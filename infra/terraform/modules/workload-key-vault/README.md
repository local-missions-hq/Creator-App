# Disposable workload Key Vault

Creates one RBAC-only, default-deny vault with narrow IP rules, no trusted-services bypass, seven-day soft delete, and purge protection. Terraform creates no secrets, keys, certificates, access policies, or inline values; applications receive only the vault URI and use managed identity. The unique run suffix avoids reusing a protected soft-deleted name.
