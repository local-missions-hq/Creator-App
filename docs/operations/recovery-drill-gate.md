# Recovery drill gate

This gate defines the evidence required before Local Missions may claim that PostgreSQL, Blob, or Container Apps recovery works. The current checkpoint is a static contract with synthetic fixtures only. It does not authorize or prove an Azure restore, revision rollback, provider query, or recovery-time guarantee.

## Draft planning windows

These targets are internal planning values, not Azure service-level agreements. They must be reviewed against the approved architecture, live service configuration, current provider documentation, measured drills, privacy requirements, and business impact before production activation.

| Recovery path                            |  Draft RPO |  Draft RTO | Escalation timeout | Local contract                                                               |
| ---------------------------------------- | ---------: | ---------: | -----------------: | ---------------------------------------------------------------------------- |
| PostgreSQL point-in-time restore         | 15 minutes | 60 minutes |         75 minutes | Seven-day backup retention, PITR required, restore into an isolated target   |
| Blob version or soft-delete recovery     | 15 minutes | 30 minutes |         45 minutes | Versioning required, private containers, seven-to-fourteen-day soft delete   |
| Container Apps previous-revision restore |  0 minutes | 15 minutes |         20 minutes | Immutable image digest, single revision mode, at least one inactive revision |

An RPO measures how old the selected recovery point may be. An RTO measures how long verified service recovery may take. A timeout is not success: it opens an attached incident and leaves the drill escalated.

## Required boundary

- Use synthetic data until a separately approved staging drill exists. Never copy customer or production data into a local or disposable recovery fixture.
- Restore PostgreSQL into an isolated target. Do not overwrite, mutate, or manually alter the source database or its migration tracker.
- Keep ordinary traffic drained until the recovered target, application revision, migration manifest, privacy exclusions, and reconciliation checks all pass.
- Select Blob versions only for data still inside its authorized retention window. Expired or deleted raw locality evidence, Reach evidence, customer phone data, derivatives, and backup remnants must not return to active use.
- Restore only an immutable, reviewed Container Apps image digest. The previous application revision must remain compatible with the current forward-only schema; schema rollback is prohibited.
- Treat every actor, resource, backup, version, revision, log, and incident reference in the checked fixtures as synthetic evidence, not an Azure identifier.

## Reconciliation evidence

Every drill records canonical before/after SHA-256 summaries for all seven categories:

1. migration manifest;
2. row counts and totals;
3. public IDs;
4. status histories;
5. audit records;
6. privacy exclusions; and
7. application readiness.

A check may report `match` only when its before and after digests match. Any mismatch keeps traffic drained, prevents a complete outcome, and requires an attached incident. PostgreSQL evidence is also bound to the current 20-entry forward-only migration manifest and the migration recovery runbook.

## Complete versus escalated

A synthetic drill may report `complete` only when the selected recovery point is inside the RPO, execution is inside the RTO and timeout, recovery succeeds, all reconciliation checks match, privacy exclusions match, and no incident is open.

A timeout, failed recovery, reconciliation difference, unavailable prior revision, missing evidence, retention conflict, or ambiguous source/target state must report `escalated`. The incident remains `open_attached` with a reason, owner, timestamps, next review, and synthetic evidence references. An escalated drill cannot claim recovery is complete.

## Local verification

Run the static validator with the pinned repository runtime:

```sh
pnpm recovery-drill:check
```

The validator reads local JSON and reviewed repository files, calculates canonical SHA-256 digests, and runs mutation/refusal cases in memory. It does not spawn Terraform, Azure CLI, a provider, a database, a container, or a network request.

## Deferred live gate

The future M5 gate still requires separate authorization, approved identities and environment, current cost and service review, subscription-backed saved plans, synthetic Azure targets, measured recovery execution, reconciliation, same-day workload destruction, and independent teardown proof. Until that future gate passes, Local Missions must not claim a tested Azure restore, live rollback, measured production RTO/RPO, or completed M5.
