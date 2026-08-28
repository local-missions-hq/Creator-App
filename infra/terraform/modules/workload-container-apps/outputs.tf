output "api_identity_principal_id" {
  value = azurerm_user_assigned_identity.api.principal_id
}

output "worker_identity_principal_id" {
  value = azurerm_user_assigned_identity.worker.principal_id
}

output "dashboard_identity_principal_id" {
  value = azurerm_user_assigned_identity.dashboard.principal_id
}

output "api_app_id" {
  value = azurerm_container_app.api.id
}

output "worker_app_id" {
  value = azurerm_container_app.worker.id
}

output "dashboard_app_id" {
  value = azurerm_container_app.dashboard.id
}

output "resource_count" {
  value = 7 + length(azurerm_role_assignment.api) + length(azurerm_role_assignment.dashboard) + length(azurerm_role_assignment.worker)
}

output "safeguards" {
  value = {
    api_environment_names             = sort(keys(local.api_environment))
    api_ingress_allowlist_count       = length(var.allowed_ipv4_cidrs)
    api_max_replicas                  = var.scale.api_max_replicas
    api_min_replicas                  = var.scale.api_min_replicas
    api_role_count                    = length(azurerm_role_assignment.api)
    dashboard_environment_names       = sort(keys(local.dashboard_environment))
    dashboard_api_url_https           = startswith(local.dashboard_environment.NEXT_PUBLIC_API_URL, "https://")
    dashboard_has_ingress             = true
    dashboard_ingress_allowlist_count = length(var.allowed_ipv4_cidrs)
    dashboard_max_replicas            = var.scale.dashboard_max_replicas
    dashboard_min_replicas            = var.scale.dashboard_min_replicas
    dashboard_role_count              = length(azurerm_role_assignment.dashboard)
    dashboard_role_names              = sort([for role in values(local.dashboard_roles) : role.role])
    image_references_use_digests      = can(regex("^[0-9a-f]{64}$", var.images.api_digest)) && can(regex("^[0-9a-f]{64}$", var.images.dashboard_digest)) && can(regex("^[0-9a-f]{64}$", var.images.worker_digest))
    inline_secret_blocks              = 0
    managed_identity_count            = 3
    registry_password_references      = 0
    worker_environment_names          = sort(keys(local.worker_environment))
    worker_has_ingress                = false
    worker_max_replicas               = var.scale.worker_max_replicas
    worker_min_replicas               = var.scale.worker_min_replicas
    worker_role_count                 = length(azurerm_role_assignment.worker)
  }
}
