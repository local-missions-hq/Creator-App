variable "location" {
  description = "Candidate single Azure region. It must be revalidated before any apply."
  type        = string
  default     = "eastus2"
  nullable    = false

  validation {
    condition     = var.location == "eastus2"
    error_message = "The reviewed retained control plane is restricted to eastus2."
  }
}

variable "control_plane_resource_group_name" {
  description = "Explicit retained control-plane resource group."
  type        = string
  nullable    = false

  validation {
    condition     = var.control_plane_resource_group_name == "rg-local-missions-control-eus2-001"
    error_message = "control_plane_resource_group_name must use the reviewed retained Local Missions name."
  }
}

variable "state_resource_group_name" {
  description = "Explicit retained Terraform-state resource group, separate from every workload target."
  type        = string
  nullable    = false

  validation {
    condition = (
      var.state_resource_group_name == "rg-local-missions-state-eus2-001" &&
      var.state_resource_group_name != var.control_plane_resource_group_name
    )
    error_message = "state_resource_group_name must use the retained state prefix and differ from the control-plane group."
  }
}

variable "state_storage_account_name" {
  description = "Exact retained Local Missions Terraform-state Storage account."
  type        = string
  default     = "stlmtfse2001"
  nullable    = false

  validation {
    condition     = var.state_storage_account_name == "stlmtfse2001"
    error_message = "state_storage_account_name must use the reviewed retained state account."
  }
}

variable "state_container_name" {
  description = "Exact private container holding the separate Local Missions Terraform state keys."
  type        = string
  default     = "tfstate"
  nullable    = false

  validation {
    condition     = var.state_container_name == "tfstate"
    error_message = "state_container_name must remain the reviewed private tfstate container."
  }
}

variable "workload_landing_zone_resource_group_name" {
  description = "Retained Local Missions-only resource-group boundary for every disposable development run."
  type        = string
  default     = "rg-local-missions-dev-eus2-001"
  nullable    = false

  validation {
    condition = (
      var.workload_landing_zone_resource_group_name == "rg-local-missions-dev-eus2-001" &&
      var.workload_landing_zone_resource_group_name != var.control_plane_resource_group_name &&
      var.workload_landing_zone_resource_group_name != var.state_resource_group_name
    )
    error_message = "workload_landing_zone_resource_group_name must use the reviewed retained Local Missions development boundary."
  }
}

variable "subscription_placement" {
  description = "Owner-selected Azure isolation model. It remains undecided until explicitly approved."
  type        = string
  default     = "undecided"
  nullable    = false

  validation {
    condition = contains([
      "undecided",
      "dedicated-local-missions",
      "shared-nonproduction",
    ], var.subscription_placement)
    error_message = "subscription_placement must be undecided, dedicated-local-missions, or shared-nonproduction."
  }
}

variable "dedicated_subscription_isolation_revalidated" {
  description = "True only after confirming the selected subscription contains no other workload."
  type        = bool
  default     = false
  nullable    = false
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
  description = "Retained control-plane switch; false for local preparation and provider-scope plans."
  type        = bool
  default     = false
  nullable    = false

  validation {
    condition = (
      !var.azure_resource_creation_enabled ||
      (
        length(trimspace(var.control_plane_approval_reference)) >= 8 &&
        (
          (var.subscription_placement == "dedicated-local-missions" && var.dedicated_subscription_isolation_revalidated) ||
          (var.subscription_placement == "shared-nonproduction" && var.shared_subscription_cotenancy_approved)
        ) &&
        var.approved_monthly_budget_usd == 100 &&
        length(trimspace(var.alert_receiver_email)) > 0 &&
        length(var.expected_subscription_id) > 0 &&
        length(var.expected_tenant_id) > 0 &&
        var.github_oidc_subjects_revalidated &&
        alltrue([for subject in values(var.github_oidc_subjects) : length(subject) > 0]) &&
        !endswith(lower(var.alert_destination_reference), ".example")
      )
    )
    error_message = "Control-plane activation requires an approved dedicated or shared placement, the exact 100 USD budget, monitored alert delivery, expected Azure scope, and reviewed immutable GitHub subjects."
  }
}

variable "control_plane_approval_reference" {
  description = "External approval reference for retained control-plane creation."
  type        = string
  default     = ""
  nullable    = false
}

variable "shared_subscription_cotenancy_approved" {
  description = "Explicit acceptance of sharing the nonproduction subscription with another workload."
  type        = bool
  default     = false
  nullable    = false
}

variable "approved_monthly_budget_usd" {
  description = "Exact approved monthly development budget."
  type        = number
  default     = 0
  nullable    = false

  validation {
    condition     = var.approved_monthly_budget_usd == 0 || var.approved_monthly_budget_usd == 100
    error_message = "The control plane accepts only zero while disabled or the reviewed 100 USD budget."
  }
}

variable "alert_receiver_email" {
  description = "Monitored Action Group email, supplied outside source control."
  type        = string
  default     = ""
  nullable    = false
  sensitive   = true

  validation {
    condition = (
      var.alert_receiver_email == "" ||
      can(regex("^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$", var.alert_receiver_email))
    )
    error_message = "alert_receiver_email must be empty or a valid monitored email supplied outside source control."
  }
}

variable "expected_subscription_id" {
  description = "Reviewed subscription UUID, supplied outside source control."
  type        = string
  default     = ""
  nullable    = false
  sensitive   = true

  validation {
    condition = (
      var.expected_subscription_id == "" ||
      can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", lower(var.expected_subscription_id)))
    )
    error_message = "expected_subscription_id must be empty or a UUID supplied outside source control."
  }
}

variable "expected_tenant_id" {
  description = "Reviewed Microsoft Entra tenant UUID, supplied outside source control."
  type        = string
  default     = ""
  nullable    = false
  sensitive   = true

  validation {
    condition = (
      var.expected_tenant_id == "" ||
      can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", lower(var.expected_tenant_id)))
    )
    error_message = "expected_tenant_id must be empty or a UUID supplied outside source control."
  }
}

variable "github_oidc_subjects" {
  description = "Exact immutable GitHub OIDC subjects copied from the reviewed subject preview."
  type = object({
    plan    = string
    apply   = string
    destroy = string
  })
  default = {
    plan    = ""
    apply   = ""
    destroy = ""
  }
  nullable = false

  validation {
    condition = (
      alltrue([for subject in values(var.github_oidc_subjects) : subject == ""]) ||
      (
        can(regex("^repository_owner_id:[0-9]+:repository_id:[0-9]+:environment:azure-development-plan$", var.github_oidc_subjects.plan)) &&
        can(regex("^repository_owner_id:[0-9]+:repository_id:[0-9]+:environment:azure-development-apply$", var.github_oidc_subjects.apply)) &&
        can(regex("^repository_owner_id:[0-9]+:repository_id:[0-9]+:environment:azure-development-destroy$", var.github_oidc_subjects.destroy))
      )
    )
    error_message = "GitHub subjects must be entirely empty or exact immutable owner/repository-ID environment subjects."
  }
}

variable "github_repository_owner" {
  description = "Approved current or migration-target GitHub repository owner; changing it requires a reviewed immutable-subject preview."
  type        = string
  default     = "local-missions-hq"
  nullable    = false

  validation {
    condition     = contains(["stratiosai", "local-missions-hq"], var.github_repository_owner)
    error_message = "github_repository_owner must remain the current personal owner or the approved Local Missions organization."
  }
}

variable "github_oidc_subjects_revalidated" {
  description = "True only after the GitHub subject preview matches all three exact immutable subjects."
  type        = bool
  default     = false
  nullable    = false
}

variable "budget_start_date" {
  description = "Approved first-of-month UTC budget start."
  type        = string
  default     = "2026-09-01T00:00:00Z"
  nullable    = false

  validation {
    condition     = can(regex("^[0-9]{4}-[0-9]{2}-01T00:00:00Z$", var.budget_start_date))
    error_message = "budget_start_date must be the first day of a month at UTC midnight."
  }
}

variable "budget_end_date" {
  description = "Approved UTC budget end after the start date."
  type        = string
  default     = "2027-09-01T00:00:00Z"
  nullable    = false

  validation {
    condition = (
      can(timecmp(var.budget_end_date, var.budget_start_date)) &&
      timecmp(var.budget_end_date, var.budget_start_date) > 0
    )
    error_message = "budget_end_date must be a valid timestamp after budget_start_date."
  }
}
