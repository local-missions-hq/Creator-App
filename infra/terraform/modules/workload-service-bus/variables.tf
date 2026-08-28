variable "namespace_name" {
  type     = string
  nullable = false
}

variable "queue_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{2,49}$", var.queue_name))
    error_message = "Service Bus queue names must be stable lowercase identifiers."
  }
}

variable "resource_group_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.resource_group_name))
    error_message = "Service Bus must remain in the explicit disposable development resource group."
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
    error_message = "Service Bus tags must retain disposable workload ownership."
  }
}

variable "allowed_ipv4_cidrs" {
  type     = list(string)
  nullable = false

  validation {
    condition = length(var.allowed_ipv4_cidrs) > 0 && alltrue([
      for cidr in var.allowed_ipv4_cidrs : can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
    ])
    error_message = "Service Bus requires one or more narrow IPv4 CIDRs and forbids global ingress."
  }
}

variable "sku" {
  type     = string
  nullable = false

  validation {
    condition     = var.sku == "Standard"
    error_message = "Duplicate detection and IP filtering require the unapproved Standard planning candidate."
  }
}
