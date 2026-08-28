variable "server_name" {
  type     = string
  nullable = false
}

variable "database_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9_]{2,62}$", var.database_name))
    error_message = "PostgreSQL database_name must be a stable lowercase identifier."
  }
}

variable "resource_group_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.resource_group_name))
    error_message = "PostgreSQL must remain in the explicit disposable development resource group."
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
    error_message = "PostgreSQL tags must retain disposable workload ownership."
  }
}

variable "allowed_ipv4_cidrs" {
  type     = list(string)
  nullable = false

  validation {
    condition = length(var.allowed_ipv4_cidrs) > 0 && alltrue([
      for cidr in var.allowed_ipv4_cidrs : can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
    ])
    error_message = "PostgreSQL requires one or more narrow IPv4 CIDRs and forbids global ingress."
  }
}

variable "sku_name" {
  type     = string
  nullable = false
}

variable "storage_mb" {
  type     = number
  nullable = false

  validation {
    condition     = var.storage_mb >= 32768 && var.storage_mb <= 65536
    error_message = "PostgreSQL storage must remain between 32 and 64 GiB for the local V1 planning contract."
  }
}

variable "backup_retention_days" {
  type     = number
  nullable = false

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 14
    error_message = "PostgreSQL backup retention must remain between seven and fourteen days."
  }
}

variable "tenant_id" {
  description = "Reviewed tenant reference only; never a credential."
  type        = string
  nullable    = false
}

variable "administrator_reference" {
  description = "Reviewed Microsoft Entra administrator reference; no password or token."
  type = object({
    object_id      = string
    principal_name = string
    principal_type = string
  })
  nullable = false

  validation {
    condition = (
      can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", lower(var.administrator_reference.object_id))) &&
      can(regex("^[a-z][a-z0-9-]{2,63}$", var.administrator_reference.principal_name)) &&
      var.administrator_reference.principal_type == "Group"
    )
    error_message = "PostgreSQL administrator_reference must be a reviewed group UUID and stable non-secret name."
  }
}
