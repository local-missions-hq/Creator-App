# External prerequisite register

Status: Inventory complete; accounts and approvals remain external gates

Owner model: named accountable humans and roles only; no personal contact details or credentials

Last reviewed: 2026-08-30

This register identifies everything Local Missions must obtain outside the repository before the corresponding distribution or live-service milestone. A recorded prerequisite is not authorization to create, configure, fund, or connect it.

## Account and platform prerequisites

| Key                                | Planned value or safe placeholder                                                                      | Accountable role                | Required before                 | Current status and proof gate                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `APPLE_DEVELOPER_ACCOUNT_STATUS`   | Organization enrollment; legal entity and D-U-N-S details supplied outside the repo                    | Founder                         | Device signing and TestFlight   | Not provisioned; require approved organization enrollment and current agreement acceptance                                           |
| `APP_STORE_CONNECT_ACCOUNT_STATUS` | App record, bundle identifier, agreements, tax, banking, privacy labels, and release roles             | Founder + Legal/Finance         | TestFlight distribution         | Not provisioned; require signed agreements and a recorded app/release owner                                                          |
| `EXPO_ORGANIZATION`                | `<approved-expo-owner-slug>`                                                                           | Technical owner                 | EAS build/update credentials    | Not provisioned; require organization ownership, MFA, least-privilege members, and Apple-team linkage review                         |
| `STRIPE_TEST_ACCOUNT_STATUS`       | Isolated Stripe test-mode platform account; no live keys                                               | Finance owner + Technical owner | Payment integration development | Not connected; require merchant-of-record/legal approval, test-platform ownership, restricted keys, and webhook ownership            |
| `ENTRA_EXTERNAL_ID_TENANT_PLAN`    | Separate customer tenant with iOS, dashboard, and API registrations; authorization-code flow with PKCE | Identity owner                  | Federated sign-in integration   | Planned only; require tenant ownership, provider approvals, redirect-URI review, recovery/support policy, and environment separation |

The field-level, secret-free M4 handoff is maintained in
[`operations/external-auth-configuration-gate.md`](./operations/external-auth-configuration-gate.md)
and [`../config/external-auth-gate.v1.json`](../config/external-auth-gate.v1.json). Passing its local
validator prepares registration review only; it does not provision or activate an external identity
service.

## Azure ownership and cost prerequisites

| Key                             | Planned value or safe placeholder                                                                      | Accountable role                     | Required before                   | Current status and proof gate                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AZURE_PRIMARY_REGION`          | `eastus2` selected for the first ephemeral development plan                                            | Blake Tindol, Technical owner        | First reviewed Terraform plan     | Public catalog/region/SKU review passed 2026-08-30; subscription policy, quota, offer, and current availability still require Azure access and approval |
| `AZURE_COST_OWNER_ROLE`         | Blake Tindol, Finance and cost owner                                                                   | Blake Tindol                         | Any Azure resource creation       | Accountable human assigned; exact subscription scope and budget approval remain external                                                                |
| `AZURE_COST_ALERT_DESTINATION`  | `azure-cost-alerts@localmissions.example`                                                              | Blake Tindol, Operations owner       | Any Azure resource creation       | Reserved placeholder only; replace with a monitored verified destination before provider-backed planning or apply                                       |
| `AZURE_EPHEMERAL_BUDGET_POLICY` | Proposed `$5` per run, `$25` monthly, 50%/80%/100% actual and forecast alerts, same-day scoped destroy | Blake Tindol, Cost + Technical owner | Any provider-backed workload plan | Proposal recorded; approval, monitored delivery, subscription budget, and scoped cleanup identity remain blocked                                        |

The first-plan region is a reviewed planning selection, not a permanent deployment decision or proof that a subscription can deploy every SKU. The public review and estimate are recorded in [`operations/azure-public-service-cost-review.md`](./operations/azure-public-service-cost-review.md). No Terraform environment may silently fall back to a different region or create billable resources until region, subscription, budget, alert destination, expiry, and destroy ownership are all recorded in the execution evidence.

## Reserved domain and email placeholders

The `.example` top-level domain is reserved for documentation. These values are deliberately non-routable and must never be treated as production contacts.

| Key                             | Safe placeholder                          | Accountable role          | Replacement gate                                                       |
| ------------------------------- | ----------------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| `PUBLIC_APP_DOMAIN_PLACEHOLDER` | `localmissions.example`                   | Founder + Technical owner | Verified domain ownership and DNS change control                       |
| `API_DOMAIN_PLACEHOLDER`        | `api.localmissions.example`               | Technical owner           | TLS, DNS, environment, and ingress approval                            |
| `SUPPORT_EMAIL_PLACEHOLDER`     | `support@localmissions.example`           | Support owner             | Monitored mailbox, retention, escalation, and service-hours approval   |
| `PRIVACY_EMAIL_PLACEHOLDER`     | `privacy@localmissions.example`           | Privacy owner             | Monitored privacy request workflow and identity-verification procedure |
| `SECURITY_EMAIL_PLACEHOLDER`    | `security@localmissions.example`          | Security owner            | Monitored incident intake and vulnerability disclosure process         |
| `AZURE_COST_EMAIL_PLACEHOLDER`  | `azure-cost-alerts@localmissions.example` | Finance owner             | Verified alert delivery and escalation test                            |

## Secret and identifier handling

- Apple team IDs, App Store Connect issuer/key IDs, Expo tokens, Azure tenant/subscription IDs, Entra client IDs, Stripe account IDs, keys, webhook secrets, and real email addresses do not belong in this register.
- Local examples contain variable names only. Real values must enter through approved secret stores or direct provider configuration and must not appear in screenshots, logs, pull requests, or chat.
- Every external account requires MFA, least privilege, named ownership, recovery ownership, and offboarding before it can satisfy its gate.
- Test accounts and tenant plans remain disconnected until their milestone includes provider-specific legal, security, privacy, cost, and teardown evidence.

## Completion meaning

This inventory is complete when `pnpm prerequisites:check` passes. Provisioning remains incomplete until separate, later evidence proves ownership and approval for each applicable provider. The inventory check therefore closes only the M1 prerequisite-record task; it does not close any live-provider gate.
