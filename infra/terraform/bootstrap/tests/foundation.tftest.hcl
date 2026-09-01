mock_provider "azurerm" {
  mock_data "azurerm_client_config" {
    defaults = {
      subscription_id = "00000000-0000-4000-8000-000000000003"
      tenant_id       = "00000000-0000-4000-8000-000000000003"
    }
  }
}

run "local_retained_state_contract" {
  command = plan

  assert {
    condition     = output.activation_status == "local-contract-only"
    error_message = "The default bootstrap checkpoint must remain local-contract-only."
  }

  assert {
    condition     = output.resource_inventory.total == 0
    error_message = "The default bootstrap plan must contain zero Azure resources."
  }

  assert {
    condition = (
      output.backend_contract.bootstrap_backend == "azurerm" &&
      !output.backend_contract.migration_required &&
      output.backend_contract.remote_storage_account == "stlmtfse2001"
    )
    error_message = "The migrated Entra-backed remote backend contract drifted."
  }

  assert {
    condition = (
      output.retained_state_cost_contract.approval_required &&
      !output.retained_state_cost_contract.approved &&
      output.retained_state_cost_contract.monthly_ceiling_usd == 1 &&
      output.retained_state_cost_contract.survives_daily_teardown
    )
    error_message = "The retained state cost boundary drifted."
  }
}

run "mock_enabled_retained_state_shape" {
  command = plan

  variables {
    approved_retained_state_monthly_ceiling_usd  = 1
    bootstrap_approval_reference                 = "mock-bootstrap-approval"
    bootstrap_resource_creation_enabled          = true
    dedicated_subscription_isolation_revalidated = true
    expected_subscription_id                     = "00000000-0000-4000-8000-000000000003"
    expected_tenant_id                           = "00000000-0000-4000-8000-000000000003"
    retained_state_cost_approved                 = true
    subscription_placement                       = "dedicated-local-missions"
    trusted_ipv4_rules                           = ["203.0.113.10"]
  }

  assert {
    condition     = output.activation_status == "mock-enabled-bootstrap"
    error_message = "The enabled bootstrap shape may be exercised only with the mock provider."
  }

  assert {
    condition = (
      output.resource_inventory.total == 3 &&
      output.resource_inventory.resource_group == 1 &&
      output.resource_inventory.storage_account == 1 &&
      output.resource_inventory.storage_container == 1
    )
    error_message = "The mock bootstrap plan must contain exactly the three retained state resources."
  }

  assert {
    condition = (
      output.planning_contract.subscription_placement == "dedicated-local-missions" &&
      output.planning_contract.dedicated_isolation_revalidated &&
      output.planning_contract.provider_scope_validated
    )
    error_message = "The enabled bootstrap plan must bind to the reviewed dedicated provider scope."
  }

  assert {
    condition = (
      !output.safeguards.anonymous_access &&
      output.safeguards.container_access_type == "private" &&
      output.safeguards.default_network_action == "Deny" &&
      output.safeguards.infrastructure_encryption &&
      output.safeguards.prevent_destroy &&
      !output.safeguards.shared_key_enabled &&
      output.safeguards.storage_uses_microsoft_entra &&
      output.safeguards.versioning_enabled
    )
    error_message = "The retained state security safeguards drifted."
  }
}
