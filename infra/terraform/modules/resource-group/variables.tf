variable "name" {
  description = "Exact resource-group name owned by the calling Terraform root."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^rg-local-missions-dev-[a-z0-9-]+$", var.name))
    error_message = "The workload resource-group module accepts only the disposable development namespace."
  }
}

variable "location" {
  description = "Candidate Azure region, revalidated externally before any apply."
  type        = string
  nullable    = false

  validation {
    condition     = can(regex("^[a-z][a-z0-9]+$", var.location))
    error_message = "location must be an explicit lowercase Azure region name."
  }
}

variable "tags" {
  description = "Required ownership, expiry, provenance, and lifecycle tags."
  type        = map(string)
  nullable    = false

  validation {
    condition = (
      length(setsubtract(
        toset([
          "application",
          "commit_sha",
          "created_at",
          "environment",
          "expires_at",
          "lifecycle",
          "managed_by",
          "owner",
          "purpose",
          "terraform_root",
          "workload_resource_group",
        ]),
        toset(keys(var.tags)),
      )) == 0 &&
      lookup(var.tags, "application", "") == "local-missions" &&
      lookup(var.tags, "environment", "") == "development" &&
      lookup(var.tags, "lifecycle", "") == "disposable" &&
      lookup(var.tags, "managed_by", "") == "terraform" &&
      lookup(var.tags, "terraform_root", "") == "workload-dev"
    )
    error_message = "Resource-group tags must identify the disposable Local Missions development workload and include every required ownership/expiry key."
  }
}
