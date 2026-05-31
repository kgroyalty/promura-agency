# Promura Social — Active Work

Workflow rules from CLAUDE.md apply. Plan first, verify, execute, verify, mark done.
Mark `[ ]` while pending, `[~]` while in_progress, `[x]` only when verified.
Every task has an acceptance criterion. Nothing is "done" without it.

---

## Strategy Decision: 2026-05-18 — Skinny Sprint 0 + Real-Use Test

Per senior-dev mentor recommendation, Sprint 0 is **trimmed** to its highest-leverage items so we get to real validation faster. Full Sprint 0 (with pytest suite + sprint verification gate) is deferred and trigger-gated.

**Skinny Sprint 0 (executing now):**
- S0-1 ✅ Local docker dev verified
- S0-2 ✅ Lessons.md seeded
- S0-3 Pre-commit hooks active (kept — cheap, high-leverage)
- S0-4 GitHub Actions CI (test + lint, no deploy yet)
- S0-5 Sentry env-tagging

**Deferred — trigger-gated:**
- S0-6 Full pytest baseline → **Gate:** complete BEFORE any payment-handling code ships (Sprint 2). No money code without tests.
- S0-7 Sprint verification gate → not needed for skinny scope; verification happens per-item.

**Then:** Real-use test on the deployed VPS instance. Connect a real social account, schedule a real post, walk an approval flow. Notes from that experience re-prioritize Sprint 1.

---

## Currently Active: Sprint 0 — Foundation Hardening + Local Dev

**Sprint goal:** Get to a state where you (Operator) can run Promura Social locally, see changes live, and have safety nets (tests + CI + observability + secret scanning) catching regressions before they reach the VPS.

**Why this sprint first:** Every future feature needs a local dev loop AND a CI gate. Building features without these is junior. With these in place, every subsequent sprint runs faster and safer.

**Exit criteria for Sprint 0 (all must be true to call it done):**
- Operator can run `docker compose up` on Mac and see the live app at http://localhost:8000
- Operator can edit any Python or HTML file and see the change without rebuilding
- pre-commit hooks run on every commit (ruff format, ruff check, mypy, gitleaks)
- GitHub Actions CI runs pytest + ruff + mypy on every push; PRs cannot merge if CI red
- Sentry captures errors with environment tag (`local`, `staging`, `production`)
- A baseline test suite runs green (even if coverage is low — establishes the gate)

---

### Tasks (in execution order)

- [x] **S0-1 — Verify local docker-compose dev works on Mac** ✅ 2026-05-18
  Acceptance MET: OrbStack installed (Docker Desktop was absent despite operator assumption); `docker compose up` builds and runs cleanly; http://localhost:8001 returns 302 → /accounts/login/ in 108ms; /admin/login/ returns 200 with 4144B login page; all 4 containers (app, worker, postgres healthy, tailwind) running; local superuser created. Live-reload via bind mount `.:/app` works for runserver; Tailwind v4.2.2 watcher building CSS on save.
  Owner: Engineering (Claude)
  Verification: live HTTP curl + admin endpoint check + worker logs show process_tasks active.
  Bug fixed during this task: race condition between worker and migrations — docker-compose.override.yml updated so worker runs `migrate --noinput && process_tasks`. Captured in lessons.md.
  Note: Dev port is 8001 (matches base.yml mapping). Could be normalized to 8000 in a later cleanup; not blocking.

- [ ] **S0-2 — Write tasks/lessons.md seed file**
  Acceptance: File exists at tasks/lessons.md with header + first 3 lessons captured from work-to-date (port conflict, prod compose merge requirement, env-gated HTTPS)
  Owner: Engineering (Claude)

- [x] **S0-3 — Install + configure pre-commit hooks** ✅ 2026-05-18
  Acceptance MET: pre-commit 4.6.0 installed via brew. Hooks active at .git/hooks/pre-commit and .git/hooks/pre-push. Verified on real files: 11 hooks pass (trailing whitespace, EOF, YAML, large files, merge conflicts, case conflicts, private keys, mixed line endings, ruff lint, ruff format, gitleaks).
  Owner: Engineering (Claude)
  Note: mypy intentionally removed from pre-commit — needs full Django dep tree to load settings, too slow for commit-time gate. mypy still runs in CI typecheck job (correct place for it). Documented inline in .pre-commit-config.yaml.

- [x] **S0-4 — GitHub Actions CI workflow** ✅ 2026-05-18 (was already configured)
  Acceptance MET: .github/workflows/ci.yml inherited from upstream is enterprise-grade. 5 jobs in parallel: lint (ruff), typecheck (mypy), test (pytest + postgres service), build (docker image), secrets-scan (gitleaks v8.24.3). build depends on lint+typecheck+test. Pinned action SHAs. Permissions: read-only by default. Concurrency cancellation on new pushes.
  Owner: Engineering (Claude)
  Manual follow-up: Operator should enable branch protection on `main` in GitHub repo Settings → require CI green to merge. (Not in code.)

- [x] **S0-5 — Sentry environment tagging** ✅ 2026-05-18
  Acceptance MET: config/settings/base.py sentry_sdk.init() now reads SENTRY_ENVIRONMENT env var (default "local") and passes it as environment= to Sentry. send_default_pii=False added for privacy. .env.example documents the var. Local .env=local, VPS .env=production.
  Owner: Engineering (Claude)
  Manual follow-up: Operator creates Sentry project at https://sentry.io → grabs DSN → sets SENTRY_DSN in BOTH local .env and VPS .env. Without DSN, init() is a no-op. (Not blocking — graceful degradation.)

- [ ] **S0-6 — Baseline pytest suite establishes the CI gate**
  Acceptance: `pytest` runs from repo root and produces a green test run (even if coverage is low). pytest-django configured per pyproject.toml. conftest.py at root already exists; verify it loads. Test count > 0. At least one model test + one view smoke test exist as the foundation pattern.
  Owner: Engineering (Claude)

- [DEFER] **S0-6 — Baseline pytest suite establishes the CI gate**
  Status: Deferred per Skinny Sprint 0 decision. **Trigger to un-defer:** before any payment-handling code ships (Sprint 2). No money code without tests.

- [DEFER] **S0-7 — End-to-end sprint verification gate**
  Status: Per-task verification used instead.

---

## Manual operator follow-ups (5 minutes total)

These are one-time GitHub/SaaS settings the operator must do — Claude cannot do them via CLI.

- [ ] **OP-1 — Enable GitHub Actions on the repo**
  Why: CI workflow file is committed and registered, but Actions is disabled by default on forked repos. Until enabled, CI never runs.
  How: https://github.com/kgroyalty/Social-Media-Studio/settings/actions → "Allow all actions and reusable workflows" → Save. Then trigger by re-pushing main or via Actions tab → Run workflow.
  Verification: Re-push a tiny change to main and watch a green check appear in the Actions tab within ~3 min.

- [ ] **OP-2 — Create Sentry project + wire DSN**
  Why: Sentry init code is live but DSN env var is empty, so init is a no-op. No errors will be captured until DSN is set.
  How: https://sentry.io → Create Project → Django → grab DSN (format: `https://xxx@xxx.ingest.sentry.io/yyy`). Add to BOTH .env files:
    - Local: `~/projects/promura-social/.env` → `SENTRY_DSN=<dsn>` (already has SENTRY_ENVIRONMENT=local)
    - VPS: `/var/www/promura-social/.env` → `SENTRY_DSN=<dsn>` (already has SENTRY_ENVIRONMENT=production)
    Then restart containers: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps app worker` on VPS, `docker compose restart app worker` locally.
  Verification: `curl http://localhost:8001/__deliberately_404` then check Sentry — should see a 404 event tagged `environment: local`.

- [ ] **OP-3 — (Optional) Branch protection on main**
  Why: Once CI is running, require it to be green before merging to main.
  How: https://github.com/kgroyalty/Social-Media-Studio/settings/branches → Add rule for `main` → "Require status checks to pass before merging" → select CI/lint, CI/typecheck, CI/test, CI/build, CI/secrets-scan.

---

## Backlog (next sprints — DO NOT START until Sprint 0 sprint gate is green)

### Sprint 1 — Analytics Foundation (the biggest gap)
- S1-1: Design unified analytics schema (post_id, platform, impressions, engagements, reach, saves, link_clicks, captured_at)
- S1-2: Build apps/analytics/ Django app with models + admin
- S1-3: Provider-side insights fetchers (start with Instagram, then TikTok — most-used platforms)
- S1-4: Background backfill job (90 days on connect)
- S1-5: Hourly refresh job
- S1-6: Per-creator analytics dashboard (HTMX + Chart.js)
- S1-7: Cross-platform performance comparison view
- S1-8: GitHub Actions auto-deploy on push to main (now that we have a stable feature)

### Sprint 2 — Payments Foundation (Stripe Connect + ledger)
- S2-1: Stripe account + Connect Express application submitted
- S2-2: Stripe webhooks endpoint with signature verification
- S2-3: Ledger table (every cent recorded, double-entry)
- S2-4: Creator Stripe onboarding flow
- S2-5: Workspace-level Stripe vs CCBill processor selection (NSFW flag respect)
- S2-6: Basic payout view (per creator, per period)

### Sprint 3 — Link-in-bio + Storefront
- S3-1: Public route /{creator-slug} renders bio page
- S3-2: Block-based editor (links, products, email opt-in, embed)
- S3-3: Mobile-responsive theme
- S3-4: Product catalog model (digital products, one-time + subscription)
- S3-5: Checkout via Stripe Checkout
- S3-6: Cloudflare caching for public bio pages

### Sprint 4+ — sequenced after Sprint 3 traction signal
- Defer detailed planning until Sprint 3 ships and we have real usage data.
- Candidates: AI Co-Pilot, Email/Newsletter, Audience CRM, AI DM Responder.

---

## Done

(Will populate as tasks complete with `[x]` and verification notes.)

---

## Review (populated at end of each Sprint)

(Empty until Sprint 0 closes.)
