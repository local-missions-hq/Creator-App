locals {
  storage_ip_rules = [
    for cidr in var.allowed_ipv4_cidrs : endswith(cidr, "/32") ? cidrhost(cidr, 0) : cidr
  ]
}

resource "azurerm_storage_account" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

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

  network_rules {
    default_action = "Deny"
    bypass         = []
    ip_rules       = local.storage_ip_rules
  }

  blob_properties {
    versioning_enabled = true

    container_delete_retention_policy {
      days = var.soft_delete_retention_days
    }

    delete_retention_policy {
      days                     = var.soft_delete_retention_days
      permanent_delete_enabled = false
    }
  }
}

resource "azurerm_storage_container" "this" {
  for_each = var.container_names

  name                  = each.value
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = "private"
}
