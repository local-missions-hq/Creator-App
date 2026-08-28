resource "azurerm_servicebus_namespace" "this" {
  name                = var.namespace_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
  sku                 = var.sku

  local_auth_enabled            = false
  minimum_tls_version           = "1.2"
  public_network_access_enabled = true

  network_rule_set {
    default_action                = "Deny"
    ip_rules                      = var.allowed_ipv4_cidrs
    public_network_access_enabled = true
    trusted_services_allowed      = false
  }
}

resource "azurerm_servicebus_queue" "events" {
  name         = var.queue_name
  namespace_id = azurerm_servicebus_namespace.this.id

  batched_operations_enabled              = true
  dead_lettering_on_message_expiration    = true
  default_message_ttl                     = "P14D"
  duplicate_detection_history_time_window = "PT10M"
  lock_duration                           = "PT1M"
  max_delivery_count                      = 10
  max_size_in_megabytes                   = 1024
  partitioning_enabled                    = false
  requires_duplicate_detection            = true
  requires_session                        = false
}
