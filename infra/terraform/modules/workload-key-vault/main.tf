resource "azurerm_key_vault" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  tenant_id           = var.tenant_id
  tags                = var.tags

  sku_name                        = "standard"
  rbac_authorization_enabled      = true
  purge_protection_enabled        = true
  soft_delete_retention_days      = 7
  public_network_access_enabled   = true
  enabled_for_deployment          = false
  enabled_for_disk_encryption     = false
  enabled_for_template_deployment = false

  network_acls {
    bypass         = "None"
    default_action = "Deny"
    ip_rules       = var.allowed_ipv4_cidrs
  }
}
