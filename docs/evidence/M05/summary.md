# M05 Azure foundation evidence

Status: M5 Phase A in progress; local resource-module contract passed with all Azure execution blocked

Date: 2026-08-28

Checkpoint: `M05-terraform-resource-module-contract-local-002`

Environment baseline: Terraform 1.15.7, TFLint 0.63.1, Node 24.19.0, and pnpm 11.24.0.

## Implemented

- Preserved the separate retained control-plane and disposable development-workload roots, state keys, resource-group namespaces, ownership contracts, and eight external activation gates from the first M5 checkpoint.
- Pinned `hashicorp/azurerm` exactly to 5.0.1 and committed the signed package checksums in the disposable root. No real AzureRM provider configuration was added.
- Added a reusable resource-group module that accepts only `rg-local-missions-dev-*` and rejects missing or incorrect ownership, expiry, provenance, environment, lifecycle, and Terraform-root tags.
- Kept the resource-group module behind `azure_resource_creation_enabled = false`. The ordinary synthetic fixture plans zero changes. A separate Terraform `mock_provider "azurerm"` test exercises exactly one resource-group create without credentials, provider refresh, or Azure access.
- Added a provider-independent workload contract for development-only environment isolation, retained/disposable ownership separation, zero-to-one default API/worker scale, TLS 1.2, narrow PostgreSQL access without allow-all/trusted-services bypasses, seven-day point-in-time recovery without unapproved geo redundancy, private Blob containers, disabled anonymous Blob access, and disabled static website hosting.
- Expanded the machine validator from three to eight expected refusals: retained/broad target, overlong expiry, activation without approvals, wrong environment, unsafe scale, broad/weak network settings, unbounded backup, and anonymous storage access.

## Verification

`pnpm terraform:check` passed:

- two independent Terraform roots;
- three plan-only Terraform tests;
- eight expected refusal tests;
- zero resource changes in every default fixture;
- exactly one `azurerm_resource_group` create in the mock-only enabled test;
- eleven required workload tags;
- twelve workload safeguards;
- ten low-cost planning defaults;
- four expiration fixtures; and
- eight external execution gates retained as blocked.

Backend-disabled `terraform init` and `terraform validate` passed. TFLint 0.63.1 reported zero findings across both roots and the recursive dev modules. The complete pinned-runtime repository verification passed all nine workspaces, 111 mobile tests, prerequisite/auth/authorization/Terraform gates, migration/OpenAPI contracts, and all builds. The final security scan passed 496 text files, and Gitleaks found no leaks in approximately 15.27 MB.

Machine contract: [`../../../config/terraform-foundation.v1.json`](../../../config/terraform-foundation.v1.json)

Operations boundary: [`../../operations/ephemeral-azure-development.md`](../../operations/ephemeral-azure-development.md)

Command evidence: [`commands.txt`](./commands.txt)

## Boundary

The AzureRM package was resolved from Terraform Registry only to freeze source code and checksums. No Azure CLI command, Azure login, account identifier, provider configuration, credential, subscription, remote backend, provider-backed refresh/plan, resource, networking activation, import, apply, destroy, or cost-incurring action was used. Candidate region/SKU/price values remain planning bounds rather than approval. M5 is not complete, all Terraform execution against Azure is explicitly deferred, and final M4 Entra/provider/native-device proof remains open.
