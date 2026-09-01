# Ephemeral Azure development boundary

Status: retained bootstrap/control plane and workflow authorization verified; V2 lifecycle contract ready; workload remains empty

This runbook separates the retained rebuild/cleanup control plane from the same-day disposable development workload. The three-resource retained-state bootstrap has been applied and migrated to its Entra-backed Blob backend under explicit authorization. This runbook does not by itself authorize the 20-resource control-plane apply, any disposable workload apply, deployment, or destroy.

## Root ownership

| Root                               | State key                              | Resource-group class | May own                                                                                                                           | Must never own                                                                                                                |
| ---------------------------------- | -------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `infra/terraform/control-plane`    | `local-missions/control-plane.tfstate` | Retained boundary    | Scoped OIDC identities, cost controls, and the empty `rg-local-missions-dev-eus2-001` landing zone with constrained workflow RBAC | Container Apps, PostgreSQL, workload storage/queues/secrets/telemetry/registry/dashboard/temp network                         |
| `infra/terraform/environments/dev` | `local-missions/dev-workload.tfstate`  | Disposable contents  | Exact-stamped application/data resources inside the retained Local Missions landing zone                                          | The landing-zone group itself, state backend, subscription root, tenant registrations, stable DNS, budgets/policy, other apps |

The roots use separate backend keys. The workload root reads and validates the retained landing zone but cannot create or delete it. A workload cleanup must refuse an empty, broad, changed, retained, subscription-level, or other-project target.

## Local Phase A gate

Run only:

```sh
pnpm terraform:check
```

The gate runs Terraform 1.15.7 formatting, backend-disabled initialization/validation, and plan-only tests with synthetic fixture values. All default fixtures plan zero resource changes. AzureRM mock-provider tests prove a three-resource retained-state bootstrap, a 20-resource retained identity/cost/landing-zone control plane, a 27-resource workload core with no Container App resources, and the subsequent three-app activation that reaches 30 disposable resources across twenty-one reviewed Azure resource types. Refusal fixtures cover cross-workload targets, undecided placement, unapproved retained cost/control activation, name-only GitHub subjects, unsafe alert/network values, over-eight-hour expiration, wrong environment, unsafe scale/network/backup/storage, incomplete identity references, mutable images, and unsafe secret/reference settings.

The local foundation gate strips Azure, ARM, and `TF_VAR_*` values from Terraform subprocesses. It does not execute `az`, contact Azure, initialize remote state, or call `terraform apply`. The separately approved provider-scope checkpoint used the real AzureRM provider only to validate the signed-in subscription/tenant and planned zero resources through ephemeral Terraform test state.

`pnpm azure-oidc:check` validates the separate static [GitHub-to-Azure OIDC plan gate](./github-azure-oidc-plan-gate.md). It proves three distinct future identities, protected immutable environment subjects, job-scoped permissions, reviewed plan/destroy-plan consumption, and fail-closed command rules while `.github/workflows/verify.yml` remains read-only and non-deploying.

`pnpm saved-plan:check` preserves the historical V1 regression checks and validates the active V2 [saved-plan evidence gate](./saved-plan-evidence-gate.md). V2 binds retained bootstrap/control evidence plus separate 27-resource core, three-app activation, and exact 30-resource destroy operations, with image/test/reconciliation prerequisites. Its fixture is synthetic contract data; the validator never creates or reads a Terraform plan binary.

`pnpm run-ledger:check` preserves the three historical V1 terminal regressions and validates the activation-valid V2 [ephemeral run-ledger gate](./ephemeral-run-ledger-gate.md). V2 orders core, images, activation, tests, destroy, and independent reconciliation; it separates Terraform-state, live disposable, and retained-control-plane inventories and never contacts Azure.

`pnpm azure-cost:check` validates the dated [public Azure service and cost review](./azure-public-service-cost-review.md). Microsoft public catalog meters support the selected East US 2 candidate shape and the raw conservative eight-hour estimate is `$3.02`. The owner selected the `$2.00` two-hour smoke tier for the first workload run, retained `$5.00`/eight hours only as a fallback ceiling, and revised the monthly alert budget from the historical `$25.00` proposal to `$100.00`. The historical check validates its captured public snapshot; it does not verify alert delivery or prove provider availability.

The pinned AzureRM package and checksums support deterministic schema validation. They do not approve Azure access or any candidate service/SKU. Mock-provider behavior follows [HashiCorp's Terraform test guidance](https://developer.hashicorp.com/terraform/language/tests/mocking). Storage contracts keep anonymous Blob access, Shared Key, and unused static website hosting disabled. PostgreSQL uses Entra-only authentication and seven-day point-in-time recovery. Container Apps use separate managed identities, scoped RBAC, and digest-pinned image references without registry passwords. Key Vault is RBAC-only and Terraform creates no secret values.

## Required future apply metadata

- Exact retained Local Missions landing-zone resource group and unique disposable deployment stamp.
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

## External sequence

1. Publicly review and select the candidate region/services/SKUs/prices and assign accountable owners. **Complete on 2026-08-30.**
2. Authenticate and inspect only the intended subscription through a zero-resource provider-scope plan. **Complete on 2026-08-31; no mutation.**
3. Owner-selected dedicated Local Missions placement is recorded; the dedicated subscription is enabled and verified empty. **Complete on 2026-08-31.**
4. Generate and independently review only the three-resource retained-state bootstrap saved plan. **Complete on 2026-08-31; no apply.**
5. Apply and migrate the approved state bootstrap. **Completed.**
6. Supply the monitored alert destination and remaining M5.4 inputs, then plan and independently review the 20-resource retained control/landing-zone boundary, including three container-scoped state-backend role assignments. **Complete.**
7. Obtain separate approval bound to the exact saved-plan SHA-256 and expiry, then apply and verify only that retained control plane. **Complete on 2026-09-01; 20 added, zero changed/destroyed, zero-change verification passed.**
8. Approve and run a no-apply GitHub OIDC access-policy proof before removing temporary operator state access. **Complete on 2026-09-01; all three identities passed, while the default-deny firewall correctly blocked the real Blob read.**
9. Use `local-missions-hq` on GitHub Free with no payment method, keep provider-backed Terraform on the reviewed local operator path, and defer paid private-runner/VNet state networking to M14. **Complete and retained as the current operating boundary.**
10. Approve and apply only correction plan SHA-256 `de06a09c687092fce1af5476b9ff37fa82d41039c13130e7f51f6395a55f923c`, then rerun the no-Terraform OIDC/ARM proof while default-deny Blob refusal remains expected. Retain temporary operator access until a later private-runner/recovery proof exists. **Complete on 2026-09-01: zero added, three changed, zero destroyed; normal plan zero-change; all three proof jobs passed; Blob refusal preserved.**
11. Revalidate current IP, base digest, build inputs, SKUs, quota, prices, and the `$2` two-hour ceiling; then generate/review and separately approve/apply the 27-resource core before building/scanning/signing/pushing immutable images.
12. Generate/review and separately approve/apply the three-Container-App activation delta.
13. Test with synthetic data, capture evidence, and stop new writes.
14. Review the exact stamped destroy target, destroy while attached without deleting the landing zone, then reconcile Terraform state and live Azure independently. Report **Disposable workload: empty** separately from **Retained control plane and landing zone: expected list**. Any orphan or mismatch is a teardown failure.

Private networking remains deferred until the infrastructure and UI are functionally complete. The first ephemeral deployment still requires TLS, authentication, managed identity/RBAC, disabled anonymous Blob access, and narrow firewall allowlists.
