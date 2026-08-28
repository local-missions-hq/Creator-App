output "id" {
  description = "Resource-group identifier supplied by AzureRM or the mock provider."
  value       = azurerm_resource_group.this.id
}

output "name" {
  description = "Exact disposable resource-group name."
  value       = azurerm_resource_group.this.name
}

output "tags" {
  description = "Reviewed ownership and expiry tags."
  value       = azurerm_resource_group.this.tags
}
