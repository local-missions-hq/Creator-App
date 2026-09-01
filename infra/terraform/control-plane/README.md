# Retained control-plane Terraform root

This root owns only the rebuild and cleanup control plane described by ADR-048: scoped GitHub-Azure OIDC identities, subscription cost/alert controls, and the retained Local Missions development landing-zone resource group. The separate `../bootstrap` root owns remote state. Stable Entra External ID registration and DNS remain separately gated external work. This root has a dedicated backend key and must never own a disposable application resource.

The committed fixture keeps `azure_resource_creation_enabled=false`, so its default plan has zero changes. A mock-only enabled test proves exactly twenty retained resources: one control resource group, one Local Missions development landing-zone group, three distinct managed identities, three immutable GitHub environment federated credentials, two Local Missions-only custom workload roles, one monitored Action Group, one `$100` budget filtered to `application=local-missions` with 50%/80%/100% actual and forecast alerts, five landing-zone-scoped workflow role assignments, and three container-scoped Storage Blob Data Contributor assignments required for the plan/apply/destroy identities to lock and use the Entra-backed state backend. Provider-scope UUIDs and the monitored email remain sensitive process inputs and never enter source or outputs.

The exact GitHub `sub` values must come from the repository's immutable subject preview. Name-only subjects and guessed owner/repository IDs are rejected. Plan receives Reader only at the workload landing zone. Apply receives a custom create/update role with every delete action excluded. Destroy receives a custom read/delete role with retained resource-group deletion excluded. Both privileged workflows receive a separately conditioned Role Based Access Control Administrator assignment only at the landing-zone group; constrained delegation permits only five application data roles and only ServicePrincipal recipients. All three workflows receive the minimum built-in Blob contributor role at the private `tfstate` container because Terraform locking and state writes use the Blob data plane. Built-in Contributor, subscription Owner/Contributor, unconstrained access administration, and any scope containing another workload are forbidden.

Local verification uses backend-disabled Terraform commands and makes no Azure request:

```sh
terraform -chdir=infra/terraform/control-plane init -backend=false
terraform -chdir=infra/terraform/control-plane validate
terraform -chdir=infra/terraform/control-plane test -var-file=fixtures/local-plan.tfvars.json
```

Do not run `apply`. Before this root can provision anything, the owner must approve subscription placement and co-tenancy, complete the retained backend bootstrap/migration, supply a monitored destination, validate all three immutable subjects, approve RBAC scopes, and independently review a saved plan.
