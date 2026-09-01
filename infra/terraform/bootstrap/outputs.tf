output "activation_status" {
  description = "Separates the default zero-resource contract from the mock-only enabled shape."
  value       = var.bootstrap_resource_creation_enabled ? "mock-enabled-bootstrap" : "local-contract-only"
}

output "backend_contract" {
  description = "Bootstrap state is retained in the Entra-backed remote backend after the one-time migration."
  value = {
    bootstrap_backend       = "azurerm"
    key                     = "local-missions/bootstrap.tfstate"
    migration_required      = false
    remote_container        = var.state_container_name
    remote_resource_group   = var.state_resource_group_name
    remote_storage_account  = var.state_storage_account_name
    workload_state_key      = "local-missions/dev-workload.tfstate"
    control_plane_state_key = "local-missions/control-plane.tfstate"
  }
}

output "retained_state_cost_contract" {
  description = "Planning ceiling for retained state only; this storage is excluded from daily workload deletion."
  value = {
    approval_required       = true
    approved                = var.retained_state_cost_approved
    approved_ceiling_usd    = var.approved_retained_state_monthly_ceiling_usd
    monthly_ceiling_usd     = local.retained_state_monthly_cost_ceiling_usd
    survives_daily_teardown = true
  }
}

output "planning_contract" {
  description = "Sanitized placement and provider-scope gates for the one-time bootstrap plan."
  value = {
    dedicated_isolation_revalidated = var.dedicated_subscription_isolation_revalidated
    provider_scope_validated        = var.bootstrap_resource_creation_enabled
    subscription_placement          = var.subscription_placement
  }
}

output "resource_inventory" {
  description = "Exact retained bootstrap shape; zero unless explicitly activated."
  value = {
    enabled           = var.bootstrap_resource_creation_enabled
    resource_group    = length(azurerm_resource_group.state)
    storage_account   = length(azurerm_storage_account.state)
    storage_container = length(azurerm_storage_container.state)
    total = (
      length(azurerm_resource_group.state) +
      length(azurerm_storage_account.state) +
      length(azurerm_storage_container.state)
    )
  }
}

output "safeguards" {
  description = "Non-secret retained-state security controls."
  value = {
    anonymous_access             = false
    change_feed_enabled          = true
    container_access_type        = "private"
    default_network_action       = "Deny"
    delete_retention_days        = 30
    https_only                   = true
    infrastructure_encryption    = true
    local_users_enabled          = false
    minimum_tls_version          = "TLS1_2"
    prevent_destroy              = true
    shared_key_enabled           = false
    storage_uses_microsoft_entra = true
    versioning_enabled           = true
  }
}

output "required_tags" {
  value = local.required_tags
}

output "root_kind" {
  value = "retained_state_bootstrap"
}
