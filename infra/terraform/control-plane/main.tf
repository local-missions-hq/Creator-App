locals {
  retained_inventory = [
    "remote-state-and-locking",
    "github-azure-oidc-identities",
    "entra-external-id-registrations",
    "stable-domain-and-verification-dns",
    "subscription-budgets-alerts-and-policy",
  ]

  required_tags = {
    application    = "local-missions"
    environment    = "control-plane"
    lifecycle      = "retained"
    managed_by     = "terraform"
    owner          = var.owner
    purpose        = "rebuild-and-cleanup-control-plane"
    terraform_root = "control-plane"
  }
}

check "retained_scope_is_explicit" {
  assert {
    condition = (
      var.control_plane_resource_group_name != var.state_resource_group_name &&
      !strcontains(lower(var.control_plane_resource_group_name), "workload") &&
      !strcontains(lower(var.state_resource_group_name), "workload")
    )
    error_message = "Retained control-plane and state scopes must be explicit, distinct, and outside the workload namespace."
  }
}
