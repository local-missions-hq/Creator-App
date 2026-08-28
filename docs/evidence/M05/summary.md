# M05 Azure foundation evidence

Status: M5 Phase A in progress; static secretless OIDC plan contract passed with all Azure execution blocked

Date: 2026-08-28

Checkpoint: `M05-secretless-oidc-plan-contract-local-004`

Environment baseline: Terraform 1.15.7, TFLint 0.63.1, Node 24.19.0, and pnpm 11.24.0.

## Implemented

- Preserved the separate retained control-plane and disposable development-workload roots, exact AzureRM 5.0.1 package/checksum lock, zero-change default fixture, 28-resource mock-only workload inventory, and eight blocked external activation gates.
- Added a static GitHub-to-Azure OIDC contract for the exact `stratiosai/Creator-App` repository, Azure token-exchange audience, immutable repository-owner/repository-id subject templates, protected `main` environments, and a future commit-SHA-pinned Azure login action. Numeric repository identifiers remain externally supplied activation inputs rather than guessed values.
- Split future authority across three distinct least-privilege identities and GitHub environments: read-only plan, reviewed saved-plan apply, and reviewed saved-destroy-plan execution. Plan can write only its exact state object/lock; apply and destroy cannot create their own unreviewed execution input.
- Added a command-policy evaluator with four accepted invocations and twenty fail-closed scenarios covering event/ref/environment/identity/runner/permissions, approval and self-review, commit and plan digest, time window, Terraform root and resource-group target, credential names, identity separation, and exact saved-plan commands.
- Added one deliberately inactive workflow example outside `.github/workflows`. Its three jobs have `if: ${{ false }}` and narrowly scoped `id-token: write`, but contain no Azure login or Terraform command. The only active workflow retains top-level `contents: read` and remains non-deploying.

## Verification

`pnpm azure-oidc:check` passed:

- three distinct identities and protected environments;
- four exact accepted command invocations;
- twenty expected refusal scenarios;
- one inactive workflow template; and
- one active non-deploying workflow with no OIDC or Azure execution permission.

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

Backend-disabled `terraform init` and `terraform validate` passed. TFLint 0.63.1 reported zero findings across both roots and all recursive modules. The complete pinned-runtime repository verification passed all nine workspaces, 111 mobile tests, prerequisite/auth/authorization/OIDC/Terraform gates, migration/OpenAPI contracts, and all builds. The final security scan passed 539 text files, and Gitleaks found no leaks in approximately 15.38 MB.

OIDC machine contract: [`../../../config/azure-oidc-plan-gate.v1.json`](../../../config/azure-oidc-plan-gate.v1.json)

OIDC operations gate: [`../../operations/github-azure-oidc-plan-gate.md`](../../operations/github-azure-oidc-plan-gate.md)

Machine contract: [`../../../config/terraform-foundation.v1.json`](../../../config/terraform-foundation.v1.json)

Operations boundary: [`../../operations/ephemeral-azure-development.md`](../../operations/ephemeral-azure-development.md)

Command evidence: [`commands.txt`](./commands.txt)

## Boundary

The OIDC work is static policy and documentation only. No GitHub environment, Azure/Entra identity, federated credential, Azure login, account identifier, provider configuration, credential, subscription, remote backend, provider-backed refresh/plan, resource, networking activation, import, apply, destroy, or cost-incurring action was created or used. Current CI remains non-deploying. Candidate region/SKU/price values remain planning bounds rather than approval. M5 is not complete, every Azure execution gate is explicitly deferred, and final M4 Entra/provider/native-device proof remains open.
