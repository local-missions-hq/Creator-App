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

variable "environment" {
  description = "Exact isolated workload environment. This root is development-only."
  type        = string
  default     = "development"
  nullable    = false

  validation {
    condition     = var.environment == "development"
    error_message = "The disposable dev root can plan only the development environment."
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
        var.identity_references_revalidated &&
        var.artifact_references_revalidated &&
        length(var.identity_reference_contract.tenant_id) > 0 &&
        length(var.identity_reference_contract.postgres_administrator_object_id) > 0 &&
        length(var.network_contract.allowed_ipv4_cidrs) > 0 &&
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
    service_bus_sku                = "Standard"
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
      var.low_cost_defaults.service_bus_sku == "Standard" &&
      var.low_cost_defaults.container_registry_sku == "Basic"
    )
    error_message = "low_cost_defaults exceeds the local V1 planning ceilings."
  }
}

variable "scale_contract" {
  description = "Conservative planning-only replica bounds for the API and worker."
  type = object({
    api_min_replicas    = number
    api_max_replicas    = number
    worker_min_replicas = number
    worker_max_replicas = number
  })
  default = {
    api_min_replicas    = 0
    api_max_replicas    = 1
    worker_min_replicas = 0
    worker_max_replicas = 1
  }
  nullable = false

  validation {
    condition = (
      var.scale_contract.api_min_replicas == 0 &&
      var.scale_contract.worker_min_replicas == 0 &&
      var.scale_contract.api_max_replicas >= 1 &&
      var.scale_contract.api_max_replicas <= 2 &&
      var.scale_contract.worker_max_replicas >= 1 &&
      var.scale_contract.worker_max_replicas <= 2
    )
    error_message = "Scale contract requires zero minimum replicas and one-to-two replica ceilings."
  }
}

variable "network_contract" {
  description = "Pre-private-network safeguards; public access is narrow, explicit, and temporary."
  type = object({
    mode                                   = string
    allowed_ipv4_cidrs                     = list(string)
    minimum_tls_version                    = string
    postgres_public_network_access_enabled = bool
    postgres_firewall_allow_azure_services = bool
    postgres_firewall_allow_all            = bool
  })
  default = {
    mode                                   = "restricted_public"
    allowed_ipv4_cidrs                     = []
    minimum_tls_version                    = "TLS1_2"
    postgres_public_network_access_enabled = true
    postgres_firewall_allow_azure_services = false
    postgres_firewall_allow_all            = false
  }
  nullable = false

  validation {
    condition = (
      var.network_contract.mode == "restricted_public" &&
      var.network_contract.minimum_tls_version == "TLS1_2" &&
      var.network_contract.postgres_public_network_access_enabled &&
      !var.network_contract.postgres_firewall_allow_azure_services &&
      !var.network_contract.postgres_firewall_allow_all &&
      alltrue([
        for cidr in var.network_contract.allowed_ipv4_cidrs :
        can(cidrnetmask(cidr)) && cidr != "0.0.0.0/0"
      ])
    )
    error_message = "Network contract requires restricted public mode, TLS 1.2, and narrow PostgreSQL CIDRs without allow-all or trusted-services bypasses."
  }
}

variable "backup_contract" {
  description = "Planning-only PostgreSQL recovery bounds."
  type = object({
    postgres_retention_days        = number
    geo_redundant_backup_enabled   = bool
    point_in_time_restore_required = bool
  })
  default = {
    postgres_retention_days        = 7
    geo_redundant_backup_enabled   = false
    point_in_time_restore_required = true
  }
  nullable = false

  validation {
    condition = (
      var.backup_contract.postgres_retention_days >= 7 &&
      var.backup_contract.postgres_retention_days <= 14 &&
      !var.backup_contract.geo_redundant_backup_enabled &&
      var.backup_contract.point_in_time_restore_required
    )
    error_message = "Backup contract requires 7-14 day retention, point-in-time restore, and no unapproved geo-redundant backup."
  }
}

variable "storage_access_contract" {
  description = "Anonymous Blob access and unused static website hosting remain disabled."
  type = object({
    blob_public_access_enabled = bool
    static_website_enabled     = bool
    container_access_type      = string
  })
  default = {
    blob_public_access_enabled = false
    static_website_enabled     = false
    container_access_type      = "private"
  }
  nullable = false

  validation {
    condition = (
      !var.storage_access_contract.blob_public_access_enabled &&
      !var.storage_access_contract.static_website_enabled &&
      var.storage_access_contract.container_access_type == "private"
    )
    error_message = "Storage access contract forbids anonymous Blob access and static website hosting."
  }
}

variable "resource_name_suffix" {
  description = "Synthetic or approved unique suffix for global resource names."
  type        = string
  default     = "example"
  nullable    = false

  validation {
    condition     = can(regex("^[a-z0-9]{6,12}$", var.resource_name_suffix))
    error_message = "resource_name_suffix must be six-to-twelve lowercase letters or numbers."
  }
}

variable "identity_reference_contract" {
  description = "Non-secret Microsoft Entra references; empty until separately reviewed."
  type = object({
    tenant_id                        = string
    postgres_administrator_object_id = string
    postgres_administrator_name      = string
    postgres_administrator_type      = string
  })
  default = {
    tenant_id                        = ""
    postgres_administrator_object_id = ""
    postgres_administrator_name      = ""
    postgres_administrator_type      = "Group"
  }
  nullable = false

  validation {
    condition = (
      (
        var.identity_reference_contract.tenant_id == "" &&
        var.identity_reference_contract.postgres_administrator_object_id == "" &&
        var.identity_reference_contract.postgres_administrator_name == ""
      ) ||
      (
        can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", lower(var.identity_reference_contract.tenant_id))) &&
        can(regex("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", lower(var.identity_reference_contract.postgres_administrator_object_id))) &&
        can(regex("^[a-z][a-z0-9-]{2,63}$", var.identity_reference_contract.postgres_administrator_name)) &&
        var.identity_reference_contract.postgres_administrator_type == "Group"
      )
    )
    error_message = "Identity references must be entirely empty or complete reviewed UUID/group references; credentials are forbidden."
  }
}

variable "identity_references_revalidated" {
  description = "True only after the non-secret tenant and PostgreSQL administrator references are reviewed."
  type        = bool
  default     = false
  nullable    = false
}

variable "image_contract" {
  description = "Immutable image repository and digest references; tags and credentials are forbidden."
  type = object({
    api_repository    = string
    api_digest        = string
    worker_repository = string
    worker_digest     = string
  })
  default = {
    api_repository    = "local-missions/api"
    api_digest        = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    worker_repository = "local-missions/worker"
    worker_digest     = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }
  nullable = false

  validation {
    condition = (
      can(regex("^[a-z0-9][a-z0-9._/-]{2,127}$", var.image_contract.api_repository)) &&
      can(regex("^[0-9a-f]{64}$", var.image_contract.api_digest)) &&
      can(regex("^[a-z0-9][a-z0-9._/-]{2,127}$", var.image_contract.worker_repository)) &&
      can(regex("^[0-9a-f]{64}$", var.image_contract.worker_digest))
    )
    error_message = "Images must use stable repositories and lowercase 64-character SHA-256 digests."
  }
}

variable "artifact_references_revalidated" {
  description = "True only after both immutable image digests are built, scanned, and reviewed."
  type        = bool
  default     = false
  nullable    = false
}

variable "secret_reference_contract" {
  description = "Fail-closed contract preventing credentials or inline secrets from entering Terraform state."
  type = object({
    inline_secret_blocks            = number
    key_vault_reference_only        = bool
    postgres_password_auth_enabled  = bool
    registry_password_references    = number
    shared_key_auth_enabled         = bool
    terraform_managed_secret_values = number
  })
  default = {
    inline_secret_blocks            = 0
    key_vault_reference_only        = true
    postgres_password_auth_enabled  = false
    registry_password_references    = 0
    shared_key_auth_enabled         = false
    terraform_managed_secret_values = 0
  }
  nullable = false

  validation {
    condition = (
      var.secret_reference_contract.inline_secret_blocks == 0 &&
      var.secret_reference_contract.key_vault_reference_only &&
      !var.secret_reference_contract.postgres_password_auth_enabled &&
      var.secret_reference_contract.registry_password_references == 0 &&
      !var.secret_reference_contract.shared_key_auth_enabled &&
      var.secret_reference_contract.terraform_managed_secret_values == 0
    )
    error_message = "Secret/reference contract forbids inline, password, registry-password, Shared Key, and Terraform-managed secret values."
  }
}
