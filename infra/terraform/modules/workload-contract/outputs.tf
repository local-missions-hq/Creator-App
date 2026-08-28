output "safeguards" {
  description = "Provider-independent contract consumed by future workload resource modules."
  value = {
    environment                          = var.environment
    workload_resource_group_name         = var.workload_resource_group_name
    retained_resource_group_names        = var.retained_resource_group_names
    retained_and_disposable_are_distinct = local.retained_and_disposable_are_distinct
    scale                                = var.scale_contract
    network                              = var.network_contract
    backup                               = var.backup_contract
    storage_access                       = var.storage_access_contract
  }
}
