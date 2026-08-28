# M05 Azure foundation evidence

Status: M5 Phase A in progress; static saved-plan evidence contract passed with all Azure execution blocked

Date: 2026-08-28

Checkpoint: `M05-saved-plan-evidence-contract-local-005`

Environment baseline: Terraform 1.15.7, TFLint 0.63.1, Node 24.19.0, and pnpm 11.24.0.

## Implemented

- Preserved the retained/disposable Terraform roots, exact AzureRM 5.0.1 package lock, 28-resource mock workload, static three-identity OIDC contract, and non-deploying active CI while every external activation gate remains blocked.
- Added one strict saved-plan evidence contract plus separate apply and destroy manifests. Harmless text fixtures stand in for plan bytes and prove SHA-256 artifact binding without creating, reading, or retaining a Terraform plan binary.
- Bound each manifest to the repository, main ref, full synthetic commit, disposable root/state key/resource group, current provider-lock digest, canonical 28-resource inventory digest, zero retained targets, exact producer and consumer identities/environments, and exact saved-plan command.
- Added a canonical review-payload digest across source, artifact, target, summary, cost, producer, and lifecycle evidence. Synthetic plan review, cost review, and operation approval use distinct actors; consumers must match both digests, run after approval and before expiry, and record transient-copy deletion.
- Enforced closed schemas, whole-manifest secret-marker checks, 16 KiB summary bounds, nonnegative minor-unit synthetic cost ceilings, one New York calendar day, an eight-hour maximum, a one-hour warning, and the 11:00 PM cutoff. Actual plan binaries remain prohibited from source and retained evidence.

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
- exact provider-lock and 28-resource target-inventory digests; and
- zero checked-in Terraform plan/state artifacts.

`pnpm terraform:check` continued to pass:

- two independent Terraform roots;
- three plan-only Terraform tests;
- eleven expected refusal tests;
- zero resource changes in every default fixture;
- exactly 28 create-only changes across 17 reviewed Azure resource types in the mock-only enabled test;
- eleven required workload tags;
- twelve workload safeguards;
- ten low-cost planning defaults;
- four expiration fixtures; and
- eight external execution gates retained as blocked.

Backend-disabled `terraform init` and `terraform validate` passed. TFLint 0.63.1 reported zero findings across both roots and all recursive modules. The complete pinned-runtime repository verification passed all nine workspaces, 111 mobile tests, prerequisite/auth/authorization/OIDC/saved-plan/Terraform gates, migration/OpenAPI contracts, and all builds. The final security scan passed 546 text files, and Gitleaks found no leaks in approximately 15.44 MB.

Saved-plan machine contract: [`../../../config/saved-plan-evidence.v1.json`](../../../config/saved-plan-evidence.v1.json)

Saved-plan operations gate: [`../../operations/saved-plan-evidence-gate.md`](../../operations/saved-plan-evidence-gate.md)

OIDC machine contract: [`../../../config/azure-oidc-plan-gate.v1.json`](../../../config/azure-oidc-plan-gate.v1.json)

OIDC operations gate: [`../../operations/github-azure-oidc-plan-gate.md`](../../operations/github-azure-oidc-plan-gate.md)

Machine contract: [`../../../config/terraform-foundation.v1.json`](../../../config/terraform-foundation.v1.json)

Operations boundary: [`../../operations/ephemeral-azure-development.md`](../../operations/ephemeral-azure-development.md)

Command evidence: [`commands.txt`](./commands.txt)

## Boundary

The saved-plan work is static policy, synthetic fixtures, and local hashing only. No GitHub environment, Azure/Entra identity, federated credential, Azure login, account identifier, provider configuration, credential, subscription, remote backend, live price request, provider-backed refresh/plan, Terraform plan binary, resource, networking activation, import, apply, destroy, or cost-incurring action was created or used. Current CI remains non-deploying. Synthetic cost values prove arithmetic only and are not prices or approvals. M5 is not complete, every Azure execution gate is explicitly deferred, and final M4 Entra/provider/native-device proof remains open.
