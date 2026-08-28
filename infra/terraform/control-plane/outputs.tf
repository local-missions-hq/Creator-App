output "activation_status" {
  description = "Confirms that this checkpoint cannot create Azure resources."
  value       = var.azure_resource_creation_enabled ? "unexpected-enabled" : "local-contract-only"
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
    candidate_location          = var.location
  }
}

output "retained_inventory" {
  description = "Expected retained classes; exact live inventory remains an external gate."
  value       = local.retained_inventory
}

output "root_kind" {
  value = "retained_control_plane"
}
