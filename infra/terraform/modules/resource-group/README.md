# Disposable resource-group module

This module owns exactly one `rg-local-missions-dev-*` resource group. It rejects missing ownership, expiry, provenance, and disposable-lifecycle tags. The dev root keeps the module at `count = 0` unless the separately gated activation switch is true; local enabled-shape tests replace AzureRM with Terraform's mock provider.
