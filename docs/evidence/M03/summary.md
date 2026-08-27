# M03 database and state-machine evidence

Status: First campaign-lifecycle slice passed; M3 overall remains in progress  
Date: 2026-08-27  
Checkpoint: `M03-campaign-lifecycle-001`, implementation commit `87ba940`
Environment: Node 24.19.0, pnpm 11.24.0, PostgreSQL 17 Alpine on loopback Docker

## Implemented in this checkpoint

- Added the first append-only Drizzle migration for `businesses`, `campaigns`, `campaign_status_history`, `audit_events`, and `idempotency_records`.
- Stores the Creator Reward Pool, platform fee, and Total Due as integer minor units. PostgreSQL rejects negative amounts and any Total Due that does not equal reward pool plus fee.
- Enforces the V1 1–20 slot campaign ceiling, ISO-style currency codes, unique public IDs, UTC timestamps, and positive optimistic-concurrency versions.
- Implements `draft → submitted → approved → funded → published`, bounded cancellation paths, stable conflict codes, row locking, optimistic concurrency, and idempotent create/transition operations.
- Writes campaign state history and immutable audit events in the same transaction as each successful state change. Failed constraints, illegal transitions, stale versions, and reused idempotency keys roll back without partial history or audit rows.
- Adds local-only `db:generate`, `db:migrate`, `db:seed`, and `db:check` commands. The seed is synthetic and repeatable.

## Verification

- The migration applied to a newly created real PostgreSQL database and all five expected tables were present.
- Four real-PostgreSQL integration tests passed: empty migration and constraints, idempotent replay/key-reuse rejection, full positive publish path plus illegal-transition rollback, and a two-writer concurrency race with exactly one winner.
- The migration also applied to the normal local database. Running the synthetic seed twice returned the same campaign at version 1, and `db:check` verified all five tables and the `$500.00 + $75.00 = $575.00` campaign.
- JUnit evidence: [`test-results/campaign-store-junit.xml`](./test-results/campaign-store-junit.xml).
- Migration: [`../../../packages/db/drizzle/0000_giant_snowbird.sql`](../../../packages/db/drizzle/0000_giant_snowbird.sql).

## Privacy and safety

- Tests and seed data use synthetic Orlando names and fixed non-customer identifiers.
- Database scripts reject any target except the loopback `local_missions` database.
- No Azure resource, identity provider, Stripe object, payment, location event, message, or external record was created.
- The generated test report hostname was replaced with a non-identifying local-development label before retention.

## Known limitations and M3 gate

This is one complete transactional slice, not the full M3 schema or API. User/identity, creator, business membership/location, mission slot/application, check-in, submission/media, dispute, payment-ledger, Local Pass, consent/rights, notification/outbox, and remaining audit records are not implemented yet. The `/v1` API, OpenAPI/client generation, prior-schema upgrade test, full capacity/overbooking matrix, and complete state-transition tables remain open.

The M3 milestone gate has not passed. No broad M3 checklist item is marked complete by this checkpoint; `plans.md` records this smaller completed slice separately.
