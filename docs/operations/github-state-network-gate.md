# GitHub workflow state-network gate

Status: GitHub Free repository transferred; correction plan consumed; corrected post-transfer proof passed; local-operator state path retained

Checkpoint: `M05-post-transfer-oidc-proof-passed-030`

## Current no-charge decision

Use the `local-missions-hq` GitHub Free organization with no payment method. The repository is now public and organization-owned. Continue GitHub-hosted verification and separately approved no-apply OIDC/ARM proof, but keep provider-backed Terraform state operations on the reviewed local operator path while Storage remains default-deny, Entra-only, TLS-protected, Shared Key disabled, anonymous access disabled, and trusted-service bypass disabled.

GitHub's read-only API verified the organization on plan `free`, one active owner, and one public organization-owned repository. The billing UI verified that no payment method exists. A budget cannot be created without adding payment information, so paid products remain prohibited rather than enabled with a nonzero limit.

## Ordered migration

1. Create the GitHub Free organization with one personal-account owner, no invitations, no repositories, and no payment method. **Complete.**
2. Preview the three future immutable organization/repository environment subjects while the repository ID remains stable. **Complete.**
3. Generate and independently review one retained-control-plane saved plan containing only those three subject updates. **Complete:** three in-place updates; zero create/delete/replace/network/RBAC/budget/workload changes; SHA-256 `5fbc63430b4778a3e18039109bbe66c065663621fd0025cbd51cffc71a0d3903`.
4. Obtain approval bound to the exact first-plan digest and one coordinated transfer window. **Complete.**
5. Revalidate every boundary and apply only the reviewed three updates. **Complete:** `0` added, `3` changed, `0` destroyed; normal provider reconciliation reported no changes.
6. Transfer the still-public repository and reconcile GitHub. **Complete:** stable ID, public visibility, redirect, environments, main-only rules, variables, zero secrets, immutable OIDC, selected Actions, and solo-founder branch protection verified.
7. Run the no-Terraform proof. **Failed safely before ARM:** GitHub emitted the documented claim-key subject form, while the first plan used an incorrect name-decorated preview form. No Azure permission, Blob access, Terraform command, or Azure mutation occurred.
8. Generate a correction plan from the observed subject. **Complete:** exactly three subject-only updates; SHA-256 `de06a09c687092fce1af5476b9ff37fa82d41039c13130e7f51f6395a55f923c`.
9. After separate digest-bound approval, apply only the correction and immediately rerun the no-Terraform proof. **Complete:** `0` added, `3` changed, `0` destroyed; normal plan zero-change; corrected run `33521970773` passed; real Blob read remained refused.
10. Keep remote-backend plan/apply/destroy on the reviewed local operator path and retain the temporary operator Blob role until a later private-runner/recovery proof is separately approved.

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

The repository transfer and both three-update applies are complete. The first failed proof gained no Azure access and exposed a narrow subject-format mismatch. Exact correction plan SHA-256 `de06a09c687092fce1af5476b9ff37fa82d41039c13130e7f51f6395a55f923c` applied with zero creates/deletes and corrected run `33521970773` passed all three OIDC/ARM jobs. The expected Blob refusal proves default deny remained closed; it is not end-to-end workflow state access. Provider-backed Terraform therefore remains on the reviewed local operator path and the temporary operator role remains retained. The next task is negative workflow-role boundary proof, not workload planning or apply.
