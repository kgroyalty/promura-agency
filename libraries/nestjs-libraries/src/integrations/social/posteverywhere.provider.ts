/**
 * PostEverywhere provider.
 *
 * Architectural decision: Option C (single base class + 8 thin subclasses).
 *
 * Why: Postiz registers providers as zero-arg instances and dispatches them
 * by their static `identifier` string (see IntegrationManager + posts.service).
 * Eight subclasses give us 8 distinct identifiers (`posteverywhere-x`,
 * `posteverywhere-instagram`, ...) so the frontend renders them as 8 separate
 * channels with no UI work, while all shared logic (auth stub, API calls,
 * media upload, post dispatch) lives once in PostEverywhereBase.
 *
 * Auth model: PostEverywhere holds the platform OAuth on their side. Promura
 * uses a single operator-level API key (POSTEVERYWHERE_API_KEY) for every
 * org. We do NOT expose OAuth flows here; accounts are mirrored from PE's
 * `/accounts` endpoint via PostEverywhereSync, then composing/posting works
 * like any other channel.
 */
import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { readOrFetch } from '@gitroom/helpers/utils/read.or.fetch';
import { lookup } from 'mime-types';
import dayjs from 'dayjs';

export type PostEverywherePlatform =
  | 'x'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'facebook'
  | 'threads'
  | 'pinterest';

export interface PostEverywhereAccount {
  id: number;
  platform: PostEverywherePlatform;
  account_name: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  health?: {
    status?: string;
    can_post?: boolean;
    needs_reconnection?: boolean;
  };
}

interface PostEverywhereCreatePostResponse {
  data?: {
    post_id?: string | number;
    id?: string | number;
    results?: Array<{
      account_id: number;
      platform: string;
      platform_post_id?: string;
      url?: string;
      status: string;
    }>;
  };
  error?: { code?: string; message?: string };
}

interface PostEverywhereMediaUploadResponse {
  data?: { id: string; url?: string };
  error?: { code?: string; message?: string };
}

const PE_BASE_URL = () =>
  process.env.POSTEVERYWHERE_BASE_URL || 'https://app.posteverywhere.ai/api/v1';

const PE_KEY = () => process.env.POSTEVERYWHERE_API_KEY || '';

/**
 * Display label per platform. Shown in the channel picker UI.
 */
const PLATFORM_LABELS: Record<PostEverywherePlatform, string> = {
  x: 'X (via PostEverywhere)',
  instagram: 'Instagram (via PostEverywhere)',
  tiktok: 'TikTok (via PostEverywhere)',
  youtube: 'YouTube (via PostEverywhere)',
  linkedin: 'LinkedIn (via PostEverywhere)',
  facebook: 'Facebook (via PostEverywhere)',
  threads: 'Threads (via PostEverywhere)',
  pinterest: 'Pinterest (via PostEverywhere)',
};

/**
 * Best-effort per-platform character limit. PostEverywhere itself does not
 * enforce these (it forwards to the platform). Numbers reflect platform caps.
 */
const PLATFORM_MAX_LENGTH: Record<PostEverywherePlatform, number> = {
  x: 280,
  instagram: 2200,
  tiktok: 2200,
  youtube: 5000,
  linkedin: 3000,
  facebook: 63206,
  threads: 500,
  pinterest: 500,
};

/**
 * Shared base class. Each platform subclass below sets its `identifier`,
 * `name`, and `platform` and reuses everything else.
 */
export abstract class PostEverywhereBase
  extends SocialAbstract
  implements SocialProvider
{
  abstract identifier: string;
  abstract name: string;
  abstract platform: PostEverywherePlatform;
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  toolTip =
    'This channel posts through PostEverywhere. Connect your social accounts at app.posteverywhere.ai, then click Sync from PostEverywhere here.';

  private readonly _logger = new Logger('PostEverywhere');

  maxLength() {
    return PLATFORM_MAX_LENGTH[this.platform] ?? 1000;
  }

  /**
   * PE manages OAuth on their side. We never run an OAuth flow on Promura,
   * so generateAuthUrl returns a stub the sync flow short-circuits.
   */
  async generateAuthUrl() {
    return {
      url: '',
      codeVerifier: '',
      state: '',
    };
  }

  /**
   * Stub authenticate. The real account-mirroring path is
   * PostEverywhereSync.syncAccounts which writes Integration rows directly.
   * If the standard OAuth callback ever lands here, it must error loudly so
   * we don't write a half-baked row.
   */
  async authenticate(): Promise<AuthTokenDetails | string> {
    return 'PostEverywhere accounts must be synced from the admin panel, not OAuthed directly.';
  }

  async refreshToken(): Promise<AuthTokenDetails> {
    // PE handles token refresh upstream. No-op here.
    return {
      id: '',
      name: '',
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
      picture: '',
      username: '',
    };
  }

  /**
   * Upload media to PostEverywhere /media. Returns the PE media id which the
   * /posts endpoint expects in `media_ids`.
   */
  private async uploadMedia(path: string): Promise<string | null> {
    const buffer = Buffer.from(await readOrFetch(path));
    const filename = path.split('/').pop() || 'upload';
    const mime = (lookup(path) as string) || 'application/octet-stream';

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mime }), filename);

    const resp = await fetch(`${PE_BASE_URL()}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PE_KEY()}`,
      },
      body: form,
    });

    const json = (await resp.json()) as PostEverywhereMediaUploadResponse;
    if (!resp.ok || !json.data?.id) {
      this._logger.error(
        `Media upload failed: ${json.error?.message || resp.statusText}`
      );
      return null;
    }
    return json.data.id;
  }

  /**
   * Map a Postiz PostDetails[] (first post in array) into a PE /posts call.
   * `integration.internalId` is the PE account id we mirrored at sync time.
   */
  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;

    const mediaIds: string[] = [];
    for (const media of firstPost.media || []) {
      const mediaId = await this.uploadMedia(media.path);
      if (mediaId) mediaIds.push(mediaId);
    }

    const peAccountId = Number(integration.internalId);
    if (!Number.isFinite(peAccountId)) {
      throw new Error(
        `PostEverywhere integration ${integration.id} has invalid internalId`
      );
    }

    const body = {
      content: firstPost.message,
      account_ids: [peAccountId],
      ...(mediaIds.length ? { media_ids: mediaIds } : {}),
    };

    const resp = await fetch(`${PE_BASE_URL()}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PE_KEY()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = (await resp.json()) as PostEverywhereCreatePostResponse;
    if (!resp.ok || json.error) {
      throw new Error(
        `PostEverywhere post failed: ${
          json.error?.message || resp.statusText
        }`
      );
    }

    const postIdValue = String(
      json.data?.results?.[0]?.platform_post_id ||
        json.data?.post_id ||
        json.data?.id ||
        ''
    );
    const releaseURL = json.data?.results?.[0]?.url || '';

    return [
      {
        id: firstPost.id,
        postId: postIdValue,
        releaseURL,
        status: 'posted',
      },
    ];
  }

  /**
   * Threaded comments are not exposed via PE's public API at the moment.
   * We post the comment as a standalone post to the same account so threads
   * still get all messages through. If PE adds reply support, swap this out.
   */
  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return this.post(id, accessToken, postDetails, integration);
  }

  /**
   * Pull per-post results. PE returns one row per platform.
   */
  async analytics(
    _id: string,
    _accessToken: string,
    _date: number
  ): Promise<AnalyticsData[]> {
    // Aggregated time-series analytics are not yet exposed by PE.
    // Per-post results are fetched via postAnalytics below.
    return [];
  }

  async postAnalytics(
    _integrationId: string,
    _accessToken: string,
    postId: string
  ): Promise<AnalyticsData[]> {
    if (!postId) return [];
    try {
      const resp = await fetch(
        `${PE_BASE_URL()}/posts/${encodeURIComponent(postId)}/results`,
        {
          headers: { Authorization: `Bearer ${PE_KEY()}` },
        }
      );
      if (!resp.ok) return [];
      const json = (await resp.json()) as {
        data?: { results?: Array<Record<string, unknown>> };
      };
      const today = dayjs().format('YYYY-MM-DD');
      return (json.data?.results || []).flatMap((row) =>
        Object.entries(row)
          .filter(([, v]) => typeof v === 'number')
          .map(([label, value]) => ({
            label: String(label),
            percentageChange: 0,
            data: [{ total: String(value as number), date: today }],
          }))
      );
    } catch (err) {
      this._logger.warn(`postAnalytics failed: ${(err as Error).message}`);
      return [];
    }
  }
}

export class PostEverywhereXProvider extends PostEverywhereBase {
  identifier = 'posteverywhere-x';
  name = PLATFORM_LABELS.x;
  platform: PostEverywherePlatform = 'x';
}

export class PostEverywhereInstagramProvider extends PostEverywhereBase {
  identifier = 'posteverywhere-instagram';
  name = PLATFORM_LABELS.instagram;
  platform: PostEverywherePlatform = 'instagram';
}

export class PostEverywhereTiktokProvider extends PostEverywhereBase {
  identifier = 'posteverywhere-tiktok';
  name = PLATFORM_LABELS.tiktok;
  platform: PostEverywherePlatform = 'tiktok';
}

export class PostEverywhereYoutubeProvider extends PostEverywhereBase {
  identifier = 'posteverywhere-youtube';
  name = PLATFORM_LABELS.youtube;
  platform: PostEverywherePlatform = 'youtube';
}

export class PostEverywhereLinkedinProvider extends PostEverywhereBase {
  identifier = 'posteverywhere-linkedin';
  name = PLATFORM_LABELS.linkedin;
  platform: PostEverywherePlatform = 'linkedin';
}

export class PostEverywhereFacebookProvider extends PostEverywhereBase {
  identifier = 'posteverywhere-facebook';
  name = PLATFORM_LABELS.facebook;
  platform: PostEverywherePlatform = 'facebook';
}

export class PostEverywhereThreadsProvider extends PostEverywhereBase {
  identifier = 'posteverywhere-threads';
  name = PLATFORM_LABELS.threads;
  platform: PostEverywherePlatform = 'threads';
}

export class PostEverywherePinterestProvider extends PostEverywhereBase {
  identifier = 'posteverywhere-pinterest';
  name = PLATFORM_LABELS.pinterest;
  platform: PostEverywherePlatform = 'pinterest';
}

/**
 * Convenience array for the registry.
 */
export const postEverywhereProviders = [
  new PostEverywhereXProvider(),
  new PostEverywhereInstagramProvider(),
  new PostEverywhereTiktokProvider(),
  new PostEverywhereYoutubeProvider(),
  new PostEverywhereLinkedinProvider(),
  new PostEverywhereFacebookProvider(),
  new PostEverywhereThreadsProvider(),
  new PostEverywherePinterestProvider(),
];
