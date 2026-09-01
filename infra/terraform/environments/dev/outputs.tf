output "activation_status" {
  description = "Distinguishes the default zero-resource plan from the mock-only enabled test."
  value = (
    !var.azure_resource_creation_enabled ? "local-contract-only" :
    var.application_activation_enabled ? "mock-enabled-contract" :
    "mock-enabled-core-contract"
  )
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
    candidate_location     = var.location
    cost_profile           = var.cost_profile
    network_mode           = var.network_contract.mode
    plan_phase             = !var.azure_resource_creation_enabled ? "plan-only" : var.application_activation_enabled ? "application-activation" : "core-infrastructure"
    subscription_placement = var.subscription_placement
  }
}

output "cost_profile_contract" {
  description = "Selected bounded runtime and cost ceiling; public retail estimate, not a quote."
  value       = local.selected_cost_profile
}

output "provider_scope_status" {
  description = "Sanitized provider-scope validation state; account identifiers are never output."
  value       = var.provider_scope_validation_enabled ? "validated" : "not_requested"
}

output "resource_group_contract" {
  description = "Retained landing-zone lookup; the disposable root never creates or deletes a resource group."
  value = {
    ownership_source = "retained-control-plane"
    planned_count    = 0
    validated_count  = length(data.azurerm_resource_group.workload_landing_zone)
    names            = [for resource_group in data.azurerm_resource_group.workload_landing_zone : resource_group.name]
    retained_tags    = try(data.azurerm_resource_group.workload_landing_zone[0].tags, null)
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
      resource_group = 0
      service_bus    = try(module.workload_service_bus[0].resource_count, 0)
      storage        = try(module.workload_storage[0].resource_count, 0)
      telemetry      = try(module.workload_telemetry[0].resource_count, 0)
    }
    total = (
      try(module.workload_container_apps[0].resource_count, 0) +
      try(module.workload_key_vault[0].resource_count, 0) +
      try(module.workload_postgresql[0].resource_count, 0) +
      try(module.workload_registry[0].resource_count, 0) +
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
  description = "Reviewed Local Missions-only names derived from the synthetic suffix or unique deployment stamp."
  value       = local.resource_names
}

output "root_kind" {
  value = "disposable_workload"
}
