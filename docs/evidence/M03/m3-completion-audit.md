# M3 completion audit

Status: Passed locally on 2026-08-27

Checkpoint: `M03-completion-audit-019`

Environment: Node 24.19.0, pnpm 11.24.0, PostgreSQL 17 Alpine on loopback Docker

## Result

The complete M3 database, API-contract, and domain-state-machine gate passes. The retained machine-readable reports contain 92 real-PostgreSQL database tests and 14 real-PostgreSQL API tests with zero failures or errors. The workspace gate also passes with 35 mobile unit tests, all nine builds, deterministic OpenAPI/client reconstruction, and an 18-migration manifest.

This audit closed two concrete omissions found during the final checklist review:

- Added privacy-safe venue contacts as references to an active Business membership and location, with no copied phone, email, address, or postal fields. Creation and revocation have immutable history/audit records, optimistic versions, tenant enforcement, primary-contact uniqueness, and race tests.
- Added an explicit Local Pass attribution-confidence enum. `link_open` is `observed_link_open`, `pass_claimed` is `verified_claim`, and `verified_pass_redemption` is `verified_redemption`; PostgreSQL enforces the exact pairing and retained evidence is immutable.

The final migration also adds a subject/type/time audit-timeline index. It safely backfills confidence for existing Local Pass evidence before making the field required.

## Schema acceptance map

| M3 requirement                                                              | Evidence                                                                                                                     |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Users, external identities, participant eligibility, payout onboarding      | `users`, `external_identities`, `creator_profiles`; tenant and locality suites                                               |
| Businesses, memberships, locations, venue contacts                          | `businesses`, `business_memberships`, `business_locations`, `venue_contacts`, immutable contact history; venue-contact suite |
| Campaigns, templates, briefs, slots, capacity                               | Campaign and mission-application suites; deterministic four-template/ten-slot seed                                           |
| Applications, reservations, accepted assignments, check-ins                 | Mission-application and check-in suites                                                                                      |
| Submissions, deliverables, media metadata, reviews, corrections             | Submission suite                                                                                                             |
| Disputes, evidence, independent resolutions                                 | Dispute suite                                                                                                                |
| Provider references and balanced immutable ledger                           | Ledger suite                                                                                                                 |
| Local Pass links, claims, challenges, redemptions, confidence               | Local Pass suite and migration `0017_charming_marrow.sql`                                                                    |
| Consent, legal terms, rights, renewals, notifications, audit                | Reach, rights, notification, and audit suites                                                                                |
| UTC timestamps, stable public IDs, constraints, indexes                     | 89-table schema check, all 18 migrations, schema unit contract, migration-recovery suite                                     |
| Integer-minor-unit currency and no hard deletion of financial/audit history | Campaign/ledger constraints and append-only triggers                                                                         |
| Deterministic synthetic data with no real personal data                     | Repeated seed plus `db:check`                                                                                                |

## Transition and failure-mode map

| Domain                     | Positive and negative behavior                                        | Concurrency, retry, or duplicate protection                           | Same-transaction/immutable proof                                                                 |
| -------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Campaign                   | Legal publish path; illegal transitions rejected                      | Idempotent retries, changed-key rejection, optimistic one-winner race | Status history and audit roll back with failed mutation                                          |
| Identity and tenant        | Provider binding, locality, role/workspace access                     | One provider-subject winner; unique bindings                          | Identity/business audit writes share the transaction                                             |
| Venue contact              | Same-business create/revoke; cross-tenant/scope denial                | One primary winner; stale revoke rejected by version                  | Create/revoke history and audit counts remain exact; rows/history cannot be deleted or rewritten |
| Application and capacity   | Qualification, acceptance, withdrawal/replacement                     | Duplicate-creator and limited-capacity races never overbook           | Reservation, slot, status history, notification fan-out, and audit remain atomic                 |
| Assignment and check-in    | Exact creator/venue/window/staff rules                                | Rotating challenge and one replay winner                              | Event and assignment history commit together; token material is hash-only                        |
| Submission and review      | Objective complete/correction/approval/auto-approval paths            | Duplicate completion and auto-approval one-winner races               | Failed uploads/reviews leave no partial submission, history, or decision                         |
| Dispute and resolution     | Timely objective disputes and all-or-nothing outcomes                 | Duplicate dispute and approval/resolution races                       | Resolution, history, audit, and financial intent are one transaction                             |
| Funding and ledger         | Provider-authoritative funding, creator payable, refund payable       | Provider-event replay and competing-evidence winner                   | Balanced journals, allocations, references, and ledger entries are append-only                   |
| Local Pass                 | Claim, recovery, refusal, substitute, redemption, expiry              | Customer/inventory/redemption/OTP replay protection                   | Offer, claim, redemption, confidence evidence, and histories are immutable                       |
| Content rights and renewal | Consent, fixed license, expiry, renewal accept/refuse/funding         | Activation/funding one-winner and exact replay                        | Rights never activate before approval/full payable; terms/history are immutable                  |
| Notification outbox        | Preference, delivery lifecycle, retry, dead letter, admin replay      | Event dedupe and one worker lease winner                              | Domain event, outbox, inbox, history, and audit can commit with mission acceptance               |
| Locality proof             | Review, correction, appeal, expiry, address change, deletion          | One deletion worker, bounded retries, duplicate-safe expiry           | Private references/status/history/alerts obey retention and immutability rules                   |
| Reach qualification        | Consent, exact-platform tier, outage grace, appeal, evidence deletion | Exact-tier reservation and deletion protections                       | Community matching remains independent; only derived tier data is exposed                        |

Retryable HTTP writes currently exposed in M3 require an idempotency key. Provider-driven financial stores also use unique provider-event references and immutable evidence. Transitions that are not retry-key operations use row locks, optimistic versions, unique constraints, one-time token hashes, or fixed deduplication keys as appropriate.

## API and retained evidence

- `/v1` errors, bounded pagination, request/correlation IDs, allowlisted logs, health/readiness/build endpoints, local-only dev-token boundary, authenticated Creator/Business reads/writes, and Reach contracts passed 14 API integration tests.
- Production and local OpenAPI snapshots match source, and the generated shared client matches both reviewed contracts.
- Database JUnit: [`test-results/m3-complete-db-junit.xml`](./test-results/m3-complete-db-junit.xml)
- API JUnit: [`test-results/m3-complete-api-junit.xml`](./test-results/m3-complete-api-junit.xml)
- Consolidated command log: [`commands.txt`](./commands.txt)

## Deliberate later-milestone boundaries

M3 proves local transactional behavior and provider-safe interfaces; it does not claim external execution. Real Entra authentication is M4, Azure deployment/networking is M5 and later infrastructure work, media/cloud processing is M10, Stripe charging/transfers/refunds/reconciliation are M12, customer-facing Local Pass delivery is M13, provider push/email is M14, and physical-iPhone gates remain M16. Social-provider capabilities remain disabled until their later policy, security, privacy, reliability, and feasibility approvals.
