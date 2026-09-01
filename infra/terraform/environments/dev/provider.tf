provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }

    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }

  # Planning must never mutate the subscription by registering providers.
  resource_provider_registrations = "none"

  # Terraform state and workload storage use Microsoft Entra authentication.
  storage_use_azuread = true
}
