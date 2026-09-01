# Local Missions retained state bootstrap

This root owns only the one-time Terraform state foundation for Local Missions: one retained resource group, one hardened StorageV2 account, and one private state container. It never owns the disposable workload, the other Azure project's resources, identities, budgets, or application data.

The default fixture and every ordinary repository test plan zero resources. The enabled three-resource shape remains exercised through Terraform's mock AzureRM provider, while the independently reviewed real bootstrap was applied on 2026-09-01 under its consumed authorization. The revised `$100` development alert budget belongs to the later control-plane phase and was not implied by bootstrap approval. Any future bootstrap change or apply requires a new independently reviewed plan and authorization.

The storage endpoint is public but default-deny. It permits only explicitly supplied operator CIDRs, requires TLS 1.2 and Microsoft Entra authentication, disables Shared Key/local users/anonymous access, enables infrastructure encryption, versioning, change feed, and 30-day Blob/container deletion recovery, and has `prevent_destroy` on every retained object.

## Bootstrap and migration boundary

The remote backend could not store the plan that created itself, so the first reviewed apply used protected one-time local state. This root now permanently declares the Entra-backed `azurerm` backend. The completed migration sequence was:

1. verified the exact three-resource Azure inventory and state-container controls;
2. initialized this root with the protected backend inputs and `-migrate-state` under Microsoft Entra authentication;
3. verified the remote `local-missions/bootstrap.tfstate` object, locking, and version history;
4. removed the consumed plan and protected one-time local state after remote verification; and
5. independently confirmed the workload and control-plane keys remain separate.

The retained state account survives daily workload teardown and carries a conservative `$1/month` planning ceiling. If no retained cost is acceptable, do not apply this root; safe remote Terraform apply/CI remains blocked.
