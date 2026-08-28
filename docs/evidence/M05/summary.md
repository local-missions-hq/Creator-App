# M05 Azure foundation evidence

Status: M5 Phase A in progress; static dashboard workload contract passed with all Azure execution blocked

Date: 2026-08-28

Checkpoint: `M05-dashboard-workload-module-local-008`

Environment baseline: Terraform 1.15.7, TFLint 0.63.1, Node 24.19.0, and pnpm 11.24.0.

## Implemented

- Preserved the retained/disposable Terraform roots, exact AzureRM 5.0.1 package lock, static OIDC and saved-plan contracts, recovery contract, and non-deploying active CI while every external activation gate remains blocked.
- Added a separately named dashboard Container App and user-assigned identity behind the disabled development root. The dashboard receives only one resource-scoped ACR pull role, uses an immutable image digest, exposes HTTPS-only ingress through the existing reviewed CIDR allowlist, and scales from zero to one candidate replica.
- Added non-secret `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_ENV` runtime references and aligned the dashboard environment example with the application variable name. The API URL is derived from the API Container App FQDN rather than a credential or hard-coded live endpoint.
- Rebound the exact mock inventory from 28 to 31 resources: three Container Apps, three user-assigned identities, nine role assignments, and the unchanged supporting workload. Saved-plan review digests and all three run-ledger digests were regenerated from their canonical synthetic payloads.
- Added a 23-state, 29-transition run ledger from approved saved plan through apply, eleven required test gates, continue or application rollback, reviewed destroy, independent reconciliation, and the only two truthful terminal states: complete or escalated.
- Added three canonical SHA-256-bound synthetic ledgers: a clean continuation, a critical-test failure with successful revision rollback and teardown, and a destroy timeout where an independent live query finds one orphan and the incident stays attached/escalated.
- Bound every ledger to the checked synthetic apply/destroy artifact and review digests, full synthetic commit, disposable Terraform root/resource group, cleanup controller, lock, same-day expiry/warning, operation evidence, and separate Terraform-state/live-resource queries.
- Split the final inventory into the exact 31-resource disposable workload and six expected retained control-plane classes. Completion requires successful destroy, zero state objects, zero independently observed live resources, no orphans, exact retained inventory, and either all tests passed or successful rollback.
- Added planned local timeout ceilings for apply, tests, rollback, destroy, and reconciliation. Apply/rollback/destroy failure, destroy timeout, orphan, or inventory mismatch must open an attached incident and can never be reported complete.
- Added four canonical synthetic recovery drills: successful PostgreSQL point-in-time restore, privacy-safe Blob version recovery, successful previous Container Apps revision restore, and a PostgreSQL timeout that remains attached to an open escalation.
- Bound recovery evidence to the current seven-day PostgreSQL retention/PITR contract, private versioned Blob storage with seven-to-fourteen-day soft delete, one retained inactive Container Apps revision, immutable image digests, and the current 20-entry forward-only migration manifest.
- Added draft internal RPO/RTO/timeout planning windows for PostgreSQL, Blob, and Container Apps. They are explicitly planning targets rather than Azure guarantees and require future live review and measurement.
- Required canonical before/after reconciliation for migration manifest, row counts, public IDs, status histories, audit records, privacy exclusions, and application readiness. Expired or deleted privacy-limited data cannot return to active use through recovery.

## Verification

`pnpm azure-oidc:check` passed:

- three distinct identities and protected environments;
- four exact accepted command invocations;
- twenty expected refusal scenarios;
- one inactive workflow template; and
- one active non-deploying workflow with no OIDC or Azure execution permission.

`pnpm saved-plan:check` passed:

- two synthetic producer-consumer manifests, one apply and one destroy;
- forty-three expected refusal scenarios;
- all eight evidence fields required by the OIDC invocation contract;
- exact provider-lock and 31-resource target-inventory digests; and
- zero checked-in Terraform plan/state artifacts.

`pnpm run-ledger:check` passed:

- three terminal synthetic ledgers: continue-complete, rollback-complete, and orphan-escalated;
- twenty-three states and twenty-nine allowed transitions;
- all eleven required test gates;
- fifty-nine expected refusal scenarios; and
- separate disposable Terraform-state/live-resource and retained-control-plane inventories.

`pnpm recovery-drill:check` passed:

- four canonical synthetic drills: three complete and one escalated;
- PostgreSQL PITR, Blob version/soft-delete recovery, and Container Apps prior-revision restore contracts;
- seven required reconciliation categories;
- sixty-two expected mutation/refusal scenarios; and
- zero cloud operations or live recovery claims.

`pnpm terraform:check` passed:

- two independent Terraform roots;
- three plan-only Terraform tests;
- twelve expected refusal tests, including a dashboard-only scale violation;
- zero resource changes in every default fixture;
- exactly 31 create-only changes across 17 reviewed Azure resource types in the mock-only enabled test;
- eleven required workload tags;
- fourteen workload safeguards;
- twelve low-cost planning defaults;
- four expiration fixtures; and
- eight external execution gates retained as blocked.

Backend-disabled `terraform init`, validation, and mock-provider tests passed through the repository gate without Azure credentials or a provider configuration. TFLint 0.63.1 reported zero findings across both roots and all recursive modules. The complete pinned-runtime repository verification passed all nine workspaces, 111 mobile tests, prerequisite/auth/authorization/OIDC/saved-plan/run-ledger/recovery/Terraform gates, the 20-entry migration manifest, OpenAPI contracts, and all builds. The final security scan passed 560 text files, and Gitleaks found no leaks in approximately 15.60 MB.

Recovery-drill machine contract: [`../../../config/recovery-drill.v1.json`](../../../config/recovery-drill.v1.json)

Recovery-drill operations gate: [`../../operations/recovery-drill-gate.md`](../../operations/recovery-drill-gate.md)

Run-ledger machine contract: [`../../../config/ephemeral-run-ledger.v1.json`](../../../config/ephemeral-run-ledger.v1.json)

Run-ledger operations gate: [`../../operations/ephemeral-run-ledger-gate.md`](../../operations/ephemeral-run-ledger-gate.md)

Saved-plan machine contract: [`../../../config/saved-plan-evidence.v1.json`](../../../config/saved-plan-evidence.v1.json)

Saved-plan operations gate: [`../../operations/saved-plan-evidence-gate.md`](../../operations/saved-plan-evidence-gate.md)

OIDC machine contract: [`../../../config/azure-oidc-plan-gate.v1.json`](../../../config/azure-oidc-plan-gate.v1.json)

OIDC operations gate: [`../../operations/github-azure-oidc-plan-gate.md`](../../operations/github-azure-oidc-plan-gate.md)

Machine contract: [`../../../config/terraform-foundation.v1.json`](../../../config/terraform-foundation.v1.json)

Operations boundary: [`../../operations/ephemeral-azure-development.md`](../../operations/ephemeral-azure-development.md)

Command evidence: [`commands.txt`](./commands.txt)

## Boundary

The dashboard and recovery work is static Terraform policy, mock-provider planning, synthetic fixtures, local file inspection, and local hashing only. No GitHub environment, Azure/Entra identity, federated credential, Azure login, account identifier, credential, subscription, remote backend, live price request, provider-backed refresh/plan, Terraform plan binary, resource, networking activation, import, apply, restore, rollback, destroy, live query, customer data, or cost-incurring action was created or used. Current CI remains non-deploying. Resource counts, cost examples, identities, endpoints, and recovery reports are synthetic contract examples rather than cloud evidence, approved prices, or measured Azure RTO/RPO. M5 is not complete, every live Azure recovery and execution gate is explicitly deferred, and final M4 Entra/provider/native-device proof remains open.
