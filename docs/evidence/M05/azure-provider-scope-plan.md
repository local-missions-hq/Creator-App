# Azure provider-scope plan evidence

Checkpoint: `M05-azure-naming-provider-scope-plan-012`
Date: 2026-08-31
Status: passed plan-only scope validation; no Azure resource mutation

The signed-in account exposed one nonproduction subscription containing another workload. Read-only inventory found no Local Missions resource group. Local Missions therefore uses only `rg-local-missions-*` resource groups and `lm` resource names; every `rg-pp-*` resource, identity, state object, and control-plane object is outside this Terraform boundary. Shared-subscription apply remains unapproved, and a dedicated Local Missions subscription is preferred before staging.

The reviewed stamp is `e2r26083101`. Read-only checks found the exact workload resource group absent and the proposed disposable Storage, Container Registry, Key Vault, and retained state-storage names available at check time. Availability is not a reservation and must be rechecked immediately before any approved create plan.

AzureRM 5.0.1 now has an explicit hardened provider block: automatic resource-provider registration is `none`, Storage uses Microsoft Entra authentication, Key Vault soft-delete recovery is retained, purge-on-destroy is disabled, and nonempty resource-group deletion is protected. Subscription and tenant UUIDs are injected only through the process environment for equality checks and are never output or committed.

The ordinary backend-disabled `terraform plan` correctly refused to proceed because the dedicated Local Missions remote backend has not been bootstrapped. No backend was initialized and the other workload's state was not used. The approved provider-scope proof then ran through an isolated Terraform test with `command = plan`, which uses ephemeral test state:

```text
run "reviewed_provider_scope_plan"... pass
Success! 1 passed, 0 failed.
```

That real-provider plan read only the current client configuration, matched the separately supplied expected subscription and tenant, retained `cost_profile=plan-only`, and planned zero additions, zero changes, and zero destroys. It produced no saved plan, apply, provider registration, role assignment, resource, remote state, or Azure cost.

The next gate is not apply. It is a separately approved retained bootstrap and full create-plan preparation: decide shared co-tenancy versus a dedicated subscription; approve Local Missions state/control resources, a monitored alert destination, and the `$25` monthly budget; create separate least-privilege identities; publish reviewed immutable images; then generate and independently review the saved 31-resource plan. Apply and the selected same-day cost tier require another explicit approval.
