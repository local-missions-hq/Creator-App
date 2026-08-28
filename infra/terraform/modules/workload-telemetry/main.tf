resource "azurerm_log_analytics_workspace" "this" {
  name                = var.workspace_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  sku                                     = "PerGB2018"
  retention_in_days                       = var.retention_days
  daily_quota_gb                          = 0.5
  allow_resource_only_permissions         = true
  local_authentication_enabled            = false
  immediate_data_purge_on_30_days_enabled = true
}

resource "azurerm_application_insights" "this" {
  name                = var.application_insights_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  application_type                     = "web"
  workspace_id                         = azurerm_log_analytics_workspace.this.id
  daily_data_cap_in_gb                 = 0.1
  daily_data_cap_notifications_enabled = true
  internet_ingestion_enabled           = true
  internet_query_enabled               = false
  ip_masking_enabled                   = true
  local_authentication_enabled         = false
  sampling_percentage                  = 100
}
