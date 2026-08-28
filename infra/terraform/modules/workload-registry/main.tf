resource "azurerm_container_registry" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
  sku                 = var.sku

  admin_enabled                                = false
  anonymous_pull_enabled                       = false
  azuread_authentication_as_arm_policy_enabled = true
  data_endpoint_enabled                        = false
  network_rule_bypass_for_tasks_enabled        = false
  network_rule_bypass_option                   = "None"
  public_network_access_enabled                = true
  quarantine_policy_enabled                    = false
  zone_redundancy_enabled                      = false
}
