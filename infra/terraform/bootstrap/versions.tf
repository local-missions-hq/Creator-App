terraform {
  required_version = ">= 1.9.0, < 2.0.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "5.0.1"
    }
  }

  # The first bootstrap apply used protected one-time local state because this
  # backend did not exist. After that reviewed apply, the source contract moves
  # permanently to the Entra-backed remote backend below.
  backend "azurerm" {}
}
