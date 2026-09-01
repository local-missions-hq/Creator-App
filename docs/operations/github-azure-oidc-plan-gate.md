# GitHub-to-Azure OIDC plan gate

Status: corrected post-transfer proof passed; default-deny Blob refusal preserved; local-operator state path retained

This runbook defines and constrains the approved secretless identity proof. The protected GitHub environments, three Microsoft Entra identities/federated credentials, and retained scoped role assignments are live. [`../../.github/workflows/azure-oidc-proof.yml`](../../.github/workflows/azure-oidc-proof.yml) may exchange OIDC tokens and inspect effective permissions, but it contains no Terraform command or Azure mutation. The machine contract is [`../../config/azure-oidc-plan-gate.v1.json`](../../config/azure-oidc-plan-gate.v1.json).

GitHub requires `id-token: write` before a job can request an OIDC token, but that permission alone does not grant cloud mutation rights. It belongs only on a future Azure job, never at workflow scope. GitHub environment protection rules must pass before a protected job starts, and the environment can restrict the branch and require an independent reviewer. See GitHub's [Azure OIDC guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure), [OIDC reference](https://docs.github.com/en/actions/reference/security/oidc), and [environment protection reference](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## Current execution boundary

- `.github/workflows/verify.yml` retains only `contents: read`. The separate proof workflow grants `id-token: write` only to its one three-identity matrix job.
- The proof uses `azure/login` v3.0.2 pinned to full commit `7ddb5af1ef8758cf1353cf3b42f940aee27ba21c`. Three non-secret Azure identifier variables are stored in each protected environment; no client secret, credentials JSON, repository secret, or identifier is checked into source.
- Each job must be manually approved through its exact main-only GitHub environment. It verifies Azure token exchange, landing-zone access, control-group denial, effective ARM permissions, and assigned state Blob data actions.
- The state account remains default-deny with no Azure-services bypass and one Mac IP rule. A GitHub-hosted runner's actual Blob read must fail until a separate temporary firewall exception is approved; the proof must not alter that firewall itself.
- [`../../infra/terraform/ci/azure-workload-identity.workflow.yml.example`](../../infra/terraform/ci/azure-workload-identity.workflow.yml.example) is outside `.github/workflows`, hard-disables every job with `if: ${{ false }}`, and contains no Azure login or Terraform command.
- Azure client, tenant, and subscription identifiers remain external values. No client secret, credentials JSON, storage key, or real identifier belongs in source, evidence, logs, screenshots, or chat.
- The only supported issuer and audience are `https://token.actions.githubusercontent.com` and `api://AzureADTokenExchange`. The future login action must be pinned to a reviewed full commit SHA.

## Immutable subject contract

GitHub repositories created after July 15, 2026 use immutable OIDC subjects containing owner and repository numeric IDs; older repositories must opt in. Local Missions does not assume which state the repository is in. Before federation, an authorized owner must use GitHub's subject-preview mechanism, record the numeric IDs outside source, and prove the emitted subject exactly matches each Microsoft Entra federated credential.

The three required subjects are:

```text
repository_owner_id:{repository_owner_id}:repository_id:{repository_id}:environment:azure-development-plan
repository_owner_id:{repository_owner_id}:repository_id:{repository_id}:environment:azure-development-apply
repository_owner_id:{repository_owner_id}:repository_id:{repository_id}:environment:azure-development-destroy
```

Environment subjects intentionally replace branch subjects in the token. Each GitHub environment allows only `main`, rejects tags and pull-request execution, requires the named human reviewer, and disallows administrator bypass. The repository currently has one human collaborator, `stratiosai`, while Codex is the separate automated plan producer. The owner explicitly accepted this single-human exception, so GitHub-native self-review prevention is disabled to avoid a permanent deployment deadlock. Exact saved-plan review and apply authorization remain separate human gates. No environment may share an Azure client identity with another operation.

## Identity separation

| Identity | Permitted future purpose                                                                                                             | Must never do                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Plan     | Read the exact disposable workload, lock/read/write only its exact state object, and produce sanitized reviewed plan evidence        | Apply/delete resources, assign roles, manage federation/control-plane resources, or hold subscription-wide ownership                    |
| Apply    | Consume one commit- and digest-bound reviewed plan file and mutate only the exact disposable workload scope                          | Create a fresh unreviewed plan, use direct/auto-approved apply, delete retained resources, or manage federation/control-plane resources |
| Destroy  | Create and consume one reviewed destroy-plan file for the exact disposable root/resource group and write sanitized teardown evidence | Run direct/unscoped destroy, cross into retained state/resources, or manage federation/control-plane resources                          |

The concrete Azure role definitions and scopes are live from the exact reviewed control-plane plan. The proof must reconcile their effective actions and refusals without using any write/delete operation.

## Command and artifact contract

The future plan job may emit only a saved `dev-workload.tfplan` plus sanitized text/JSON summaries, commit SHA, plan SHA-256, approved cost summary, expiration, and exact root/resource-group evidence. The apply job accepts only `terraform apply -input=false dev-workload.tfplan` after matching the commit and digest. The destroy job first creates `dev-workload-destroy.tfplan`, requires independent target review, and then applies that exact file.

The closed manifest, review-payload digest, independent actors, cost ceiling, expiry, and transient-artifact retention rules are defined by the separate [saved-plan evidence gate](./saved-plan-evidence-gate.md). The current fixtures are synthetic and cannot be promoted into live approval by changing a status value.

Direct `terraform destroy`, direct/unreviewed `terraform apply`, `-auto-approve`, `-target`, `import`, `refresh`, `force-unlock`, state mutation, taint, and untaint are refused. The command policy also refuses pull requests, forks, non-main refs, wrong environments/identities, self-hosted runners, missing or excessive GitHub permissions, self-approval, stale/overnight evidence, commit/digest mismatch, broad targets, client secrets, and shared identities.

## Future activation sequence

1. Approve the Azure subscription, exact retained-state and disposable-workload scopes, named owners, budget, alert destination, region/SKUs/prices, and same-day expiration window.
2. Confirm or enable GitHub immutable subjects and capture a subject preview for all three protected environments.
3. Create three distinct Microsoft Entra workload identities and exact-subject federated credentials; add only the minimum independently reviewed Azure roles.
4. Configure the three GitHub environments with main-only branch rules, the named human reviewer, no administrator bypass, and the documented single-human self-review exception. Store only the three external identifier variables needed for OIDC login.
5. Pin the reviewed Azure login action and all other actions to full commit SHAs. Copy the template only after replacing every static refusal with executable approval and evidence checks.
6. Run a separately approved read-only identity/plan probe, capture sanitized evidence, and stop. A successful token exchange does not approve apply.
7. Review the saved plan and current cost, obtain explicit same-day apply approval, then follow the ephemeral build/test/destroy/reconciliation runbook.

Steps 1 through 6 are complete for the retained control plane and transferred public repository. The first post-transfer step 6 attempt failed before ARM because the initial preview used a name-decorated subject that did not match GitHub's emitted claim-key subject. Exact correction plan SHA-256 `de06a09c687092fce1af5476b9ff37fa82d41039c13130e7f51f6395a55f923c` then applied only three subject updates, reconciled to a zero-change normal plan, and corrected run `33521970773` passed all three no-Terraform jobs while Blob access remained blocked. This does not authorize step 7, a state firewall exception, temporary operator-role removal, workload planning, or workload apply.
