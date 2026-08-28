variable "name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^stlmdev[a-z0-9]{6,12}$", var.name)) && length(var.name) <= 24
    error_message = "Storage account names must use the unique stlmdev plus six-to-twelve character suffix contract."
  }
}

variable "resource_group_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.resource_group_name))
    error_message = "Storage must remain in the explicit disposable development resource group."
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
    error_message = "Storage tags must retain disposable workload ownership."
  }
}

variable "allowed_ipv4_cidrs" {
  type     = list(string)
  nullable = false

  validation {
    condition = length(var.allowed_ipv4_cidrs) > 0 && alltrue([
      for cidr in var.allowed_ipv4_cidrs : can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
    ])
    error_message = "Storage requires one or more narrow IPv4 CIDRs and forbids global ingress."
  }
}

variable "container_names" {
  type     = set(string)
  nullable = false

  validation {
    condition = length(var.container_names) == 3 && alltrue([
      for name in var.container_names : can(regex("^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$", name))
    ])
    error_message = "Storage requires exactly three valid private workload container names."
  }
}

variable "soft_delete_retention_days" {
  type     = number
  nullable = false

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 14
    error_message = "Disposable Blob soft-delete retention must remain between seven and fourteen days."
  }
}
