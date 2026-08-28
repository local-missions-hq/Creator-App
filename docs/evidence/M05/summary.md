# M05 Azure foundation evidence

Status: M5 Phase A in progress; local workload-resource module contract passed with all Azure execution blocked

Date: 2026-08-28

Checkpoint: `M05-workload-resource-modules-local-003`

Environment baseline: Terraform 1.15.7, TFLint 0.63.1, Node 24.19.0, and pnpm 11.24.0.

## Implemented

- Preserved the separate retained control-plane and disposable development-workload roots, exact AzureRM 5.0.1 package/checksum lock, state keys, resource-group namespaces, ownership contracts, and eight external activation gates.
- Added seven conservative workload modules behind `azure_resource_creation_enabled = false`: Storage account/private containers, PostgreSQL Flexible Server/database/firewall/Entra administrator, Container Apps environment/API/worker/identities/RBAC, Service Bus namespace/queue, Container Registry, Key Vault, and Log Analytics/Application Insights.
- Kept the ordinary synthetic fixture at zero changes. The separate `mock_provider "azurerm"` run exercises exactly 28 create-only changes across 17 reviewed resource types without credentials, provider refresh, or Azure access.
- Enforced disposable tags on every taggable resource; zero-to-one API/worker scale; narrow public-network allowlists pending the separately deferred private-network phase; private OAuth-first Storage; Entra-only PostgreSQL with seven-day backup; local-auth-disabled Service Bus and telemetry; non-admin/non-anonymous registry; RBAC-only purge-protected Key Vault with no Terraform-managed secrets; and separate API/worker managed identities with eight scoped role assignments and digest-pinned images.
- Expanded the machine validator to eleven expected refusals by adding incomplete identity-reference, mutable-image, and unsafe secret/reference fixtures to the existing target, expiry, activation, environment, scale, network, backup, and anonymous-access refusals.

## Verification

`pnpm terraform:check` passed:

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

Backend-disabled `terraform init` and `terraform validate` passed. TFLint 0.63.1 reported zero findings across both roots and all recursive modules. The complete pinned-runtime repository verification passed all nine workspaces, 111 mobile tests, prerequisite/auth/authorization/Terraform gates, migration/OpenAPI contracts, and all builds. The final security scan passed 534 text files, and Gitleaks found no leaks in approximately 15.35 MB.

Machine contract: [`../../../config/terraform-foundation.v1.json`](../../../config/terraform-foundation.v1.json)

Operations boundary: [`../../operations/ephemeral-azure-development.md`](../../operations/ephemeral-azure-development.md)

Command evidence: [`commands.txt`](./commands.txt)

## Boundary

The AzureRM package was resolved from Terraform Registry only to freeze source code and checksums. No Azure CLI command, Azure login, account identifier, provider configuration, credential, subscription, remote backend, provider-backed refresh/plan, resource, networking activation, import, apply, destroy, or cost-incurring action was used. Candidate region/SKU/price values remain planning bounds rather than approval. M5 is not complete, all Terraform execution against Azure is explicitly deferred, and final M4 Entra/provider/native-device proof remains open.
