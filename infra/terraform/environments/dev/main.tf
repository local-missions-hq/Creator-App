locals {
  cost_profiles = {
    plan-only = {
      azure_resources             = false
      maximum_hours               = 0
      raw_estimate_usd            = 0
      run_ceiling_usd             = 0
      monthly_budget_proposal_usd = 100
    }
    smoke-2h = {
      azure_resources             = true
      maximum_hours               = 2
      raw_estimate_usd            = 0.85
      run_ceiling_usd             = 2
      monthly_budget_proposal_usd = 100
    }
    integration-4h = {
      azure_resources             = true
      maximum_hours               = 4
      raw_estimate_usd            = 1.66
      run_ceiling_usd             = 3
      monthly_budget_proposal_usd = 100
    }
    full-8h = {
      azure_resources             = true
      maximum_hours               = 8
      raw_estimate_usd            = 3.02
      run_ceiling_usd             = 5
      monthly_budget_proposal_usd = 100
    }
  }

  selected_cost_profile = local.cost_profiles[var.cost_profile]

  disposable_inventory = [
    "container-apps-and-environment",
    "postgresql-and-application-database",
    "workload-storage-and-media-containers",
    "service-bus-and-worker-entry-point",
    "workload-key-vault",
    "workload-telemetry",
    "container-registry-and-temporary-images",
    "dashboard-hosting",
    "temporary-networking",
  ]

  required_tags = {
    application             = "local-missions"
    application_code        = "lm"
    commit_sha              = var.commit_sha
    cost_profile            = var.cost_profile
    created_at              = var.created_at
    deployment_stamp        = var.resource_name_suffix
    environment             = "development"
    expires_at              = var.expires_at
    lifecycle               = "disposable"
    managed_by              = "terraform"
    owner                   = var.owner
    purpose                 = "same-day-synthetic-cloud-validation"
    region                  = var.location
    run_ceiling_usd         = tostring(local.selected_cost_profile.run_ceiling_usd)
    terraform_root          = "workload-dev"
    workload_resource_group = var.workload_resource_group_name
  }

  resource_names = {
    storage_account           = "stlmdev${var.resource_name_suffix}"
    postgresql_server         = "psql-local-missions-dev-${var.resource_name_suffix}"
    service_bus_namespace     = "sb-local-missions-dev-${var.resource_name_suffix}"
    container_registry        = "acrlmdev${var.resource_name_suffix}"
    key_vault                 = "kvlmdev-${var.resource_name_suffix}"
    log_analytics_workspace   = "law-local-missions-dev-${var.resource_name_suffix}"
    application_insights      = "appi-local-missions-dev-${var.resource_name_suffix}"
    container_app_environment = "cae-local-missions-dev-${var.resource_name_suffix}"
    api_container_app         = "ca-lm-api-dev-${var.resource_name_suffix}"
    dashboard_container_app   = "ca-lm-dashboard-dev-${var.resource_name_suffix}"
    worker_container_app      = "ca-lm-worker-dev-${var.resource_name_suffix}"
    api_identity              = "id-local-missions-api-dev-${var.resource_name_suffix}"
    dashboard_identity        = "id-local-missions-dashboard-dev-${var.resource_name_suffix}"
    worker_identity           = "id-local-missions-worker-dev-${var.resource_name_suffix}"
  }
}

module "workload_contract" {
  source = "../../modules/workload-contract"

  environment                     = var.environment
  workload_resource_group_name    = var.workload_resource_group_name
  retained_resource_group_names   = [var.control_plane_resource_group_name, var.state_resource_group_name]
  scale_contract                  = var.scale_contract
  network_contract                = var.network_contract
  backup_contract                 = var.backup_contract
  storage_access_contract         = var.storage_access_contract
  azure_resource_creation_enabled = var.azure_resource_creation_enabled
  secret_reference_contract       = var.secret_reference_contract
}

data "azurerm_resource_group" "workload_landing_zone" {
  count = var.azure_resource_creation_enabled ? 1 : 0

  name = var.workload_resource_group_name
}

module "workload_storage" {
  count  = var.azure_resource_creation_enabled ? 1 : 0
  source = "../../modules/workload-storage"

  name                       = local.resource_names.storage_account
  resource_group_name        = var.workload_resource_group_name
  location                   = var.location
  tags                       = local.required_tags
  allowed_ipv4_cidrs         = var.network_contract.allowed_ipv4_cidrs
  container_names            = ["mission-media", "locality-evidence", "account-exports"]
  soft_delete_retention_days = 7

  depends_on = [data.azurerm_resource_group.workload_landing_zone]
}

module "workload_postgresql" {
  count  = var.azure_resource_creation_enabled ? 1 : 0
  source = "../../modules/workload-postgresql"

  server_name           = local.resource_names.postgresql_server
  database_name         = "local_missions"
  resource_group_name   = var.workload_resource_group_name
  location              = var.location
  tags                  = local.required_tags
  allowed_ipv4_cidrs    = var.network_contract.allowed_ipv4_cidrs
  sku_name              = var.low_cost_defaults.postgres_sku_name
  storage_mb            = var.low_cost_defaults.postgres_storage_mb
  backup_retention_days = var.backup_contract.postgres_retention_days
  tenant_id             = var.identity_reference_contract.tenant_id
  administrator_reference = {
    object_id      = var.identity_reference_contract.postgres_administrator_object_id
    principal_name = var.identity_reference_contract.postgres_administrator_name
    principal_type = var.identity_reference_contract.postgres_administrator_type
  }

  depends_on = [data.azurerm_resource_group.workload_landing_zone]
}

module "workload_service_bus" {
  count  = var.azure_resource_creation_enabled ? 1 : 0
  source = "../../modules/workload-service-bus"

  namespace_name      = local.resource_names.service_bus_namespace
  queue_name          = "mission-events"
  resource_group_name = var.workload_resource_group_name
  location            = var.location
  tags                = local.required_tags
  allowed_ipv4_cidrs  = var.network_contract.allowed_ipv4_cidrs
  sku                 = var.low_cost_defaults.service_bus_sku

  depends_on = [data.azurerm_resource_group.workload_landing_zone]
}

module "workload_registry" {
  count  = var.azure_resource_creation_enabled ? 1 : 0
  source = "../../modules/workload-registry"

  name                = local.resource_names.container_registry
  resource_group_name = var.workload_resource_group_name
  location            = var.location
  tags                = local.required_tags
  sku                 = var.low_cost_defaults.container_registry_sku

  depends_on = [data.azurerm_resource_group.workload_landing_zone]
}

module "workload_key_vault" {
  count  = var.azure_resource_creation_enabled ? 1 : 0
  source = "../../modules/workload-key-vault"

  name                = local.resource_names.key_vault
  resource_group_name = var.workload_resource_group_name
  location            = var.location
  tenant_id           = var.identity_reference_contract.tenant_id
  tags                = local.required_tags
  allowed_ipv4_cidrs  = var.network_contract.allowed_ipv4_cidrs

  depends_on = [data.azurerm_resource_group.workload_landing_zone]
}

module "workload_telemetry" {
  count  = var.azure_resource_creation_enabled ? 1 : 0
  source = "../../modules/workload-telemetry"

  workspace_name            = local.resource_names.log_analytics_workspace
  application_insights_name = local.resource_names.application_insights
  resource_group_name       = var.workload_resource_group_name
  location                  = var.location
  tags                      = local.required_tags
  retention_days            = var.low_cost_defaults.log_retention_days

  depends_on = [data.azurerm_resource_group.workload_landing_zone]
}

module "workload_container_apps" {
  count  = var.azure_resource_creation_enabled ? 1 : 0
  source = "../../modules/workload-container-apps"

  application_activation_enabled = var.application_activation_enabled
  environment_name               = local.resource_names.container_app_environment
  api_app_name                   = local.resource_names.api_container_app
  dashboard_app_name             = local.resource_names.dashboard_container_app
  worker_app_name                = local.resource_names.worker_container_app
  api_identity_name              = local.resource_names.api_identity
  dashboard_identity_name        = local.resource_names.dashboard_identity
  worker_identity_name           = local.resource_names.worker_identity
  resource_group_name            = var.workload_resource_group_name
  location                       = var.location
  tags                           = local.required_tags
  allowed_ipv4_cidrs             = var.network_contract.allowed_ipv4_cidrs

  log_analytics_workspace_id = module.workload_telemetry[0].log_analytics_workspace_id
  registry = {
    id           = module.workload_registry[0].id
    login_server = module.workload_registry[0].login_server
  }
  storage = {
    id   = module.workload_storage[0].id
    name = module.workload_storage[0].name
  }
  service_bus = {
    id             = module.workload_service_bus[0].id
    namespace_name = module.workload_service_bus[0].namespace_name
    queue_name     = module.workload_service_bus[0].queue_name
  }
  key_vault = {
    id        = module.workload_key_vault[0].id
    vault_uri = module.workload_key_vault[0].vault_uri
  }
  postgresql = {
    fqdn          = module.workload_postgresql[0].fqdn
    database_name = module.workload_postgresql[0].database_name
  }
  images = var.image_contract
  scale  = var.scale_contract

  depends_on = [
    module.workload_key_vault,
    module.workload_postgresql,
    module.workload_registry,
    module.workload_service_bus,
    module.workload_storage,
    module.workload_telemetry,
    data.azurerm_resource_group.workload_landing_zone,
  ]
}

check "retained_and_disposable_scopes_are_distinct" {
  assert {
    condition = (
      var.workload_resource_group_name != var.control_plane_resource_group_name &&
      var.workload_resource_group_name != var.state_resource_group_name &&
      var.control_plane_resource_group_name != var.state_resource_group_name
    )
    error_message = "Disposable workload, retained control plane, and retained state scopes must all differ."
  }
}

check "workload_group_matches_deployment_stamp" {
  assert {
    condition     = !var.azure_resource_creation_enabled || var.workload_resource_group_name == "rg-local-missions-dev-eus2-001"
    error_message = "The workload must target the exact retained Local Missions landing-zone resource group; run isolation comes from stamped resource names and state."
  }
}

check "workload_landing_zone_is_revalidated" {
  assert {
    condition = (
      !var.azure_resource_creation_enabled ||
      (
        var.workload_landing_zone_revalidated &&
        try(data.azurerm_resource_group.workload_landing_zone[0].name, "") == var.workload_resource_group_name &&
        try(data.azurerm_resource_group.workload_landing_zone[0].tags.application, "") == "local-missions" &&
        try(data.azurerm_resource_group.workload_landing_zone[0].tags.lifecycle, "") == "retained-boundary"
      )
    )
    error_message = "Azure activation requires the existing Local Missions-only landing-zone resource group and its retained-boundary ownership tags to be revalidated."
  }
}

check "cost_profile_matches_activation" {
  assert {
    condition = (
      (!var.azure_resource_creation_enabled && var.cost_profile == "plan-only") ||
      (
        var.azure_resource_creation_enabled &&
        local.selected_cost_profile.azure_resources &&
        local.selected_cost_profile.maximum_hours > 0 &&
        local.selected_cost_profile.maximum_hours <= 8 &&
        timecmp(
          var.expires_at,
          timeadd(var.created_at, "${local.selected_cost_profile.maximum_hours}h"),
        ) <= 0 &&
        var.approved_monthly_budget_usd >= local.selected_cost_profile.monthly_budget_proposal_usd
      )
    )
    error_message = "Plan-only must create zero resources; Azure activation requires a bounded Azure cost tier, matching expiry, and at least the proposed monthly budget."
  }
}

check "application_activation_is_second_phase" {
  assert {
    condition = (
      !var.application_activation_enabled ||
      (
        var.azure_resource_creation_enabled &&
        var.artifact_references_revalidated
      )
    )
    error_message = "Container Apps are a second-phase activation after core infrastructure and immutable image publication."
  }
}
