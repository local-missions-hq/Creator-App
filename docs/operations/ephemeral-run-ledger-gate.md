# Ephemeral run-ledger gate

Status: activation-valid V2 lifecycle contract; no cloud run or teardown claim

The active machine contract is [`../../config/ephemeral-run-ledger.v2.json`](../../config/ephemeral-run-ledger.v2.json). Its success path explicitly orders retained-state verification, retained-control verification, core plan/apply, three immutable images, activation plan/apply, eleven critical tests, destroy plan/apply, and independent clean reconciliation. It does not authenticate, initialize remote state, consume a real plan, apply, test a cloud endpoint, publish an image, destroy, or query Azure.

The historical V1 state machine and its three synthetic terminal fixtures remain checked as regression evidence. They are not activation evidence. `pnpm run-ledger:check` now requires both the historical V1 checks and the V2 activation-valid lifecycle contract.

## Historical V1 terminal examples

| Fixture             | Decision path                                                                                                        | Truthful terminal report                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `continue-complete` | Approved saved plan → apply succeeds → all eleven gates pass → continue → destroy → independent reconciliation       | Disposable workload empty; retained control plane expected   |
| `rollback-complete` | Approved saved plan → apply succeeds → critical test fails → application revision rollback succeeds → destroy        | Complete only after independent state/live reconciliation    |
| `orphan-escalated`  | Approved saved plan → tests pass → destroy exceeds its timeout → incident opens → independent query finds one orphan | Escalated and attached; it is explicitly not called complete |

All actors, identities, references, commits, timestamps, resources, and outcomes are synthetic. The fixtures are state-machine proof, not execution evidence.

## Active V2 success contract

The V2 success path contains twelve ordered states. It cannot report complete unless the core count is 27, all three image identities are bound to immutable digests, activated count is 30, tests pass, destroy removes exactly 30 disposable resources and no retained resource, state/live reconciliation are independently performed, both counts are zero, and no orphan or incident remains. Forty-three combined V2 refusal mutations exercise false claims, ordering, binding, count, image, test, destroy, reconciliation, expiry, secret-shape, and retained-boundary failures.

## Historical V1 state and transition contract

The ledger contains 23 explicit states and 29 allowed transitions. It begins at `plan_approved` and can finish only at `complete` or `escalated`. Every event has a contiguous sequence, exact previous/next state, monotonic New York timestamp, synthetic actor, evidence reference, and reason code. Unknown states, skipped links, illegal transitions, events after the run end, and events after a terminal state are refused.

The ordinary path is:

```text
plan approved → apply → tests → continue or rollback → reviewed destroy plan
→ destroy → independent reconciliation → complete or escalated
```

A test failure is not silently ignored. It must enter rollback; a failed rollback opens an incident. Apply failure, rollback failure, destroy failure/timeout, orphan detection, or inventory mismatch cannot reach `complete`. They require an attached open incident and an explicit escalation path.

## Required evidence

Each ledger is a closed schema with a canonical SHA-256 digest and includes:

- exact binding to the checked synthetic apply and destroy plan artifact/review digests;
- full commit SHA, disposable Terraform root, exact workload resource-group pattern, cleanup controller, lock status, start/warning/expiry/end, and zero/one extension count;
- apply, test, decision, optional rollback, destroy, and independent reconciliation evidence;
- all eleven required gates: smoke, integration, E2E, authorization, upload, queue, webhook, backup/restore, reconciliation, dashboard, and environment isolation;
- planned timeout ceilings of 30 minutes for apply, 120 for tests, 20 for rollback, 60 for destroy, and 15 for reconciliation;
- separate Terraform-state and live-resource query references; and
- a final report that never collapses retained and disposable inventories into one ambiguous “subscription empty” claim.

These timeout values are local safety contracts pending operational review; they are not measurements from Azure.

## Inventory separation

The disposable-before inventory is tied to the reviewed 28-resource Terraform mock contract. A clean result requires both the Terraform-state count and independently queried live-resource count to be zero, with no orphan references.

The retained inventory is reported separately and must exactly contain:

- Terraform state backend and lock;
- GitHub-Azure OIDC identities;
- Entra application registrations;
- stable verification DNS; and
- subscription budgets, alerts, and policy.

Missing retained classes, unexpected retained objects, a nonzero disposable state/live count, or any orphan makes the final inventory unclean. Terraform output alone can never prove teardown.

## Failure and incident boundary

An apply/rollback/destroy failure, destroy timeout, orphan, or inventory mismatch requires `incident_opened`, a synthetic owner, attached evidence, and a next review no later than run expiry. The ledger may end `escalated` while cleanup continues, but cannot end `complete`. This preserves the rule that a cleanup failure stays attached until independent reconciliation proves resolution.

`pnpm run-ledger:check` currently proves three terminal ledgers and fifty-nine refusal scenarios spanning schema/digest drift, state transitions, sequence/time bounds, plan binding, timeouts, test and rollback decisions, disposable/retained inventory, independent queries, incident attachment, orphan handling, false completion, and secret-shaped evidence.

## Future live gate

A later explicitly approved checkpoint must replace synthetic references with sanitized evidence from one real ephemeral run while preserving this contract. It must separately authorize the saved plan, apply, tests, rollback decision, reviewed destroy plan, destroy, and independent state/live reconciliation. A live timeout or orphan remains an active incident; it cannot be converted into a successful report to finish the milestone.

No step in this checkpoint performed any cloud operation.
