# PostgreSQL migration and roll-forward recovery

This runbook governs Local Missions schema changes. Migrations are append-only and forward-only. Never edit an applied migration, delete its journal entry, manually mark it complete, or roll the production schema backward.

## Preconditions

Before any staging or production migration:

1. Confirm the application revision is compatible with both the current N-1 schema and the target schema during the deployment window.
2. Confirm only one deployment writer can run migrations. Stop or block every competing release job.
3. Verify the reviewed artifact before connecting to the database:

   ```sh
   pnpm --filter @local-missions/db contracts:check
   pnpm --filter @local-missions/db exec drizzle-kit check
   ```

4. Review the SQL and `packages/db/drizzle/migration-manifest.json`. The manifest must contain contiguous journal entries and matching SHA-256 hashes for every SQL file and snapshot. The verifier refuses unreviewed `DROP TABLE`, `DROP DATABASE`, `DROP SCHEMA`, `TRUNCATE`, or `DELETE FROM` statements.
5. Confirm a recent restorable backup and point-in-time recovery are available and tested for the target environment. Record the restore point, deployment revision, operator, and change ticket. This is mandatory before future staging or production execution.
6. Drain readiness for the migration writer if the change cannot safely coexist with ordinary traffic. Liveness may remain available; readiness must not claim that the service is ready while a required migration is incomplete.

The current development workflow uses only loopback PostgreSQL and synthetic data. It does not authorize an Azure, staging, or production migration.

## Local proof

Start the local dependencies, then run the same gates used by CI:

```sh
pnpm local:up
pnpm --filter @local-missions/db test:integration
pnpm db:migrate
pnpm db:seed
pnpm db:seed
pnpm db:check
```

The recovery suite creates isolated temporary databases. It proves an empty install, an N-1 upgrade with retained synthetic identity/campaign/history data, transaction rollback after an injected failure, and successful application of the corrected forward migration.

## Deployment sequence

1. Capture the current application revision, schema migration count, latest tracked hash, database health, and reconciliation baselines for affected rows.
2. Take or verify the required recovery point.
3. Put the migration-capable service or deployment job into single-writer mode.
4. Apply the reviewed migrations once with `pnpm db:migrate` from the exact release artifact.
5. Do not retry blindly after a failure. First inspect PostgreSQL transaction state and the `drizzle.__drizzle_migrations` tracker.
6. Run the post-deployment checks below.
7. Restore normal readiness only after migration, application, and row-reconciliation checks pass.

## Post-deployment checks

- The tracked migration count, timestamps, and hashes match the reviewed manifest.
- `contracts:check`, `drizzle-kit check`, and the environment-safe database check pass.
- `/health/live` remains healthy and `/health/ready` becomes healthy only after PostgreSQL is reachable at the expected schema.
- The current and N-1 application revisions can read the rows required during the rollout window, when backward compatibility was part of the reviewed plan.
- Pre-migration counts, totals, public IDs, status histories, audit records, and affected backfill counts reconcile. Investigate any unexplained difference before reopening traffic.
- Re-running the migration command is a no-op; an idempotent backfill creates no duplicate logical history.

## Failure decision tree

### Failure occurred inside the migration transaction and no tracker row was committed

PostgreSQL should have rolled back the migration statements. Keep readiness drained, preserve logs and correlation details, and verify both the schema and tracker are still at N-1. Correct the defect in a new append-only migration or corrected not-yet-applied release artifact, rerun the local recovery proof, review new hashes, and migrate forward.

### SQL appears applied but the tracker row is absent

Do not insert a tracker row manually and do not rerun until the state is understood. Keep traffic drained. Compare actual objects and data with the reviewed SQL and transaction logs. If the transaction was not atomic or state is ambiguous, escalate to database and incident owners and restore into an isolated database to prove the recovery path. Resolve production only with an approved forward repair or recovery-point restore.

### Tracker row is committed but application readiness fails

Do not reverse the schema. Check configuration, query compatibility, permissions, and application logs. If the previous application revision is explicitly compatible with the new schema, roll the application revision back while leaving the schema forward. Otherwise deploy an approved forward-compatible application or forward repair migration.

### Data reconciliation fails

Keep traffic drained and stop all writers that could widen the difference. Preserve evidence, compare the recovery point with the migrated database, and prepare an idempotent forward repair. Use point-in-time restore only through the incident/change process; never improvise destructive SQL.

## Prohibited shortcuts

- No destructive down migrations.
- No edits to SQL, snapshots, journal timestamps, or hashes after an entry has run in a shared environment.
- No manual mutation of `drizzle.__drizzle_migrations` to make a release appear successful.
- No concurrent migration writers.
- No staging or production run without a verified recovery point and recorded reconciliation plan.
- No real customer data in local recovery fixtures.
