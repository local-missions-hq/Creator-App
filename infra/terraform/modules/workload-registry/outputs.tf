output "id" {
  value = azurerm_container_registry.this.id
}

output "login_server" {
  value = azurerm_container_registry.this.login_server
}

output "resource_count" {
  value = 1
}

output "safeguards" {
  value = {
    admin_enabled          = azurerm_container_registry.this.admin_enabled
    anonymous_pull_enabled = azurerm_container_registry.this.anonymous_pull_enabled
    arm_audience_auth      = azurerm_container_registry.this.azuread_authentication_as_arm_policy_enabled
    candidate_sku          = azurerm_container_registry.this.sku
  }
}
