# GitHub-to-Azure OIDC plan gate

Status: static local contract only; no GitHub or Azure activation

This runbook defines the future secretless CI boundary without creating a GitHub environment, Microsoft Entra identity, federated credential, Azure role assignment, backend session, or active cloud workflow. The machine contract is [`../../config/azure-oidc-plan-gate.v1.json`](../../config/azure-oidc-plan-gate.v1.json), and `pnpm azure-oidc:check` proves the repository remains non-deploying.

GitHub requires `id-token: write` before a job can request an OIDC token, but that permission alone does not grant cloud mutation rights. It belongs only on a future Azure job, never at workflow scope. GitHub environment protection rules must pass before a protected job starts, and the environment can restrict the branch and require an independent reviewer. See GitHub's [Azure OIDC guidance](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure), [OIDC reference](https://docs.github.com/en/actions/reference/security/oidc), and [environment protection reference](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## Current local boundary

- `.github/workflows/verify.yml` retains only `contents: read`. It has no `id-token: write`, Azure login action, cloud identifiers, provider configuration, or Terraform mutation command.
- [`../../infra/terraform/ci/azure-workload-identity.workflow.yml.example`](../../infra/terraform/ci/azure-workload-identity.workflow.yml.example) is outside `.github/workflows`, hard-disables every job with `if: ${{ false }}`, and contains no Azure login or Terraform command.
- Azure client, tenant, and subscription identifiers remain external values. No client secret, credentials JSON, storage key, or real identifier belongs in source, evidence, logs, screenshots, or chat.
- The only supported issuer and audience are `https://token.actions.githubusercontent.com` and `api://AzureADTokenExchange`. The future login action must be pinned to a reviewed full commit SHA.

## Immutable subject contract

GitHub repositories created after July 15, 2026 use immutable OIDC subjects containing owner and repository numeric IDs; older repositories must opt in. Local Missions does not assume which state the repository is in. Before federation, an authorized owner must use GitHub's subject-preview mechanism, record the numeric IDs outside source, and prove the emitted subject exactly matches each Microsoft Entra federated credential.

The three required subjects are:

```text
repo:stratiosai@{repository_owner_id}/Creator-App@{repository_id}:environment:azure-development-plan
repo:stratiosai@{repository_owner_id}/Creator-App@{repository_id}:environment:azure-development-apply
repo:stratiosai@{repository_owner_id}/Creator-App@{repository_id}:environment:azure-development-destroy
```

Environment subjects intentionally replace branch subjects in the token. Therefore each GitHub environment must independently allow only `main`, reject tags and pull-request execution, require an independent reviewer, prevent self-review, and disallow administrator bypass. No environment may share an Azure client identity with another operation.

## Identity separation

| Identity | Permitted future purpose                                                                                                             | Must never do                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Plan     | Read the exact disposable workload, lock/read/write only its exact state object, and produce sanitized reviewed plan evidence        | Apply/delete resources, assign roles, manage federation/control-plane resources, or hold subscription-wide ownership                    |
| Apply    | Consume one commit- and digest-bound reviewed plan file and mutate only the exact disposable workload scope                          | Create a fresh unreviewed plan, use direct/auto-approved apply, delete retained resources, or manage federation/control-plane resources |
| Destroy  | Create and consume one reviewed destroy-plan file for the exact disposable root/resource group and write sanitized teardown evidence | Run direct/unscoped destroy, cross into retained state/resources, or manage federation/control-plane resources                          |

Concrete Azure role definitions and scopes remain unapproved external decisions. A role name that is convenient is not evidence of least privilege; actual data-plane/control-plane operations must be enumerated and reviewed before role assignment.

## Command and artifact contract

The future plan job may emit only a saved `dev-workload.tfplan` plus sanitized text/JSON summaries, commit SHA, plan SHA-256, approved cost summary, expiration, and exact root/resource-group evidence. The apply job accepts only `terraform apply -input=false dev-workload.tfplan` after matching the commit and digest. The destroy job first creates `dev-workload-destroy.tfplan`, requires independent target review, and then applies that exact file.

The closed manifest, review-payload digest, independent actors, cost ceiling, expiry, and transient-artifact retention rules are defined by the separate [saved-plan evidence gate](./saved-plan-evidence-gate.md). The current fixtures are synthetic and cannot be promoted into live approval by changing a status value.

Direct `terraform destroy`, direct/unreviewed `terraform apply`, `-auto-approve`, `-target`, `import`, `refresh`, `force-unlock`, state mutation, taint, and untaint are refused. The command policy also refuses pull requests, forks, non-main refs, wrong environments/identities, self-hosted runners, missing or excessive GitHub permissions, self-approval, stale/overnight evidence, commit/digest mismatch, broad targets, client secrets, and shared identities.

## Future activation sequence

1. Approve the Azure subscription, exact retained-state and disposable-workload scopes, named owners, budget, alert destination, region/SKUs/prices, and same-day expiration window.
2. Confirm or enable GitHub immutable subjects and capture a subject preview for all three protected environments.
3. Create three distinct Microsoft Entra workload identities and exact-subject federated credentials; add only the minimum independently reviewed Azure roles.
4. Configure the three GitHub environments with main-only branch rules, independent review, self-review prevention, and no bypass. Store only the three external identifier variables needed for OIDC login.
5. Pin the reviewed Azure login action and all other actions to full commit SHAs. Copy the template only after replacing every static refusal with executable approval and evidence checks.
6. Run a separately approved read-only identity/plan probe, capture sanitized evidence, and stop. A successful token exchange does not approve apply.
7. Review the saved plan and current cost, obtain explicit same-day apply approval, then follow the ephemeral build/test/destroy/reconciliation runbook.

No step in this checkpoint performed that sequence.
