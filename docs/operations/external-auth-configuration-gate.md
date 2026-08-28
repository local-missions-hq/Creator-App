# External authentication configuration gate

Status: local contract complete; every external mutation and round trip remains blocked

Checkpoint: `M04-external-auth-configuration-gate-local-010`

Machine-readable contract: [`../../config/external-auth-gate.v1.json`](../../config/external-auth-gate.v1.json)

This runbook turns the accepted M4 identity decisions into an exact, secret-free handoff. It does not authorize anyone to create an Entra tenant, register an application, enable a provider, enter a credential, activate network authentication, or use a real identity. The app remains fail-closed until the applicable approval gates are recorded and the missing transport/provider/device tests pass.

## Registration inventory

Create separate registrations in each approved environment. Never reuse a development registration, redirect, identifier, provider credential, or test account in staging or production.

| Registration           | Required purpose                                   | Exact inputs to record outside source control                                                                                                                                                        | Secret rule                                                                                                                  |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Mobile public client   | Shared Creator/Business/Venue Staff iPhone sign-in | Environment, customer tenant ID, mobile application client ID, exact `localmissions://auth/callback` native redirect, hosted sign-in user flow, and delegated `access_as_user` permission to the API | Public client; no client secret is allowed                                                                                   |
| Customer API resource  | Local Missions participant API audience            | Environment, customer tenant ID, API application client ID, application ID URI, delegated `access_as_user` scope, and mobile-client permission grant                                                 | API audience/scope are identifiers, not credentials; no validation secret is required                                        |
| Participant web client | Future protected customer web surface              | Environment, customer tenant ID, separate web client ID, exact approved HTTPS callback, and a server-side secret-store reference                                                                     | Deferred; if a confidential credential is later required, only its secret-store reference may enter deployment configuration |

The employee admin/support console uses separately granted workforce authentication, MFA, and step-up. It must not inherit a customer app registration or become a hidden phone-app mode.

## Provider and role mapping

Apple, Google, Microsoft, and passwordless email one-time code are enabled in the same hosted customer sign-in user flow before Local Missions role selection. Every phone button opens that same reviewed browser-delegated flow; the button's provider intent is UI state, not a trusted query parameter or an identity claim. Entra's hosted flow owns provider selection, consent, passwordless code entry, cancellation, and provider errors.

Facebook and Meta are absent from V1 registration, environment, screenshots, and tests. A successful provider return authenticates one external issuer/subject binding to one root Local Missions user. Email, including Apple private relay, is contact/recovery data and never auto-links, merges, changes a root identity, or grants Creator/Business access. The API derives current roles and Business workspaces from PostgreSQL after token verification.

## Secret-free environment contract

The checked-in `.env.example` files contain names and public identifiers/endpoints only. They contain no value. The external activation record supplies environment-specific values through approved deployment configuration.

Mobile public configuration:

- `EXPO_PUBLIC_ENTRA_AUTHORIZATION_ENDPOINT`
- `EXPO_PUBLIC_ENTRA_TOKEN_ENDPOINT`
- `EXPO_PUBLIC_ENTRA_ISSUER`
- `EXPO_PUBLIC_ENTRA_JWKS_URI`
- `EXPO_PUBLIC_ENTRA_CLIENT_ID`
- `EXPO_PUBLIC_ENTRA_REDIRECT_URI` — must equal `localmissions://auth/callback`
- `EXPO_PUBLIC_ENTRA_SCOPE` — must contain unique `openid profile offline_access api://<API_CLIENT_ID>/access_as_user`

API identifier configuration:

- `ENTRA_TENANT_ID`
- `ENTRA_API_AUDIENCE`
- `ENTRA_ISSUER`
- `ENTRA_JWKS_URI`
- `ENTRA_REQUIRED_SCOPE` — must equal `access_as_user`

Never add a mobile client secret, Apple/Google/Microsoft provider secret, private key, refresh credential, authorization code, token, tenant-specific value, or real email to the repository, Expo public variables, screenshots, evidence, logs, Terraform state, or chat. Provider credentials are entered directly into the approved external control plane by an authorized owner; server credentials, if later required, enter only through the approved secret store.

## Reviewed transport boundaries

1. Authorization uses only the system browser and HTTPS authorization endpoint. It sends authorization code + S256 PKCE, state, nonce, exact callback, and required scopes. Embedded provider password fields are prohibited.
2. The mobile token exchange is still unavailable. Its future implementation must POST `application/x-www-form-urlencoded` to the exact configured HTTPS token endpoint, include the authorization code, mobile client ID, exact redirect, and PKCE verifier, send no client secret, reject redirects, bound time/response size, and map all failures to a generic result without logging request or response bodies.
3. Mobile ID-token verification is locally proven with trusted keys but external JWKS transport is still unavailable. The future resolver must use only the configured same-origin HTTPS JWKS URI, reject redirects and header-supplied key locations, bound caching/time/response size, and preserve key-rotation behavior.
4. API access-token verification already requires an exact HTTPS v2 issuer, same-origin JWKS URI, tenant UUID, API audience UUID, and `access_as_user`. Remote resolution is bounded to a three-second timeout, ten-minute cache, and thirty-second refresh cooldown; redirect following and token/header-provided key locations are rejected. Network JWKS evidence remains unclaimed.
5. A token establishes only verified issuer/subject evidence. The server re-reads active identity, root account, session, Creator profile, Business membership, and workspace state for authorization. The phone's selected mode and token-carried roles/emails are untrusted.

## Provider test matrix

| Case                                                         | Local evidence                                  | External/device evidence still required           |
| ------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------- |
| Apple success, consent, cancellation, denial                 | Callback bounds and generic cancel/error states | Hosted-flow consent and real provider round trips |
| Google success, consent, cancellation, denial                | Callback bounds and generic cancel/error states | Hosted-flow consent and real provider round trips |
| Microsoft success, consent, cancellation, denial             | Callback bounds and generic cancel/error states | Hosted-flow consent and real provider round trips |
| Email code success, expiry, single use                       | Not simulated as provider proof                 | Test-tenant code lifecycle                        |
| Email resend throttle                                        | Not simulated as provider proof                 | Test-tenant throttle and safe UI behavior         |
| Disabled provider                                            | Fail-closed unavailable runtime                 | Disabled-provider hosted-flow behavior            |
| Wrong, malformed, expired, replayed, or failed native return | Local callback/transaction tests pass           | Native system-browser and deep-link confirmation  |
| Matching, changed, or Apple private-relay email              | Local no-auto-merge/linking rules pass          | Test-tenant provider binding confirmation         |
| Cold start, refresh, logout, and local cache purge           | Local orchestration/SecureStore boundary passes | Real refresh/revocation and physical-device proof |

External evidence must use approved test identities and redact email, token, tenant/client IDs, codes, trace/correlation values, and provider credentials. A synthetic test cannot close a provider or physical-device row.

## Separate approval points

Stop at each gate; one approval never authorizes the next mutation.

1. Founder, identity owner, and technical owner approve tenant ownership, environment separation, recovery owners, and MFA/offboarding.
2. Identity and technical owners explicitly approve tenant/app/API registration mutations and the exact recorded identifiers/redirects/scopes.
3. Identity plus legal/privacy owners approve provider terms, data handling, and direct credential entry outside the repository.
4. Security and technical owners review configuration diffs and explicitly approve test-environment activation. A partial or unsafe configuration must fail startup/sign-in.
5. Privacy and test owners approve real test identities and the redacted evidence procedure before any provider round trip.
6. The user schedules the deferred physical-iPhone system-browser/deep-link matrix. Simulator or browser preview cannot satisfy it.
7. Founder, identity, security, and privacy owners separately approve production activation after the complete M4 matrix passes.

## Activation and rollback checklist

- Record environment and named owners outside source control; confirm no personal identifier or credential is copied into evidence.
- Compare the external registration export manually with the machine-readable contract and exact callback/scope values.
- Run `pnpm external-auth:check`, focused mobile/API auth tests, `pnpm verify`, security scan, and Gitleaks under the pinned toolchain.
- Activate only the approved nonproduction environment. Confirm absent/partial/wrong-host/wrong-scope settings still fail closed.
- Execute provider cases one at a time with redacted evidence; disable the environment if routing, consent, token, key, callback, role, session, or logout behavior differs from the contract.
- Rollback means disabling the affected hosted flow/provider and removing the deployment configuration reference. Do not delete identity bindings, sessions, audit history, missions, memberships, rewards, refunds, or provider records to conceal a failure.

This local checkpoint claims only a reviewed, machine-validated handoff. Entra tenant/app/API registration, provider enablement, provider/JWKS network contact, real identities, production authentication, and physical-iPhone execution remain open M4 gates.
