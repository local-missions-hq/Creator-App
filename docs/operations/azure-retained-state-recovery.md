# Azure retained-state recovery after a cost pause

Status: local recovery gate ready; cost pause active; no Azure or Terraform recovery action authorized

The owner-directed cost teardown removed the Local Missions Terraform-state Storage account after the current bootstrap and control-plane states were copied to a private directory outside the repository. The disposable workload was already empty. Remote Terraform state is intentionally unavailable, and no workload plan may run until both retained roots are restored and independently reconciled.

## Current boundary

- Azure has zero Local Missions Storage accounts and zero disposable workload resources.
- Three retained resource groups, three user-assigned Terraform identities, one email-only action group, the budget, custom roles, workload role assignments, and provider registrations remain.
- Deleting the Storage account also removed the private container and its four container-scoped data-role assignments: the temporary operator assignment plus the three workflow state-backend assignments.
- The two private state backups are sensitive operational artifacts. They remain outside Git, mode `0600`, and must never be copied into the repository, chat, screenshots, logs, or a Terraform command argument.

## Local-only validation

Static contract validation contacts neither Azure nor Terraform:

```sh
node scripts/validate-azure-retained-state-recovery-gate.mjs
```

The future bootstrap recovery plan must also pass the independent [saved-plan reviewer](./azure-retained-state-recovery-plan-review.md). It is local-only and does not authorize plan generation, apply, role assignment, state upload, or workload planning.

The owner may separately authorize read-only verification of the private bytes. Supply the absolute directory through the process environment; the validator prints no state values, identifiers, IP addresses, or secrets:

```sh
LOCAL_MISSIONS_PRIVATE_STATE_BACKUP_DIRECTORY=/private/absolute/path \
  node scripts/validate-azure-retained-state-recovery-gate.mjs --verify-private-backups
```

The validator requires both exact SHA-256/size bindings, regular non-symlink files, mode `0600`, Terraform state format 4, exact managed-resource inventories, and a directory that resolves outside the repository.

## Separately approved recovery sequence

Each numbered gate stops before the next. A plan approval never authorizes apply, role mutation, state upload, workload planning, or any later action.

1. Re-resolve the unique Local Missions subscription without trusting the Azure CLI default. Read only the three retained groups, zero workload, zero Storage, retained control inventory, provider state, current public IPv4, policy, and applicable pricing. Retain no account identifier or IP value.
2. In an isolated temporary Terraform data directory, copy—never move—the private bootstrap state. Generate and independently review a saved recovery plan bound to the current source, provider lock, state hash, target, current IP, eight-hour expiry, and mode `0600`. It may create only the hardened state Storage account and private state container; it must show zero updates, deletes, replacements, workload resources, or Container Apps.
3. Obtain separate approval for that exact saved-plan digest and the retained `$1/month` ceiling. Apply only the reviewed artifact.
4. Obtain separate approval to recreate the temporary human operator's `Storage Blob Data Contributor` assignment at the exact private container scope. Do not grant subscription-, resource-group-, or account-wide data access.
5. Obtain separate approval to migrate the updated bootstrap state and upload the untouched control-plane backup to exactly `local-missions/bootstrap.tfstate` and `local-missions/control-plane.tfstate`. Verify Entra data access, locking, versioning, and hashes before removing temporary working copies.
6. Initialize the control-plane root against the restored exact key. Generate and independently review a saved reconciliation plan. It may create only the three missing workflow container-scoped state-backend assignments and must show no other change.
7. Obtain separate approval for that exact plan and apply only the three reviewed role assignments.
8. Independently prove both retained roots plan zero change, the live retained inventory is exact, the Storage boundary is default-deny/current-IP-only/Entra-only/private/TLS 1.2/infrastructure-encrypted, the workload remains empty, and the other project is untouched.

Only after step 8 passes can the existing 27-resource workload-core saved-plan gate become the next task. Restoration does not authorize workload planning or deployment.

## Fail closed

Stop immediately if the subscription is ambiguous, either backup digest or inventory differs, a backup is inside Git or not mode `0600`, the current IP cannot be bound narrowly, the plan includes anything outside its exact allowlist, the retained inventory differs, any deletion/update/replacement appears, or an approval is absent or expired. Never use direct `terraform destroy`, broad Azure CLI deletion, shared keys, public Blob access, `0.0.0.0/0`, trusted-service bypass, or another project's state.
