output "id" {
  value = azurerm_postgresql_flexible_server.this.id
}

output "fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.application.name
}

output "resource_count" {
  value = 3 + length(azurerm_postgresql_flexible_server_firewall_rule.allowlist)
}

output "safeguards" {
  value = {
    active_directory_auth_enabled = true
    administrator_password_fields = 0
    backup_retention_days         = azurerm_postgresql_flexible_server.this.backup_retention_days
    firewall_rule_count           = length(azurerm_postgresql_flexible_server_firewall_rule.allowlist)
    geo_redundant_backup_enabled  = azurerm_postgresql_flexible_server.this.geo_redundant_backup_enabled
    password_auth_enabled         = false
  }
}
