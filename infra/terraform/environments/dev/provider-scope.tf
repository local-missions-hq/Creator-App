data "azurerm_client_config" "current" {
  count = var.provider_scope_validation_enabled ? 1 : 0
}

check "provider_scope_inputs_are_complete" {
  assert {
    condition = (
      !var.provider_scope_validation_enabled ||
      (
        length(var.expected_subscription_id) > 0 &&
        length(var.expected_tenant_id) > 0
      )
    )
    error_message = "Provider-scope validation requires expected subscription and tenant IDs supplied outside source control."
  }
}

check "provider_scope_matches_reviewed_account" {
  assert {
    condition = (
      !var.provider_scope_validation_enabled ||
      (
        try(data.azurerm_client_config.current[0].subscription_id, "") == var.expected_subscription_id &&
        try(data.azurerm_client_config.current[0].tenant_id, "") == var.expected_tenant_id
      )
    )
    error_message = "The active AzureRM provider scope does not match the separately supplied reviewed account scope."
  }
}
