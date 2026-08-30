# Ephemeral Azure development boundary

Status: public service/cost review complete; Azure plan access and activation are blocked

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

`pnpm run-ledger:check` validates the static [ephemeral run-ledger gate](./ephemeral-run-ledger-gate.md). Three synthetic ledgers cover clean continuation, successful application rollback after a failed test, and destroy-timeout/orphan escalation. The gate separates Terraform-state, live disposable, and retained-control-plane inventories and never contacts Azure.

`pnpm azure-cost:check` validates the dated [public Azure service and cost review](./azure-public-service-cost-review.md). Microsoft public catalog meters support the selected East US 2 candidate shape, the raw conservative eight-hour estimate is `$3.02`, and the proposed buffered ceiling is `$5.00` per run under a `$25.00` monthly budget. This check validates a captured public snapshot; it does not authenticate, inspect a subscription, approve the budget, verify alert delivery, or prove provider availability.

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

The checked-in defaults are ceilings for review, not an approved subscription quote: API, dashboard, and worker scale from zero to one replica; PostgreSQL uses B1ms with 32 GiB storage and seven-day backup retention; Container Registry uses Basic; Service Bus uses Standard because the queue contract requires duplicate detection; and telemetry uses a 0.5 GB daily cap with 30-day retention. The 2026-08-30 public review estimates `$3.02` for a deliberately conservative eight-hour run and proposes a `$5.00` buffered ceiling. Revalidate every meter after 2026-09-06 or immediately before a subscription-backed plan, whichever occurs first.

## External sequence, stopped before Azure access

1. Publicly review and select the candidate region/services/SKUs/prices and assign accountable owners. **Complete on 2026-08-30.**
2. Obtain explicit user approval to authenticate and inspect only the intended subscription for a provider-backed saved plan. **Current stop gate.**
3. Record the exact subscription/scope, real monitored alert destination, approved `$25` budget, current offer/quota/policy results, OIDC identities, backend, and artifact references.
4. Produce a saved subscription-backed plan and cost summary without applying it automatically.
5. Obtain separate explicit same-day apply approval.
6. Apply only the disposable workload, test with synthetic data, capture evidence, and stop new writes.
7. Review the exact destroy target, destroy while attached, then reconcile Terraform state and live Azure independently.
8. Report **Disposable workload: empty** separately from **Retained control plane: expected list**. Any orphan or mismatch is a teardown failure.

Private networking remains deferred until the infrastructure and UI are functionally complete. The first ephemeral deployment still requires TLS, authentication, managed identity/RBAC, disabled anonymous Blob access, and narrow firewall allowlists.
