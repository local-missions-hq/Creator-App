variable "location" {
  description = "Candidate single Azure region; revalidation is mandatory before apply."
  type        = string
  default     = "eastus2"
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9]+$", var.location))
    error_message = "location must be an explicit lowercase Azure region name."
  }
}

variable "workload_resource_group_name" {
  description = "Exact disposable development workload target. Broad or retained targets are forbidden."
  type        = string
  nullable    = false

  validation {
    condition = (
      can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.workload_resource_group_name)) &&
      var.workload_resource_group_name != var.control_plane_resource_group_name &&
      var.workload_resource_group_name != var.state_resource_group_name &&
      !strcontains(lower(var.workload_resource_group_name), "control") &&
      !strcontains(lower(var.workload_resource_group_name), "state")
    )
    error_message = "workload_resource_group_name must be one explicit dev workload group and cannot overlap retained scopes."
  }
}

variable "control_plane_resource_group_name" {
  description = "Retained control-plane group used only for overlap refusal."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^rg-local-missions-control-[a-z0-9-]+$", var.control_plane_resource_group_name))
    error_message = "control_plane_resource_group_name must use the retained control-plane prefix."
  }
}

variable "state_resource_group_name" {
  description = "Retained state group used only for overlap refusal."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^rg-local-missions-state-[a-z0-9-]+$", var.state_resource_group_name))
    error_message = "state_resource_group_name must use the retained state prefix."
  }
}

variable "owner" {
  description = "Accountable ephemeral-run owner role/reference; never a credential or private contact."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,63}$", var.owner))
    error_message = "owner must be a stable lowercase role/reference between 3 and 64 characters."
  }
}

variable "commit_sha" {
  description = "Exact immutable source commit used to rebuild the workload."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[0-9a-f]{40}$", var.commit_sha))
    error_message = "commit_sha must be a full lowercase 40-character Git commit SHA."
  }
}

variable "created_at" {
  description = "Immutable RFC3339 workload creation timestamp with offset."
  type        = string
  nullable    = false

  validation {
    condition     = can(timecmp(var.created_at, var.created_at)) && can(regex("(Z|[+-][0-9]{2}:[0-9]{2})$", var.created_at))
    error_message = "created_at must be an RFC3339 timestamp with an explicit offset."
  }
}

variable "expires_at" {
  description = "Earlier of created_at plus eight hours or 11 PM America/New_York that day."
  type        = string
  nullable    = false

  validation {
    condition = (
      can(timecmp(var.expires_at, var.created_at)) &&
      timecmp(var.expires_at, var.created_at) > 0 &&
      timecmp(var.expires_at, timeadd(var.created_at, "8h")) <= 0
    )
    error_message = "expires_at must be after creation and no later than eight hours after creation."
  }
}

variable "warning_at" {
  description = "Exact one-hour-before-expiry warning timestamp."
  type        = string
  nullable    = false

  validation {
    condition     = can(timecmp(var.warning_at, timeadd(var.expires_at, "-1h"))) && timecmp(var.warning_at, timeadd(var.expires_at, "-1h")) == 0
    error_message = "warning_at must be exactly one hour before expires_at."
  }
}

variable "created_new_york_date" {
  description = "Creation calendar date in America/New_York, supplied by the retained deadline controller."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$", var.created_new_york_date))
    error_message = "created_new_york_date must be YYYY-MM-DD."
  }
}

variable "expires_new_york_date" {
  description = "Expiration calendar date in America/New_York; overnight expiry is forbidden."
  type        = string
  nullable    = false

  validation {
    condition     = var.expires_new_york_date == var.created_new_york_date
    error_message = "expires_new_york_date must equal the creation date; overnight extension is forbidden."
  }
}

variable "extension_count" {
  description = "Recorded same-day extensions; zero initially and never more than one."
  type        = number
  default     = 0
  nullable    = false

  validation {
    condition     = var.extension_count == 0 || var.extension_count == 1
    error_message = "extension_count must be zero or one."
  }
}

variable "network_mode" {
  description = "Pre-private-network development allows only an explicitly restricted public boundary."
  type        = string
  default     = "restricted_public"
  nullable    = false

  validation {
    condition     = var.network_mode == "restricted_public"
    error_message = "Only restricted_public is defined for the pre-private-network dev checkpoint."
  }
}

variable "allowed_ipv4_cidrs" {
  description = "Narrow reviewed ingress allowlist. Empty is allowed only while Azure activation is disabled."
  type        = list(string)
  default     = []
  nullable    = false

  validation {
    condition = alltrue([
      for cidr in var.allowed_ipv4_cidrs :
      can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
    ])
    error_message = "Every ingress range must be a valid narrow IPv4 CIDR; 0.0.0.0/0 is forbidden."
  }
}

variable "alert_destination_reference" {
  description = "Non-secret reference to a verified monitored cost/cleanup destination."
  type        = string
  nullable    = false

  validation {
    condition     = length(trimspace(var.alert_destination_reference)) >= 12
    error_message = "alert_destination_reference must identify the monitored destination gate."
  }
}

variable "cleanup_controller_reference" {
  description = "Non-secret reference to the retained OIDC cleanup controller."
  type        = string
  default     = ""
  nullable    = false
}

variable "apply_approval_reference" {
  description = "External reviewed apply approval. Empty during local preparation."
  type        = string
  default     = ""
  nullable    = false
}

variable "approved_monthly_budget_usd" {
  description = "Approved monitored monthly budget. Zero while only planning locally."
  type        = number
  default     = 0
  nullable    = false

  validation {
    condition     = var.approved_monthly_budget_usd >= 0 && var.approved_monthly_budget_usd <= 100
    error_message = "The V1 development budget must be between zero and the $100 safety ceiling."
  }
}

variable "region_and_sku_revalidated" {
  description = "True only after current availability, policy, and price review."
  type        = bool
  default     = false
  nullable    = false
}

variable "azure_resource_creation_enabled" {
  description = "Explicit activation switch. It remains false for this local checkpoint."
  type        = bool
  default     = false
  nullable    = false

  validation {
    condition = (
      var.azure_resource_creation_enabled == false ||
      (
        length(trimspace(var.apply_approval_reference)) >= 8 &&
        var.approved_monthly_budget_usd > 0 &&
        var.region_and_sku_revalidated &&
        length(var.allowed_ipv4_cidrs) > 0 &&
        length(trimspace(var.cleanup_controller_reference)) >= 8 &&
        !endswith(lower(var.alert_destination_reference), ".example")
      )
    )
    error_message = "Azure activation requires apply approval, budget, current region/SKU review, narrow CIDRs, retained cleanup controller, and a non-placeholder monitored destination."
  }
}

variable "low_cost_defaults" {
  description = "Planning ceilings only; every SKU and price must be revalidated before apply."
  type = object({
    api_min_replicas               = number
    api_max_replicas               = number
    worker_min_replicas            = number
    worker_max_replicas            = number
    postgres_sku_name              = string
    postgres_storage_mb            = number
    postgres_backup_retention_days = number
    service_bus_sku                = string
    container_registry_sku         = string
    log_retention_days             = number
  })
  default = {
    api_min_replicas               = 0
    api_max_replicas               = 1
    worker_min_replicas            = 0
    worker_max_replicas            = 1
    postgres_sku_name              = "B_Standard_B1ms"
    postgres_storage_mb            = 32768
    postgres_backup_retention_days = 7
    service_bus_sku                = "Basic"
    container_registry_sku         = "Basic"
    log_retention_days             = 30
  }
  nullable = false

  validation {
    condition = (
      var.low_cost_defaults.api_min_replicas == 0 &&
      var.low_cost_defaults.api_max_replicas >= 1 &&
      var.low_cost_defaults.api_max_replicas <= 2 &&
      var.low_cost_defaults.worker_min_replicas == 0 &&
      var.low_cost_defaults.worker_max_replicas >= 1 &&
      var.low_cost_defaults.worker_max_replicas <= 2 &&
      var.low_cost_defaults.postgres_storage_mb >= 32768 &&
      var.low_cost_defaults.postgres_storage_mb <= 65536 &&
      var.low_cost_defaults.postgres_backup_retention_days >= 7 &&
      var.low_cost_defaults.postgres_backup_retention_days <= 14 &&
      var.low_cost_defaults.log_retention_days >= 30 &&
      var.low_cost_defaults.log_retention_days <= 30 &&
      contains(["Basic", "Standard"], var.low_cost_defaults.service_bus_sku) &&
      var.low_cost_defaults.container_registry_sku == "Basic"
    )
    error_message = "low_cost_defaults exceeds the local V1 planning ceilings."
  }
}
