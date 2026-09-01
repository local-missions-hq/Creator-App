# Azure retained foundation and two-phase workload plan

Status: retained bootstrap/control plane and workflow authorization verified; V2 lifecycle contract ready; workload planning remains gated

## Why the plan is phased

The retained Terraform backend cannot create itself while already using itself. The disposable Container Registry also cannot contain the API, dashboard, and worker images before that registry exists. A single first-time 30-resource workload apply would therefore be operationally circular: Container Apps would reference image digests that could not yet have been published to the new ACR.

The safe sequence is:

1. **Retained state bootstrap — 3 resources.** Create one protected Local Missions state resource group, one Entra-only/default-deny/versioned Storage account, and one private container using a separately approved local bootstrap state. Verify them, then immediately migrate bootstrap state into `local-missions/bootstrap.tfstate`.
2. **Retained control plane and landing zone — 20 resources.** Create one control resource group, one empty Local Missions-only development landing-zone group, separate plan/apply/destroy managed identities, three exact immutable GitHub federated credentials, two lifecycle-separated custom workload roles, one tagged cost Action Group, one `$100` Local Missions-tag-filtered subscription budget with 50%/80%/100% actual and forecast notifications, five workflow role assignments scoped only to the landing zone, and three Blob data-role assignments scoped only to the private Terraform-state container.
3. **Disposable workload core — 27 resources.** Inside the retained landing zone, create stamped Storage, PostgreSQL, Service Bus, Key Vault, telemetry, ACR, Container Apps environment, application managed identities, and scoped application RBAC. Do not create API, dashboard, or worker yet.
4. **Immutable image publication.** Build from the reviewed Node base digest and exact commit, scan, sign, push to the new ACR, verify the three digests, and bind them to evidence.
5. **Application activation — 3-resource delta.** Generate and review a new saved plan that adds exactly API, dashboard, and worker, bringing the disposable workload to 30 resources. Apply only that reviewed plan after separate authorization.
6. **Test and destroy.** Run the approved cloud/iOS matrix, then apply a separately reviewed destroy plan for the exact stamped workload resources. The empty landing zone, retained state/control resources, and every `rg-pp-*` object remain outside the destroy scope.

## Identity boundary

GitHub and Microsoft now support immutable GitHub OIDC subjects in the form `repo:<owner>@<owner_id>/<repo>@<repo_id>:environment:<environment>`. Microsoft Entra requires the credential subject to match the token `sub` exactly and case-sensitively. The repository therefore accepts only subject-previewed immutable values for the three protected GitHub environments. Name-only subjects, guessed numeric IDs, wildcard subjects, shared identities, client secrets, and subscription Owner are forbidden.

The control plane implements the least-privilege shared-safe boundary without granting subscription-wide workflow permissions. Plan receives Reader at the Local Missions landing zone. Apply receives `Local Missions Dev Workload Deployer`, which permits the reviewed workload providers but excludes every delete action. Destroy receives `Local Missions Dev Workload Destroyer`, which permits read/delete but excludes deletion of the retained landing-zone group. Both receive a separately conditioned Role Based Access Control Administrator assignment that limits role-assignment create/delete to AcrPull, Key Vault Secrets User, Storage Blob Data Contributor, and Service Bus sender/receiver roles for ServicePrincipal recipients. Separately, plan/apply/destroy each receive Storage Blob Data Contributor only at the retained private state container so Terraform can lock and update their distinct state keys through Microsoft Entra. Built-in Contributor, Owner, User Access Administrator, unconstrained delegation, and access to another project remain forbidden.

## Retained cost versus daily deletion

The stamped 27/30-resource workload is destroyed at the earlier of its selected 2/4/8-hour tier or 11:00 PM New York time. The empty landing zone, retained backend, workflow identities, RBAC boundary, budget, alerts, and federated credentials survive daily teardown. The state account has a conservative `$1/month` ceiling; the other retained objects are management/control objects, while delivered notifications or provider changes may have separate terms.

If literally no retained Azure cost is acceptable, do not bootstrap remote state. Local-only planning can continue, but safe shared/CI apply, saved-plan consumption, and independent destroy reconciliation remain blocked.

## Current gate

The dedicated `Local Missions Development` subscription is enabled and tenant-matched. The retained three-resource state bootstrap and 20-resource control/landing-zone plane were applied from separately reviewed saved plans and independently reconciled. Corrected GitHub OIDC/ARM proof passed for all three identities, and live role review proved plan read-only, apply no-delete, destroy unable to delete the landing-zone group, and five-role ServicePrincipal-only delegated RBAC. The workload landing zone remains empty. One temporary operator Blob data-role assignment remains because default-deny Storage blocks standard GitHub-hosted runners; paid private networking is deferred.

The activation-valid V2 contract now binds the exact bootstrap, control, 27-resource core, immutable image publication, three-app activation, tests, 30-resource destroy, and independent reconciliation sequence. The next gate is action-time revalidation of the current public IPv4, Node base-image digest, dependency/build inputs, East US 2 SKUs/quota/prices, and `$2` two-hour smoke ceiling. No workload plan may be generated until that review passes.
