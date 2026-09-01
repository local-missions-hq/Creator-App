# Disposable development workload Terraform root

This root owns only the low-cost, synthetic, same-day development resources described by ADR-047 through ADR-049. Its backend key differs from the retained control plane. It consumes the retained `rg-local-missions-dev-eus2-001` landing-zone boundary but never creates or deletes that group. A future destroy from this root must remove every stamped workload object without traversing into retained state, identity, DNS, budget, policy, landing-zone ownership, or another project.

The current checkpoint pins and locks AzureRM 5.0.1 and includes a hardened provider configuration for an explicitly approved plan-only scope check. Automatic resource-provider registration is disabled, Storage data-plane access uses Microsoft Entra authentication, and no account identifier or credential is stored in Terraform source. The committed fixture keeps `azure_resource_creation_enabled=false`, so default and provider-scope plans have zero resource changes. Mock-only tests prove an applyable 27-resource core phase with no Container App resources, followed by a three-application activation delta that reaches the exact 30-resource workload. The reviewed development candidate is `eastus2`; every SKU and price remains subject to revalidation before apply.

The contract requires:

- the exact retained `rg-local-missions-dev-eus2-001` landing-zone target, validated by name and ownership tags but never owned by this root;
- Local Missions-only `lm`/`local-missions` resource names with one unique `e2rYYMMDDNN` deployment stamp;
- one of four cost profiles: zero-resource `plan-only`, or separately approved 2/4/8-hour Azure tiers capped at `$2`/`$3`/`$5` per run;
- owner, full commit SHA, creation, expiration, purpose, lifecycle, and root tags;
- expiration no later than eight hours after creation and on the same New York calendar day;
- an exact one-hour warning and at most one extension;
- zero-minimum/one-maximum API, dashboard, and worker replicas, bounded database storage/backup, Basic registry, Standard Service Bus for duplicate-detection support, and short telemetry retention;
- development-only environment isolation, TLS 1.2, no broad PostgreSQL firewall/trusted-services bypass, seven-day point-in-time recovery, private Blob containers, disabled Shared Key/anonymous/static-website access, and identity-only PostgreSQL/Service Bus/telemetry access;
- separate API/dashboard/worker managed identities with scoped RBAC, immutable digest image references, RBAC-only Key Vault with no Terraform-managed secret values, and no registry password references; the dashboard identity receives only ACR pull access;
- core infrastructure must exist before images can be published to its disposable ACR; API/dashboard/worker remain behind `application_activation_enabled` until all three pushed digests are independently revalidated;
- external dashboard ingress restricted to HTTPS and the reviewed CIDR allowlist, with the API URL and application environment supplied as non-secret runtime references;
- a narrow CIDR allowlist, reviewed budget, current region/SKU review, monitored alert destination, retained OIDC cleanup controller, and explicit approval before activation.

Local verification uses a backend-disabled init and Terraform mock-provider plans. Terraform Registry package resolution is the only permitted external access; the test suite strips Azure environment variables and never enables the guarded provider-scope query:

```sh
terraform -chdir=infra/terraform/environments/dev init -backend=false
terraform -chdir=infra/terraform/environments/dev validate
terraform -chdir=infra/terraform/environments/dev test -var-file=fixtures/local-plan.tfvars.json
```

A provider-backed plan is allowed only when separately approved, with `azure_resource_creation_enabled=false`, `cost_profile=plan-only`, backend initialization disabled, expected account scope supplied through the process environment, and no saved plan artifact. Never run `apply` from that approval. The package-level `pnpm terraform:check` gate also proves refusal of broad/retained targets, overlong expiration, unapproved activation, wrong environment/region, unsafe general or dashboard-specific scale, broad/weak network settings, unbounded backup, anonymous Blob access, incomplete identity references, mutable image references, and unsafe secret/reference settings.

The dedicated Local Missions state account is now bootstrapped, but the workload root remains inactive. The earlier provider-scope proof used `terraform test -test-directory=provider-tests` with ephemeral local test state so it could not initialize or reuse another workload's backend. Any future real workload plan must instead initialize the dedicated `local-missions/dev-workload.tfstate` key with Entra authentication, provide expected subscription and tenant UUIDs process-only, and pass its own approval gate.
