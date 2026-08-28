# Authenticated Reach API and mobile data checkpoint

Status: passed  
Date: 2026-08-27  
Checkpoint: `M03-authenticated-reach-api-018`
Implementation commit: `5a23b49`

## Implemented boundary

The authenticated V1 API now exposes the optional Reach domain to both roles:

- `GET /v1/creator/reach` returns the signed-in Creator's independent Instagram, TikTok, and YouTube capability, consent, and current derived qualification states.
- `POST /v1/creator/reach/{platform}/consent` records the versioned optional read-only consent for exactly one supported platform.
- `DELETE /v1/creator/reach/{platform}/consent` revokes that platform's optional consent and blocks future Reach qualification without changing Community eligibility or an accepted reward.
- `GET /v1/business/reach-options` returns the 80% Community minimum, fixed Level 1/2/3 creator-reward multipliers, and per-platform booking availability.

Every route resolves the bearer identity against current PostgreSQL role and Business membership state. Creator routes deny Business identities, the Business route denies Creator identities, and deployed authentication remains fail-closed until the later Entra configuration gate.

## Privacy and provider boundary

The Business response has no estimated local-audience count, evidence reference, provider-connection reference, account identifier, follower total, combined audience, or arbitrary filter. It exposes only fixed packages and whether each platform is presently bookable. Creator qualification output is derived tier/dates/status only.

Instagram, TikTok, and YouTube remain disabled by default. No endpoint activates a capability or submits provider evidence. Consent can be recorded independently, but `connectionAvailable` and Business `bookingAvailable` remain false while a platform is disabled. No social platform, analytics provider, phone, Entra tenant, Azure resource, Stripe endpoint, payment method, message, or real account/data was contacted.

## Mobile binding and visible proof

The shared generated client now drives explicit `local-preview` and `api` Reach adapters. API mode requires an authenticated session token and never silently falls back. Local preview makes no API/provider call and refuses persisted consent mutations. The Creator Reach and Business Budget views read the same typed response structures while preserving the Warm Sand, Midnight Navy, Orlando Lagoon, and Sunset Tangerine visual system.

An in-app browser at `402 × 874` visibly verified:

- Creator Community protection, separate platform cards, illustrative tier-only disclosure, optional consent preview, and disabled-provider footer.
- Business `10 Community` at `$575` Total Due.
- Business `8 Community + 2 Reach` at `$400` Community rewards plus `$200` Reach rewards, `$600` Creator Reward Pool, `$90` fee, and `$690` Total Due.
- The 80% Community statement, pending-provider-approval copy, responsive cards, stable accessible controls, and no horizontal overflow.

Prior retained screenshots remain under [`../M02/screenshots/web/`](../M02/screenshots/web/).

## Verification

- Focused mobile: 35 tests passed.
- Authenticated API: 14 tests passed against real PostgreSQL.
- Complete integration gate: 88 database tests plus 14 API tests passed.
- Complete `pnpm verify`: formatting, prerequisite policy, lint, strict types, unit tests, deterministic OpenAPI/client contract checks, production local-token exclusion, and all nine workspace builds passed.
- Production/local OpenAPI snapshots and `packages/api-client/src/generated/schema.ts` were regenerated and intentionally reviewed.
- The high-confidence security scan passed 384 text files, and Gitleaks found no leak in approximately 12.52 MB.

JUnit evidence: [`test-results/authenticated-reach-api-junit.xml`](./test-results/authenticated-reach-api-junit.xml).

## Deliberate later work

This checkpoint does not select or enable a live analytics provider, perform OAuth, submit verification evidence, expose a Business reservation qualification route, implement Entra sign-in, save a real session token in the mobile app, fund a campaign, or deploy cloud infrastructure. Those actions remain behind their provider, identity, payment, legal/privacy, and infrastructure gates. Community launch remains independent of all Reach integrations.
