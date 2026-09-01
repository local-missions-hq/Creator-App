locals {
  retained_state_monthly_cost_ceiling_usd = 1

  required_tags = {
    application      = "local-missions"
    application_code = "lm"
    environment      = "development"
    lifecycle        = "retained"
    managed_by       = "terraform"
    owner            = var.owner
    purpose          = "terraform-state-and-locking"
    region           = var.location
    terraform_root   = "bootstrap"
  }
}

data "azurerm_client_config" "current" {
  count = var.bootstrap_resource_creation_enabled ? 1 : 0
}

resource "azurerm_resource_group" "state" {
  count = var.bootstrap_resource_creation_enabled ? 1 : 0

  name     = var.state_resource_group_name
  location = var.location
  tags     = local.required_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_storage_account" "state" {
  count = var.bootstrap_resource_creation_enabled ? 1 : 0

  name                              = var.state_storage_account_name
  resource_group_name               = var.state_resource_group_name
  location                          = var.location
  account_kind                      = "StorageV2"
  account_tier                      = "Standard"
  account_replication_type          = "LRS"
  access_tier                       = "Hot"
  allow_nested_items_to_be_public   = false
  cross_tenant_replication_enabled  = false
  default_to_oauth_authentication   = true
  https_traffic_only_enabled        = true
  infrastructure_encryption_enabled = true
  local_user_enabled                = false
  min_tls_version                   = "TLS1_2"
  public_network_access_enabled     = true
  shared_access_key_enabled         = false
  tags                              = local.required_tags

  blob_properties {
    change_feed_enabled = true
    versioning_enabled  = true

    container_delete_retention_policy {
      days = 30
    }

    delete_retention_policy {
      days                     = 30
      permanent_delete_enabled = false
    }
  }

  network_rules {
    default_action = "Deny"
    bypass         = ["None"]
    ip_rules       = var.trusted_ipv4_rules
  }

  lifecycle {
    prevent_destroy = true
  }

  depends_on = [azurerm_resource_group.state]
}

resource "azurerm_storage_container" "state" {
  count = var.bootstrap_resource_creation_enabled ? 1 : 0

  name                  = var.state_container_name
  storage_account_id    = azurerm_storage_account.state[0].id
  container_access_type = "private"

  lifecycle {
    prevent_destroy = true
  }
}

check "local_missions_state_scope_is_isolated" {
  assert {
    condition = (
      startswith(var.state_resource_group_name, "rg-local-missions-state-") &&
      !startswith(var.state_resource_group_name, "rg-pp-") &&
      !startswith(var.state_storage_account_name, "stpp")
    )
    error_message = "The bootstrap root must target only the retained Local Missions state namespace."
  }
}

check "disabled_bootstrap_is_zero_cost" {
  assert {
    condition = (
      var.bootstrap_resource_creation_enabled ||
      (
        var.approved_retained_state_monthly_ceiling_usd == 0 &&
        !var.retained_state_cost_approved
      )
    )
    error_message = "Local bootstrap preparation must not claim budget or retained-cost approval."
  }
}

check "provider_scope_matches_reviewed_account" {
  assert {
    condition = (
      !var.bootstrap_resource_creation_enabled ||
      (
        try(data.azurerm_client_config.current[0].subscription_id, "") == var.expected_subscription_id &&
        try(data.azurerm_client_config.current[0].tenant_id, "") == var.expected_tenant_id
      )
    )
    error_message = "The active AzureRM provider scope does not match the reviewed retained-state bootstrap scope."
  }
}
