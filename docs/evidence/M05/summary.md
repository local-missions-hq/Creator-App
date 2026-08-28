# M05 Azure foundation evidence

Status: M5 Phase A in progress; local Terraform foundation checkpoint passed with Azure activation blocked

Date: 2026-08-28

Checkpoint: `M05-terraform-ephemeral-foundation-local-001`

Environment baseline: Terraform 1.15.7, TFLint 0.63.1, Node 24.19.0, and pnpm 11.24.0.

## Implemented

- Replaced the empty infrastructure placeholder with two separate Terraform roots. `infra/terraform/control-plane` is retained and owns the `local-missions/control-plane.tfstate` contract; `infra/terraform/environments/dev` is disposable and owns `local-missions/dev-workload.tfstate`. Their resource-group namespaces and ownership outputs are intentionally different.
- Kept the checkpoint contract-only. Both roots declare partial AzureRM backend boundaries but contain zero Azure provider blocks and zero Azure resource blocks. The local gate initializes with the backend disabled and strips `ARM_*`, `AZURE_*`, and `TF_VAR_*` values before invoking Terraform.
- Added eleven required disposable-workload tags covering application, environment, lifecycle, management, owner, purpose, Terraform root, full commit SHA, creation, expiration, and exact workload resource group.
- Added the ADR-049 expiration contract: no more than eight hours, same `America/New_York` calendar day, 11:00 PM cutoff fixtures, exact one-hour warning, and no more than one extension. Four standard/DST fixtures prove the earlier-deadline calculation.
- Added ten conservative planning defaults: API and worker scale from zero to one replica, a candidate burstable PostgreSQL SKU with 32 GiB storage and seven-day backup retention, Basic Service Bus and Container Registry candidates, and 30-day telemetry retention. These are safety ceilings, not an approved price or SKU decision.
- Added activation refusal requiring an explicit approval reference, approved nonzero budget, current region/SKU review, narrow non-global CIDRs, retained cleanup-controller reference, and a non-placeholder monitored alert destination. The current fixture leaves all activation inputs unapproved and sets creation to false.
- Added an operational runbook that separates retained and disposable inventories, documents the blocked external sequence, and requires future reports to distinguish **Disposable workload: empty** from **Retained control plane: expected list**.
- Added Terraform 1.15.7 setup to repository CI and made `pnpm terraform:check` part of `pnpm verify`. CI still has read-only repository permissions and no Azure OIDC permission.

## Verification

`pnpm terraform:check` passed:

- two independent Terraform roots;
- two plan-only Terraform tests;
- three expected refusal tests for retained/broad target, overlong expiration, and unapproved activation;
- zero planned resource changes;
- eleven required workload tags;
- ten low-cost planning defaults;
- four expiration fixtures; and
- eight external activation gates retained as blocked.

Both roots passed backend-disabled `terraform init` and `terraform validate`. TFLint passed both roots with zero findings after all declared values were included in the output contracts. The complete pinned-runtime repository verification passed all nine workspaces, 111 mobile tests, existing prerequisite/auth/authorization checks, migration/OpenAPI contracts, and builds. The final security scan passed 480 text files, and Gitleaks found no leaks in approximately 15.24 MB.

Machine contract: [`../../../config/terraform-foundation.v1.json`](../../../config/terraform-foundation.v1.json)

Operations boundary: [`../../operations/ephemeral-azure-development.md`](../../operations/ephemeral-azure-development.md)

Command evidence: [`commands.txt`](./commands.txt)

## Boundary

No Azure CLI command, Azure login, provider configuration, remote backend, subscription plan, resource creation, networking activation, cloud identity, apply, destroy, or cost-incurring action was used. The `eastus2` region, service/SKU candidates, budget, owner, monitored destination, OIDC identities, and exact scopes remain external approval gates. M5 is not complete, and final M4 Entra/provider/native-device proof remains deferred.
