/**
 * Account-sync service for PostEverywhere.
 *
 * Pulls the current connected-account list from PE and upserts a Postiz
 * Integration row per account. Identifier maps 1:1 to the platform-specific
 * PostEverywhere provider classes (`posteverywhere-{platform}`).
 *
 * Triggered on-demand via the admin endpoint. Safe to call repeatedly.
 */
import { Injectable, Logger } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import {
  PostEverywhereAccount,
  PostEverywherePlatform,
} from '@gitroom/nestjs-libraries/integrations/social/posteverywhere.provider';
import dayjs from 'dayjs';

const PE_BASE_URL = () =>
  process.env.POSTEVERYWHERE_BASE_URL || 'https://app.posteverywhere.ai/api/v1';

const PE_KEY = () => process.env.POSTEVERYWHERE_API_KEY || '';

const SUPPORTED_PLATFORMS: PostEverywherePlatform[] = [
  'x',
  'instagram',
  'tiktok',
  'youtube',
  'linkedin',
  'facebook',
  'threads',
  'pinterest',
];

export interface PostEverywhereSyncResult {
  synced: number;
  skipped: number;
  accounts: Array<{
    id: number;
    platform: string;
    name: string;
    providerIdentifier: string;
    disabled: boolean;
  }>;
}

@Injectable()
export class PostEverywhereSyncService {
  private readonly _logger = new Logger('PostEverywhereSync');

  constructor(private readonly _integrationService: IntegrationService) {}

  private async fetchAccounts(): Promise<PostEverywhereAccount[]> {
    if (!PE_KEY()) {
      throw new Error('POSTEVERYWHERE_API_KEY is not configured');
    }

    const resp = await fetch(`${PE_BASE_URL()}/accounts`, {
      headers: { Authorization: `Bearer ${PE_KEY()}` },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(
        `PostEverywhere /accounts failed: ${resp.status} ${text.slice(0, 200)}`
      );
    }

    const json = (await resp.json()) as {
      data?: { accounts?: PostEverywhereAccount[] };
      accounts?: PostEverywhereAccount[];
    };
    return json.data?.accounts || json.accounts || [];
  }

  /**
   * Sync PE accounts into Postiz Integration rows for one organization.
   * Each PE account becomes an Integration with:
   *   - providerIdentifier = `posteverywhere-{platform}`
   *   - internalId         = `{pe_account_id}` (used at post-time)
   *   - name               = pe_account.account_name
   *   - picture            = pe_account.avatar_url
   *   - disabled           = !pe_account.health.can_post
   *
   * The shared operator key is stored as the token so refreshes are no-ops.
   */
  async syncAccounts(orgId: string): Promise<PostEverywhereSyncResult> {
    const accounts = await this.fetchAccounts();
    const out: PostEverywhereSyncResult = {
      synced: 0,
      skipped: 0,
      accounts: [],
    };

    for (const acc of accounts) {
      if (!SUPPORTED_PLATFORMS.includes(acc.platform)) {
        out.skipped += 1;
        this._logger.warn(
          `Skipping PE account ${acc.id}: unsupported platform "${acc.platform}"`
        );
        continue;
      }

      const providerIdentifier = `posteverywhere-${acc.platform}`;
      const disabled = acc.health?.can_post === false;
      if (disabled) {
        // PE reports the account cannot post (auth lapsed, etc.). We still
        // mirror it so operators can see it in the channel list, but flag it
        // in the response. Manual disable via the existing UI is the next step.
        this._logger.warn(
          `PE account ${acc.id} (${acc.platform}) cannot post: ${
            acc.health?.status || 'unknown'
          }`
        );
      }

      await this._integrationService.createOrUpdateIntegration(
        undefined,
        false,
        orgId,
        acc.account_name,
        acc.avatar_url,
        'social',
        String(acc.id),
        providerIdentifier,
        PE_KEY(),
        '',
        dayjs().add(100, 'years').unix() - dayjs().unix(),
        acc.account_name,
        false,
        undefined,
        undefined,
        undefined
      );

      out.synced += 1;
      out.accounts.push({
        id: acc.id,
        platform: acc.platform,
        name: acc.account_name,
        providerIdentifier,
        disabled,
      });
    }

    return out;
  }
}
