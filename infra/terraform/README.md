# Terraform boundary

This directory defines two independently owned Terraform roots while the M5 Phase A checkpoint remains local and contract-only:

- [`control-plane/`](./control-plane/) is retained and uses `local-missions/control-plane.tfstate`.
- [`environments/dev/`](./environments/dev/) is disposable and uses `local-missions/dev-workload.tfstate`.

The disposable root pins AzureRM 5.0.1 and locks its checksums, but has no real provider configuration. Seventeen reviewed Azure resource types cover the disposable resource group, Storage, PostgreSQL, Container Apps, Service Bus, registry, Key Vault, and telemetry contracts. Every resource remains behind `azure_resource_creation_enabled = false`. Backend examples are partial, identifier-free contracts; local verification initializes with `-backend=false` and replaces AzureRM with Terraform's mock provider. No provider-backed refresh/plan or apply command belongs in the automated local gate.

The intended progression is:

1. Local M1–M4 development with Docker, Azurite, synthetic queues/identities, and Stripe test tooling.
2. Disposable, low-cost Azure development workloads that are built, tested, and destroyed the same day.
3. Private-network staging/production only after ordinary infrastructure and UI flows are complete and the security/cost gates approve it.

`pnpm terraform:check` proves formatting, backend-disabled initialization and validation, three plan-only tests, eleven refusal tests, zero default resource changes, and exactly 28 create-only changes across the 17-type mock workload. It also proves distinct state/scope ownership, eleven disposable tags, scale/network/backup/access/secret safeguards, conservative planning ceilings, and expiration-policy fixtures. It removes Azure/ARM/TF_VAR values from the subprocess environment and never invokes `az`, configures an Azure provider, or calls `terraform apply`.

`pnpm azure-oidc:check` separately proves the future GitHub-to-Azure plan/apply/destroy identity and command contract while every active workflow remains non-deploying. The only workflow-shaped example is hard-disabled under [`ci/`](./ci/) and is not inside `.github/workflows`.

`pnpm saved-plan:check` proves two synthetic apply/destroy producer-consumer manifests, SHA-256 artifact and canonical review binding, exact source/target/cost/approval/expiry evidence, strict sanitization, transient-copy deletion, and fail-closed mutations. Harmless `.synthetic.fixture` text is used instead of a Terraform plan binary.

`pnpm run-ledger:check` proves the complete synthetic apply/test/continue-or-rollback/destroy/reconcile state machine, independent state/live inventory checks, retained-control-plane separation, and attached escalation for timeout, failure, or orphan outcomes. It executes no Terraform or cloud command.

Do not add credentials, subscription identifiers, broad targets, persistent dev resources, or resource mutations merely to make the foundation look complete. Current region/SKU prices, named owners, alert delivery, OIDC identities, budgets, saved plans, and every apply/destroy action remain separate external gates.
