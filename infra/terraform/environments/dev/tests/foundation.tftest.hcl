mock_provider "azurerm" {}

run "local_disposable_workload_contract" {
  command = plan

  assert {
    condition     = output.activation_status == "local-contract-only"
    error_message = "The disposable workload checkpoint must remain local-contract-only."
  }

  assert {
    condition     = output.backend_contract.key == "local-missions/dev-workload.tfstate"
    error_message = "The disposable workload backend key drifted."
  }

  assert {
    condition     = output.backend_contract.retained_resources_owned == false
    error_message = "The disposable root must not own retained resources."
  }

  assert {
    condition     = output.expiration_contract.warning_at == "2026-08-28T21:00:00-04:00"
    error_message = "The local fixture warning must remain exactly one hour before expiration."
  }

  assert {
    condition     = output.low_cost_defaults.api_max_replicas == 1 && output.low_cost_defaults.worker_max_replicas == 1
    error_message = "The local fixture must retain one-replica API and worker ceilings."
  }

  assert {
    condition     = output.resource_group_contract.planned_count == 0
    error_message = "The default local fixture must plan zero resource groups."
  }
}

run "mock_enabled_resource_group_contract" {
  command = plan

  variables {
    alert_destination_reference     = "monitored-cost-destination"
    apply_approval_reference        = "mock-plan-approval"
    approved_monthly_budget_usd     = 50
    azure_resource_creation_enabled = true
    cleanup_controller_reference    = "mock-cleanup-controller"
    region_and_sku_revalidated      = true
    network_contract = {
      mode                                   = "restricted_public"
      allowed_ipv4_cidrs                     = ["203.0.113.10/32"]
      minimum_tls_version                    = "TLS1_2"
      postgres_public_network_access_enabled = true
      postgres_firewall_allow_azure_services = false
      postgres_firewall_allow_all            = false
    }
  }

  assert {
    condition     = output.activation_status == "mock-enabled-contract"
    error_message = "The enabled shape may be exercised only under the mock-provider contract."
  }

  assert {
    condition     = output.resource_group_contract.planned_count == 1 && output.resource_group_contract.names[0] == "rg-local-missions-dev-example"
    error_message = "The mock-enabled plan must contain exactly the explicit disposable resource group."
  }

  assert {
    condition = (
      output.resource_group_contract.tags.lifecycle == "disposable" &&
      output.resource_group_contract.tags.terraform_root == "workload-dev" &&
      output.resource_group_contract.tags.owner == "technical-owner"
    )
    error_message = "The mock resource group must retain disposable ownership tags."
  }

  assert {
    condition = (
      output.workload_safeguards.environment == "development" &&
      output.workload_safeguards.retained_and_disposable_are_distinct &&
      output.workload_safeguards.scale.api_min_replicas == 0 &&
      output.workload_safeguards.scale.api_max_replicas == 1
    )
    error_message = "Environment, ownership, and scale safeguards drifted."
  }

  assert {
    condition = (
      output.workload_safeguards.network.minimum_tls_version == "TLS1_2" &&
      !output.workload_safeguards.network.postgres_firewall_allow_all &&
      output.workload_safeguards.backup.postgres_retention_days == 7 &&
      output.workload_safeguards.backup.point_in_time_restore_required
    )
    error_message = "Network or backup safeguards drifted."
  }

  assert {
    condition = (
      !output.workload_safeguards.storage_access.blob_public_access_enabled &&
      !output.workload_safeguards.storage_access.static_website_enabled &&
      output.workload_safeguards.storage_access.container_access_type == "private"
    )
    error_message = "Anonymous storage access must remain disabled."
  }
}
