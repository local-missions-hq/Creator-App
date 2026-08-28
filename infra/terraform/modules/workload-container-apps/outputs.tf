output "api_identity_principal_id" {
  value = azurerm_user_assigned_identity.api.principal_id
}

output "worker_identity_principal_id" {
  value = azurerm_user_assigned_identity.worker.principal_id
}

output "api_app_id" {
  value = azurerm_container_app.api.id
}

output "worker_app_id" {
  value = azurerm_container_app.worker.id
}

output "resource_count" {
  value = 5 + length(azurerm_role_assignment.api) + length(azurerm_role_assignment.worker)
}

output "safeguards" {
  value = {
    api_environment_names        = sort(keys(local.api_environment))
    api_ingress_allowlist_count  = length(var.allowed_ipv4_cidrs)
    api_max_replicas             = var.scale.api_max_replicas
    api_min_replicas             = var.scale.api_min_replicas
    api_role_count               = length(azurerm_role_assignment.api)
    image_references_use_digests = can(regex("^[0-9a-f]{64}$", var.images.api_digest)) && can(regex("^[0-9a-f]{64}$", var.images.worker_digest))
    inline_secret_blocks         = 0
    managed_identity_count       = 2
    registry_password_references = 0
    worker_environment_names     = sort(keys(local.worker_environment))
    worker_has_ingress           = false
    worker_max_replicas          = var.scale.worker_max_replicas
    worker_min_replicas          = var.scale.worker_min_replicas
    worker_role_count            = length(azurerm_role_assignment.worker)
  }
}
