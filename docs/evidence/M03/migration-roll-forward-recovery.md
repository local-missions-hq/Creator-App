# M3 migration manifest and roll-forward recovery

Date: 2026-08-27

Checkpoint: `M03-migration-recovery-012`

## Implemented boundary

- Added a deterministic manifest for all thirteen ordered Drizzle migrations. It records each journal index/timestamp and SHA-256 hashes of its SQL and snapshot.
- Added a contract gate that rejects missing, reordered, renamed, or changed migration artifacts and unreviewed destructive statements.
- Added append-only migration `0012_notification_preference_history_backfill.sql`. It closes the N-1 deployment window between notification preference creation in `0010` and history/trigger creation in `0011` by creating exactly one versioned history row for every existing preference.
- Added a forward-only operational runbook with single-writer, backup/PITR, readiness, reconciliation, and incident requirements. It forbids destructive down migrations and manual tracker repair.

## Real PostgreSQL proof

The dedicated recovery suite passed two tests against isolated PostgreSQL databases:

1. A truly empty database accepted all thirteen migrations through the real Drizzle migrator in one migration transaction. The resulting 63 public tables exactly matched the current schema, and all thirteen tracker hashes matched the committed manifest.
2. An N-1 fixture applied through `0010`, then retained a synthetic root user, Business owner membership, `$500.00 + $75.00 = $575.00` campaign, campaign history, audit event, and disabled notification preference. It then applied `0011`, injected a PostgreSQL failure after executing `0012` but before its tracker insert, and proved the transaction left both data and migration tracking at N-1 with no partial backfill. The real migrator then applied `0012`, preserved every fixture row, backfilled preference version 1 exactly once, and allowed the existing trigger to record version 2 once on update.

The first focused test run exposed a test-fixture timing error: creating the preference after `0011` correctly invoked the new history trigger, so the expected pre-backfill history count was wrong. The fixture was corrected to model the real N-1 window by creating the preference under `0010` before applying `0011`; no production migration was changed or hidden.

## Verification result

- All 67 database integration tests pass against PostgreSQL.
- The retained local database migrated successfully, two seed runs remained deterministic, and `db:check` verified 63 tables.
- `contracts:check` verified thirteen ordered SQL/snapshot hashes and the destructive-statement guard.
- `drizzle-kit check` reports a consistent thirteen-migration journal.
- JUnit evidence: [`test-results/migration-recovery-junit.xml`](./test-results/migration-recovery-junit.xml).
- Runbook: [`../../operations/migration-roll-forward.md`](../../operations/migration-roll-forward.md).
- Manifest: [`../../../packages/db/drizzle/migration-manifest.json`](../../../packages/db/drizzle/migration-manifest.json).
- Backfill: [`../../../packages/db/drizzle/0012_notification_preference_history_backfill.sql`](../../../packages/db/drizzle/0012_notification_preference_history_backfill.sql).

## Safety boundary

All fixtures are visibly synthetic and run only against loopback PostgreSQL temporary databases. No Azure resource, backup, customer database, external provider, live money, real identity, phone, message, or customer data was used. The production backup/PITR and deployment controls in the runbook are future mandatory gates, not evidence that a live environment has been changed.
