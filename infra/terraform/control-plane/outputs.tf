output "activation_status" {
  description = "Confirms that this checkpoint cannot create Azure resources."
  value       = var.azure_resource_creation_enabled ? "mock-enabled-control-plane" : "local-contract-only"
}

output "backend_contract" {
  description = "Non-secret retained backend ownership contract."
  value = {
    key                  = "local-missions/control-plane.tfstate"
    resource_group_name  = var.state_resource_group_name
    workload_state_owned = false
  }
}

output "required_tags" {
  description = "Tags required on future retained resources."
  value       = local.required_tags
}

output "planning_contract" {
  description = "Non-secret region and alert gates that require external approval before apply."
  value = {
    alert_destination_reference = var.alert_destination_reference
    budget_usd                  = var.approved_monthly_budget_usd
    candidate_location          = var.location
    github_subjects_reviewed    = var.github_oidc_subjects_revalidated
    subscription_placement      = var.subscription_placement
    workload_landing_zone       = var.workload_landing_zone_resource_group_name
  }
}

output "resource_inventory" {
  description = "Exact retained control-plane shape; zero unless explicitly activated."
  value = {
    action_group                   = length(azurerm_monitor_action_group.cost)
    budget                         = length(azurerm_consumption_budget_subscription.development)
    enabled                        = var.azure_resource_creation_enabled
    federated_identity_credentials = length(azurerm_federated_identity_credential.github)
    managed_identities             = length(azurerm_user_assigned_identity.terraform)
    resource_groups                = length(azurerm_resource_group.control) + length(azurerm_resource_group.workload_landing_zone)
    state_backend_role_assignments = length(azurerm_role_assignment.state_backend)
    workload_role_definitions      = length(azurerm_role_definition.workload)
    workflow_role_assignments      = length(azurerm_role_assignment.workflow)
    total = (
      length(azurerm_monitor_action_group.cost) +
      length(azurerm_consumption_budget_subscription.development) +
      length(azurerm_federated_identity_credential.github) +
      length(azurerm_user_assigned_identity.terraform) +
      length(azurerm_resource_group.control) +
      length(azurerm_resource_group.workload_landing_zone) +
      length(azurerm_role_assignment.state_backend) +
      length(azurerm_role_definition.workload) +
      length(azurerm_role_assignment.workflow)
    )
  }
}

output "security_contract" {
  description = "Sanitized identity, budget, and protection invariants."
  value = {
    automatic_provider_registration     = false
    budget_alert_count                  = 6
    budget_filter                       = "tag:application=local-missions"
    federated_identity_count            = 3
    immutable_github_subjects           = var.github_oidc_subjects_revalidated
    long_lived_credentials              = false
    managed_identity_count              = 3
    delegated_role_definition_count     = length(local.delegated_workload_role_definition_ids)
    landing_zone_scope_only             = true
    apply_identity_can_delete           = false
    destroy_identity_can_delete_group   = false
    custom_workload_role_count          = length(azurerm_role_definition.workload)
    subscription_scope_workload_rbac    = false
    state_backend_role_assignment_count = length(azurerm_role_assignment.state_backend)
    state_backend_scope_is_container    = nonsensitive(endswith(local.state_container_scope, "/blobServices/default/containers/${var.state_container_name}"))
    workflow_role_assignment_count      = length(azurerm_role_assignment.workflow)
    prevent_destroy                     = true
    provider_scope_validated            = var.azure_resource_creation_enabled
    shared_identity                     = false
  }
}

output "retained_inventory" {
  description = "Expected retained classes; exact live inventory remains an external gate."
  value       = local.retained_inventory
}

output "root_kind" {
  value = "retained_control_plane"
}
