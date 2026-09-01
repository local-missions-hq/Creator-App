# Azure workload provider-registration gate

Checkpoint: `M05-provider-registration-gate-local-034`

Status: local fail-closed gate complete; exact-six Azure registration awaits explicit owner approval

## Exact scope derived from code

The active development root and its modules declare 17 AzureRM resource types. A validator scans the tracked Terraform files and requires every type to map to one provider namespace. Five required namespaces are already registered and must not be mutated: `Microsoft.Authorization`, `Microsoft.Insights`, `Microsoft.ManagedIdentity`, `Microsoft.Resources`, and `Microsoft.Storage`.

Only these six currently missing namespaces may be registered after explicit approval, sequentially and against the process-only subscription ID:

1. `Microsoft.App`
2. `Microsoft.ContainerRegistry`
3. `Microsoft.DBforPostgreSQL`
4. `Microsoft.KeyVault`
5. `Microsoft.OperationalInsights`
6. `Microsoft.ServiceBus`

The registration command shape requires `--subscription`, `--wait`, and an exact allowlisted namespace. It cannot accept marketplace terms, unregister a provider, use Terraform automatic registration, trust the Azure CLI default, or run registrations in parallel.

## Required preconditions and postconditions

Before any mutation, the operator must record approval for the exact list, uniquely rediscover the Local Missions subscription from the retained tag/resource-group boundary, reprove the empty disposable workload, recheck the current-IP state firewall rule, and snapshot all 11 provider states. Any ambiguity or drift is a stop.

After registration, all six targets must report `Registered`; all five preexisting namespaces and every non-target provider state must remain unchanged; the retained group count and Storage security boundary must remain unchanged; and the disposable workload must still contain zero resources.

The subsequent proof is read-only. It must query the official Container Apps regional subscription usage endpoint and require headroom for one managed environment, recheck PostgreSQL 16 / `Standard_B1ms` / 32 GiB capability, recheck East US 2 locations and documented service limits, and retain zero workload resources. These checks reduce deployment risk but do not reserve capacity or guarantee a successful future apply.

## Stop boundary

This checkpoint ran no provider registration, Terraform command, Azure mutation, image operation, Stripe action, or iOS deployment. Registration approval will authorize only the exact six sequential provider registrations and the read-only post-registration proof. It will not authorize a Terraform plan or apply.

Sources:

- [Azure CLI provider registration reference](https://learn.microsoft.com/en-us/cli/azure/provider)
- [Azure Container Apps quotas](https://learn.microsoft.com/en-us/azure/container-apps/quotas)
- [Azure Container Apps regional subscription usage REST API](https://learn.microsoft.com/en-us/rest/api/resource-manager/containerapps/usages/list)
- [Azure Database for PostgreSQL flexible server overview](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/overview)
