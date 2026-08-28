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

The gate runs Terraform 1.15.7 formatting, backend-disabled initialization/validation, and plan-only tests with synthetic fixture values. It asserts zero Azure provider/resource blocks and zero planned resource changes. It also requires three negative plans to refuse a retained/broad target, an over-eight-hour expiration, and activation without approval/budget/current price review/narrow CIDRs/cleanup controller/monitored destination.

The gate strips Azure, ARM, and `TF_VAR_*` values from Terraform subprocesses. It does not execute `az`, contact Azure, configure a backend, create state, or call `terraform apply`.

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

The checked-in defaults are ceilings for local review, not approved prices: API and worker scale from zero to one replica, PostgreSQL uses the smallest candidate burstable SKU with 32 GiB storage and seven-day backup retention, Service Bus and Container Registry use Basic candidates, and telemetry retention is 30 days. Revalidate every value immediately before a subscription-backed plan.

## External sequence, still blocked

1. Approve the subscription, named owner, alert destination, budget, OIDC identities, and exact scopes.
2. Revalidate region/services/SKUs/policy/prices against current official sources.
3. Add reviewed Azure resource modules without crossing root ownership.
4. Produce a saved subscription-backed plan and cost summary; do not apply it automatically.
5. Obtain explicit same-day apply approval.
6. Apply only the disposable workload, test with synthetic data, capture evidence, and stop new writes.
7. Review the exact destroy target, destroy while attached, then reconcile Terraform state and live Azure independently.
8. Report **Disposable workload: empty** separately from **Retained control plane: expected list**. Any orphan or mismatch is a teardown failure.

Private networking remains deferred until the infrastructure and UI are functionally complete. The first ephemeral deployment still requires TLS, authentication, managed identity/RBAC, disabled anonymous Blob access, and narrow firewall allowlists.
