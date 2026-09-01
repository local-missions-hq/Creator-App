mock_provider "azurerm" {
  mock_data "azurerm_resource_group" {
    defaults = {
      id       = "/subscriptions/00000000-0000-4000-8000-000000000003/resourceGroups/rg-local-missions-dev-eus2-001"
      location = "eastus2"
      name     = "rg-local-missions-dev-eus2-001"
      tags = {
        application = "local-missions"
        lifecycle   = "retained-boundary"
      }
    }
  }

  mock_resource "azurerm_container_registry" {
    defaults = {
      id           = "/subscriptions/00000000-0000-4000-8000-000000000003/resourceGroups/rg-local-missions-dev-example/providers/Microsoft.ContainerRegistry/registries/acrlmdevexample"
      login_server = "acrlmdevexample.azurecr.io"
    }
  }

  mock_resource "azurerm_key_vault" {
    defaults = {
      id        = "/subscriptions/00000000-0000-4000-8000-000000000003/resourceGroups/rg-local-missions-dev-example/providers/Microsoft.KeyVault/vaults/kvlmdev-example"
      vault_uri = "https://kvlmdev-example.vault.azure.net/"
    }
  }

  mock_resource "azurerm_postgresql_flexible_server" {
    defaults = {
      id   = "/subscriptions/00000000-0000-4000-8000-000000000003/resourceGroups/rg-local-missions-dev-example/providers/Microsoft.DBforPostgreSQL/flexibleServers/psql-local-missions-dev-example"
      fqdn = "psql-local-missions-dev-example.postgres.database.azure.com"
    }
  }

  mock_resource "azurerm_servicebus_namespace" {
    defaults = {
      id = "/subscriptions/00000000-0000-4000-8000-000000000003/resourceGroups/rg-local-missions-dev-example/providers/Microsoft.ServiceBus/namespaces/sb-local-missions-dev-example"
    }
  }

  mock_resource "azurerm_storage_account" {
    defaults = {
      id = "/subscriptions/00000000-0000-4000-8000-000000000003/resourceGroups/rg-local-missions-dev-example/providers/Microsoft.Storage/storageAccounts/stlmdevexample"
    }
  }

  mock_resource "azurerm_log_analytics_workspace" {
    defaults = {
      id = "/subscriptions/00000000-0000-4000-8000-000000000003/resourceGroups/rg-local-missions-dev-example/providers/Microsoft.OperationalInsights/workspaces/law-local-missions-dev-example"
    }
  }

  mock_resource "azurerm_user_assigned_identity" {
    defaults = {
      client_id    = "00000000-0000-4000-8000-000000000013"
      principal_id = "00000000-0000-4000-8000-000000000014"
    }
  }
}

run "local_disposable_workload_contract" {
  command = plan

  assert {
    condition     = output.activation_status == "local-contract-only"
    error_message = "The disposable workload checkpoint must remain local-contract-only."
  }

  assert {
    condition     = output.backend_contract.key == "local-missions/dev-workload.tfstate"
    error_message = "The disposable workload backend key drifted."
  }

  assert {
    condition     = output.backend_contract.retained_resources_owned == false
    error_message = "The disposable root must not own retained resources."
  }

  assert {
    condition     = output.expiration_contract.warning_at == "2026-08-28T21:00:00-04:00"
    error_message = "The local fixture warning must remain exactly one hour before expiration."
  }

  assert {
    condition     = output.low_cost_defaults.api_max_replicas == 1 && output.low_cost_defaults.dashboard_max_replicas == 1 && output.low_cost_defaults.worker_max_replicas == 1
    error_message = "The local fixture must retain one-replica API, dashboard, and worker ceilings."
  }

  assert {
    condition     = output.resource_group_contract.planned_count == 0
    error_message = "The default local fixture must plan zero resource groups."
  }

  assert {
    condition     = output.workload_resource_inventory.total == 0 && output.workload_resource_safeguards == null
    error_message = "The default local fixture must plan zero workload resources and expose no enabled safeguards."
  }
}

run "mock_enabled_core_infrastructure_contract" {
  command = plan

  variables {
    alert_destination_reference     = "monitored-cost-destination"
    apply_approval_reference        = "mock-core-approval"
    approved_monthly_budget_usd     = 100
    azure_resource_creation_enabled = true
    cleanup_controller_reference    = "mock-cleanup-controller"
    cost_profile                    = "full-8h"
    identity_references_revalidated = true
    identity_reference_contract = {
      tenant_id                        = "00000000-0000-4000-8000-000000000003"
      postgres_administrator_object_id = "00000000-0000-4000-8000-000000000004"
      postgres_administrator_name      = "local-missions-postgres-admins"
      postgres_administrator_type      = "Group"
    }
    region_and_sku_revalidated        = true
    subscription_placement            = "shared-nonproduction"
    workload_landing_zone_revalidated = true
    network_contract = {
      mode                                   = "restricted_public"
      allowed_ipv4_cidrs                     = ["203.0.113.10/32"]
      minimum_tls_version                    = "TLS1_2"
      postgres_public_network_access_enabled = true
      postgres_firewall_allow_azure_services = false
      postgres_firewall_allow_all            = false
    }
  }

  assert {
    condition     = output.activation_status == "mock-enabled-core-contract"
    error_message = "The first applyable shape must remain core infrastructure only."
  }

  assert {
    condition = (
      output.workload_resource_inventory.total == 27 &&
      output.workload_resource_inventory.by_module.container_apps == 13 &&
      !output.workload_resource_safeguards.container_apps.applications_enabled &&
      output.workload_resource_safeguards.container_apps.application_resource_count == 0
    )
    error_message = "The core phase must create 27 resources inside the retained landing zone and no Container App resource."
  }

  assert {
    condition     = output.planning_contract.plan_phase == "core-infrastructure"
    error_message = "The first applyable phase label drifted."
  }
}

run "mock_enabled_resource_group_contract" {
  command = plan

  variables {
    alert_destination_reference     = "monitored-cost-destination"
    application_activation_enabled  = true
    apply_approval_reference        = "mock-plan-approval"
    approved_monthly_budget_usd     = 100
    azure_resource_creation_enabled = true
    cleanup_controller_reference    = "mock-cleanup-controller"
    cost_profile                    = "full-8h"
    artifact_references_revalidated = true
    identity_references_revalidated = true
    identity_reference_contract = {
      tenant_id                        = "00000000-0000-4000-8000-000000000003"
      postgres_administrator_object_id = "00000000-0000-4000-8000-000000000004"
      postgres_administrator_name      = "local-missions-postgres-admins"
      postgres_administrator_type      = "Group"
    }
    region_and_sku_revalidated        = true
    subscription_placement            = "shared-nonproduction"
    workload_landing_zone_revalidated = true
    network_contract = {
      mode                                   = "restricted_public"
      allowed_ipv4_cidrs                     = ["203.0.113.10/32"]
      minimum_tls_version                    = "TLS1_2"
      postgres_public_network_access_enabled = true
      postgres_firewall_allow_azure_services = false
      postgres_firewall_allow_all            = false
    }
  }

  assert {
    condition     = output.activation_status == "mock-enabled-contract"
    error_message = "The enabled shape may be exercised only under the mock-provider contract."
  }

  assert {
    condition = (
      output.planning_contract.plan_phase == "application-activation" &&
      output.workload_resource_safeguards.container_apps.applications_enabled &&
      output.workload_resource_safeguards.container_apps.application_resource_count == 3
    )
    error_message = "The final phase must activate exactly API, dashboard, and worker."
  }


  assert {
    condition     = output.cost_profile_contract.run_ceiling_usd == 5 && output.cost_profile_contract.maximum_hours == 8
    error_message = "The enabled mock shape must retain the full-8h cost ceiling."
  }

  assert {
    condition = (
      output.workload_resource_inventory.total == 30 &&
      output.workload_resource_inventory.by_module.resource_group == 0 &&
      output.workload_resource_inventory.by_module.storage == 4 &&
      output.workload_resource_inventory.by_module.postgresql == 4 &&
      output.workload_resource_inventory.by_module.container_apps == 16
    )
    error_message = "The mock-enabled plan must contain the exact 30-resource disposable workload inventory inside the retained landing zone."
  }

  assert {
    condition = (
      output.resource_group_contract.ownership_source == "retained-control-plane" &&
      output.resource_group_contract.planned_count == 0 &&
      output.resource_group_contract.validated_count == 1 &&
      output.resource_group_contract.names[0] == "rg-local-missions-dev-eus2-001"
    )
    error_message = "The disposable root must validate, but never create or delete, the retained Local Missions landing zone."
  }

  assert {
    condition = (
      output.resource_group_contract.retained_tags.application == "local-missions" &&
      output.resource_group_contract.retained_tags.lifecycle == "retained-boundary"
    )
    error_message = "The mock landing zone must retain its Local Missions-only boundary tags."
  }

  assert {
    condition = (
      output.workload_safeguards.environment == "development" &&
      output.workload_safeguards.retained_and_disposable_are_distinct &&
      output.workload_safeguards.scale.api_min_replicas == 0 &&
      output.workload_safeguards.scale.api_max_replicas == 1 &&
      output.workload_safeguards.scale.dashboard_min_replicas == 0 &&
      output.workload_safeguards.scale.dashboard_max_replicas == 1
    )
    error_message = "Environment, ownership, and scale safeguards drifted."
  }

  assert {
    condition = (
      output.workload_safeguards.network.minimum_tls_version == "TLS1_2" &&
      !output.workload_safeguards.network.postgres_firewall_allow_all &&
      output.workload_safeguards.backup.postgres_retention_days == 7 &&
      output.workload_safeguards.backup.point_in_time_restore_required
    )
    error_message = "Network or backup safeguards drifted."
  }

  assert {
    condition = (
      !output.workload_safeguards.storage_access.blob_public_access_enabled &&
      !output.workload_safeguards.storage_access.static_website_enabled &&
      output.workload_safeguards.storage_access.container_access_type == "private"
    )
    error_message = "Anonymous storage access must remain disabled."
  }

  assert {
    condition = (
      output.workload_resource_safeguards.storage.anonymous_blob_access_enabled == false &&
      output.workload_resource_safeguards.storage.shared_key_enabled == false &&
      output.workload_resource_safeguards.storage.default_network_action == "Deny" &&
      alltrue([for access_type in values(output.workload_resource_safeguards.storage.container_access_types) : access_type == "private"])
    )
    error_message = "Storage must remain OAuth-first, private, non-anonymous, and default-deny."
  }

  assert {
    condition = (
      output.workload_resource_safeguards.postgresql.active_directory_auth_enabled &&
      !output.workload_resource_safeguards.postgresql.password_auth_enabled &&
      output.workload_resource_safeguards.postgresql.administrator_password_fields == 0 &&
      output.workload_resource_safeguards.postgresql.backup_retention_days == 7 &&
      !output.workload_resource_safeguards.postgresql.geo_redundant_backup_enabled
    )
    error_message = "PostgreSQL must remain Entra-only with bounded point-in-time recovery and no password fields."
  }

  assert {
    condition = (
      !output.workload_resource_safeguards.registry.admin_enabled &&
      !output.workload_resource_safeguards.registry.anonymous_pull_enabled &&
      output.workload_resource_safeguards.registry.arm_audience_auth &&
      !output.workload_resource_safeguards.service_bus.local_auth_enabled &&
      output.workload_resource_safeguards.service_bus.duplicate_detection &&
      output.workload_resource_safeguards.service_bus.default_network_action == "Deny"
    )
    error_message = "Registry and Service Bus must require identity and retain reliability/network safeguards."
  }

  assert {
    condition = (
      output.workload_resource_safeguards.key_vault.rbac_enabled &&
      output.workload_resource_safeguards.key_vault.purge_protection_enabled &&
      output.workload_resource_safeguards.key_vault.secret_resources == 0 &&
      output.workload_resource_safeguards.key_vault.default_network_action == "Deny" &&
      !output.workload_resource_safeguards.telemetry.workspace_local_auth &&
      !output.workload_resource_safeguards.telemetry.application_insights_local_auth
    )
    error_message = "Key Vault and telemetry must remain RBAC/identity-only without Terraform secret values."
  }

  assert {
    condition = (
      output.workload_resource_safeguards.container_apps.managed_identity_count == 3 &&
      output.workload_resource_safeguards.container_apps.api_role_count == 4 &&
      output.workload_resource_safeguards.container_apps.dashboard_role_count == 1 &&
      join(",", output.workload_resource_safeguards.container_apps.dashboard_role_names) == "AcrPull" &&
      join(",", output.workload_resource_safeguards.container_apps.dashboard_environment_names) == "API_BASE_URL,APP_ENV" &&
      output.workload_resource_safeguards.container_apps.dashboard_api_url_https &&
      output.workload_resource_safeguards.container_apps.worker_role_count == 4 &&
      output.workload_resource_safeguards.container_apps.dashboard_has_ingress &&
      output.workload_resource_safeguards.container_apps.dashboard_ingress_allowlist_count == 1 &&
      output.workload_resource_safeguards.container_apps.dashboard_min_replicas == 0 &&
      output.workload_resource_safeguards.container_apps.dashboard_max_replicas == 1 &&
      output.workload_resource_safeguards.container_apps.image_references_use_digests &&
      output.workload_resource_safeguards.container_apps.inline_secret_blocks == 0 &&
      output.workload_resource_safeguards.container_apps.registry_password_references == 0 &&
      !output.workload_resource_safeguards.container_apps.worker_has_ingress
    )
    error_message = "API, dashboard, and worker Container Apps must use separate managed identities, scoped RBAC, digest images, and no inline secrets."
  }
}
