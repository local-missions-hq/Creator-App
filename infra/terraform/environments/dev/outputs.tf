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

output "workload_resource_inventory" {
  description = "Exact mock-only workload resource counts; every default plan remains zero."
  value = {
    enabled = var.azure_resource_creation_enabled
    by_module = {
      container_apps = try(module.workload_container_apps[0].resource_count, 0)
      key_vault      = try(module.workload_key_vault[0].resource_count, 0)
      postgresql     = try(module.workload_postgresql[0].resource_count, 0)
      registry       = try(module.workload_registry[0].resource_count, 0)
      resource_group = length(module.workload_resource_group)
      service_bus    = try(module.workload_service_bus[0].resource_count, 0)
      storage        = try(module.workload_storage[0].resource_count, 0)
      telemetry      = try(module.workload_telemetry[0].resource_count, 0)
    }
    total = (
      try(module.workload_container_apps[0].resource_count, 0) +
      try(module.workload_key_vault[0].resource_count, 0) +
      try(module.workload_postgresql[0].resource_count, 0) +
      try(module.workload_registry[0].resource_count, 0) +
      length(module.workload_resource_group) +
      try(module.workload_service_bus[0].resource_count, 0) +
      try(module.workload_storage[0].resource_count, 0) +
      try(module.workload_telemetry[0].resource_count, 0)
    )
  }
}

output "workload_resource_safeguards" {
  description = "Concrete module safeguards, populated only by the mock-enabled plan."
  value = var.azure_resource_creation_enabled ? {
    container_apps = module.workload_container_apps[0].safeguards
    key_vault      = module.workload_key_vault[0].safeguards
    postgresql     = module.workload_postgresql[0].safeguards
    registry       = module.workload_registry[0].safeguards
    service_bus    = module.workload_service_bus[0].safeguards
    storage        = module.workload_storage[0].safeguards
    telemetry      = module.workload_telemetry[0].safeguards
  } : null
}

output "workload_resource_names" {
  description = "Synthetic name contract; every globally unique name must be replaced/reviewed before live planning."
  value       = local.resource_names
}

output "root_kind" {
  value = "disposable_workload"
}
