# ADR-0001: Product Direction, ICP, Monetization, and Content Posture

**Status:** Accepted
**Date:** 2026-05-17
**Decider:** Kg (Operator)
**Context:** Post-deployment audit (REVELi-0001) identified three blocking decisions before Phase 2 build sequencing could begin.

---

## Context

After the initial rebrand from `brightbean-studio` to `Promura Social` and deployment to the Hostinger VPS at `187.77.142.68:8001`, a senior-developer audit identified the platform as a strong base (54k LOC, 17 social platforms, multi-tenant from Day 1) but flagged three product decisions that gate the next phase of development:

1. **Who is this for first?** Internal Promura use, agencies, solo creators, or all simultaneously.
2. **How does it make money?** Free + paid hosted, SaaS tiers, transactional take rate, or agency license.
3. **What content is allowed?** Mainstream only, NSFW supported platform-wide, or feature-flagged per tenant.

The choice on each materially changes the order of feature work, the payment processor selection, the compliance surface area, and the GTM strategy.

---

## Decision

### D1 — Primary ICP: **Promura-internal first, productize later**

Promura Social is built first for the operator's own agency use. The operator is customer zero. Productization as SaaS happens after 3-6 months of internal usage proves the surfaces.

**Why:** Lowest-risk path. Every successful agency SaaS (Buffer, Later, Hootsuite, ConvertKit, Beehiiv) started as an internal tool for the founder's own business. Dogfooding produces sharper product instincts than customer research alone. Eliminates the build-the-wrong-thing risk for the first 6 months.

**Implication:** Feature priorities optimize for Promura's actual workflow first. Public marketing, signup flows, billing tiers, and self-serve onboarding are deferred to Phase 6+ (post-productization gate).

### D2 — Monetization Model: **Free + paid hosted (Beehiiv pattern)**

The codebase remains open-source under AGPL. Revenue comes from:
- Hosted SaaS tier (Promura runs the infrastructure for paying customers)
- Premium add-ons (advanced AI features, white-label, priority support)
- Eventually: managed-service tier for agencies that want full implementation help

**Why:** Aligns with the AGPL license already in place. Builds community goodwill while preserving a clear commercial path. Successful precedents: Beehiiv ($0 → $20M ARR in 30 months), Plausible Analytics, Cal.com, Supabase.

**Implication:** Self-hostable installer (docker-compose) must remain first-class. SaaS tier differentiates on hosting/support/integrations, not feature-gating the core. License preservation is non-negotiable.

### D3 — NSFW Posture: **Feature-flagged per tenant**

Adult-industry content is allowed only in workspaces that explicitly opt-in. Those workspaces route through alternative payment processors (CCBill/Verotel/Segpay). Mainstream workspaces use Stripe Connect.

**Why:** Maximizes addressable market without burning the Stripe relationship. Operator has adult-industry context per user preferences but Promura Social itself is not adult-only. Per-tenant flag is the most regulatory-aware approach.

**Implication:** Workspace model needs an `is_adult_content_enabled` field (default False). Payment processor selection is per-workspace, not platform-wide. Some social platform integrations (LinkedIn, Pinterest, most enterprise APIs) cannot be used in adult-enabled workspaces — UI must surface this clearly. Content moderation strategy needs two policies: mainstream and adult-allowed.

---

## Consequences

### Positive
- All future feature work has a clear ICP filter: "does this serve Promura's internal operation today?"
- Open-source/AGPL keeps the codebase honest and recruits community feedback
- NSFW flag is reversible per-workspace, not a platform-wide commitment
- Lowest-risk monetization path — no need to fight for early SaaS revenue while still finding product-market fit

### Negative / Trade-offs
- Slower revenue ramp than a Day-1 paid SaaS would produce
- Self-hostable infrastructure must be maintained, even when SaaS tier exists
- Operating two payment processors (Stripe + CCBill/Verotel) adds engineering surface area
- Some integrations will be forbidden in adult-enabled tenants — must be communicated clearly

### Neutral
- License stays AGPL. Revisit at M5 (productization gate) if SaaS market dynamics require BSL/SSPL.

---

## Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Solo-creator ICP, Beacons-clone first | Higher GTM cost; requires content-marketing muscle the team hasn't built |
| Agency ICP, B2B SaaS first | Long sales cycle, slow to validate; deferred until internal usage proves value |
| Both ICPs simultaneously | Doubles design surface, splits focus, prematurely scales complexity |
| Transactional take-rate (Stan pattern) | Requires transaction volume that doesn't exist yet; chicken-and-egg |
| Closed-source SaaS-only | Forecloses self-host community option; contradicts existing AGPL license |
| NSFW forbidden platform-wide | Walks away from a market the operator already serves elsewhere |
| NSFW supported platform-wide | Burns Stripe relationship unnecessarily; limits some integrations |

---

## Revisit Trigger

This ADR is revisited when ANY of the following are true:
- Promura's internal usage hits stable production for ≥ 90 days (productization gate)
- A potential customer offers ≥ $10k/year for a managed deployment (pull-forward signal)
- Stripe rejects the Connect application (forces NSFW posture re-evaluation)
- AGPL license becomes incompatible with a major distribution channel (license re-evaluation)
