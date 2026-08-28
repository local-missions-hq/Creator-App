variable "location" {
  description = "Candidate single Azure region. It must be revalidated before any apply."
  type        = string
  default     = "eastus2"
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9]+$", var.location))
    error_message = "location must be an explicit lowercase Azure region name."
  }
}

variable "control_plane_resource_group_name" {
  description = "Explicit retained control-plane resource group."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^rg-local-missions-control-[a-z0-9-]+$", var.control_plane_resource_group_name))
    error_message = "control_plane_resource_group_name must use the retained Local Missions control-plane prefix."
  }
}

variable "state_resource_group_name" {
  description = "Explicit retained Terraform-state resource group, separate from every workload target."
  type        = string
  nullable    = false

  validation {
    condition = (
      can(regex("^rg-local-missions-state-[a-z0-9-]+$", var.state_resource_group_name)) &&
      var.state_resource_group_name != var.control_plane_resource_group_name
    )
    error_message = "state_resource_group_name must use the retained state prefix and differ from the control-plane group."
  }
}

variable "owner" {
  description = "Accountable role or approved owner reference; never a credential or private contact."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,63}$", var.owner))
    error_message = "owner must be a stable lowercase role/reference between 3 and 64 characters."
  }
}

variable "alert_destination_reference" {
  description = "Non-secret reference to the monitored cost/cleanup destination."
  type        = string
  nullable    = false

  validation {
    condition     = length(trimspace(var.alert_destination_reference)) >= 12
    error_message = "alert_destination_reference must identify an external monitored destination gate."
  }
}

variable "azure_resource_creation_enabled" {
  description = "Local checkpoint kill switch. No Azure resources exist in this root yet."
  type        = bool
  default     = false
  nullable    = false

  validation {
    condition     = var.azure_resource_creation_enabled == false
    error_message = "Azure resource creation is unavailable in the local foundation checkpoint."
  }
}
