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
}
