# M03 database and state-machine evidence

Status: Campaign lifecycle, shared identity/tenant, mission contract/capacity, accepted-mission/check-in, submission/review, dispute/resolution, immutable-ledger, Local Pass, content-rights, notification/outbox, and API/OpenAPI/client-foundation slices passed; M3 overall remains in progress
Date: 2026-08-27  
Checkpoint: `M03-campaign-lifecycle-001`, implementation commit `87ba940`
Shared identity checkpoint: `M03-shared-identity-tenant-002`, implementation commit `8ef7b08`
Mission capacity checkpoint: `M03-mission-contract-capacity-003`
Check-in checkpoint: `M03-check-in-state-machine-004`
Submission checkpoint: `M03-submission-review-005`
Dispute checkpoint: `M03-dispute-resolution-006`
Ledger checkpoint: `M03-immutable-ledger-007`
Local Pass checkpoint: `M03-local-pass-008`
Content rights checkpoint: `M03-content-rights-009`
Notification outbox checkpoint: `M03-notification-outbox-010`
API foundation checkpoint: `M03-api-foundation-011`
Environment: Node 24.19.0, pnpm 11.24.0, PostgreSQL 17 Alpine on loopback Docker

## Implemented in this checkpoint

- Added the first append-only Drizzle migration for `businesses`, `campaigns`, `campaign_status_history`, `audit_events`, and `idempotency_records`.
- Stores the Creator Reward Pool, platform fee, and Total Due as integer minor units. PostgreSQL rejects negative amounts and any Total Due that does not equal reward pool plus fee.
- Enforces the V1 1–20 slot campaign ceiling, ISO-style currency codes, unique public IDs, UTC timestamps, and positive optimistic-concurrency versions.
- Implements `draft → submitted → approved`, provider-authoritative `approved → funded`, and `funded → published`, plus bounded cancellation paths, stable conflict codes, row locking, optimistic concurrency, and idempotent operations. A Business user cannot self-declare funding.
- Writes campaign state history and immutable audit events in the same transaction as each successful state change. Failed constraints, illegal transitions, stale versions, and reused idempotency keys roll back without partial history or audit rows.
- Adds local-only `db:generate`, `db:migrate`, `db:seed`, and `db:check` commands. The seed is synthetic and repeatable.

## Shared identity and tenant checkpoint

- Added `users`, `external_identities`, `creator_profiles`, `business_memberships`, and `business_locations` through append-only migration `0001_empty_tyrannus.sql`.
- One root user can hold Creator and Business roles. Provider bindings use provider plus issuer/subject uniqueness and deliberately contain no email field, so matching or private-relay email addresses cannot merge accounts.
- Supports only Apple, Google, Microsoft, and passwordless email provider types. A second identity on the same account must use another provider.
- Stores creator locality status, a private verified postal area, annual verification dates, and payout-onboarding status. No creator street address, coordinates, identity email, bank field, or raw proof is present in these tables.
- Creates each business with an active owner membership. Business location and campaign reads require an active owner/manager membership in that exact business workspace.
- Adds stable `403`/`409` identity and tenant conflict codes and writes successful identity, creator, membership, business, and location mutations to the same audit transaction.

## Verification

- The migration applied to a newly created real PostgreSQL database and all five expected tables were present.
- Four real-PostgreSQL integration tests passed: empty migration and constraints, idempotent replay/key-reuse rejection, full positive publish path plus illegal-transition rollback, and a two-writer concurrency race with exactly one winner.
- Five additional real-PostgreSQL tests passed: forward upgrade preservation, one-winner provider binding, one-provider-per-user linking, private locality constraints, and cross-business location/campaign isolation.
- The forward migration preserved a pre-existing `$575.00` campaign and business without data loss. The migration also applied to the normal local database.
- Running the upgraded synthetic seed twice retained the same campaign at version 1. `db:check` verified all ten tables plus the synthetic shared identity, creator profile, owner membership, Orlando location, and `$500.00 + $75.00 = $575.00` campaign.
- JUnit evidence: [`test-results/campaign-store-junit.xml`](./test-results/campaign-store-junit.xml).
- Identity/tenant JUnit evidence: [`test-results/tenant-store-junit.xml`](./test-results/tenant-store-junit.xml).
- Six mission-contract/capacity tests passed against real PostgreSQL: forward preservation and no-follower schema, 80% Community rollback, same-creator duplicate race, six-creators-for-three-slots capacity race, withdrawal/replacement behavior, and cross-business acceptance denial.
- The latest deterministic seed contains all four templates, one versioned brief, and ten Community Slots totaling the `$500.00` Creator Reward Pool. Repeating the seed does not duplicate any contract row; `db:check` verifies all 16 tables.
- Mission/capacity JUnit evidence: [`test-results/mission-application-store-junit.xml`](./test-results/mission-application-store-junit.xml).
- Eight accepted-mission/check-in tests passed against real PostgreSQL: forward preservation and privacy schema inspection, schedule/tenant constraints, scoped Venue Staff fallback, challenge rotation, successful QR transaction, cross-creator/wrong-venue/expiry rejection, concurrent replay, and server-window enforcement.
- Check-in challenges retain only a token hash; check-in evidence retains an accuracy class and derived statement, with no raw-coordinate field. The latest schema and deterministic seed check now cover 21 tables.
- Check-in JUnit evidence: [`test-results/check-in-store-junit.xml`](./test-results/check-in-store-junit.xml).
- Seven deliverable-submission/review tests passed against real PostgreSQL: checked-in-assignment upgrade/backfill and privacy schema inspection, objective-contract enforcement, pre-check-in rollback, missing/quarantined/invalid media rollback, duplicate-completion concurrency, tenant review plus one bounded correction, and server-time auto-approval concurrency.
- The latest deterministic seed contains two locked Visit & Create requirements—five photos and two 5–15-second vertical clips. Repeating the seed does not duplicate them; `db:check` verifies all 29 tables.
- Submission/review JUnit evidence: [`test-results/submission-store-junit.xml`](./test-results/submission-store-junit.xml).
- The combined M3 suite now passes 65 real-PostgreSQL tests. `pnpm verify` passes all workspace gates, the security scan passes 300 text files, Gitleaks finds no leak in approximately 9.26 MB, `db:check` verifies 63 tables, and `drizzle-kit check` reports a consistent twelve-migration journal.
- Eight dispute/resolution tests passed against real PostgreSQL: approved-submission preservation plus full-payable-intent backfill and privacy/economic schema inspection, cross-business and subjective-reason rollback, creator correction dispute, server-time expiry, cross-mission evidence rejection plus duplicate race, approval/dispute race, independent full-reward resolution, and one-winner no-payout resolution.
- Resolution is all-or-nothing: the database records only a pending full creator-payable intent or pending full slot-refund intent. No dispute table or financial intent contains a manually editable amount, and no payment provider is contacted.
- Dispute/resolution JUnit evidence: [`test-results/dispute-store-junit.xml`](./test-results/dispute-store-junit.xml).
- Nine immutable-ledger/provider-reference tests passed against real PostgreSQL: prior-intent upgrade preservation and schema inspection, authoritative funding with business self-funding denial, deterministic 15% fee allocation, funding idempotency and one-winner races, full creator-payable posting, full refund-payable posting, full Reach-bonus refund posting, unfunded/state-mismatch rollback, and Finance Operator separation plus database immutability/balance enforcement.
- The canonical campaign reconciles `10 × $50 = $500` Creator Reward Pool, `$75` platform fee, and `$575` Total Due. A no-payout `$125` slot posts one full `$143.75` refund obligation, including its `$18.75` fee allocation and no processing deduction. Provider records hold immutable synthetic IDs but no copied mutable status or sensitive payment details; no Stripe API was called.
- Ledger/provider-reference JUnit evidence: [`test-results/ledger-store-junit.xml`](./test-results/ledger-store-junit.xml).
- Five Local Pass tests passed against real PostgreSQL: forward migration/privacy/immutability, first-valid creator attribution under a duplicate-customer race, final-inventory one-winner behavior plus future-claim pause, rotating-token/wrong-venue/authorization/replay enforcement, and seven-day unredeemed inventory release.
- Opaque creator links and rotating claim tokens retain only hashes. The customer boundary retains only a versioned HMAC-style synthetic deduplication token; no phone, email, IP, device identifier, or raw token exists in the Local Pass schema. Evidence is limited to `link_open`, `pass_claimed`, and `verified_pass_redemption` and never changes mission, reward, reliability, Reach, or financial state.
- Local Pass JUnit evidence: [`test-results/local-pass-store-junit.xml`](./test-results/local-pass-store-junit.xml).
- Six content-rights tests passed against real PostgreSQL: forward migration and immutable hash-only legal documents, fixed add-on economics and exact-Creator consent, no-rights failure states, concurrent idempotent activation with scoped Business reads, no-content rejection, and server-time expiry without renewal.
- The included 90-day organic license is fixed to accepted assets on Business-owned social. Optional 12-month owned-media and 30-day paid-ad licenses add 50% and 100% of the base reward respectively. Community Slots can receive these contract add-ons without becoming Reach Slots or adding a follower gate.
- Rights activation requires final objective approval and the full Creator-payable obligation. Incomplete, unpaid, canceled, and final no-payout/refund-obligation workflows create no license. No provider call, live-money action, external message, ownership transfer, exclusivity, sublicensing, AI training, synthetic media, or face/voice cloning right exists.
- Content-rights JUnit evidence: [`test-results/rights-store-junit.xml`](./test-results/rights-store-junit.xml).
- Seven notification/outbox tests passed against real PostgreSQL: minimized forward migration, same-transaction mission acceptance fan-out and rollback, event deduplication and recipient/tenant isolation, preference opt-out and one-winner worker claims, exponential retry, dead-letter/admin replay, and durable recipient-only inbox acknowledgment.
- Notification records contain versioned template keys and protected aggregate references rather than free-form mission or locked-screen content. Phone, email address, device token, provider payload/response, location, reward, customer data, and media URLs are absent. The local adapter records only `no_send` or `suppressed` and cannot run in a deployed environment.
- Notification/outbox JUnit evidence: [`test-results/notification-store-junit.xml`](./test-results/notification-store-junit.xml).
- Seven API integration tests passed against the real local PostgreSQL database: dependency-independent liveness, database-backed readiness, non-secret build info, stable cursor pagination, standard validation envelopes, request/correlation ID propagation and replacement, allowlisted structured logs, production/local OpenAPI separation, production dev-token absence, synthetic local-token issuance, deployed-environment refusal, and safe dependency failure.
- The deterministic production OpenAPI contains seven implemented paths and excludes `/v1/dev/token`; the local snapshot contains exactly that one additional path. `contracts:check` regenerates both documents and the shared `@local-missions/api-client` in memory and rejects drift. Mobile and dashboard compile against that same production-generated client, which permits only HTTPS or loopback HTTP.
- Every production API build begins with an empty output directory and scans the resulting JavaScript, declarations, and source maps. The build contains no `local-only` directory or dev-token marker. A live compiled-process smoke passed `/health/live`, `/health/ready`, `/build-info`, `/v1`, paginated `/v1/mission-templates`, and `/openapi.json` on loopback port 4000; the production process returned 404 for `/v1/dev/token`.
- The combined checkpoint now passes 65 real-PostgreSQL domain tests plus seven API integration tests. `pnpm verify` passes all nine-package workspace gates, the security scan passes 332 text files, Gitleaks finds no leak in approximately 9.40 MB, `db:check` verifies 63 tables, and `drizzle-kit check` reports a consistent twelve-migration journal.
- API JUnit evidence: [`test-results/api-foundation-junit.xml`](./test-results/api-foundation-junit.xml).
- API review and generated contracts: [`api/contract-review.md`](./api/contract-review.md), [`api/openapi.json`](./api/openapi.json), and [`api/openapi.local.json`](./api/openapi.local.json).
- Migration: [`../../../packages/db/drizzle/0000_giant_snowbird.sql`](../../../packages/db/drizzle/0000_giant_snowbird.sql).
- Forward migration: [`../../../packages/db/drizzle/0001_empty_tyrannus.sql`](../../../packages/db/drizzle/0001_empty_tyrannus.sql).
- Mission/capacity migration: [`../../../packages/db/drizzle/0002_material_rachel_grey.sql`](../../../packages/db/drizzle/0002_material_rachel_grey.sql).
- Accepted-mission/check-in migration: [`../../../packages/db/drizzle/0003_orange_tempest.sql`](../../../packages/db/drizzle/0003_orange_tempest.sql).
- Deliverable-submission/review migration: [`../../../packages/db/drizzle/0004_handy_gideon.sql`](../../../packages/db/drizzle/0004_handy_gideon.sql).
- Dispute/resolution migration: [`../../../packages/db/drizzle/0005_huge_agent_brand.sql`](../../../packages/db/drizzle/0005_huge_agent_brand.sql).
- Immutable-ledger/provider-reference migration: [`../../../packages/db/drizzle/0006_dapper_mordo.sql`](../../../packages/db/drizzle/0006_dapper_mordo.sql).
- Local Pass migration: [`../../../packages/db/drizzle/0007_thick_sharon_ventura.sql`](../../../packages/db/drizzle/0007_thick_sharon_ventura.sql).
- Content-rights migration: [`../../../packages/db/drizzle/0008_fair_sheva_callister.sql`](../../../packages/db/drizzle/0008_fair_sheva_callister.sql).
- Slot bonus-component migration: [`../../../packages/db/drizzle/0009_nifty_scorpion.sql`](../../../packages/db/drizzle/0009_nifty_scorpion.sql).
- Notification catalog/outbox migration: [`../../../packages/db/drizzle/0010_wide_lady_ursula.sql`](../../../packages/db/drizzle/0010_wide_lady_ursula.sql).
- Notification history/state-machine migration: [`../../../packages/db/drizzle/0011_perpetual_ender_wiggin.sql`](../../../packages/db/drizzle/0011_perpetual_ender_wiggin.sql).

## Privacy and safety

- Tests and seed data use synthetic Orlando names and fixed non-customer identifiers.
- Database scripts reject any target except the loopback `local_missions` database.
- No Azure resource, identity provider, Stripe object, payment, location event, message, or external record was created.
- The generated test report hostname was replaced with a non-identifying local-development label before retention.

## Known limitations and M3 gate

These are eleven complete local foundation slices, not the full M3 milestone. Local Pass OTP/recovery/refusal/reporting edges, rights renewal operations, external notification providers/device registration/scheduling, raw-proof retention jobs, Reach analytics qualification, authenticated domain HTTP resources, and remaining audit records are not implemented yet. Stripe execution, webhook processing, transfers, refunds, payouts, chargebacks, reserve controls, and provider reconciliation remain M12 work; the ledger checkpoint records internal obligations only. Cloud upload intents and media workers remain later M10 work. A latest-schema empty-database/recovery proof and complete state-transition tables remain open. Physical camera/location and push-delivery execution remain later device gates rather than part of this local state-machine checkpoint.

The M3 milestone gate has not passed. The API foundation and reviewed OpenAPI/shared-client checklist items are complete; `plans.md` keeps the remaining M3 work open.
