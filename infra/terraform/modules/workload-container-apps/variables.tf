variable "environment_name" {
  type     = string
  nullable = false
}

variable "application_activation_enabled" {
  description = "Creates API, dashboard, and worker only after their immutable images exist in the disposable registry."
  type        = bool
  nullable    = false
}

variable "api_app_name" {
  type     = string
  nullable = false
}

variable "dashboard_app_name" {
  type     = string
  nullable = false
}

variable "worker_app_name" {
  type     = string
  nullable = false
}

variable "api_identity_name" {
  type     = string
  nullable = false
}

variable "dashboard_identity_name" {
  type     = string
  nullable = false
}

variable "worker_identity_name" {
  type     = string
  nullable = false
}

variable "resource_group_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.resource_group_name))
    error_message = "Container Apps must remain in the explicit disposable development resource group."
  }
}

variable "location" {
  type     = string
  nullable = false
}

variable "tags" {
  type     = map(string)
  nullable = false

  validation {
    condition     = lookup(var.tags, "lifecycle", "") == "disposable" && lookup(var.tags, "terraform_root", "") == "workload-dev"
    error_message = "Container Apps tags must retain disposable workload ownership."
  }
}

variable "allowed_ipv4_cidrs" {
  type     = list(string)
  nullable = false

  validation {
    condition = length(var.allowed_ipv4_cidrs) > 0 && alltrue([
      for cidr in var.allowed_ipv4_cidrs : can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
    ])
    error_message = "Container Apps API/dashboard ingress requires narrow IPv4 CIDRs and forbids global ingress."
  }
}

variable "log_analytics_workspace_id" {
  type     = string
  nullable = false
}

variable "registry" {
  type = object({
    id           = string
    login_server = string
  })
  nullable = false
}

variable "storage" {
  type = object({
    id   = string
    name = string
  })
  nullable = false
}

variable "service_bus" {
  type = object({
    id             = string
    namespace_name = string
    queue_name     = string
  })
  nullable = false
}

variable "key_vault" {
  type = object({
    id        = string
    vault_uri = string
  })
  nullable = false
}

variable "postgresql" {
  type = object({
    fqdn          = string
    database_name = string
  })
  nullable = false
}

variable "images" {
  type = object({
    api_repository       = string
    api_digest           = string
    dashboard_repository = string
    dashboard_digest     = string
    worker_repository    = string
    worker_digest        = string
  })
  nullable = false

  validation {
    condition = (
      can(regex("^[a-z0-9][a-z0-9._/-]{2,127}$", var.images.api_repository)) &&
      can(regex("^[0-9a-f]{64}$", var.images.api_digest)) &&
      can(regex("^[a-z0-9][a-z0-9._/-]{2,127}$", var.images.dashboard_repository)) &&
      can(regex("^[0-9a-f]{64}$", var.images.dashboard_digest)) &&
      can(regex("^[a-z0-9][a-z0-9._/-]{2,127}$", var.images.worker_repository)) &&
      can(regex("^[0-9a-f]{64}$", var.images.worker_digest))
    )
    error_message = "Container images require stable repositories and immutable lowercase SHA-256 digests, never tags or latest."
  }
}

variable "scale" {
  type = object({
    api_min_replicas       = number
    api_max_replicas       = number
    dashboard_min_replicas = number
    dashboard_max_replicas = number
    worker_min_replicas    = number
    worker_max_replicas    = number
  })
  nullable = false

  validation {
    condition = (
      var.scale.api_min_replicas == 0 &&
      var.scale.api_max_replicas == 1 &&
      var.scale.dashboard_min_replicas == 0 &&
      var.scale.dashboard_max_replicas == 1 &&
      var.scale.worker_min_replicas == 0 &&
      var.scale.worker_max_replicas == 1
    )
    error_message = "The disposable Container Apps contract scales API, dashboard, and worker from zero to one replica."
  }
}
