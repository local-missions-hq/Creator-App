locals {
  api_image       = "${var.registry.login_server}/${var.images.api_repository}@sha256:${var.images.api_digest}"
  dashboard_image = "${var.registry.login_server}/${var.images.dashboard_repository}@sha256:${var.images.dashboard_digest}"
  worker_image    = "${var.registry.login_server}/${var.images.worker_repository}@sha256:${var.images.worker_digest}"

  api_environment = {
    APP_ENVIRONMENT       = "development"
    KEY_VAULT_URI         = var.key_vault.vault_uri
    POSTGRES_AUTH_MODE    = "entra"
    POSTGRES_DATABASE     = var.postgresql.database_name
    POSTGRES_HOST         = var.postgresql.fqdn
    SERVICE_BUS_NAMESPACE = var.service_bus.namespace_name
    SERVICE_BUS_QUEUE     = var.service_bus.queue_name
    STORAGE_ACCOUNT_NAME  = var.storage.name
  }

  worker_environment = merge(local.api_environment, {
    WORKER_MODE = "service-bus"
  })

  dashboard_environment = {
    API_BASE_URL = "https://${azurerm_container_app.api.latest_revision_fqdn}"
    APP_ENV      = "development"
  }

  api_roles = {
    acr_pull = {
      scope = var.registry.id
      role  = "AcrPull"
    }
    key_vault_secrets = {
      scope = var.key_vault.id
      role  = "Key Vault Secrets User"
    }
    service_bus_send = {
      scope = var.service_bus.id
      role  = "Azure Service Bus Data Sender"
    }
    storage_blob = {
      scope = var.storage.id
      role  = "Storage Blob Data Contributor"
    }
  }

  worker_roles = {
    acr_pull = {
      scope = var.registry.id
      role  = "AcrPull"
    }
    key_vault_secrets = {
      scope = var.key_vault.id
      role  = "Key Vault Secrets User"
    }
    service_bus_receive = {
      scope = var.service_bus.id
      role  = "Azure Service Bus Data Receiver"
    }
    storage_blob = {
      scope = var.storage.id
      role  = "Storage Blob Data Contributor"
    }
  }

  dashboard_roles = {
    acr_pull = {
      scope = var.registry.id
      role  = "AcrPull"
    }
  }
}

resource "azurerm_user_assigned_identity" "api" {
  name                = var.api_identity_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_user_assigned_identity" "worker" {
  name                = var.worker_identity_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_user_assigned_identity" "dashboard" {
  name                = var.dashboard_identity_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_role_assignment" "api" {
  for_each = local.api_roles

  scope                = each.value.scope
  role_definition_name = each.value.role
  principal_id         = azurerm_user_assigned_identity.api.principal_id
  principal_type       = "ServicePrincipal"
  description          = "Disposable Local Missions API ${each.key} access"
}

resource "azurerm_role_assignment" "worker" {
  for_each = local.worker_roles

  scope                = each.value.scope
  role_definition_name = each.value.role
  principal_id         = azurerm_user_assigned_identity.worker.principal_id
  principal_type       = "ServicePrincipal"
  description          = "Disposable Local Missions worker ${each.key} access"
}

resource "azurerm_role_assignment" "dashboard" {
  for_each = local.dashboard_roles

  scope                = each.value.scope
  role_definition_name = each.value.role
  principal_id         = azurerm_user_assigned_identity.dashboard.principal_id
  principal_type       = "ServicePrincipal"
  description          = "Disposable Local Missions dashboard ${each.key} access"
}

resource "azurerm_container_app_environment" "this" {
  name                       = var.environment_name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  tags                       = var.tags
  log_analytics_workspace_id = var.log_analytics_workspace_id
  logs_destination           = "log-analytics"
  mutual_tls_enabled         = false
  public_network_access      = "Enabled"
}

resource "azurerm_container_app" "api" {
  name                         = var.api_app_name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"
  max_inactive_revisions       = 1
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.api.id]
  }

  registry {
    server   = var.registry.login_server
    identity = azurerm_user_assigned_identity.api.id
  }

  ingress {
    external_enabled           = true
    allow_insecure_connections = false
    target_port                = 3000
    transport                  = "http"

    dynamic "ip_security_restriction" {
      for_each = { for index, cidr in var.allowed_ipv4_cidrs : format("allow-%02d", index + 1) => cidr }
      content {
        action           = "Allow"
        name             = ip_security_restriction.key
        ip_address_range = ip_security_restriction.value
        description      = "Reviewed temporary development ingress"
      }
    }

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.scale.api_min_replicas
    max_replicas = var.scale.api_max_replicas

    container {
      name   = "api"
      image  = local.api_image
      cpu    = 0.25
      memory = "0.5Gi"

      dynamic "env" {
        for_each = local.api_environment
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    http_scale_rule {
      name                = "http-concurrency"
      concurrent_requests = "50"
    }
  }

  depends_on = [azurerm_role_assignment.api]
}

resource "azurerm_container_app" "worker" {
  name                         = var.worker_app_name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"
  max_inactive_revisions       = 1
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.worker.id]
  }

  registry {
    server   = var.registry.login_server
    identity = azurerm_user_assigned_identity.worker.id
  }

  template {
    min_replicas = var.scale.worker_min_replicas
    max_replicas = var.scale.worker_max_replicas

    container {
      name   = "worker"
      image  = local.worker_image
      cpu    = 0.25
      memory = "0.5Gi"

      dynamic "env" {
        for_each = local.worker_environment
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    custom_scale_rule {
      name             = "service-bus-events"
      custom_rule_type = "azure-servicebus"
      identity_id      = azurerm_user_assigned_identity.worker.id
      metadata = {
        namespace    = var.service_bus.namespace_name
        queueName    = var.service_bus.queue_name
        messageCount = "5"
      }
    }
  }

  depends_on = [azurerm_role_assignment.worker]
}

resource "azurerm_container_app" "dashboard" {
  name                         = var.dashboard_app_name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"
  max_inactive_revisions       = 1
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.dashboard.id]
  }

  registry {
    server   = var.registry.login_server
    identity = azurerm_user_assigned_identity.dashboard.id
  }

  ingress {
    external_enabled           = true
    allow_insecure_connections = false
    target_port                = 3000
    transport                  = "http"

    dynamic "ip_security_restriction" {
      for_each = { for index, cidr in var.allowed_ipv4_cidrs : format("allow-%02d", index + 1) => cidr }
      content {
        action           = "Allow"
        name             = ip_security_restriction.key
        ip_address_range = ip_security_restriction.value
        description      = "Reviewed temporary development ingress"
      }
    }

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.scale.dashboard_min_replicas
    max_replicas = var.scale.dashboard_max_replicas

    container {
      name   = "dashboard"
      image  = local.dashboard_image
      cpu    = 0.25
      memory = "0.5Gi"

      dynamic "env" {
        for_each = local.dashboard_environment
        content {
          name  = env.key
          value = env.value
        }
      }
    }

    http_scale_rule {
      name                = "http-concurrency"
      concurrent_requests = "50"
    }
  }

  depends_on = [azurerm_role_assignment.dashboard]
}
