output "id" {
  value = azurerm_storage_account.this.id
}

output "name" {
  value = azurerm_storage_account.this.name
}

output "container_ids" {
  value = { for name, container in azurerm_storage_container.this : name => container.id }
}

output "resource_count" {
  value = 1 + length(azurerm_storage_container.this)
}

output "safeguards" {
  value = {
    anonymous_blob_access_enabled = azurerm_storage_account.this.allow_nested_items_to_be_public
    container_access_types        = { for name, container in azurerm_storage_container.this : name => container.container_access_type }
    default_network_action        = "Deny"
    https_only                    = azurerm_storage_account.this.https_traffic_only_enabled
    minimum_tls_version           = azurerm_storage_account.this.min_tls_version
    oauth_default                 = azurerm_storage_account.this.default_to_oauth_authentication
    shared_key_enabled            = azurerm_storage_account.this.shared_access_key_enabled
    soft_delete_retention_days    = var.soft_delete_retention_days
  }
}
