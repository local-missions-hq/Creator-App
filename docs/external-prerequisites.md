# External prerequisite register

Status: Inventory complete; accounts and approvals remain external gates  
Owner model: named roles only; no personal contact details or credentials  
Last reviewed: 2026-08-26

This register identifies everything Local Missions must obtain outside the repository before the corresponding distribution or live-service milestone. A recorded prerequisite is not authorization to create, configure, fund, or connect it.

## Account and platform prerequisites

| Key                                | Planned value or safe placeholder                                                                      | Accountable role                | Required before                 | Current status and proof gate                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `APPLE_DEVELOPER_ACCOUNT_STATUS`   | Organization enrollment; legal entity and D-U-N-S details supplied outside the repo                    | Founder                         | Device signing and TestFlight   | Not provisioned; require approved organization enrollment and current agreement acceptance                                           |
| `APP_STORE_CONNECT_ACCOUNT_STATUS` | App record, bundle identifier, agreements, tax, banking, privacy labels, and release roles             | Founder + Legal/Finance         | TestFlight distribution         | Not provisioned; require signed agreements and a recorded app/release owner                                                          |
| `EXPO_ORGANIZATION`                | `<approved-expo-owner-slug>`                                                                           | Technical owner                 | EAS build/update credentials    | Not provisioned; require organization ownership, MFA, least-privilege members, and Apple-team linkage review                         |
| `STRIPE_TEST_ACCOUNT_STATUS`       | Isolated Stripe test-mode platform account; no live keys                                               | Finance owner + Technical owner | Payment integration development | Not connected; require merchant-of-record/legal approval, test-platform ownership, restricted keys, and webhook ownership            |
| `ENTRA_EXTERNAL_ID_TENANT_PLAN`    | Separate customer tenant with iOS, dashboard, and API registrations; authorization-code flow with PKCE | Identity owner                  | Federated sign-in integration   | Planned only; require tenant ownership, provider approvals, redirect-URI review, recovery/support policy, and environment separation |

## Azure ownership and cost prerequisites

| Key                             | Planned value or safe placeholder                                                                    | Accountable role                 | Required before               | Current status and proof gate                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `AZURE_PRIMARY_REGION`          | `eastus2` candidate for the Orlando pilot                                                            | Technical owner                  | First reviewed Terraform plan | Candidate only; revalidate service/SKU availability, latency, compliance, and price immediately before planning        |
| `AZURE_COST_OWNER_ROLE`         | Finance owner                                                                                        | Finance owner                    | Any Azure resource creation   | Role identified; a named person and subscription scope must be approved outside the repo                               |
| `AZURE_COST_ALERT_DESTINATION`  | `azure-cost-alerts@localmissions.example`                                                            | Finance owner + Operations owner | Any Azure resource creation   | Reserved placeholder only; replace with a monitored verified destination before apply                                  |
| `AZURE_EPHEMERAL_BUDGET_POLICY` | Low-cost development budget, alerts, earlier-of-eight-hours-or-11-PM expiry, same-day scoped destroy | Finance owner + Technical owner  | Any ephemeral workload apply  | Policy frozen in ADR-047 through ADR-049; numeric budget and externally scoped destroy identity still require approval |

The candidate region is a planning default, not a permanent deployment decision. No Terraform environment may silently fall back to a different region or create billable resources until region, subscription, budget, alert destination, expiry, and destroy ownership are all recorded in the execution evidence.

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
