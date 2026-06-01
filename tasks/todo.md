# Promura Agency — Active Backlog

Pull this up any time to see what's pending. Items decided but not yet built; items waiting on operator; items deferred.

Workflow rules from CLAUDE.md apply. Plan first, verify, execute, verify, mark done.
Mark `[ ]` while pending, `[~]` while in_progress, `[x]` only when verified.

---

## 🚧 In-flight (executing now)

- [x] Image rebuild #2 with P1 batch (locale links, hover colors, hero copy, affiliate hide, analytics gate, English flag US, ceo email)
- [ ] Image rebuild #3 (testimonials re-added per operator, ADMIN_EMAIL env-gated, Agents friendly error)
- [ ] Verify HTTPS still live after image swap

---

## 📋 Deferred items — operator decisions captured 2026-05-31

### Brand / content

- [x] **Testimonials carousel** — KEEP as Postiz testimonials (white-labeled). Operator: "It's the same system, just white-labeled and will be enhanced." Re-added to auth layout this rebuild.
- [ ] **Admin email** — Set to `ceo@promuraagency.com` via `ADMIN_EMAIL` env var (defaults that address). Operator creates domain + email later.
- [ ] **Domain plan** — Operator will register `promuraagency.com` and use `letsgoviral.promuraagency.com` (tagline-as-subdomain) OR `socials@promuraagency.com`. When domain is live: DNS A record → 187.77.142.68, update Traefik labels + MAIN_URL/FRONTEND_URL env vars + OAuth callback URLs at each dev portal.
- [ ] **Chrome extension** — Operator will build a Promura-branded extension later. CTA + manifest stay pointing at Postiz extension store for now.
- [ ] **Onboarding tutorial video** — Currently Postiz YouTube URL (likely Postiz-branded). Operator will film own intro video later. Until then, the step shows the upstream video. Operator's call to remove the step or wait.
- [ ] **README upstream Postiz links** — Most are correct AGPL attribution (KEEP). The "Built on Postiz" line stays per AGPL §5. Marketing CTAs (Register at platform.postiz.com, Join Discord) could be removed or redirected when Promura has equivalents.
- [ ] **Public API docs CTAs** — Currently link to `docs.postiz.com`. Hide or stub until Promura has its own docs hosted at `promuraagency.com/docs`.
- [ ] **Postiz Chrome Web Store CTA** in `chrome.extension.component.tsx` and `add.provider.component.tsx` — gate behind `EXTENSION_CHROME_STORE_URL` env var. Hide when empty.
- [ ] **MCP server identifier** `'postiz'` — internal naming only. Rename to `'promura'` when operator wants full purity (lower priority).

### Backend / behavior

- [ ] **Agents 504 hang fix** — Backend controller returns immediate `503 {error: "AI features need OPENAI_API_KEY"}` instead of timing out. Queued for next rebuild.
- [ ] **Email delivery** — `RESEND_API_KEY` empty so all transactional emails fail. Options: Resend.com free tier 100/day, AWS SES, any SMTP. Currently `DISABLE_REGISTRATION=true` masks the bug.
- [ ] **`agencies.service.ts` hardcoded `https://postiz.com/agencies/...` URLs** — Replace with `${process.env.FRONTEND_URL}/agencies/...` so emails point at our deploy.
- [ ] **`apps/extension/manifest.json` `externally_connectable` lock to `*.postiz.com`** — Change to current Promura URL when extension is built.

### Connection / OAuth

- [ ] **First Bluesky connection** — Operator action: app password from bsky.app/settings/app-passwords → Channels → Add Bluesky. ZERO env vars needed.
- [ ] **Telegram bot** — BotFather → `/newbot` → token. Set `TELEGRAM_TOKEN` + `TELEGRAM_BOT_NAME`. ~60s setup.
- [ ] **X.com OAuth** — Operator registers X dev app at developer.x.com (Free tier ok for testing). Sends keys, I wire `X_API_KEY` + `X_API_SECRET` + `X_URL`.
- [ ] **TikTok OAuth** — Operator registers at developers.tiktok.com → sandbox app. Sends `TIKTOK_CLIENT_ID` + `TIKTOK_CLIENT_SECRET`.
- [ ] **Meta core app (Facebook + Instagram)** — Operator creates Meta app for FB Login + Instagram products. Sends `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`.
- [ ] **Meta Threads app (SEPARATE)** — Operator creates SECOND Meta app for Threads Use Case. Sends `THREADS_APP_ID` + `THREADS_APP_SECRET`.
- [ ] **LinkedIn** — Optional. developer.linkedin.com. Sends `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET`.
- [ ] **YouTube + Google Business** — Optional. Google Cloud project + YouTube Data API + OAuth consent screen.

### AI

- [ ] **OpenAI / OpenRouter API key** — Options: (a) OpenAI direct (~$5 min), (b) OpenRouter free tier (set `OPENAI_API_KEY` + `OPENAI_BASE_URL=https://openrouter.ai/api/v1`), (c) Anthropic.

### Infrastructure

- [ ] **Real domain on the deploy** — Currently `187-77-142-68.sslip.io`. When operator registers `promuraagency.com` and points DNS, update everything: Traefik labels, MAIN_URL, FRONTEND_URL, OAuth callback URLs at each platform.
- [ ] **Image storage** — Currently `local`. Switch to Cloudflare R2 when scaling.
- [ ] **Sentry error monitoring** — `NEXT_PUBLIC_SENTRY_DSN` empty. Sign up at sentry.io free tier when ready.
- [ ] **Image cleanup runbook** — Docker daemon's lease GC killed our built image once. Either (a) bake image into ghcr.io registry, (b) document rebuild SOP.

---

## ✅ Done (recent)

- Phase A: Archive brightbean fork + decommission VPS
- Phase B: Clone Postiz to ~/projects/promura-agency
- Phase C: Rebrand Postiz → Promura Agency (commit `66d81187`)
- Phase D: Deploy Promura Agency to VPS with HTTPS via sslip.io + Traefik + Let's Encrypt
- Phase E: Proactive audit + P1 batch fix (commit `db1c61e0`)

---

## 🎯 Most-recent recommended next operator action

**Connect Bluesky in 60 seconds.** Bluesky settings → app password → Promura Agency Channels → Add Bluesky → handle + app password → connected. This validates the entire compose → schedule → publish loop on a platform that requires ZERO dev portal work. Then Telegram (BotFather, 60s) for second zero-friction win. Then start the OAuth dev-portal registrations in parallel tabs.
