variable "name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^kvlmdev-[a-z0-9]{6,12}$", var.name)) && length(var.name) <= 24
    error_message = "Key Vault names must use the unique kvlmdev plus six-to-twelve character suffix contract."
  }
}

variable "resource_group_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.resource_group_name))
    error_message = "Key Vault must remain in the explicit disposable development resource group."
  }
}

variable "location" {
  type     = string
  nullable = false
}

variable "tenant_id" {
  description = "Reviewed tenant reference only; never a credential."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", lower(var.tenant_id)))
    error_message = "Key Vault tenant_id must be a reviewed UUID reference."
  }
}

variable "tags" {
  type     = map(string)
  nullable = false

  validation {
    condition     = lookup(var.tags, "lifecycle", "") == "disposable" && lookup(var.tags, "terraform_root", "") == "workload-dev"
    error_message = "Key Vault tags must retain disposable workload ownership."
  }
}

variable "allowed_ipv4_cidrs" {
  type     = list(string)
  nullable = false

  validation {
    condition = length(var.allowed_ipv4_cidrs) > 0 && alltrue([
      for cidr in var.allowed_ipv4_cidrs : can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
    ])
    error_message = "Key Vault requires one or more narrow IPv4 CIDRs and forbids global ingress."
  }
}
