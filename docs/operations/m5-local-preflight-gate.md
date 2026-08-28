# M5 local preflight gate

This gate is the final consolidated **local-only** M5 preparation check. It proves that the Terraform, OIDC, saved-plan, ephemeral-run, recovery, and container-image contracts agree with one another while active CI remains non-deploying.

Run it with:

```bash
pnpm m5:preflight
```

The gate checks the six machine contracts, nine local preparation areas, required operations/evidence artifacts, shared resource counts, expiration rules, identity environments, prohibited Terraform artifacts, and the read-only active GitHub Actions workflow. Synthetic refusal tests prove that live/completed claims, missing approvals, Azure authentication, provider-backed planning, registry use, image builds, Terraform mutations, and cloud cost cannot be introduced silently.

Passing this gate does **not** complete M5. The 16 external gates remain separately owned, separately evidenced, and separately approved. Do not activate a workflow, authenticate, initialize remote state, request live prices, build or push an image, run a provider-backed plan, apply, recover, roll back, destroy, or query Azure from this checkpoint.

The next permitted live step requires the user to reopen the external boundary explicitly. At that point, begin with current Azure service/SKU/price and named-owner review; do not infer approval for later identity, backend, plan, apply, or destroy steps from approval to perform that review.
