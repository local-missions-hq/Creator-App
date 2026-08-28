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
