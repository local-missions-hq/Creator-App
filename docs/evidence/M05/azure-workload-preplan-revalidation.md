# Azure workload pre-plan read-only revalidation

Status: read-only review passed; blocked on six separately approved provider registrations and subscription quota proof

Date: 2026-09-01

Checkpoint: `M05-workload-preplan-readonly-revalidation-033`

## Verified

- The Azure CLI default pointed at the other project. No command trusted that context. A read-only search across the two enabled subscriptions found exactly one candidate with three `application=local-missions` retained groups and no other groups; every later Azure query used that candidate explicitly without retaining its name or identifier.
- Two independent public IPv4 sources agreed. The value was never printed, hashed, committed, or retained. It exactly matched the one state-account IP rule; Storage remains default deny, bypass `None`, Shared Key disabled, and the disposable workload count remains zero.
- East US 2 publishes the required Container Apps environment, Service Bus namespace, Container Registry, Key Vault, Log Analytics workspace, and Application Insights resource types. The subscription capability response includes PostgreSQL 16, `Standard_B1ms` with one vCPU/2 GiB, and 32 GiB managed storage.
- All 17 reviewed public USD retail meters matched the 2026-08-30 snapshot. The modeled two-hour smoke estimate remains `$0.85` under the deliberately conservative assumptions, so the selected `$2` run ceiling remains sufficient. The `$5` eight-hour tier is still fallback-only and the `$100` budget is an alert threshold, not a spend target.
- Docker's official manifest for `docker.io/library/node:24.19.0-bookworm-slim` resolved to index digest `sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df`. The reviewed Azure runtime platform is the immutable `linux/amd64` manifest `sha256:e5a8dee7bc1e6a215d224a7ef8206f7e77271bc3cabd5febf2beafac0674f174`, sourced from Node Docker revision `fd1bf45c51970427bc899084b5381f6827722246`. The official Dockerfile records Node `24.19.0`.
- Commit `1107947d9d25ef5649a4fb5afb2e3968484a0f9a` passed GitHub Verify run `33526734483`. The frozen pnpm 11.24.0 lock and every tracked API/dashboard/worker Docker build input are bound by sanitized SHA-256 evidence in [`../../../config/azure-workload-preplan-revalidation.v1.json`](../../../config/azure-workload-preplan-revalidation.v1.json).

## Inference

- Resource-type location records and the PostgreSQL capability response support the selected East US 2 architecture. They do not reserve capacity or guarantee that this subscription can create each service at plan/apply time.
- The exact manifest digest is immutable, but the human-readable Docker tag can move. Any later build must use the recorded `linux/amd64` digest and re-resolve provenance immediately before the separately approved build.

## Unknown and blocking

- Six least-privilege workload namespaces are `NotRegistered`: `Microsoft.App`, `Microsoft.ContainerRegistry`, `Microsoft.DBforPostgreSQL`, `Microsoft.KeyVault`, `Microsoft.OperationalInsights`, and `Microsoft.ServiceBus`.
- Subscription-specific quota/capacity is not yet proven. Provider registration is an Azure subscription mutation and was not inferred from approval to perform read-only revalidation.
- No workload Terraform plan is allowed until those exact six registrations are separately approved, complete, and followed by another quota/capacity check. Provider registration approval will not authorize a Terraform plan, apply, image build/push, or later phase.

## Execution boundary

This review used Azure read-only inventory/capability calls, Microsoft's public Retail Prices API, two public IPv4 echo sources, and the Docker Official Image manifest endpoint. It contacted a public registry only for manifest metadata. It pulled no image, built/published no container, registered no provider, ran no Terraform command, generated no plan, changed no Azure resource, used no customer data, and incurred no workload cost.

Primary provenance: [Node 24 bookworm-slim Dockerfile](https://github.com/nodejs/docker-node/blob/main/24/bookworm-slim/Dockerfile), [Docker Official Node image](https://hub.docker.com/_/node), [Azure provider registration guidance](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-services-resource-providers), and [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices).
