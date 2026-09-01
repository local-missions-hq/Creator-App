# Saved-plan evidence gate

Status: activation-valid V2 local contract; no workload plan or cloud execution claimed

The active V2 gate is [`../../config/saved-plan-evidence.v2.json`](../../config/saved-plan-evidence.v2.json). It models five separately approved Terraform operations: retained bootstrap, retained control plane, 27-resource workload core, three-resource application activation, and exact 30-resource workload destroy. It also binds the intervening three-image publication gate, eleven-test gate, and independent state/live reconciliation gate. Its checked fixture is synthetic contract data, so it does not create a plan, query Azure, approve cost, authenticate, initialize state, or authorize apply/destroy.

The historical V1 contract remains checked as regression evidence, but it stays visibly blocked for activation because it models a single 31-resource apply. `pnpm saved-plan:check` now requires both the preserved V1 regression checks and the activation-valid V2 lifecycle checks to pass.

## Current local boundary

- The two `.synthetic.fixture` files are visible text stating that they are not Terraform plan binaries and contain no cloud data.
- The fixture manifests use synthetic actor, run, review, approval, and cost references. Their dollar values test arithmetic and ceilings only; they are not current Azure prices, budgets, quotes, or approvals.
- The validator reads repository files and hashes fixture bytes. It does not spawn Terraform, Azure CLI, GitHub Actions, a network client, or another process.
- `.gitignore` excludes `.tfplan`, `.tfstate`, `.tfstate.*`, and `.terraform/`. The validator independently refuses those artifacts anywhere in the reviewed source tree.
- Current CI remains non-deploying. The inactive OIDC example still contains no Azure login or Terraform command.

## Manifest and digest binding

Each apply or destroy evidence manifest has one strict, closed schema:

1. **Artifact** — the exact logical plan filename and lowercase SHA-256 digest. The synthetic fixture path exists only for local contract testing and is not part of future retained evidence.
2. **Source** — repository, `main` ref, full commit SHA, disposable Terraform root, exact state key, exact `rg-local-missions-dev-*` group, provider-lock digest, 28-resource workload-inventory digest, and zero retained targets.
3. **Producer** — the separately scoped identity/environment, synthetic run reference, initiator, and production time.
4. **Sanitized summary** — create/update/delete/replace counts plus bounded text and JSON projections. Unknown fields, secret-shaped field names, credential markers, and oversized summaries are refused.
5. **Cost evidence** — currency, one-run estimate, monthly run-rate context, reviewed ceiling, timestamp, independent reviewer, and the same artifact digest. The current gate accepts only `synthetic_fixture_only` and requires `livePriceApproved: false`.
6. **Lifecycle** — one New York calendar day, at most eight hours, no later than 11:00 PM, with the warning exactly one hour before expiration.
7. **Review and approval** — separate synthetic references and actors. A canonical SHA-256 review-payload digest binds the source, artifact digest, target, summary, cost, producer, and lifecycle before approval.
8. **Consumer** — the exact identity/environment and exact saved-plan apply command, with both expected digests, post-approval/pre-expiry consumption time, and transient-copy deletion proof.

The apply manifest binds `AZURE_PLAN_CLIENT_ID` production to `AZURE_APPLY_CLIENT_ID` consumption. The destroy manifest binds the separately scoped destroy environment's reviewed destroy-plan phase to its exact saved-plan execution phase. Neither consumer may substitute a new plan, a different commit, another target, a changed summary/cost, or an altered artifact.

## Retention and sanitization

Actual Terraform plan files can contain sensitive values. A future binary plan must remain a short-lived protected workflow artifact and must never be committed, copied into retained evidence, printed, attached to a support case, pasted into chat, or treated as a sanitized report. The retained evidence is the closed manifest plus deliberately sanitized text/JSON summaries and digests. The consumer must delete its transient plan copy after use or expiry.

A SHA-256 digest proves that producer and consumer saw the same bytes; it does not make those bytes safe, prove the plan is correct, approve the cost, or authorize cloud mutation. Independent review must still inspect the sanitized changes, exact target, current cost source, expiry, and operation-specific risks.

## V2 local proof

`pnpm saved-plan:check` now proves:

- the preserved V1 apply/destroy regression paths remain synthetic and activation-blocked;
- five ordered V2 saved-plan operations bind the three Terraform roots, exact state keys, producer/consumer identities, approvals, digests, expiry, and transient deletion;
- the core remains exactly 27 resources with zero Container Apps, activation adds exactly three Container Apps after all immutable images pass scan/signature/provenance checks, and destroy targets exactly 30 disposable resources with zero retained targets;
- all eleven critical test gates must pass before destroy and both Terraform state and independently queried live disposable inventory must reconcile to zero; and
- forty-three V2 refusal mutations cover ordering, counts, images, identities, expiry, tests, destroy scope, reconciliation, secret-shaped evidence, and false execution claims; and
- zero checked-in Terraform plan/state artifacts.

## Live evidence boundary

Do not turn the V2 fixture status into a live claim. Each real phase must independently:

1. lift the no-Azure boundary for a read-only plan probe only;
2. approve the subscription, exact scopes, owners, immutable GitHub subjects, OIDC identities, backend, budget, monitored alerts, region/SKUs, and current pricing source;
3. use the already retained bootstrap/control evidence or produce separate subscription-backed saved plans for the 27-resource workload core, three-app activation, and destroy only as each operation becomes eligible;
4. sanitize summaries and record real source/target/cost metadata without exposing the binary or credentials;
5. independently review the commit, artifact digest, change inventory, exact target, cost ceiling, and expiry;
6. record explicit operation-specific approval bound to the review-payload digest; and
7. separately authorize the matching apply or destroy consumer.

No step in this checkpoint performed that sequence.

After future plan approval, operation evidence must follow the separate [ephemeral run-ledger gate](./ephemeral-run-ledger-gate.md); a valid saved plan alone never proves apply, testing, rollback, destroy, or independent reconciliation.
