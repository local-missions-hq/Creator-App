# Disposable development workload Terraform root

This root owns only the low-cost, synthetic, same-day development workload described by ADR-047 through ADR-049. Its backend key and resource-group target differ from the retained control plane. A future destroy from this root must never own or traverse into retained state, identity, DNS, budget, or policy resources.

The current checkpoint is a contract-only plan. It contains no provider block and no Azure resource block. `azure_resource_creation_enabled` remains `false`, the candidate `eastus2` region and planning SKUs are unapproved defaults, and the committed fixture contains only synthetic values.

The contract requires:

- one explicit `rg-local-missions-dev-*` workload target;
- owner, full commit SHA, creation, expiration, purpose, lifecycle, and root tags;
- expiration no later than eight hours after creation and on the same New York calendar day;
- an exact one-hour warning and at most one extension;
- zero-minimum/one-maximum API and worker replicas, bounded database storage/backup, Basic registry, and short telemetry retention;
- a narrow CIDR allowlist, reviewed budget, current region/SKU review, monitored alert destination, retained OIDC cleanup controller, and explicit approval before activation.

Local verification uses backend-disabled, refresh-disabled Terraform commands and makes no Azure request:

```sh
terraform -chdir=infra/terraform/environments/dev init -backend=false
terraform -chdir=infra/terraform/environments/dev validate
terraform -chdir=infra/terraform/environments/dev test -var-file=fixtures/local-plan.tfvars.json
```

Do not run `apply`. The package-level `pnpm terraform:check` gate also proves that broad target, overlong expiration, and unapproved activation fixtures are rejected.
