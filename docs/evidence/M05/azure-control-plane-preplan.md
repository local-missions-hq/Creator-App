# Azure retained control-plane pre-plan evidence

Status: superseded by the owner's monitored destination, named reviewer, and revised `$100` monthly alert budget

Date: `2026-09-01`

Checkpoint: `M05-retained-state-bootstrap-applied-019`

This evidence retains no Azure account identifier, Entra object identifier, GitHub numeric identifier, email address, credential, token, public IPv4, or Terraform state payload.

## Verified Azure boundary

- The dedicated `Local Missions Development` subscription remains enabled.
- Live inventory remains one retained state resource group, one top-level Storage account, and one private child container. No control-plane or disposable workload resource exists.
- The only live role assignments are the operator's existing management-plane Owner assignment and the explicitly tracked temporary Blob data-role assignment at the state container.
- There are zero subscription policy assignments.
- `Microsoft.Resources`, `Microsoft.Authorization`, `Microsoft.Consumption`, `Microsoft.ManagedIdentity`, and `Microsoft.Insights` are registered. Only the latter two registrations were added during this M5.4 pre-plan pass; registration did not change Azure resource inventory.
- Managed identities list East US 2 support, and Action Groups list East US 2 or global support. The retained control plane uses no paid regional compute SKU or dedicated regional quota.
- Later workload providers, SKUs, and quotas remain deferred until the separately reviewed 27-resource workload-core plan.

## Cost and service review

The owner's later 2026-09-01 direction supplied the monitored destination and revised the monthly alert budget from `$25` to `$100`. A subsequent clarification selected the `$2` two-hour smoke tier for the first disposable workload run and kept `$5`/eight hours only as a fallback ceiling. The 50%/80%/100% actual and forecast notifications remain unchanged. This approval does not authorize a control-plane apply without review of its exact saved plan.

Immediately before this pre-plan gate, the official Azure Retail Prices API was queried again for East US 2 and USD. All 17 expected meters were present and all 17 retained the reviewed prices. The query inspected 302 current catalog items. Subscription-specific discounts, taxes, future workload quota, and delayed teardown remain outside that public estimate.

The retained control plane itself consists of management objects: resource groups, managed identities, federated credentials, role definitions/assignments, one Action Group, and one budget. The already-live state Storage account remains bounded by the approved `$1/month` ceiling.

## PostgreSQL administrator group

Created the security-enabled Microsoft Entra group `Local Missions PostgreSQL Administrators` for elevated database bootstrap and recovery only. The signed-in human operator is its single explicit owner and member. The group is not an application runtime identity, and its object identifier remains process-only for the later workload plan.

Microsoft recommends a group administrator for manageability and warns against using the PostgreSQL Entra administrator for regular application operations: [Microsoft Entra authentication for PostgreSQL Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-azure-ad-authentication).

## GitHub immutable identity review

Initial read-only GitHub inspection verified the expected public `stratiosai/Creator-App` repository, `main` default branch, and numeric owner/repository identifiers without retaining those identifiers. It initially found:

- the three required environments do not exist;
- immutable OIDC subjects are not enabled; and
- the current operator is the repository's only collaborator, so no independent environment reviewer can be configured yet.

The owner then named `stratiosai` as the reviewer and explicitly continued with the connected single-user repository. All three environments were created with `main`-only branch policies, `stratiosai` as required reviewer, administrator bypass disabled, and no environment secrets. GitHub-native self-review prevention is disabled because the sole collaborator would otherwise be permanently deadlocked; Codex remains the separate automated plan producer and the exact saved-plan apply remains a separate owner decision. Immutable GitHub OIDC subjects were enabled and re-read successfully. GitHub documents environment reviewers and self-review controls: [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments). GitHub and Microsoft document the immutable owner/repository-ID subject format used by the Terraform contract: [GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc) and [Microsoft immutable-subject guidance](https://learn.microsoft.com/en-us/entra/workload-id/workload-identities-github-immutable-subjects).

## Blocking inputs

1. Resolved: the owner supplied the monitored email destination process-only.
2. Superseded with an explicit single-human exception: `stratiosai` is the only repository collaborator and is the named human reviewer independent from Codex as plan producer. GitHub-native self-review prevention cannot be enabled without deadlocking this repository.

Both inputs are now supplied. The next gate is generation and independent review of the exact 20-resource control-plane saved plan; no control-plane apply is authorized by this prerequisite evidence.
