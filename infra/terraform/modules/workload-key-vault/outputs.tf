output "id" {
  value = azurerm_key_vault.this.id
}

output "vault_uri" {
  value = azurerm_key_vault.this.vault_uri
}

output "resource_count" {
  value = 1
}

output "safeguards" {
  value = {
    default_network_action   = "Deny"
    purge_protection_enabled = azurerm_key_vault.this.purge_protection_enabled
    rbac_enabled             = azurerm_key_vault.this.rbac_authorization_enabled
    secret_resources         = 0
    soft_delete_days         = azurerm_key_vault.this.soft_delete_retention_days
    trusted_services_bypass  = false
  }
}
