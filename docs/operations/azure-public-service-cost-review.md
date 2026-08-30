# Azure public service, region, and cost review

Status: public catalog review complete on 2026-08-30; Azure access and plan approval pending

This review is the last repository-only checkpoint before Azure subscription access. It used
Microsoft's public, unauthenticated Retail Prices API and current Microsoft Learn documentation. It
did not authenticate to Azure, inspect a subscription, initialize a backend, request an
account-specific offer, execute a provider-backed Terraform plan, contact a registry, or create a
resource or charge.

## Decision

- Select **East US 2** (`eastus2`) for the first ephemeral development plan. The public retail
  catalog returned the required meters in that region, and the PostgreSQL regional matrix lists
  East US 2 with the Intel compute family used by the candidate Burstable server. Subscription
  registration, policy, quota, and moment-of-plan availability remain unverified until Azure access
  is separately approved.
- Retain PostgreSQL 16 `B_Standard_B1ms`, 32 GiB storage, seven-day local backup retention, no HA,
  and no geo backup. Microsoft describes Burstable as suitable for development and proof-of-concept
  work and documents B1ms as 1 vCore/2 GiB. PostgreSQL includes backup storage up to 100% of the
  provisioned server storage; excess backup storage is billed separately.
- Retain the Container Apps Consumption shape: API, dashboard, and worker each use 0.25 vCPU/0.5
  GiB and scale from zero to one. A revision at zero replicas has no resource-consumption charge.
  The per-subscription monthly free grant is 180,000 vCPU-seconds, 360,000 GiB-seconds, and two
  million requests, but the estimate below deliberately assumes those grants have already been
  consumed.
- Retain Service Bus Standard because Basic does not support the queue's required duplicate
  detection. Retain ACR Basic because it is the cost-optimized development tier, supports Microsoft
  Entra authentication, and includes 10 GiB storage.
- Retain Standard Hot LRS Blob storage, Standard Key Vault, and workspace-based Application
  Insights backed by the capped 30-day Log Analytics workspace. The first five monthly GB shown by
  the public Analytics Logs meter are free; the estimate deliberately prices the full 0.5 GB daily
  cap anyway.

## Public retail estimate

The estimate uses USD public retail meters returned for `eastus2` on 2026-08-30. It assumes one
eight-hour run, a 730-hour month for prorating monthly storage, all three Container Apps replicas
active for the full eight hours, one million external requests, 0.5 GB billable logs, 1 GB Blob
data, and one 10,000-operation block for each modeled Storage/Key Vault category.

| Component                            | Reviewed public meter/assumption                                 | Eight-hour estimate |
| ------------------------------------ | ---------------------------------------------------------------- | ------------------: |
| PostgreSQL B1ms + 32 GB              | $0.017/hour + $0.115/GB-month                                    |               $0.18 |
| Three Container Apps + 1M requests   | $0.000024/vCPU-second + $0.000003/GiB-second + $0.40/1M requests |               $1.05 |
| Service Bus Standard                 | $0.013441/hour                                                   |               $0.11 |
| Container Registry Basic             | One full $0.1666 registry day                                    |               $0.17 |
| StorageV2 Hot LRS                    | 1 GB prorated plus conservative transaction blocks               |               $0.11 |
| Key Vault Standard                   | One $0.03/10K operation block                                    |               $0.03 |
| Log Analytics + Application Insights | 0.5 GB at $2.76/GB; free tier treated as unavailable             |               $1.38 |
| **Raw estimate**                     |                                                                  |           **$3.02** |
| **Uncertainty reserve**              | offer/quota/egress/retry/restore/delayed-destroy variance        |           **$1.98** |
| **Proposed per-run ceiling**         |                                                                  |           **$5.00** |

This is an estimate, not a quote or subscription-backed cost proof. It excludes account-specific
offers, discounts, taxes, egress, retained control-plane resources, image build/scan/sign/push,
provider-side dependencies, and overruns caused by retries, restore time, or failed cleanup.

## Owners and budget proposal

| Responsibility            | Accountable owner | State                                                        |
| ------------------------- | ----------------- | ------------------------------------------------------------ |
| Platform/technical owner  | Blake Tindol      | Assigned                                                     |
| Finance/cost owner        | Blake Tindol      | Assigned                                                     |
| Alert response owner      | Blake Tindol      | Assigned; real monitored destination still required          |
| Technical on-call owner   | Blake Tindol      | Assigned                                                     |
| Plan producer             | Codex             | Automated producer accountable to Blake Tindol               |
| Independent plan reviewer | Blake Tindol      | Independent from the automated producer; approval is pending |

Proposed development controls:

- `$5.00` maximum estimated cost for one eight-hour ephemeral run;
- `$25.00` monthly budget;
- actual and forecast alerts at 50% (`$12.50`), 80% (`$20.00`), and 100% (`$25.00`); and
- the existing earlier-of-eight-hours-or-11:00-PM America/New_York destroy deadline.

The budget and alert destination are not approved or verified by this document. A real monitored
destination must be supplied outside the repository. Azure budget notifications are alerts, not a
hard spending stop.

## Sources

- [Azure Retail Prices REST API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) — unauthenticated public USD retail meters by region and SKU.
- [Azure Container Apps billing](https://learn.microsoft.com/en-us/azure/container-apps/billing) — Consumption billing, monthly grants, and scale-to-zero behavior.
- [Azure Database for PostgreSQL regions](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/overview#azure-regions) and [compute options](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-compute) — East US 2 support, Burstable intent, B1ms capacity, and minimum storage.
- [PostgreSQL backup and restore](https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-backup-restore) — seven-day default PITR and included backup allowance.
- [Service Bus duplicate detection](https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection) — Standard/Premium support and Basic exclusion.
- [Container Registry tiers](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus) — Basic development intent, Entra support, and 10 GiB included storage.
- [Azure Monitor Logs costs](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cost-logs) — workspace-based Application Insights billing, ingestion, and included analytics retention.
- [Storage redundancy](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy) and [Key Vault overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview) — retained service design context.

The exact API filters and captured meter values are recorded in
`config/azure-public-cost-review.v1.json`. Requery them after 2026-09-06 or immediately before a
provider-backed plan, whichever comes first.

## Stop gate

Stop here until the user explicitly approves Azure access for the next action. The next action is a
subscription-scoped pre-plan validation and saved provider-backed Terraform plan. That step will
require Azure authentication, subscription read access, exact identity/artifact/backend references,
and another current cost check. It must not apply, deploy, restore, roll back, destroy, or activate
CI. Apply and destroy remain separate later approvals.
