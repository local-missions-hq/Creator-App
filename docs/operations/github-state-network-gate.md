# GitHub workflow state-network gate

Status: local design passed; founder and billing approval pending

Checkpoint: `M05-github-state-network-design-local-025`

## Selected recommendation

Use a Local Missions-only GitHub Team organization, a two-core Linux larger runner with maximum concurrency one, and GitHub's Azure VNet private-network integration. Permit the retained state account only from the exact dedicated runner subnet through the `Microsoft.Storage` service endpoint. Keep default deny, Entra-only data access, TLS, disabled Shared Key, disabled anonymous access, no trusted-service bypass, and protected environment review.

The currently visible candidate organization slug is `local-missions-hq`. It is not reserved. Creating it, purchasing Team, transferring the repository, or changing Azure is prohibited until the owner approves the exact external impact.

## Ordered migration

1. Record the approved organization slug, one-seat Team ceiling, runner-minute ceiling, and transfer window.
2. Create the organization and Team subscription; do not transfer yet.
3. Generate the new immutable GitHub owner/repository subject preview and a complete federation/network migration plan, including failure recovery and repository-transfer rollback.
4. Generate and independently review one retained-control-plane saved plan containing only the exact federation replacements and retained network resources. Include provider registration, resource counts, cost meters, security rules, source/lock digests, expiry, and zero workload resources.
5. Obtain approval bound to that artifact. Apply only the reviewed retained delta and reconcile Azure independently.
6. Transfer the public repository during the approved window, configure only the selected repository/runner group, and keep all three protected environments main-only with required review.
7. Run a no-Terraform three-identity Blob read/write/lock/delete proof against three distinct disposable proof keys—not the real state objects—then delete the proof objects and verify version/soft-delete evidence without exposing payloads.
8. Run one reviewed remote-backend initialization per identity/key, with no workload plan. Reconcile Storage firewall, VNet/subnet/NSG/network settings, OIDC subjects, RBAC, proof-object cleanup, and cost.
9. Approve and test an operator recovery method. Only then remove the temporary operator data-role assignment through a separately reviewed control-plane plan and prove recovery still works.

## Fail-closed requirements

- No self-hosted runner on the public repository or founder's daily-use Mac.
- No global GitHub Actions IP allowlist, dynamic runner-IP workaround, all-networks mode, or trusted-services bypass.
- No repository transfer before both old/new subject and rollback procedures are reviewed.
- No federation replacement or network change outside a saved Terraform plan.
- No runner group access beyond `Creator-App`; no pull-request, fork, or unreviewed branch execution.
- No concurrency above one for the first proof.
- No real Terraform state payload printed, copied to artifacts, or used as a network test object.
- No operator-role removal before separate recovery proof.
- No workload plan, image publication, application activation, or Stripe action under this gate.

## Cost model

Public estimates reviewed 2026-09-01:

- GitHub Team: `$4` per user per month.
- Linux two-core larger runner: `$0.006` per minute; `$0.12` per 20 minutes or `$0.36` per hour.
- Idle larger runner: `$0` according to GitHub's current billing documentation.
- Azure VNet base: `$0`; associated services, traffic, logs, taxes, and offer-specific charges remain unapproved until the exact saved plan and billing screen are reviewed.

The `$100` Azure budget does not include or authorize GitHub charges. Configure a separate GitHub Actions budget/spend limit before the first paid runner job.

## Current stop

No external change is authorized. The next owner decision is whether to approve the candidate `local-missions-hq` organization, one GitHub Team seat at the current `$4/month` public price, repository transfer while remaining public, and a first-run larger-runner ceiling of 60 minutes (`$0.36`).
