# Azure retained-state bootstrap apply and migration evidence

Status: three-resource bootstrap applied, verified, and migrated to the Entra-backed remote backend

Checkpoint: `M05-retained-state-bootstrap-applied-019`
Completed: `2026-09-01`
Target display name: `Local Missions Development`

This evidence intentionally contains no subscription UUID, tenant UUID, public IPv4 address, email address, credential, token, access key, connection string, or Terraform state payload.

## Authorization and expired-plan refusal

The owner explicitly authorized Terraform apply and continued execution at the agreed lowest tiers on 2026-09-01. The prior 2026-08-31 saved plan was expired and was not consumed. Before generating its replacement, read-only checks reconfirmed:

- the exact dedicated subscription and tenant;
- one subscription-level Owner assignment for the signed-in operator;
- zero resource groups and zero resources;
- the unchanged provider lock and pre-migration bootstrap source digests;
- global availability of the retained Storage account name; and
- one valid current operator IPv4 retained only in process memory and the protected plan.

## Replacement saved-plan binding

- Logical artifact: `local-missions-bootstrap.tfplan`
- SHA-256: `4a35f1ca66da808e3c89b05df4cda7a94bee89c21980d347dba9261a056dbfec`
- Size and mode: 11,331 bytes; `0600`
- Generated: `2026-09-01T11:18:28+00:00`
- Review expiry: `2026-09-01T19:18:28+00:00`
- Terraform: 1.15.7
- AzureRM: 5.0.1
- Provider lock SHA-256: `71dfddefb8c7d0b3c89bc300587ad764ccde47fce1c43f122f7e600ba4050c33`
- Source SHA-256 at plan: `c3d31985c406313b5189bcc2bac381266250c4d0013cca8ae2e90b029afe18f7`
- Source SHA-256 after permanent remote-backend declaration: `8b03482ebf9f40ca7f990c78da0b9e8f444edbb1d32f21e0c274e4b7dfa3e45d`
- Git baseline: `d31d92a085f1d1e626c72456ec6609a9c5198208`; dirty worktree bound additionally by the source digest

The saved plan and raw Terraform JSON were never stored in the repository. The consumed plan, refresh-only plan, and one-time local state were deleted after independent remote-state verification.

## Independently reviewed changes

| Address                              | Type                        | Action |
| ------------------------------------ | --------------------------- | ------ |
| `azurerm_resource_group.state[0]`    | `azurerm_resource_group`    | Create |
| `azurerm_storage_account.state[0]`   | `azurerm_storage_account`   | Create |
| `azurerm_storage_container.state[0]` | `azurerm_storage_container` | Create |

Totals: 3 creates, 0 updates, 0 deletes, and 0 replacements. The streamed JSON review found no resource drift, no unexpected address, and zero known secret-shaped string values.

## Provider registration

`Microsoft.Storage` was initially unregistered. It was explicitly registered only after the replacement plan passed review and immediately before apply. Registration created no resource group or resource. Terraform automatic resource-provider registration remains disabled.

Microsoft documents that required providers must be registered before using their service and recommends registering only when ready to use them: [Azure resource providers](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-services-resource-providers).

## Applied Azure inventory

- Terraform-managed retained resources: 3
- Azure resource groups: 1
- Azure top-level resources: 1 Storage account
- Azure child resources: 1 private Blob container
- Disposable workload resources: 0
- Control-plane identities, budget, action group, and landing zone: 0
- Storage provider status: `Registered`

The generic Azure top-level inventory reports the Storage account but not its Blob child container. Terraform remote state independently resolves the three managed resource addresses plus the read-only client-configuration data source.

## Live security verification

- StorageV2 Standard LRS with Hot access tier
- Public endpoint with default-deny network rules and exactly one current operator IPv4 rule
- Network bypass `None`
- Microsoft Entra authentication is the default
- Shared Key, local users, and anonymous Blob access disabled
- HTTPS only and TLS 1.2 minimum
- Infrastructure encryption enabled
- Blob versioning and change feed enabled
- Blob and container deletion recovery set to 30 days
- Container public access `None`
- `prevent_destroy` remains declared on all three Terraform-managed resources

## Remote state and temporary operator RBAC

Subscription Owner does not grant Blob data-plane access through Microsoft Entra. A single temporary `Storage Blob Data Contributor` assignment was therefore created for the current operator at the exact `tfstate` container scope. Microsoft documents this explicit data-role requirement and supports container-level assignment: [assign a Blob data role](https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access).

The bootstrap state was migrated to `local-missions/bootstrap.tfstate` with Azure CLI and Microsoft Entra authentication. Independent clean initialization proved:

- the remote state blob exists in the private container;
- version history is present;
- Terraform acquired the remote Blob lock;
- refresh found no resource drift;
- the backend contract records `azurerm` and `migration_required=false`; and
- a fresh protected Terraform data directory resolves exactly three managed resources and one read-only data source.

HashiCorp documents that the `azurerm` backend uses the Storage data plane and recommends Microsoft Entra authentication: [Terraform azurerm backend](https://developer.hashicorp.com/terraform/language/backend/azurerm).

The control-plane target was corrected from 17 to 20 Terraform resources by adding three container-scoped state-backend assignments for the future plan/apply/destroy identities. The temporary operator assignment must remain until those identities prove backend access and an approved recovery path exists, then be removed and reconciled.

## Sanitization incident

During the first streamed JSON review attempt, a command-piping error caused raw Terraform JSON to appear in transient tool output. That output included process-only subscription/tenant identifiers and the current IP. It contained no credential, token, password, access key, connection string, or known secret value, and it was not written to the repository. The review was rerun through a sanitizer script, subsequent outputs were sanitized, and this incident is retained rather than silently omitted.

## Next gate

M5.3 is complete. M5.4 subsequently received a monitored alert destination and revised `$100/month` alert budget; GitHub immutable subjects and the corrected 20-resource retained control-plane plan remain separately evidenced. No control-plane apply is claimed by this bootstrap evidence.
