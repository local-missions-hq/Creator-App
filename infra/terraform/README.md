# Terraform boundary

This directory defines two independently owned Terraform roots while the M5 Phase A checkpoint remains local and contract-only:

- [`control-plane/`](./control-plane/) is retained and uses `local-missions/control-plane.tfstate`.
- [`environments/dev/`](./environments/dev/) is disposable and uses `local-missions/dev-workload.tfstate`.

Neither root currently contains an Azure provider or resource block. Backend examples are partial, identifier-free contracts; local verification initializes with `-backend=false` and uses Terraform plan tests with synthetic values. No apply command belongs in the automated local gate.

The intended progression is:

1. Local M1–M4 development with Docker, Azurite, synthetic queues/identities, and Stripe test tooling.
2. Disposable, low-cost Azure development workloads that are built, tested, and destroyed the same day.
3. Private-network staging/production only after ordinary infrastructure and UI flows are complete and the security/cost gates approve it.

`pnpm terraform:check` proves formatting, backend-disabled initialization and validation, two plan-only tests, three refusal tests, zero planned resource changes, distinct state/scope ownership, required disposable tags, low-cost planning ceilings, and expiration-policy fixtures. It removes Azure/ARM/TF_VAR values from the subprocess environment and never invokes `az` or `terraform apply`.

Do not add credentials, subscription identifiers, broad targets, persistent dev resources, or resource mutations merely to make the foundation look complete. Current region/SKU prices, named owners, alert delivery, OIDC identities, budgets, saved plans, and every apply/destroy action remain separate external gates.
