variable "workspace_name" {
  type     = string
  nullable = false
}

variable "application_insights_name" {
  type     = string
  nullable = false
}

variable "resource_group_name" {
  type     = string
  nullable = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.resource_group_name))
    error_message = "Telemetry must remain in the explicit disposable development resource group."
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
    error_message = "Telemetry tags must retain disposable workload ownership."
  }
}

variable "retention_days" {
  type     = number
  nullable = false

  validation {
    condition     = var.retention_days == 30
    error_message = "Disposable technical telemetry retention must remain exactly thirty days."
  }
}
