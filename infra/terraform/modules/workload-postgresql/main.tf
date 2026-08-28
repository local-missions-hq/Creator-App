locals {
  firewall_rules = {
    for index, cidr in var.allowed_ipv4_cidrs : format("allow-%02d", index + 1) => {
      start_ip = cidrhost(cidr, 0)
      end_ip   = cidrhost(cidr, -1)
    }
  }
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                = var.server_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  version                       = "16"
  sku_name                      = var.sku_name
  storage_mb                    = var.storage_mb
  auto_grow_enabled             = true
  backup_retention_days         = var.backup_retention_days
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = false
    tenant_id                     = var.tenant_id
  }
}

resource "azurerm_postgresql_flexible_server_database" "application" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allowlist" {
  for_each = local.firewall_rules

  name             = each.key
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = each.value.start_ip
  end_ip_address   = each.value.end_ip
}

resource "azurerm_postgresql_flexible_server_active_directory_administrator" "this" {
  server_name         = azurerm_postgresql_flexible_server.this.name
  resource_group_name = var.resource_group_name
  tenant_id           = var.tenant_id
  object_id           = var.administrator_reference.object_id
  principal_name      = var.administrator_reference.principal_name
  principal_type      = var.administrator_reference.principal_type
}
