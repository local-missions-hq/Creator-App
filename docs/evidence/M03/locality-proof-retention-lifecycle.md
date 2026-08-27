# M3 locality proof and retention lifecycle

Date: 2026-08-27

Checkpoint: `M03-locality-proof-retention-013`

## Implemented boundary

- Added one private locality-verification lifecycle per Creator review, with fixed proof methods, normalized five-digit postal area, a private evidence reference, explicit review/correction/rejection/appeal/verified/expired/invalidated states, immutable status history, and same-transaction audit events.
- Added the dedicated `verification_reviewer` staff role. Approval requires an active reviewer or administrator and the fixed `approved` reason. Correction and rejection accept only their objective reason sets. An appeal must be filed by the Creator within 14 days and decided by a different authorized reviewer.
- Approval writes only the derived postal area and annual verification timestamps to `creator_profiles`. A declared address change immediately clears the derived locality credential and invalidates Community eligibility. Database-time expiry marks the credential expired exactly once.
- Verification or appeal completion creates one deletion job due 30 days later. An appeal decision moves the deadline later rather than shortening it. Leased PostgreSQL worker claims use `FOR UPDATE SKIP LOCKED`, safe retry codes, bounded backoff, immutable attempts, dead letter, and one minimized retention alert.
- A legal hold requires an active administrator, fixed reason, case ID, evidence-only scope, review date, and expiry no later than 90 days. A live hold blocks deletion; an expired hold needs no manual release and the existing due job becomes claimable automatically.
- The local/test-only synthetic deletion adapter clears the private evidence reference and records `deleted` or `no_object`. It cannot activate in a deployed environment and stores no raw document bytes.

## Real PostgreSQL proof

Seven dedicated tests passed:

1. The forward migration preserved a prior derived verified credential, created no raw proof, and backfilled a completed `no_object` retention job.
2. Creator submissions returned no evidence reference, audit details retained no reference, ordinary users could not review, and an approval with a correction reason was rejected.
3. One correction/resubmission succeeded; a rejected renewal preserved the still-current credential during a timely appeal, a different reviewer was required, approval superseded the old credential, and deletion moved to 30 days after appeal closure.
4. Approval produced an annual credential; a declared address change immediately cleared the profile credential and the existing Community application service rejected the Creator.
5. Database-time expiry transitioned the credential and profile exactly once.
6. A bounded active hold blocked deletion, simulated expiry automatically released the due job, and two concurrent workers produced one claim. Completion cleared the reference and immutable attempts rejected mutation.
7. A non-retryable synthetic storage failure retained the evidence, dead-lettered the job, created exactly one minimized alert, and enforced alert immutability.

The migration also updated the shared latest-schema recovery suite. All fourteen manifested migrations apply to an empty database, and an injected final-migration failure rolls back before forward recovery with retained identity, campaign, notification, and locality data.

## Verification result

- All 74 database integration tests pass against PostgreSQL.
- The retained local database migrated successfully, two seed runs remained deterministic, and `db:check` verified 69 tables.
- The migration manifest verifies fourteen ordered SQL/snapshot hashes and the destructive-statement guard.
- `drizzle-kit check` reports a consistent fourteen-migration journal.
- `pnpm verify` passes all nine workspace packages, the high-confidence security scan passes 348 text files, and Gitleaks finds no leak in approximately 10.31 MB.
- JUnit evidence: [`test-results/locality-proof-store-junit.xml`](./test-results/locality-proof-store-junit.xml).
- Migration: [`../../../packages/db/drizzle/0013_brave_maddog.sql`](../../../packages/db/drizzle/0013_brave_maddog.sql).
- Store: [`../../../packages/db/src/locality-proof-store.ts`](../../../packages/db/src/locality-proof-store.ts).

## Privacy and deferred boundaries

The locality tables contain no street/unit address, exact coordinates, raw document bytes, public URL, phone, email, bank, tax, payout, Stripe/KYC, or provider payload. The worker and tests use visibly synthetic private references and loopback PostgreSQL only. Businesses receive no locality-proof access from this store; the later authenticated API must expose only the approved area badge and coarse venue-distance band.

No Azure Blob object, Key Vault key, external verifier, real document, customer database, identity provider, phone, message, or live money was used. Blob version/derivative deletion and backup aging remain later cloud implementation gates; this checkpoint proves the database control plane and synthetic adapter, not cloud erasure.
