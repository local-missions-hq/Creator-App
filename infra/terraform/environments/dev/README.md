# Disposable development workload Terraform root

This root owns only the low-cost, synthetic, same-day development workload described by ADR-047 through ADR-049. Its backend key and resource-group target differ from the retained control plane. A future destroy from this root must never own or traverse into retained state, identity, DNS, budget, or policy resources.

The current checkpoint pins and locks AzureRM 5.0.1 but deliberately contains no real provider configuration. The resource-group, Storage, PostgreSQL, Container Apps, Service Bus, registry, Key Vault, and telemetry modules all sit behind `azure_resource_creation_enabled`; the committed fixture keeps that switch `false`, so the default plan has zero resource changes. A second test sets the switch only inside Terraform's mock provider and proves an exact 31-resource shape across 17 reviewed resource types without Azure credentials or a subscription. The candidate `eastus2` region and every planning SKU remain unapproved defaults.

The contract requires:

- one explicit `rg-local-missions-dev-*` workload target;
- owner, full commit SHA, creation, expiration, purpose, lifecycle, and root tags;
- expiration no later than eight hours after creation and on the same New York calendar day;
- an exact one-hour warning and at most one extension;
- zero-minimum/one-maximum API, dashboard, and worker replicas, bounded database storage/backup, Basic registry, Standard Service Bus for duplicate-detection support, and short telemetry retention;
- development-only environment isolation, TLS 1.2, no broad PostgreSQL firewall/trusted-services bypass, seven-day point-in-time recovery, private Blob containers, disabled Shared Key/anonymous/static-website access, and identity-only PostgreSQL/Service Bus/telemetry access;
- separate API/dashboard/worker managed identities with scoped RBAC, immutable digest image references, RBAC-only Key Vault with no Terraform-managed secret values, and no registry password references; the dashboard identity receives only ACR pull access;
- external dashboard ingress restricted to HTTPS and the reviewed CIDR allowlist, with the API URL and application environment supplied as non-secret runtime references;
- a narrow CIDR allowlist, reviewed budget, current region/SKU review, monitored alert destination, retained OIDC cleanup controller, and explicit approval before activation.

Local verification uses a backend-disabled init and Terraform mock-provider plans. Terraform Registry package resolution is the only permitted external access; the tests make no Azure request and supply no provider configuration:

```sh
terraform -chdir=infra/terraform/environments/dev init -backend=false
terraform -chdir=infra/terraform/environments/dev validate
terraform -chdir=infra/terraform/environments/dev test -var-file=fixtures/local-plan.tfvars.json
```

Do not run a provider-backed plan or `apply`. The package-level `pnpm terraform:check` gate also proves refusal of broad/retained targets, overlong expiration, unapproved activation, wrong environment, unsafe general or dashboard-specific scale, broad/weak network settings, unbounded backup, anonymous Blob access, incomplete identity references, mutable image references, and unsafe secret/reference settings.
