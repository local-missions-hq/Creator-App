# Ephemeral Azure development boundary

Status: local contract only; Azure activation is blocked

This runbook separates the retained rebuild/cleanup control plane from the same-day disposable development workload. It does not authorize Azure login, planning against a subscription, apply, or destroy.

## Root ownership

| Root                               | State key                              | Resource-group class | May own                                                                                                                    | Must never own                                                                                                                |
| ---------------------------------- | -------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `infra/terraform/control-plane`    | `local-missions/control-plane.tfstate` | Retained             | State/locking, scoped OIDC identities, identity registrations, stable verification DNS, subscription budgets/alerts/policy | Container Apps, PostgreSQL, workload storage/queues/secrets/telemetry/registry/dashboard/temp network                         |
| `infra/terraform/environments/dev` | `local-missions/dev-workload.tfstate`  | Disposable           | The explicit `rg-local-missions-dev-*` application/data workload only                                                      | State backend, control-plane group, subscription root, tenant/identity registrations, stable DNS, subscription budgets/policy |

The roots use separate backend keys and explicit non-overlapping resource-group names. A workload cleanup must refuse an empty, broad, changed, retained, or subscription-level target.

## Local Phase A gate

Run only:

```sh
pnpm terraform:check
```

The gate runs Terraform 1.15.7 formatting, backend-disabled initialization/validation, and plan-only tests with synthetic fixture values. The default fixtures plan zero resource changes. The only enabled-shape test replaces AzureRM with Terraform's mock provider and expects exactly 28 create-only changes across 17 reviewed resource types for the disposable resource group, Storage, PostgreSQL, Container Apps, Service Bus, registry, Key Vault, and telemetry. Eleven refusal fixtures cover retained/broad targets, over-eight-hour expiration, activation without approvals, wrong environment, unsafe scale, broad/weak networking, unbounded backup, anonymous Blob access, incomplete identity references, mutable images, and unsafe secret/reference settings.

The gate strips Azure, ARM, and `TF_VAR_*` values from Terraform subprocesses. It does not execute `az`, contact Azure, configure a provider or backend, create remote state, perform a provider-backed refresh/plan, or call `terraform apply`.

`pnpm azure-oidc:check` validates the separate static [GitHub-to-Azure OIDC plan gate](./github-azure-oidc-plan-gate.md). It proves three distinct future identities, protected immutable environment subjects, job-scoped permissions, reviewed plan/destroy-plan consumption, and fail-closed command rules while `.github/workflows/verify.yml` remains read-only and non-deploying.

`pnpm saved-plan:check` validates the static [saved-plan evidence gate](./saved-plan-evidence-gate.md). Two harmless text fixtures model apply and destroy producer-consumer binding across artifact/review digests, source and target, synthetic cost ceilings, independent review/approval, same-day expiry, exact commands, and transient deletion. It never creates or reads a Terraform plan binary.

The pinned AzureRM package and checksums support deterministic schema validation. They do not approve Azure access or any candidate service/SKU. Mock-provider behavior follows [HashiCorp's Terraform test guidance](https://developer.hashicorp.com/terraform/language/tests/mocking). Storage contracts keep anonymous Blob access, Shared Key, and unused static website hosting disabled. PostgreSQL uses Entra-only authentication and seven-day point-in-time recovery. Container Apps use separate managed identities, scoped RBAC, and digest-pinned image references without registry passwords. Key Vault is RBAC-only and Terraform creates no secret values.

## Required future apply metadata

- Exact disposable workload resource group.
- Named/approved owner reference.
- Full source commit SHA.
- Immutable creation and expiration timestamps.
- Same New York calendar date, no more than eight hours, and no later than 11:00 PM `America/New_York`.
- Exact one-hour warning timestamp and zero/one extension record.
- Reviewed monthly budget and verified actual/forecast alert destination.
- Current region, SKU availability, policy, and cost review.
- Narrow approved ingress CIDRs; never `0.0.0.0/0`.
- Retained OIDC cleanup-controller reference and explicit apply approval.

## Low-cost planning ceiling

The checked-in defaults are ceilings for local review, not approved prices: API and worker scale from zero to one replica, PostgreSQL uses a candidate burstable SKU with 32 GiB storage and seven-day backup retention, Container Registry uses a Basic candidate, Service Bus uses a Standard candidate because the queue contract requires duplicate detection, and telemetry retention is 30 days. Revalidate every value immediately before a subscription-backed plan.

## External sequence, still blocked

1. Approve the subscription, named owner, alert destination, budget, OIDC identities, and exact scopes.
2. Revalidate region/services/SKUs/policy/prices against current official sources.
3. Add and approve a secretless GitHub-to-Azure OIDC plan path without crossing root ownership.
4. Produce a saved subscription-backed plan and cost summary only after the user lifts the current no-Azure boundary; do not apply it automatically.
5. Obtain explicit same-day apply approval.
6. Apply only the disposable workload, test with synthetic data, capture evidence, and stop new writes.
7. Review the exact destroy target, destroy while attached, then reconcile Terraform state and live Azure independently.
8. Report **Disposable workload: empty** separately from **Retained control plane: expected list**. Any orphan or mismatch is a teardown failure.

Private networking remains deferred until the infrastructure and UI are functionally complete. The first ephemeral deployment still requires TLS, authentication, managed identity/RBAC, disabled anonymous Blob access, and narrow firewall allowlists.
