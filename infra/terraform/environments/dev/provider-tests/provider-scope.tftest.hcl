run "reviewed_provider_scope_plan" {
  command = plan

  variables {
    provider_scope_validation_enabled = true
    resource_name_suffix              = "e2r26083101"
    workload_resource_group_name      = "rg-local-missions-dev-e2r26083101"
    control_plane_resource_group_name = "rg-local-missions-control-eus2-001"
    state_resource_group_name         = "rg-local-missions-state-eus2-001"
    created_at                        = "2026-08-31T14:00:00-04:00"
    created_new_york_date             = "2026-08-31"
    expires_at                        = "2026-08-31T22:00:00-04:00"
    expires_new_york_date             = "2026-08-31"
    warning_at                        = "2026-08-31T21:00:00-04:00"
  }

  assert {
    condition     = output.provider_scope_status == "validated"
    error_message = "The AzureRM account scope was not validated."
  }

  assert {
    condition     = output.activation_status == "local-contract-only"
    error_message = "Provider-scope validation must retain plan-only activation."
  }

  assert {
    condition     = output.workload_resource_inventory.total == 0
    error_message = "Provider-scope validation must plan zero Azure resources."
  }

  assert {
    condition = (
      output.cost_profile_contract.azure_resources == false &&
      output.cost_profile_contract.run_ceiling_usd == 0
    )
    error_message = "Provider-scope validation must retain the zero-cost plan-only tier."
  }
}
