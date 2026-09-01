# Azure workload provider-registration gate

Checkpoint: `M05-workload-provider-registration-proof-passed-035`

Status: exact-six Azure registration and read-only usage/capability proof passed; no Terraform plan

## Exact scope derived from code

The active development root and its modules declare 17 AzureRM resource types. A validator scans the tracked Terraform files and requires every type to map to one provider namespace. Five required namespaces are already registered and must not be mutated: `Microsoft.Authorization`, `Microsoft.Insights`, `Microsoft.ManagedIdentity`, `Microsoft.Resources`, and `Microsoft.Storage`.

The owner approved SHA-256-bound sequential registration of exactly these six previously missing namespaces against the process-only subscription ID:

1. `Microsoft.App`
2. `Microsoft.ContainerRegistry`
3. `Microsoft.DBforPostgreSQL`
4. `Microsoft.KeyVault`
5. `Microsoft.OperationalInsights`
6. `Microsoft.ServiceBus`

The registration command shape requires `--subscription`, `--wait`, and an exact allowlisted namespace. It cannot accept marketplace terms, unregister a provider, use Terraform automatic registration, trust the Azure CLI default, or run registrations in parallel.

## Executed preconditions and postconditions

Before mutation, the tool recorded approval SHA-256 `08c3b30897c8013089fa450e34409ddee94060e82efe73baff44922ed3d448f9`, uniquely rediscovered the Local Missions subscription from the retained tag/resource-group boundary, reproved the empty disposable workload, rechecked the current-IP state firewall rule, and snapshotted provider states. An initial dry-run defect safely refused before mutation because Azure returned `microsoft.insights` with different casing; case-insensitive namespace matching was added and regression-tested before resuming the same approved sequence.

After sequential registration, all six targets report `Registered`; the preexisting namespaces and every non-target provider state remained unchanged; the retained group count and Storage security boundary remained unchanged; and the disposable workload still contains zero resources. Provider registration created no workload resource and incurs no workload runtime charge.

The subsequent proof was read-only. The official Container Apps regional subscription usage endpoint reported `0/20` managed environments, leaving the required headroom. PostgreSQL 16 / `Standard_B1ms` / 32 GiB capability passed. Ten required regional resource types across Container Apps, ACR, PostgreSQL, Key Vault, Log Analytics, Service Bus, Application Insights, managed identities, and Storage report East US 2 support. These checks reduce deployment risk but do not reserve capacity or guarantee a successful future apply.

## Stop boundary

This checkpoint performed only the six approved subscription provider registrations and read-only proof. It ran no Terraform command, plan, apply, resource creation/update/deletion, network/RBAC/budget change, image operation, Stripe action, or iOS deployment. The next separately gated action is generation and independent review of the exact 27-resource workload-core saved plan with zero Container Apps; apply remains unauthorized.

Sources:

- [Azure CLI provider registration reference](https://learn.microsoft.com/en-us/cli/azure/provider)
- [Azure Container Apps quotas](https://learn.microsoft.com/en-us/azure/container-apps/quotas)
- [Azure Container Apps regional subscription usage REST API](https://learn.microsoft.com/en-us/rest/api/resource-manager/containerapps/usages/list)
- [Azure Database for PostgreSQL flexible server overview](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/overview)
