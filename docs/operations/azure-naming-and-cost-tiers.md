# Local Missions Azure naming and cost tiers

Status: implemented and locally validated; live name availability is read-only evidence, not deployment approval
Scope: Local Missions only; no other Azure workload may be targeted, imported, renamed, or reused

## Placement decision

The signed-in Azure account currently exposes one nonproduction subscription whose existing resource groups use the `rg-pp-*` prefix for another workload. Local Missions may share that development subscription only through hard logical isolation:

- Local Missions owns `rg-local-missions-*` resource groups and compact `lm` resource names only.
- It receives separate Terraform state, managed identities, budget/alerts, tags, teardown evidence, and one retained development landing-zone resource group.
- `rg-pp-*`, its state storage, identities, External ID resources, and all other workload objects are forbidden Terraform targets.
- Shared-subscription placement requires a separately recorded approval before apply. A dedicated Local Missions subscription remains preferred before staging.

No subscription ID, tenant ID, user address, object ID, public IP address, credential, or access token belongs in this document, source control, a Terraform variable file, or retained plan output.

## Naming components

Readable Azure names use:

```text
<resource-type>-<workload>-<component>-<environment>-<deployment-stamp>
```

Global resources that forbid hyphens use compact concatenation. The workload is `local-missions` in readable names and `lm` in constrained global names. The current region is `eastus2`, encoded as `e2` inside the deployment stamp.

An ephemeral stamp is:

```text
e2r<YYMMDD><sequence>
```

For example, `e2r26083101` is East US 2, ephemeral run, 2026-08-31, sequence 01. A stamp is never reused. This prevents same-day collisions and avoids attempting to reuse a soft-deleted Key Vault name on a later run.

## Retained names

| Purpose                         | Name                                   |
| ------------------------------- | -------------------------------------- |
| Control resource group          | `rg-local-missions-control-eus2-001`   |
| State resource group            | `rg-local-missions-state-eus2-001`     |
| Workload landing-zone group     | `rg-local-missions-dev-eus2-001`       |
| State storage account candidate | `stlmtfse2001`                         |
| State container                 | `tfstate`                              |
| Control state key               | `local-missions/control-plane.tfstate` |
| Disposable workload state key   | `local-missions/dev-workload.tfstate`  |

The state storage name is now consumed by the live retained bootstrap and its private state container. The workload landing-zone group remains a planned retained management boundary between runs; after a separately approved control-plane apply, it will keep workflow RBAC at resource-group scope. Retained resources are never included in the daily workload destroy target.

## Disposable example

Using `e2r26083101`:

| Resource                   | Name                                          |
| -------------------------- | --------------------------------------------- |
| Retained workload boundary | `rg-local-missions-dev-eus2-001`              |
| Storage account            | `stlmdeve2r26083101`                          |
| PostgreSQL Flexible Server | `psql-local-missions-dev-e2r26083101`         |
| Service Bus namespace      | `sb-local-missions-dev-e2r26083101`           |
| Container Registry         | `acrlmdeve2r26083101`                         |
| Key Vault                  | `kvlmdev-e2r26083101`                         |
| Log Analytics              | `law-local-missions-dev-e2r26083101`          |
| Application Insights       | `appi-local-missions-dev-e2r26083101`         |
| Container Apps environment | `cae-local-missions-dev-e2r26083101`          |
| API app                    | `ca-lm-api-dev-e2r26083101`                   |
| Dashboard app              | `ca-lm-dashboard-dev-e2r26083101`             |
| Worker app                 | `ca-lm-worker-dev-e2r26083101`                |
| API identity               | `id-local-missions-api-dev-e2r26083101`       |
| Dashboard identity         | `id-local-missions-dashboard-dev-e2r26083101` |
| Worker identity            | `id-local-missions-worker-dev-e2r26083101`    |

The exact machine contract is [`../../config/azure-naming.v1.json`](../../config/azure-naming.v1.json), validated by `pnpm azure-naming:check`.

## Cost tiers

These are conservative public-retail planning estimates derived from the currently reviewed East US 2 meters. They are not a quote and exclude subscription offers, taxes, egress, delayed deletion, image build/scan/sign/push, retained control-plane resources, and provider-discovered dependencies.

| Tier             | Maximum Azure runtime | Test purpose                                        | Raw estimate | Hard planning ceiling |
| ---------------- | --------------------: | --------------------------------------------------- | -----------: | --------------------: |
| `plan-only`      |               0 hours | Provider/scope/naming validation; no resources      |      `$0.00` |               `$0.00` |
| `smoke-2h`       |               2 hours | Deployment, health, auth, and teardown smoke        |      `$0.85` |               `$2.00` |
| `integration-4h` |               4 hours | API/database/queue/upload integration               |      `$1.66` |               `$3.00` |
| `full-8h`        |               8 hours | Complete guarded cloud test suite and recovery work |      `$3.02` |               `$5.00` |

Every Azure-resource tier uses the approved `$100` monthly alert budget and 50%/80%/100% actual and forecast alerts. The first deployment uses the `$2` two-hour smoke tier; `$5`/eight hours is only a separately justified fallback ceiling. The monitored destination is supplied process-only; delivery remains to be proven after the separately approved control-plane apply. Persistent development is prohibited. Resources must be destroyed at the earlier of the selected tier limit or 11:00 PM `America/New_York` on the creation day.

## Required tags

Every disposable resource carries at least:

- `application=local-missions`
- `application_code=lm`
- `environment=development`
- `region=eastus2`
- `lifecycle=disposable`
- `cost_profile=<selected-tier>`
- `run_ceiling_usd=<selected-tier-ceiling>`
- `deployment_stamp=<unique-stamp>`
- `managed_by=terraform`
- `terraform_root=workload-dev`
- `owner`, full `commit_sha`, `created_at`, `expires_at`, purpose, and `workload_resource_group=rg-local-missions-dev-eus2-001`

Names contain no person, email, customer, mission, venue, location proof, or other sensitive value. Tags are not a safe location for secrets or participant data.

## Daily teardown invariant

The daily destroy target is every Terraform-managed workload resource carrying the exact `e2rYYMMDDNN` deployment stamp inside `rg-local-missions-dev-eus2-001`, plus reconciliation of its workload state key. The landing-zone group itself remains empty and retained. Cleanup must never traverse into Local Missions state/control resources or any `rg-pp-*` resource. Completion requires both:

1. zero disposable objects in Terraform state; and
2. an independent live Azure inventory showing zero resources with the exact deployment stamp inside the Local Missions landing zone.

A timeout, remaining resource, lock, role assignment, soft-delete ambiguity, or inventory mismatch remains an open cleanup incident. It is not reported as successful merely because Terraform destroy returned.
