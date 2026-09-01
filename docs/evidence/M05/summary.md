# M05 Azure foundation evidence

Status: M5.4 complete through live workflow-RBAC negative proof; local-operator state path retained; no workload deployed

Date: 2026-09-01

Checkpoint: `M05-workflow-rbac-negative-proof-passed-031`

Environment baseline: Terraform 1.15.7, TFLint 0.63.1, Node 24.19.0, and pnpm 11.24.0.

## Implemented

- Applied only the independently reviewed replacement three-resource bootstrap after rejecting the expired prior artifact; registered only `Microsoft.Storage` and preserved automatic provider registration as disabled.
- Verified the retained resource group, hardened Standard LRS Storage account, and private state container against the default-deny network, Entra-default authentication, disabled Shared Key/local-user/anonymous access, TLS, encryption, versioning, recovery, tags, and destroy-protection contracts.
- Migrated bootstrap state to `local-missions/bootstrap.tfstate`, proved independent clean initialization and Blob locking, removed the consumed temporary plan/local state, and retained sanitized evidence only.
- Added one temporary operator Blob data-role assignment at the private container. Corrected the next control-plane target from 17 to 20 resources so the three plan/apply/destroy identities each receive the required container-scoped backend access.
- Reverified all 17 reviewed East US 2 public workload meters without price drift, registered only the two additional control-plane namespaces, confirmed zero policy assignments and no dedicated control-plane SKU quota, and created the least-privilege PostgreSQL Entra administrator group.
- Generated and independently reviewed the exact 20-resource retained control-plane plan after resolving its process-only monitored destination and GitHub reviewer inputs. The plan contained 20 creates, zero changes/deletes/replacements, and zero paid workload resources; its separately approved apply is now complete.
- Applied the exact approved saved plan by SHA-256 before expiry. Terraform reported 20 added, zero changed, and zero destroyed. Independent live inventory and Terraform state proved the exact retained resources, an empty workload landing zone, `$100` budget, six alerts, and zero disposable workload resources.
- Azure normalized the protected budget period to the current September billing year. The stale August defaults triggered a safe `prevent_destroy` refusal during verification; the source-only dates were corrected to match live Azure and a normal provider-backed plan then reported **No changes**.
- Completed the separately approved no-mutation GitHub OIDC/ARM proof on commit `73ef5bd5e3251a95347aeb7449d4365745e4c5c4`. Plan, apply, and destroy jobs all exchanged their immutable-subject tokens, proved exact live ARM/data permissions and retained-control-group denial, confirmed the state firewall remained closed, and logged out successfully. No Terraform or Azure mutation command ran.
- Reviewed current official GitHub and Azure network constraints after the proof. Standard-runner IP allowlisting, a dynamic runner-IP rule, a self-hosted runner on the public repository, all-networks Storage, and broad trusted-services bypass were rejected. Proposed an organization-scoped GitHub Team two-core larger runner in an exact East US 2 VNet subnet with maximum concurrency one, default-deny Storage, Entra-only access, and separate migration/apply gates; no organization, billing, transfer, runner, provider, network, or firewall change occurred.
- The owner rejected the paid GitHub Team path for now and deferred it to M14. Created `local-missions-hq` on GitHub Free under the personal `stratiosai` account with one owner, zero repositories, no invitations, and no payment method. No paid plan, runner, repository transfer, or GitHub charge occurred.
- Verified the stable current repository ID and the new organization owner ID process-only, previewed the three future immutable environment subjects, and generated a real retained-control-plane saved plan outside the repository. Independent review proved exactly three in-place `azurerm_federated_identity_credential` subject updates, zero creates/deletes/replacements, zero network/RBAC/budget/workload changes, mode `0600`, and SHA-256 `5fbc63430b4778a3e18039109bbe66c065663621fd0025cbd51cffc71a0d3903`. No apply occurred.
- Consumed that approved plan with `0` added, `3` changed, and `0` destroyed, then transferred the still-public repository to `local-missions-hq`. Verified the stable repository ID, redirect, protected environments, main-only policies, exact variables, zero secrets, and restored the immutable OIDC, selected Actions, and solo-founder branch rule that GitHub reset during transfer.
- Post-transfer run `33519420112` failed safely during Azure login before ARM or Blob access because GitHub emitted `repository_owner_id:{id}:repository_id:{id}:environment:{name}` while the first plan encoded a name-decorated preview. Applied only approved correction plan SHA-256 `de06a09c687092fce1af5476b9ff37fa82d41039c13130e7f51f6395a55f923c`: zero added, three changed, zero destroyed. A normal provider-backed plan then reported no changes.
- Protected run `33521970773` passed all three corrected post-transfer OIDC/ARM jobs on commit `76803cde194dfc8965bf6114690f47a0dabcdf79`. Each identity exchanged OIDC, proved exact permission boundaries and retained-control denial, logged out, and confirmed the actual state Blob read remained refused by the unchanged default-deny firewall. No Terraform or Azure mutation command ran; the workload landing zone remained empty.
- Independently re-read all live workflow identities, assignments, custom roles, and constrained-delegation conditions. Plan has only Reader at the landing zone and its exact state-container role; apply excludes every delete; destroy excludes landing-zone group deletion; the two RBAC administrators are condition version `2.0`, ServicePrincipal-only, and limited to the exact five approved application data roles. Five landing-zone assignments, three workflow state assignments, zero cross-scope assignments, zero control-group service-principal assignments, zero workload resources, and zero activity-log mutations were observed.
- The owner subsequently supplied the monitored destination and named the sole `stratiosai` collaborator as reviewer. Created all three main-only GitHub environments with required review and no administrator bypass, recorded the single-human self-review exception, and enabled immutable OIDC subjects without adding secrets or activating an Azure workflow.

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
- Queried Microsoft's public unauthenticated Retail Prices API for East US 2 and retained the seven service groups already bounded by the Terraform contract: PostgreSQL Flexible Server, Container Apps, Service Bus, Container Registry, Blob Storage, Key Vault, and Azure Monitor/Application Insights.
- Assigned Blake Tindol as accountable platform, cost, alert-response, technical-on-call, and independent plan-review owner, with Codex as the automated plan producer. No personal contact, credential, tenant, subscription, or account identifier was recorded.
- Retained the conservative historical `$3.02` eight-hour arithmetic, but selected a `$2.00` two-hour smoke run as the first workload tier. `$5.00`/eight hours is only a separately justified fallback ceiling. The approved monthly alert budget is `$100.00` with 50%/80%/100% actual and forecast notifications; it is not a spend target or hard cap.
- Added a static dated cost-review manifest and validator with twenty-six exercised refusal scenarios. It requires a fresh review after seven days and refuses subscription availability, alert delivery, approval, Azure authentication, provider planning, mutation, resource, registry, customer-data, or cost claims.

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

`pnpm azure-cost:check` passed:

- seven reviewed service groups aligned with the Terraform defaults;
- East US 2 public regional meters and current official Microsoft documentation;
- exact `$3.02` raw arithmetic, `$5.00` buffered run ceiling, and `$25.00` unapproved monthly proposal;
- accountable owner assignments and pending independent review; and
- twenty-six exercised refusal scenarios with zero Azure subscription or provider access claims.

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

Backend-disabled `terraform init`, validation, and mock-provider tests passed through the repository gate without Azure credentials or a provider configuration. TFLint 0.63.1 reported zero findings across both roots and all recursive modules. The complete pinned-runtime repository verification passed all nine workspaces, 111 mobile tests, prerequisite/auth/authorization/OIDC/saved-plan/run-ledger/recovery/Terraform/public-cost/preflight/container gates, the 20-entry migration manifest, OpenAPI contracts, all builds, and all three local production-bundle smokes. The final security scan passed 575 text files, and Gitleaks found no leaks in approximately 15.74 MB.

Container image machine contract: [`../../../config/container-image-contract.v1.json`](../../../config/container-image-contract.v1.json)

Container image operations gate: [`../../operations/container-image-gate.md`](../../operations/container-image-gate.md)

M5 local preflight machine contract: [`../../../config/m5-local-preflight.v1.json`](../../../config/m5-local-preflight.v1.json)

M5 local preflight operations gate: [`../../operations/m5-local-preflight-gate.md`](../../operations/m5-local-preflight-gate.md)

Azure public cost-review machine contract: [`../../../config/azure-public-cost-review.v1.json`](../../../config/azure-public-cost-review.v1.json)

Azure public service/cost review: [`../../operations/azure-public-service-cost-review.md`](../../operations/azure-public-service-cost-review.md)

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

The preflight, container, dashboard, and recovery work remains static/local. The only new external read was Microsoft's public unauthenticated Retail Prices API and public Microsoft Learn documentation. No container build, base-image pull, package/container registry request, image scan, signature, publication, GitHub environment, Azure/Entra identity, federated credential, Azure login, tenant/account/subscription identifier, credential, subscription read, remote backend, account-specific offer request, provider-backed refresh/plan, Terraform plan binary, resource, networking activation, import, apply, restore, rollback, destroy, live-state query, customer data, or cost-incurring action was created or used. Current CI remains non-deploying. Public meters are estimates, not an Azure quote, approved budget, subscription availability proof, or measured RTO/RPO. M5 is not complete, the provider-plan and later mutation gates remain deferred, and final M4 Entra/provider/native-device proof remains open.
