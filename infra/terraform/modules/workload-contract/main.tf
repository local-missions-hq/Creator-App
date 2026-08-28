locals {
  retained_and_disposable_are_distinct = (
    !contains(var.retained_resource_group_names, var.workload_resource_group_name) &&
    length(distinct(var.retained_resource_group_names)) == length(var.retained_resource_group_names)
  )
}

check "retained_and_disposable_ownership" {
  assert {
    condition     = local.retained_and_disposable_are_distinct
    error_message = "Retained control/state groups and the disposable workload group must have distinct ownership."
  }
}

check "enabled_network_has_narrow_ingress" {
  assert {
    condition     = !var.azure_resource_creation_enabled || length(var.network_contract.allowed_ipv4_cidrs) > 0
    error_message = "An enabled workload contract requires at least one narrow reviewed ingress CIDR."
  }
}
