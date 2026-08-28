# M05 Azure foundation evidence

Status: M5 Phase A local preflight passed; all registry and Azure execution remains blocked

Date: 2026-08-28

Checkpoint: `M05-local-preflight-audit-010`

Environment baseline: Terraform 1.15.7, TFLint 0.63.1, Node 24.19.0, and pnpm 11.24.0.

## Implemented

- Preserved the retained/disposable Terraform roots, exact AzureRM 5.0.1 package lock, static OIDC and saved-plan contracts, recovery contract, and non-deploying active CI while every external activation gate remains blocked.
- Added a separately named dashboard Container App and user-assigned identity behind the disabled development root. The dashboard receives only one resource-scoped ACR pull role, uses an immutable image digest, exposes HTTPS-only ingress through the existing reviewed CIDR allowlist, and scales from zero to one candidate replica.
- Added non-secret server-runtime `API_BASE_URL` and `APP_ENV` references and aligned the dashboard environment example with the application variable names. The API URL is derived from the API Container App FQDN rather than a credential or hard-coded build-time endpoint.
- Rebound the exact mock inventory from 28 to 31 resources: three Container Apps, three user-assigned identities, nine role assignments, and the unchanged supporting workload. Saved-plan review digests and all three run-ledger digests were regenerated from their canonical synthetic payloads.
- Added separate API, dashboard, and worker Dockerfiles that accept no default base image. A future build must supply a reviewed Node 24.19.0 Linux image by SHA-256 digest plus a full commit, whole-second UTC build time, and numeric semantic version before package installation begins.
- Required frozen pnpm 11.24.0 installs, restricted source copies, production-only offline deploy bundles, numeric `10001:10001` ownership, OCI provenance labels, exact runtime commands, API/dashboard health checks, and no secret build arguments. The dashboard now emits monorepo-aware Next.js standalone output.
- Limited API, worker, and shared package publication surfaces to compiled `dist` output plus database migrations. The worker now stays alive as a Container App process until `SIGINT` or `SIGTERM`, then records and completes a clean shutdown.
- Added a local validator that creates an isolated temporary offline workspace, assembles three production bundles, runs four API/dashboard/worker runtime checks, proves 35 mutation/refusal scenarios, removes every temporary bundle, and leaves the source workspace install unchanged. The active non-deploying CI runs this gate through `pnpm verify` without invoking Docker or a registry.
- Added a consolidated M5 preflight manifest and validator that reconcile all six machine contracts, nine local preparation areas, fifteen required operations/evidence artifacts, active read-only CI, and sixteen separately approved external gates. It cross-checks the exact 31-resource inventory, eight-hour/11:00 PM New York expiration policy, OIDC producer/consumer environments, synthetic recovery status, and no-build/no-registry image status.
- Added 45 exercised refusal scenarios covering false milestone/execution claims, contract/evidence drift, missing ownership or approval, active workflow OIDC/write/Azure/Terraform/Docker/registry activation, count/time/identity disagreement, and checked-in Terraform plan/state/cache artifacts. The preflight is now part of `pnpm verify` but performs no external action.
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

`pnpm container:check` passed:

- three production bundles: API pnpm deploy, dashboard Next.js standalone, and worker pnpm deploy;
- four local runtime checks covering API liveness, API build provenance, dashboard rendering, and worker stay-alive/clean shutdown;
- thirty-five expected refusal scenarios for activation claims, mutable base/tag/provenance, root or broad-copy Dockerfiles, secrets, missing labels, unlocked installs, online deploys, and package drift;
- seven external base-image/registry/scan/sign/plan/deploy gates retained as blocked; and
- zero container builds, image pulls, registry contacts, published images, signatures, or cloud operations.

`pnpm m5:preflight` passed:

- six existing M5 machine contracts;
- nine local preparation areas and fifteen required artifacts;
- sixteen external gates retained as deferred and separately approval-bound;
- forty-five exercised mutation/refusal scenarios; and
- zero Azure, registry, provider-backed planning, remote-backend, Terraform-mutation, customer-data, or cloud-cost claims.

Backend-disabled `terraform init`, validation, and mock-provider tests passed through the repository gate without Azure credentials or a provider configuration. TFLint 0.63.1 reported zero findings across both roots and all recursive modules. The complete pinned-runtime repository verification passed all nine workspaces, 111 mobile tests, prerequisite/auth/authorization/OIDC/saved-plan/run-ledger/recovery/Terraform/preflight/container gates, the 20-entry migration manifest, OpenAPI contracts, all builds, and all three local production-bundle smokes. The final security scan passed 572 text files, and Gitleaks found no leaks in approximately 15.69 MB.

Container image machine contract: [`../../../config/container-image-contract.v1.json`](../../../config/container-image-contract.v1.json)

Container image operations gate: [`../../operations/container-image-gate.md`](../../operations/container-image-gate.md)

M5 local preflight machine contract: [`../../../config/m5-local-preflight.v1.json`](../../../config/m5-local-preflight.v1.json)

M5 local preflight operations gate: [`../../operations/m5-local-preflight-gate.md`](../../operations/m5-local-preflight-gate.md)

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

The preflight, container, dashboard, and recovery work is static policy, local compilation, temporary offline production bundling, localhost process smoke, mock-provider planning, synthetic fixtures, local file inspection, and local hashing only. No container build, base-image pull, package/container registry request, image scan, image signature, image publication, GitHub environment, Azure/Entra identity, federated credential, Azure login, account identifier, credential, subscription, remote backend, live price request, provider-backed refresh/plan, Terraform plan binary, resource, networking activation, import, apply, restore, rollback, destroy, live query, customer data, or cost-incurring action was created or used. Current CI remains non-deploying. Resource counts, cost examples, identities, endpoints, tags, and recovery reports are synthetic contract examples rather than image or cloud evidence, approved prices, or measured Azure RTO/RPO. M5 is not complete, all sixteen external gates remain deferred, and final M4 Entra/provider/native-device proof remains open.
