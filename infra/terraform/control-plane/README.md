# Retained control-plane Terraform root

This root owns only the rebuild and cleanup control plane described by ADR-048: remote state/locking, scoped GitHub-Azure OIDC identities, identity registrations, stable verification DNS, and subscription cost/policy controls. It has a dedicated backend key and must never own a disposable application workload.

The current checkpoint is contract-only. It contains no provider block and no Azure resource block, and `azure_resource_creation_enabled` is required to remain `false`. The committed fixture is synthetic and non-routable.

Local verification uses backend-disabled Terraform commands and makes no Azure request:

```sh
terraform -chdir=infra/terraform/control-plane init -backend=false
terraform -chdir=infra/terraform/control-plane validate
terraform -chdir=infra/terraform/control-plane test -var-file=fixtures/local-plan.tfvars.json
```

Do not run `apply`. Before this root can provision anything, the owner must approve the subscription/scope, backend bootstrap procedure, cost destination, OIDC permissions, current provider versions, and a reviewed saved plan.
