output "id" {
  value = azurerm_servicebus_namespace.this.id
}

output "namespace_name" {
  value = azurerm_servicebus_namespace.this.name
}

output "queue_name" {
  value = azurerm_servicebus_queue.events.name
}

output "resource_count" {
  value = 2
}

output "safeguards" {
  value = {
    dead_letter_on_expiration = azurerm_servicebus_queue.events.dead_lettering_on_message_expiration
    default_network_action    = "Deny"
    duplicate_detection       = azurerm_servicebus_queue.events.requires_duplicate_detection
    local_auth_enabled        = azurerm_servicebus_namespace.this.local_auth_enabled
    minimum_tls_version       = azurerm_servicebus_namespace.this.minimum_tls_version
    trusted_services_allowed  = false
  }
}
