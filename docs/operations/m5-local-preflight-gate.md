# M5 local preflight gate

This gate is the consolidated **non-deploying** M5 status check. It proves that the Terraform, OIDC, saved-plan, ephemeral-run, recovery, container-image, and Azure workload-provider records agree while active CI remains non-deploying.

Run it with:

```bash
pnpm m5:preflight
```

At checkpoint `M05-workload-provider-registration-proof-passed-035`, the gate checks 12 machine contracts, 11 coverage areas, required operations/evidence artifacts, shared resource counts, expiration rules, identity environments, prohibited Terraform artifacts, and the read-only active GitHub Actions workflow. Forty-seven refusal tests cover execution-record erasure, false completion, missing approvals, active CI Azure/OIDC/write access, unapproved planning, registry/image activation, Terraform mutations, contract drift, and checked-in Terraform artifacts.

Passing this gate does **not** complete M5. It records completed retained state/control work, the no-apply OIDC/RBAC proof, current image/SKU/cost revalidation, and the approved exact-six provider registration/read-only usage proof. Nine later external gates remain deferred and separately approval-bound. The gate itself runs no Azure, Terraform plan/apply/destroy, image, registry, Stripe, or iOS deployment command.

The next external step requires separate approval to generate and independently review only the exact 27-resource workload-core saved plan with zero Container Apps. That approval must not be inferred from provider-registration approval and will not authorize apply, image publication, application activation, testing, or destroy.
