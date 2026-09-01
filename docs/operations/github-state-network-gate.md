# GitHub workflow state-network gate

Status: GitHub Free selected; organization created; federation-only saved plan reviewed; no apply or transfer

Checkpoint: `M05-free-org-federation-saved-plan-reviewed-027`

## Current no-charge decision

Use the `local-missions-hq` GitHub Free organization with no payment method. Keep the existing repository public and personal-owner hosted until the exact federation plan and coordinated transfer window are separately approved. Continue GitHub-hosted verification and no-apply OIDC/ARM proof, but keep provider-backed Terraform state operations on the reviewed local operator path while Storage remains default-deny, Entra-only, TLS-protected, Shared Key disabled, anonymous access disabled, and trusted-service bypass disabled.

GitHub's read-only API verified the organization on plan `free`, one active owner, zero repositories, and no transfer. The billing UI verified that no payment method exists. A budget cannot be created without adding payment information, so paid products remain prohibited rather than enabled with a nonzero limit.

## Ordered migration

1. Create the GitHub Free organization with one personal-account owner, no invitations, no repositories, and no payment method. **Complete.**
2. Preview the three future immutable organization/repository environment subjects while the repository ID remains stable. **Complete.**
3. Generate and independently review one retained-control-plane saved plan containing only those three subject updates. **Complete:** three in-place updates; zero create/delete/replace/network/RBAC/budget/workload changes; SHA-256 `5fbc63430b4778a3e18039109bbe66c065663621fd0025cbd51cffc71a0d3903`.
4. Obtain approval bound to the exact plan digest and one coordinated transfer window. Stop before both apply and transfer.
5. Revalidate plan/source/provider-lock digests, unchanged Azure inventory, current personal repository ownership, organization ownership, and operator state access. Apply only the reviewed three updates and reconcile Azure independently.
6. Transfer the still-public repository immediately afterward. Verify its stable repository ID, redirects, branch/default settings, protected environments, required reviewer, main-only rules, immutable OIDC setting, and Actions permissions.
7. Run the no-Terraform three-identity OIDC/ARM proof. The real Blob read must remain refused by the default-deny firewall; GitHub workflow state access stays deferred.
8. Keep remote-backend plan/apply/destroy on the reviewed local operator path and retain the temporary operator Blob role until a later private-runner/recovery proof is separately approved.

## Fail-closed requirements

- No self-hosted runner on the public repository or founder's daily-use Mac.
- No global GitHub Actions IP allowlist, dynamic runner-IP workaround, all-networks mode, or trusted-services bypass.
- No repository transfer before the exact federation saved plan, old/new subjects, rollback procedure, and coordinated window are approved.
- No federation replacement or network change outside a saved Terraform plan.
- No paid runner, payment method, or GitHub subscription under the current decision.
- No real Terraform state payload printed, copied to artifacts, or used as a network test object.
- No operator-role removal before separate recovery proof.
- No workload plan, image publication, application activation, or Stripe action under this gate.

## Deferred paid option

Public estimates reviewed 2026-09-01:

- GitHub Team: `$4` per user per month.
- Linux two-core larger runner: `$0.006` per minute; `$0.12` per 20 minutes or `$0.36` per hour.
- Idle larger runner: `$0` according to GitHub's current billing documentation.
- Azure VNet base: `$0`; associated services, traffic, logs, taxes, and offer-specific charges remain unapproved until the exact saved plan and billing screen are reviewed.

The owner deferred this option to M14. The `$100` Azure budget does not include or authorize GitHub charges. A future paid proposal requires fresh pricing, a separate GitHub approval and spending control, and an exact Azure network saved plan.

## Current stop

The free organization exists and the federation-only saved plan has been reviewed. No payment, Azure mutation, or repository transfer occurred. The next owner decision is whether to approve exact plan SHA-256 `5fbc63430b4778a3e18039109bbe66c065663621fd0025cbd51cffc71a0d3903` and the coordinated still-public repository transfer window. Plan approval does not authorize a workload plan, paid GitHub feature, Storage firewall change, or operator-role removal.
