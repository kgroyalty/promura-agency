# Promura Social — Lessons Learned

Per workflow rule 3 (Self-Improvement Loop): every correction or non-obvious decision goes here. Future-Claude reviews this at session start to avoid repeating mistakes.

Format:
```
## YYYY-MM-DD — Short title
**Trigger:** what happened
**Lesson:** what to do next time
**Why:** the underlying principle
```

This file is also a methodology log. When the project completes, the entries here become the basis for a reusable "platform build skill" we extract for future projects.

---

## 2026-05-19 — When research keeps citing a reference implementation, evaluate USING it directly, not reimplementing it.

**Trigger:** 4 separate research subagents (X, Meta, TikTok, OAuth architecture) all cited Postiz (gitroomhq/postiz-app, AGPL-3, 14k stars) as THE architectural gold standard. Every recommendation was "do what Postiz does." The operator caught what I should have caught session-earlier: if Postiz already does this, why are we reimplementing it on a different fork?

**Lesson:** When research output converges on a single open-source reference as "the way to do this," that's a strong signal to evaluate using the reference DIRECTLY as the base, not as inspiration. Especially true when:
- License is compatible (AGPL → AGPL = identical IP posture)
- The reference has active maintenance + production users
- We'd otherwise spend months building feature parity
- Our differentiation lives in features above the integration layer, not in the integrations themselves

**Why:** Reimplementing a reference is the most expensive way to learn the patterns it teaches. If 4 audits say "study Postiz," the next step isn't "rewrite Postiz from scratch." It's "fork Postiz, customize on top." The integration layer is commodity; differentiation lives elsewhere.

**How to apply:** When closing out audit/research phase, ask explicitly: "is the recommended reference architecture itself a viable base?" Check (a) license compatibility, (b) maintenance status, (c) extensibility model, (d) whether our differentiation requires modifying the integration core or sits cleanly above it. If 3/4 answers are yes, base on the reference.

**Cost of having NOT applied this earlier:** ~3 sessions of work on brightbean-studio fork that we're now archiving. Not wasted (the ADR + lessons + infrastructure setup transfer), but ~70% of the code-specific work is being discarded. Salvageable lesson; expensive lesson.

---

## 2026-05-19 — Decision paralysis ≠ senior dev. Take a position, defend it, then tell the user what you did.

**Trigger:** Presented operator with a 4-way AskUserQuestion at a moment where they wanted a senior-dev RECOMMENDATION and decisive execution. Their response: "never guess. never assume. make errors fail loud. catch them and fix them like a senior developer before returning to me." Translation: stop punting decisions back as menus when I have enough evidence to choose.

**Lesson:** When the audit/evidence is complete and the operator has set the priorities (ICP, monetization, NSFW posture, "hands-off"), MAKE the call. Use AskUserQuestion only for decisions that genuinely require the operator's identity, payment, taste, or insider knowledge. Architectural / library / refactor decisions where evidence converges = my call, my defense.

**Why:** Operators hire senior devs for judgment, not optionality. A senior who returns a 4-option matrix when the audit clearly points to option A is failing the job. Optionality should be reserved for decisions where the operator has information I genuinely don't.

**How to apply:** Before drafting an AskUserQuestion with >2 options, ask: "do I have enough information to make this call myself?" If yes, make it. If no, ask the ONE clarifying question that closes the gap. Multi-option menus on architectural decisions are a smell.

**Allowed exceptions:**
- Money decisions (operator pays the bill)
- Identity-bound decisions (operator's name on the dev portal account)
- Brand/taste decisions (subdomain, copy, naming)
- Decisions with audit data still missing

---

## 2026-05-19 — Validation [PASS] without tests is theatre — use [VERIFIED]/[SELF-ASSESSED]/[NOT-TESTED] tri-state

**Trigger:** REVELi-0002 validation_checklist had 10 [PASS] marks, all self-assessed, none tested. Operator caught it: "did REVELi or you do the test? all these passed?" Honest answer: I wrote PASS based on judgment, no actual test ran.

**Lesson:** Validation gates that aren't tested are decoration. Going forward, every validation line uses tri-state:
- `[VERIFIED]` — concrete test run with citation (file:line, command, or external evidence)
- `[SELF-ASSESSED]` — engineer judgment, NOT externally verified — flag in confidence score
- `[NOT-TESTED]` — known gap, listed as follow-up work

**Why:** Self-assessment dressed as test results undermines the entire validation framework. Future-me reads PASS and skips re-verification. Real bugs ship. Tri-state forces honesty AND surfaces what needs follow-up work.

**How to apply:** REVELi outputs (and any other validation checklist) get the tri-state. When writing PASS, ask "what test proved this?" If no test exists, mark SELF-ASSESSED or NOT-TESTED.

---

## 2026-05-19 — Tool selection cheatsheet (avoid Skill-vs-Agent confusion forever)

**Trigger:** Confused `Skill` tool (context injector) with `Agent` tool (subagent spawner). Result: tried to run REVELi alongside research subagents; nothing rendered because Skill just re-injects spec into MY context, doesn't spawn anything.

**Cheatsheet — fail loud at decision time, not at execution time:**

| I want to... | Use | Why |
|---|---|---|
| Load a skill's instructions for ME to follow | `Skill` | Context injection — augments my context, no separate process |
| Run a skill IN PARALLEL with other work | `Agent` with skill spec in prompt | Spawns isolated Claude instance with clean context |
| Have a clean-context expert do research | `Agent` | Bias-resistant; my conversation history doesn't pollute the result |
| Get multi-expert convergent analysis | Multiple `Agent` calls in parallel | One topic per agent, synthesize after |
| Use a built-in CLI command (slash command) | Type it directly | Skill tool is for skill invocation, not CLI |

**Lesson:** Before invoking `Skill` for parallel work — fail loud immediately. If the use case is "run X alongside Y", reach for `Agent`, not `Skill`. Document this rule and check against it.

**Why:** Naming similarity is deceptive. Both feel like "invoke a thing." But Skill modifies my brain; Agent spawns a separate brain. These are not interchangeable, and confusing them silently produces no output (worst possible failure mode — no error, just absence).

**How to apply:** Reference this cheatsheet at decision time. If unsure, default to `Agent` — the cost of an unnecessary subagent is small; the cost of a Skill that didn't run is invisible.

---

## 2026-05-18 — Skill tool is a context injector, NOT a generator (REVELi parallel-run bug)

**Trigger:** Tried to run REVELi alongside 4 research subagents via `Skill: anthropic-skills:reveli`. Skill tool responded "Launching skill" but produced no actual REVELi-formatted output. Conclusion: Skill tool re-injected REVELi spec into my own context (where I'd already read it), instead of spawning a parallel REVELi process.

**Lesson:** `Skill` tool ≠ parallel execution. To get parallel structured output from a skill/framework, spawn it via `Agent` tool with the skill spec embedded in the subagent prompt. Skill tool is for in-context skill activation; Agent tool is for spawning isolated parallel instances.

**Why:** Naming similarity ("invoke a skill") is deceptive. The mental model needs to be: `Skill` = "load these instructions into MY brain"; `Agent` = "spawn a separate brain with these instructions." Different concepts, both useful, but not interchangeable.

**How to apply:** When the user wants "REVELi alongside subagents" or "multiple parallel passes from different frameworks," embed the framework spec inside an `Agent` prompt. Never use `Skill` for parallel work.

---

## 2026-05-18 — Don't write [PASS] on validation checklists you haven't actually tested

**Trigger:** Operator caught that REVELi-0002 validation_checklist had all `[PASS]` marks but I had never actually run any of the checks. Self-assessment dressed up as test results = exactly the validation theatre the workflow rules forbid.

**Lesson:** Validation checklist entries should be one of: (a) `[VERIFIED]` with the verification method named ("traced 20/20 requirements to workflow steps via grep against IDs"), (b) `[SELF-ASSESSED]` honestly labeled, or (c) `[NOT TESTED]` flagged for follow-up. Never `[PASS]` without testing.

**Why:** The whole point of a validation gate is to surface gaps. Writing PASS without testing converts a gate into decoration. The operator can't trust the output, and future-me will rebuild on a shaky foundation.

**How to apply:** Before writing PASS on any checklist item, ask "what test would prove this is true?" If the test wasn't run, mark accordingly. For REVELi outputs specifically: implement a `[VERIFIED]/[SELF-ASSESSED]/[NOT-TESTED]` tri-state instead of binary PASS/FAIL.

---

## 2026-05-18 — X.com API moved to Pay-Per-Use (Feb 2026), invalidating older "Basic/Pro tier" guidance

**Trigger:** Initial recommendation to operator was based on legacy X Free/Basic/Pro tier model. Deep research subagent revealed X switched to PPU in Feb 2026: $0 base + $0.01/post created + $0.005/post read + $0.20 per URL-containing post. Legacy tiers closed to new signups.

**Lesson:** For pricing on platforms that change rapidly (X especially), ALWAYS re-verify with primary sources at the time of decision. Don't rely on training-time knowledge or even recent blog posts. Use X's devcommunity.x.com announcements as ground truth.

**Why:** Platform pricing is the single highest-impact assumption in SMM tool architecture. Wrong by one tier = wrong unit economics = wrong product positioning. The cost of verifying (5 min) is microscopic vs. cost of being wrong (months of mis-priced product).

**How to apply:** When building any platform integration that involves money, the first research step is "what is the platform charging RIGHT NOW for the API tier I need" — verified at primary source within the last 30 days.

---

## 2026-05-18 — X Developer Agreement §II.A.5 forbids shared API keys across unrelated end users

**Trigger:** Research subagent surfaced that X explicitly prohibits one dev app serving "different end users with substantially similar use case" — multi-tenant SMM with shared X keys is the textbook violation. X can and does revoke keys.

**Lesson:** Design the PlatformCredential model to support per-tenant API keys from Day 1, even when Promura's current use is single-tenant. Add a `per_tenant_keys: bool` flag on Platform. When productizing, each customer-agency registers their own X dev app and pastes their credentials.

**Why:** Refactoring credential sharding AFTER customers exist is painful (data migration, encryption key isolation, billing changes). Designing for it now costs ~1 hour and saves ~2 weeks later.

**How to apply:** Per-tenant credentials should encrypt with HKDF info=org_id (instead of global), so a leaked SECRET_KEY can't decrypt one org's credentials with another org's keys. Each tenant onboarding includes "register your X app" as a step.

---

## 2026-05-18 — Postiz/Mixpost both use Authlib-pattern OAuth + exception-driven refresh

**Trigger:** Architecture research subagent read Postiz source on DeepWiki. Their pattern: SocialAbstract base class with a token-refresh interceptor that catches TokenExpiredError from any API call, refreshes, retries once. This collapses "did the token expire?" branching at every call site into one centralized handler.

**Lesson:** Adopt the exception-driven refresh pattern in Promura's providers/base.py. Decorator `@with_token_refresh` wraps every authenticated method. Token expiry stops being a per-method concern.

**Why:** Without this pattern, every API method needs `if token_expired: refresh()` boilerplate. That code drifts, gets buggy, and silently swallows refresh failures. Centralized interceptor = one place to fix bugs, one place to instrument.

**How to apply:** When adding the X provider, build the interceptor first. All future providers (LinkedIn, Pinterest, YouTube) inherit it for free.

---

## 2026-05-18 — Strategic decisions deserve parallel-subagent research, not single-shot Claude

**Trigger:** Operator asked whether free/open-source alternatives existed to paid X.com API. Default answer "no, just use official API" was probably right but lacked rigor — operator wisely pushed for deeper research before committing.

**Lesson:** When a strategic decision involves >$100/mo recurring cost OR architectural lock-in OR legal/ToS implications, deploy 4-6 parallel research subagents (one per topic) before deciding. Each agent runs clean-context, no inherited bias. Then synthesize with REVELi structure + confidence scores. Single-shot answers from main Claude conversation are biased by recency and conversational momentum; parallel research is bias-resistant.

**Why:** The cost asymmetry favors research. Subagent research costs ~10 min of wall-clock time + maybe $1 of API. Wrong architectural decision costs days-to-weeks of rework. The 100x ratio means defaulting to research is the senior move every time the stakes meet the threshold.

**Threshold to trigger this pattern:**
- Cost ≥ $100/mo OR
- Touches user authentication / payments / data sovereignty OR
- Changes a core architectural surface that's hard to reverse OR
- Operator explicitly asks for "deep" or "research-grade" answer.

---

## 2026-05-17 — docker-compose.prod.yml is a supplement, not a standalone file

**Trigger:** Initial deploy spec said `docker compose -f docker-compose.prod.yml up --build -d`. That command fails because the prod compose file has services without `build:` or `image:` directives — they inherit from docker-compose.yml.

**Lesson:** Always run `docker compose -f docker-compose.yml -f docker-compose.prod.yml ...` for the production VPS. The default file-resolution behavior auto-loads docker-compose.override.yml (the dev overlay), which is wrong for prod. Explicit `-f` flags REPLACE the default resolution.

**Why:** Docker compose's file resolution is layered: base + override.yml for dev (auto), or explicit -f for prod. Mixing them produces incorrect environments.

---

## 2026-05-17 — Django production.py forced HTTPS without an env toggle

**Trigger:** Django production.py had `SECURE_SSL_REDIRECT = True`, `SECURE_HSTS_SECONDS = 31536000`, `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True` hardcoded. Deploying to plain HTTP (no TLS proxy yet) created an infinite redirect loop.

**Lesson:** Always gate HTTPS-only Django settings behind an env toggle. Default to False for IP-based deploys; flip to True only when a TLS-terminating reverse proxy is in front.

**Why:** Production code should be deployable in multiple postures (bare IP, behind nginx, behind Cloudflare, behind Caddy). Hardcoding HTTPS-required settings prevents staging or IP-based deploys.

---

## 2026-05-17 — CSRF_TRUSTED_ORIGINS must be explicitly read from env in Django 4.x+

**Trigger:** Setting `CSRF_TRUSTED_ORIGINS` in .env did nothing because the settings file never called `env.list("CSRF_TRUSTED_ORIGINS", default=[])`. Every POST request would have returned 403.

**Lesson:** When the project uses django-environ, an env var only takes effect if the settings file explicitly reads it. Spec docs saying "set X in .env" must be paired with a code change that consumes X. Verify both ends of the contract.

**Why:** Django settings are Python — they don't auto-import from env. The bridge between env and settings is the explicit `env(...)` call.

---

## 2026-05-18 — Dev compose worker race-conditions migrations on fresh DB

**Trigger:** First `docker compose up` after fresh build crashed `promura-social-worker-1` with `relation "background_task" does not exist`. Root cause: in dev mode, `worker` and `app` both depend only on `postgres: service_healthy` and start in parallel; if worker queries `Task` model before app has applied migrations, it crashes.

**Lesson:** In `docker-compose.override.yml`, override worker's `command` to migrate-then-process: `sh -c "python manage.py migrate --noinput && python manage.py process_tasks"`. `migrate` is idempotent so this stays safe. Prod compose already has a dedicated `migrate` one-shot service; dev keeps it inline.

**Why:** `depends_on: condition: service_healthy` only waits for postgres readiness, NOT for schema migrations. Any container that uses the ORM at startup is exposed to this race on a fresh DB.

---

## 2026-05-18 — Orphan docker network blocks compose up

**Trigger:** After an interrupted/half-failed `docker compose up`, retrying produced `Network promura-social_default Error: network with name promura-social_default already exists` and containers app + worker never reached Created state.

**Lesson:** When compose up fails partway through, run `docker compose down --remove-orphans` followed by `docker network prune -f` before retrying. Failing to clean orphan networks silently breaks subsequent `up`s with confusing error messages.

**Why:** Docker compose creates a default network per project. If the up process is killed mid-execution, the network can persist but the containers don't, leaving compose unable to reuse OR recreate the network cleanly.

---

## 2026-05-17 — Audit before deploy, every time

**Trigger:** Pre-deploy audit caught 4 blockers that would have produced a broken production environment: forced HTTPS, missing CSRF reader, non-standalone prod compose, port 8000 collision with Coolify.

**Lesson:** Always run a senior-developer-style audit pass on a forked codebase before deploying. Check: env-var consumption, security toggle assumptions, compose file topology, port conflicts on the target host, license/branding completeness.

**Why:** Fork-and-deploy projects accumulate assumptions from upstream that don't match your environment. Catching them in audit costs minutes; catching them in production costs hours and reputation.
