# Azure subscription placement and workflow RBAC

Status: dedicated `Local Missions Development` retained-state bootstrap applied and migrated; 20-resource control-plane plan pending

## Decision

A dedicated Local Missions subscription is the owner-selected isolation boundary. On 2026-08-31, the existing subscription with four non–Local Missions resource groups was rejected, then `Local Missions Development` was created under the sole active Microsoft Customer Agreement billing scope and available standard Microsoft Azure Plan. Before bootstrap apply, read-only verification found the new subscription enabled in the current tenant with zero resource groups, zero resources, and one subscription-level Owner assignment for the signed-in operator. The exact reviewed bootstrap was subsequently applied and migrated on 2026-09-01. The existing other-project subscription remains the CLI default. No subscription or tenant identifier is retained in source or this document.

Both choices now use the same safe development pattern:

- `rg-local-missions-dev-eus2-001` is a retained, Local-Missions-only landing-zone resource group owned by the control-plane Terraform root.
- The workload root reads and validates that group by exact name and ownership tags. It cannot create or delete it.
- Every workload resource inside the group contains a unique `e2rYYMMDDNN` deployment stamp and disposable lifecycle tags.
- Daily teardown destroys and independently reconciles every stamped workload resource, leaving the landing zone empty.
- No workflow receives subscription Owner, subscription Contributor, or unconstrained access-administration rights.

This corrects the earlier stamped-resource-group model. Recreating and deleting a resource group requires resource-group write/delete permission at a parent scope. In a subscription containing another project, that creates avoidable blast radius. Microsoft recommends the smallest role-assignment scope that meets the requirement, and resource groups are intended to collect resources with a shared lifecycle.

## Workflow role matrix

| Workflow identity | Landing-zone roles                                                             | Purpose                                                                                       |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Plan              | Reader                                                                         | Read the Local Missions landing zone and generate a plan                                      |
| Apply             | Local Missions Dev Workload Deployer; Role Based Access Control Administrator  | Create/update stamped resources without delete and create narrowly constrained app-data roles |
| Destroy           | Local Missions Dev Workload Destroyer; Role Based Access Control Administrator | Read/delete stamped resources without permission to delete the retained landing-zone group    |

The two Role Based Access Control Administrator assignments use condition version `2.0`. Create/delete delegation is limited to `ServicePrincipal` recipients and exactly these roles:

- AcrPull
- Azure Service Bus Data Receiver
- Azure Service Bus Data Sender
- Key Vault Secrets User
- Storage Blob Data Contributor

The custom roles replace built-in Contributor because Microsoft documents that Contributor's wildcard actions include resource-group deletion, and deleting a group can delete its contents without individual resource-delete permission. Apply excludes all delete actions. Destroy permits reads/deletes but explicitly excludes `Microsoft.Resources/subscriptions/resourceGroups/delete`. The separate RBAC condition does not permit assigning Owner, Contributor, Role Based Access Control Administrator, User Access Administrator, or any unrelated role. Every assignment and both custom-role assignable scopes are only the Local Missions landing zone.

## Retained versus disposable

Retained after daily teardown:

- Terraform state group/account/container
- Control resource group
- Empty Local Missions workload landing zone
- Plan/apply/destroy managed identities and exact GitHub federation
- Two Local Missions-only custom workload role definitions
- Five landing-zone workflow role assignments
- Three private-state-container role assignments for the plan/apply/destroy identities
- Local Missions-tag-filtered budget and monitored Action Group

Destroyed and reconciled each day:

- 27-resource stamped core workload
- Three Container Apps after second-phase activation
- All workload-created application identities and nine application data-role assignments
- All metered application/data/telemetry/registry resources in workload state

Successful teardown requires both empty workload Terraform state and independent live inventory showing zero resources with the exact deployment stamp. The landing zone may remain; any stamped resource, orphaned role assignment, soft-delete ambiguity, or inventory mismatch is a failed cleanup.

## Remaining owner and external gates

1. Preserve and independently reconcile the applied three-resource backend and its remote state; never place a state payload or consumed plan in source control.
2. Keep the temporary operator container role until all three workflow identities prove backend access and an approved recovery path exists.
3. Supply and verify the monitored alert destination, immutable GitHub subjects, PostgreSQL administrator group, later trusted network rules, and Node base digest outside source control.
4. Independently review the 20-resource retained control/landing-zone plan, two custom roles, five workload role assignments, and three state-container role assignments before requesting apply approval.
5. Keep the control-plane apply, every later plan/apply, deployment, test, and destroy behind its own authorization.

The machine-readable contract is [`../../config/azure-subscription-placement.v1.json`](../../config/azure-subscription-placement.v1.json), validated by `pnpm azure-placement:check`.

## Official references

- [Delegate Azure access management with conditions](https://learn.microsoft.com/en-us/azure/role-based-access-control/delegate-role-assignments-overview)
- [Understand Azure role definitions](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions)
- [Understand Azure role assignments and scope](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments)
- [Understand Azure custom roles](https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles)
- [Manage Azure resource groups](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-portal)
- [Delete Azure resource groups and required access](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/delete-resource-group)
