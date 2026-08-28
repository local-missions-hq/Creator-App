locals {
  disposable_inventory = [
    "container-apps-and-environment",
    "postgresql-and-application-database",
    "workload-storage-and-media-containers",
    "service-bus-and-worker-entry-point",
    "workload-key-vault",
    "workload-telemetry",
    "container-registry-and-temporary-images",
    "dashboard-hosting",
    "temporary-networking",
  ]

  required_tags = {
    application             = "local-missions"
    commit_sha              = var.commit_sha
    created_at              = var.created_at
    environment             = "development"
    expires_at              = var.expires_at
    lifecycle               = "disposable"
    managed_by              = "terraform"
    owner                   = var.owner
    purpose                 = "same-day-synthetic-cloud-validation"
    terraform_root          = "workload-dev"
    workload_resource_group = var.workload_resource_group_name
  }
}

module "workload_contract" {
  source = "../../modules/workload-contract"

  environment                     = var.environment
  workload_resource_group_name    = var.workload_resource_group_name
  retained_resource_group_names   = [var.control_plane_resource_group_name, var.state_resource_group_name]
  scale_contract                  = var.scale_contract
  network_contract                = var.network_contract
  backup_contract                 = var.backup_contract
  storage_access_contract         = var.storage_access_contract
  azure_resource_creation_enabled = var.azure_resource_creation_enabled
}

module "workload_resource_group" {
  count  = var.azure_resource_creation_enabled ? 1 : 0
  source = "../../modules/resource-group"

  name     = var.workload_resource_group_name
  location = var.location
  tags     = local.required_tags
}

check "retained_and_disposable_scopes_are_distinct" {
  assert {
    condition = (
      var.workload_resource_group_name != var.control_plane_resource_group_name &&
      var.workload_resource_group_name != var.state_resource_group_name &&
      var.control_plane_resource_group_name != var.state_resource_group_name
    )
    error_message = "Disposable workload, retained control plane, and retained state scopes must all differ."
  }
}
