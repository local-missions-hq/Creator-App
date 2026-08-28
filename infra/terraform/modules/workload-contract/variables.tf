variable "environment" {
  type     = string
  nullable = false

  validation {
    condition     = var.environment == "development"
    error_message = "The workload contract is isolated to the development environment."
  }
}

variable "workload_resource_group_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.workload_resource_group_name))
    error_message = "The workload contract requires the disposable development resource-group namespace."
  }
}

variable "retained_resource_group_names" {
  type     = list(string)
  nullable = false
}

variable "scale_contract" {
  type = object({
    api_min_replicas    = number
    api_max_replicas    = number
    worker_min_replicas = number
    worker_max_replicas = number
  })
  nullable = false

  validation {
    condition = (
      var.scale_contract.api_min_replicas == 0 &&
      var.scale_contract.worker_min_replicas == 0 &&
      var.scale_contract.api_max_replicas >= 1 &&
      var.scale_contract.api_max_replicas <= 2 &&
      var.scale_contract.worker_max_replicas >= 1 &&
      var.scale_contract.worker_max_replicas <= 2
    )
    error_message = "Workload scale must keep zero minimum replicas and one-to-two replica ceilings."
  }
}

variable "network_contract" {
  type = object({
    mode                                   = string
    allowed_ipv4_cidrs                     = list(string)
    minimum_tls_version                    = string
    postgres_public_network_access_enabled = bool
    postgres_firewall_allow_azure_services = bool
    postgres_firewall_allow_all            = bool
  })
  nullable = false

  validation {
    condition = (
      var.network_contract.mode == "restricted_public" &&
      var.network_contract.minimum_tls_version == "TLS1_2" &&
      var.network_contract.postgres_public_network_access_enabled &&
      !var.network_contract.postgres_firewall_allow_azure_services &&
      !var.network_contract.postgres_firewall_allow_all &&
      alltrue([
        for cidr in var.network_contract.allowed_ipv4_cidrs :
        can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
      ])
    )
    error_message = "Workload networking must stay restricted, TLS 1.2, and deny broad PostgreSQL access."
  }
}

variable "backup_contract" {
  type = object({
    postgres_retention_days        = number
    geo_redundant_backup_enabled   = bool
    point_in_time_restore_required = bool
  })
  nullable = false

  validation {
    condition = (
      var.backup_contract.postgres_retention_days >= 7 &&
      var.backup_contract.postgres_retention_days <= 14 &&
      !var.backup_contract.geo_redundant_backup_enabled &&
      var.backup_contract.point_in_time_restore_required
    )
    error_message = "PostgreSQL recovery requires 7-14 day retention, point-in-time restore, and no unapproved geo-redundant backup."
  }
}

variable "storage_access_contract" {
  type = object({
    blob_public_access_enabled = bool
    static_website_enabled     = bool
    container_access_type      = string
  })
  nullable = false

  validation {
    condition = (
      !var.storage_access_contract.blob_public_access_enabled &&
      !var.storage_access_contract.static_website_enabled &&
      var.storage_access_contract.container_access_type == "private"
    )
    error_message = "Anonymous Blob access and unused static website hosting must remain disabled."
  }
}

variable "azure_resource_creation_enabled" {
  type     = bool
  nullable = false
}

variable "secret_reference_contract" {
  type = object({
    inline_secret_blocks            = number
    key_vault_reference_only        = bool
    postgres_password_auth_enabled  = bool
    registry_password_references    = number
    shared_key_auth_enabled         = bool
    terraform_managed_secret_values = number
  })
  nullable = false

  validation {
    condition = (
      var.secret_reference_contract.inline_secret_blocks == 0 &&
      var.secret_reference_contract.key_vault_reference_only &&
      !var.secret_reference_contract.postgres_password_auth_enabled &&
      var.secret_reference_contract.registry_password_references == 0 &&
      !var.secret_reference_contract.shared_key_auth_enabled &&
      var.secret_reference_contract.terraform_managed_secret_values == 0
    )
    error_message = "Workload secret contract forbids credentials and inline/Terraform-managed secret values."
  }
}
