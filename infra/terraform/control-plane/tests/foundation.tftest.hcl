mock_provider "azurerm" {
  mock_data "azurerm_client_config" {
    defaults = {
      subscription_id = "00000000-0000-4000-8000-000000000003"
      tenant_id       = "00000000-0000-4000-8000-000000000003"
    }
  }
}

run "local_control_plane_contract" {
  command = plan

  assert {
    condition     = output.activation_status == "local-contract-only"
    error_message = "The retained control-plane checkpoint must remain local-contract-only."
  }

  assert {
    condition     = output.backend_contract.key == "local-missions/control-plane.tfstate"
    error_message = "The retained control-plane backend key drifted."
  }

  assert {
    condition     = output.backend_contract.workload_state_owned == false
    error_message = "The retained root must not own disposable workload state."
  }
}

run "mock_enabled_control_plane_contract" {
  command = plan

  variables {
    alert_destination_reference            = "monitored-cost-owner"
    alert_receiver_email                   = "alerts@localmissions.example"
    approved_monthly_budget_usd            = 100
    azure_resource_creation_enabled        = true
    control_plane_approval_reference       = "mock-control-approval"
    expected_subscription_id               = "00000000-0000-4000-8000-000000000003"
    expected_tenant_id                     = "00000000-0000-4000-8000-000000000003"
    github_repository_owner                = "local-missions-hq"
    github_oidc_subjects_revalidated       = true
    subscription_placement                 = "shared-nonproduction"
    shared_subscription_cotenancy_approved = true
    github_oidc_subjects = {
      plan    = "repository_owner_id:123456:repository_id:789012:environment:azure-development-plan"
      apply   = "repository_owner_id:123456:repository_id:789012:environment:azure-development-apply"
      destroy = "repository_owner_id:123456:repository_id:789012:environment:azure-development-destroy"
    }
  }

  assert {
    condition     = output.activation_status == "mock-enabled-control-plane"
    error_message = "The retained enabled shape may run only under the mock provider."
  }

  assert {
    condition = (
      output.resource_inventory.total == 20 &&
      output.resource_inventory.resource_groups == 2 &&
      output.resource_inventory.managed_identities == 3 &&
      output.resource_inventory.federated_identity_credentials == 3 &&
      output.resource_inventory.action_group == 1 &&
      output.resource_inventory.budget == 1 &&
      output.resource_inventory.state_backend_role_assignments == 3 &&
      output.resource_inventory.workload_role_definitions == 2 &&
      output.resource_inventory.workflow_role_assignments == 5
    )
    error_message = "The mock control plane must contain exactly twenty retained boundary resources."
  }

  assert {
    condition = (
      output.security_contract.budget_alert_count == 6 &&
      output.security_contract.federated_identity_count == 3 &&
      output.security_contract.immutable_github_subjects &&
      output.security_contract.delegated_role_definition_count == 5 &&
      output.security_contract.landing_zone_scope_only &&
      !output.security_contract.apply_identity_can_delete &&
      !output.security_contract.destroy_identity_can_delete_group &&
      output.security_contract.custom_workload_role_count == 2 &&
      !output.security_contract.long_lived_credentials &&
      output.security_contract.prevent_destroy &&
      !output.security_contract.subscription_scope_workload_rbac &&
      output.security_contract.state_backend_role_assignment_count == 3 &&
      output.security_contract.state_backend_scope_is_container &&
      output.security_contract.workflow_role_assignment_count == 5 &&
      !output.security_contract.shared_identity
    )
    error_message = "The control-plane security contract drifted."
  }
}
