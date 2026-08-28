variable "name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^acrlmdev[a-z0-9]{6,12}$", var.name)) && length(var.name) <= 50
    error_message = "Registry names must use the unique acrlmdev plus six-to-twelve character suffix contract."
  }
}

variable "resource_group_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.resource_group_name))
    error_message = "Registry must remain in the explicit disposable development resource group."
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
    error_message = "Registry tags must retain disposable workload ownership."
  }
}

variable "sku" {
  type     = string
  nullable = false

  validation {
    condition     = var.sku == "Basic"
    error_message = "The local V1 registry contract permits only the unapproved Basic planning candidate."
  }
}
