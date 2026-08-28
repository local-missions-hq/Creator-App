output "activation_status" {
  description = "Distinguishes the default zero-resource plan from the mock-only enabled test."
  value       = var.azure_resource_creation_enabled ? "mock-enabled-contract" : "local-contract-only"
}

output "backend_contract" {
  description = "Disposable workload backend ownership contract."
  value = {
    key                      = "local-missions/dev-workload.tfstate"
    retained_state_owned     = false
    retained_resources_owned = false
    workload_resource_group  = var.workload_resource_group_name
  }
}

output "disposable_inventory" {
  description = "Expected same-day destroy classes."
  value       = local.disposable_inventory
}

output "expiration_contract" {
  description = "Immutable expiration and external warning/controller inputs."
  value = {
    created_at            = var.created_at
    expires_at            = var.expires_at
    extension_count       = var.extension_count
    new_york_date         = var.created_new_york_date
    expires_new_york_date = var.expires_new_york_date
    time_zone             = "America/New_York"
    warning_at            = var.warning_at
  }
}

output "low_cost_defaults" {
  description = "Planning ceilings requiring current price/SKU review before apply."
  value       = var.low_cost_defaults
}

output "required_tags" {
  description = "Tags required on every future disposable workload resource."
  value       = local.required_tags
}

output "planning_contract" {
  description = "Non-secret candidate deployment values that remain externally gated."
  value = {
    candidate_location = var.location
    network_mode       = var.network_contract.mode
  }
}

output "resource_group_contract" {
  description = "Resource-group module plan shape; count remains zero outside the mock-enabled test."
  value = {
    planned_count = length(module.workload_resource_group)
    names         = [for resource_group in module.workload_resource_group : resource_group.name]
    tags          = local.required_tags
  }
}

output "workload_safeguards" {
  description = "Provider-independent safety contract passed to future workload modules."
  value       = module.workload_contract.safeguards
}

output "root_kind" {
  value = "disposable_workload"
}
