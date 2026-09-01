variable "location" {
  description = "Reviewed region for the Local Missions retained state boundary."
  type        = string
  default     = "eastus2"
  nullable    = false

  validation {
    condition     = var.location == "eastus2"
    error_message = "The reviewed bootstrap root is restricted to eastus2."
  }
}

variable "state_resource_group_name" {
  description = "Exact Local Missions-only retained state resource group."
  type        = string
  nullable    = false

  validation {
    condition     = var.state_resource_group_name == "rg-local-missions-state-eus2-001"
    error_message = "The retained state resource group must use the reviewed Local Missions name."
  }
}

variable "state_storage_account_name" {
  description = "Globally unique Local Missions Terraform-state storage account."
  type        = string
  nullable    = false

  validation {
    condition     = var.state_storage_account_name == "stlmtfse2001"
    error_message = "The state storage account must use the reviewed Local Missions candidate name."
  }
}

variable "state_container_name" {
  description = "Private container used only for Local Missions Terraform state."
  type        = string
  default     = "tfstate"
  nullable    = false

  validation {
    condition     = var.state_container_name == "tfstate"
    error_message = "The retained state container must remain tfstate."
  }
}

variable "owner" {
  description = "Accountable role/reference; never a credential or private contact."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,63}$", var.owner))
    error_message = "owner must be a stable lowercase role/reference between 3 and 64 characters."
  }
}

variable "trusted_ipv4_rules" {
  description = "Narrow operator IPv4 addresses or supported CIDRs allowed to reach the state endpoint; never committed with a real address."
  type        = list(string)
  default     = []
  nullable    = false

  validation {
    condition = alltrue([
      for rule in var.trusted_ipv4_rules :
      strcontains(rule, "/") ?
      (
        can(cidrnetmask(rule)) &&
        can(tonumber(split("/", rule)[1])) &&
        tonumber(split("/", rule)[1]) >= 1 &&
        tonumber(split("/", rule)[1]) <= 30
      ) :
      can(cidrnetmask("${rule}/32")) && rule != "0.0.0.0"
    ])
    error_message = "State access requires valid narrow IPv4 addresses/supported CIDRs and forbids allow-all."
  }
}

variable "approved_retained_state_monthly_ceiling_usd" {
  description = "Owner-approved monthly ceiling for this retained-state bootstrap only; zero during local preparation."
  type        = number
  default     = 0
  nullable    = false

  validation {
    condition     = contains([0, 1], var.approved_retained_state_monthly_ceiling_usd)
    error_message = "The retained-state monthly ceiling must be zero or the reviewed 1 USD maximum."
  }
}

variable "bootstrap_approval_reference" {
  description = "External approval reference for the one-time retained bootstrap."
  type        = string
  default     = ""
  nullable    = false
}

variable "subscription_placement" {
  description = "Owner-selected Azure isolation model."
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
  description = "True only after read-only inventory confirms the selected subscription contains no other workload."
  type        = bool
  default     = false
  nullable    = false
}

variable "shared_subscription_cotenancy_approved" {
  description = "Explicit acceptance of Local Missions sharing a nonproduction subscription with another workload."
  type        = bool
  default     = false
  nullable    = false
}

variable "retained_state_cost_approved" {
  description = "Explicit acceptance that protected Terraform state remains billable after daily workload teardown."
  type        = bool
  default     = false
  nullable    = false
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

variable "bootstrap_resource_creation_enabled" {
  description = "One-time retained bootstrap switch; false for every local and provider-scope checkpoint."
  type        = bool
  default     = false
  nullable    = false

  validation {
    condition = (
      !var.bootstrap_resource_creation_enabled ||
      (
        length(trimspace(var.bootstrap_approval_reference)) >= 8 &&
        (
          (var.subscription_placement == "dedicated-local-missions" && var.dedicated_subscription_isolation_revalidated) ||
          (var.subscription_placement == "shared-nonproduction" && var.shared_subscription_cotenancy_approved)
        ) &&
        var.retained_state_cost_approved &&
        var.approved_retained_state_monthly_ceiling_usd == 1 &&
        length(var.expected_subscription_id) > 0 &&
        length(var.expected_tenant_id) > 0 &&
        length(var.trusted_ipv4_rules) > 0
      )
    )
    error_message = "Bootstrap activation requires explicit approval, an owner-approved dedicated or shared placement, retained-cost acceptance at the 1 USD monthly ceiling, reviewed Azure scope, and a narrow trusted IPv4 rule."
  }
}
