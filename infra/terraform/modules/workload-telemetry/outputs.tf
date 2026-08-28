output "log_analytics_workspace_id" {
  value = azurerm_log_analytics_workspace.this.id
}

output "application_insights_id" {
  value = azurerm_application_insights.this.id
}

output "resource_count" {
  value = 2
}

output "safeguards" {
  value = {
    application_insights_local_auth = azurerm_application_insights.this.local_authentication_enabled
    application_insights_query_open = azurerm_application_insights.this.internet_query_enabled
    daily_workspace_quota_gb        = azurerm_log_analytics_workspace.this.daily_quota_gb
    retention_days                  = azurerm_log_analytics_workspace.this.retention_in_days
    workspace_local_auth            = azurerm_log_analytics_workspace.this.local_authentication_enabled
  }
}
