# M04 authentication and account lifecycle evidence

Status: M4 in progress; local checkpoints through the consolidated authorization matrix passed

Date: 2026-08-28

Checkpoints: `M04-account-lifecycle-local-001`, `M04-account-read-ui-local-002a`, `M04-account-mutations-local-002b`, `M04-mobile-auth-session-local-003`, `M04-oidc-client-boundary-local-004`, `M04-entra-verifier-local-005`, `M04-external-principal-mapping-local-006`, `M04-mobile-code-exchange-local-007`, `M04-server-session-bootstrap-local-008`, `M04-mobile-auth-orchestration-local-009`, `M04-external-auth-configuration-gate-local-010`, `M04-mobile-auth-transport-local-011`, `M04-authorization-matrix-audit-local-012`

Environment baseline: Node 24.19.0 and pnpm 11.24.0. The mutation continuation used pnpm 11.24.0 with shell Node 25.9.0 and an engine warning. PostgreSQL 17 Alpine ran on loopback Docker.

## Implemented

- Added append-only migration `0018_tiresome_wallflower.sql`, bringing the local schema to 96 tables and the reviewed manifest to 19 migrations.
- Upgraded external identity bindings with active/revoked state, optimistic versions, immutable provider subject/ownership, append-only status history, and no hard deletion.
- Added account sessions bound to the exact active user/provider identity, plus five-minute single-use recent-auth grants bounded to ten minutes by PostgreSQL.
- Added secure provider linking and unlinking. Legacy direct linking is blocked once the M4 schema exists. Linking requires a current same-user session and a purpose-specific recent-auth grant. Unlinking requires another active verified method and revokes every session created through the removed identity.
- Added transactionally generated `security_alert` events using the existing database fan-out to one pending outbox record, immutable initial outbox history, and one recipient-scoped in-app notification.
- Added controlled total-lockout recovery holds covering funding, payout-destination changes, identity-provider changes, and account deletion. Only Trust and Safety/Admin staff can place or release a hold, and release requires a different authorized staff user.
- Added export and deletion request records with immutable history. Deletion requires recent authentication and no active recovery hold; requesting deletion marks the root account `deletion_requested` but does not delete domain, audit, ledger, reward, refund, or membership history.

## Verification

Five focused real-PostgreSQL tests pass:

1. Latest-schema/privacy inspection and rejection of the legacy provider-link path.
2. Fresh single-use link proof with same-transaction binding history, audit, outbox, and inbox evidence.
3. Last-method rejection and a concurrent two-method unlink race with exactly one winner and one active method remaining.
4. Recovery-hold enforcement and dual-controlled release.
5. Export/deletion request behavior, recent-auth enforcement, root status change, and immutable account history.

The full regression passes 97 database integration tests and 14 API integration tests. `pnpm verify` passes with 35 mobile tests and all nine builds. `db:check` verifies 96 tables; the 19-entry migration manifest and Drizzle journal pass; the security scan passes 397 text files; and Gitleaks finds no leak in approximately 13.78 MB.

JUnit evidence: [`test-results/account-lifecycle-junit.xml`](./test-results/account-lifecycle-junit.xml)

## Boundaries

This checkpoint proves local server-side lifecycle rules with synthetic identities. It does not create Entra app registrations, validate a real external token, send a provider notification, store a provider token, perform a real account deletion/export, or complete a phone/browser round trip. Production bearer verification remains fail-closed. Those external and device proofs remain open M4 gates.

## Authenticated account read and Creator UI

- Added authenticated `GET /v1/account`. The bearer identity is resolved to the current active root user and selected role in PostgreSQL before any account row is read.
- The response contains only active provider names/verification times, active session public IDs/times, recent account-request state, and whether a sensitive recovery hold is active. It excludes provider issuer/subject, email, street/locality proof, bank, payout, tax, and provider-token data.
- Disabled and deletion-requested root users are rejected at the shared bearer boundary. A synthetic decoy user's provider is excluded from the signed-in account response.
- Regenerated production/local OpenAPI and the typed client, then added an explicit `local-preview`/`api` mobile account adapter.
- Updated the generated-image-aligned Creator Account & Safety UI with connected sign-in methods, active-session state, data-source labeling, and conditional recovery-hold messaging. The provider action is disabled in local preview and makes no external call.

Nine focused domain API tests pass with zero failures. The full API integration gate passes 16 tests, all 97 database integration tests pass, and `pnpm verify` passes all nine workspaces with 37 mobile tests and all builds. `db:check` verifies 96 tables; the security scan passes 401 text files; and Gitleaks finds no leak in approximately 13.84 MB.

JUnit evidence: [`test-results/account-read-api-junit.xml`](./test-results/account-read-api-junit.xml)

The repository pins Node 24.19.x. This continuation used pnpm 11.24.0 through the pinned-version runner while the shell exposed Node 25.9.0, so commands emitted an engine warning even though every gate passed. A later final M4 gate must rerun under the pinned Node runtime.

## Authenticated account mutations and local provider-proof boundary

- Added authenticated identity link/unlink, session logout, and export/deletion request routes. Every internal UUID is resolved from an account-owned public ID or provider under the bearer-resolved user.
- Provider link accepts only a short-lived opaque provider-control proof and a fresh purpose-specific recent-auth grant. The request cannot assert provider, issuer, subject, email, contact, locality, or audience data.
- Production provider proof fails closed. A separate local-only signer issues five-minute one-use proofs only for authenticated synthetic users, is absent from production OpenAPI/routes/build output, and refuses every non-local environment.
- Unlink requires fresh one-use authentication, rejects the last method, observes recovery holds, revokes provider-bound sessions, and retains immutable history/security notices.
- Logout revokes only an active same-user session, records an atomic audit, and rejects cross-user or repeated attempts. The mobile coordinator clears sensitive local state after success and after an unconfirmed remote failure.
- Export requires an active session. Deletion additionally requires recent authentication, records immutable request/history/security evidence, preserves required money/legal history, and immediately rejects later bearer use through `deletion_requested` status.
- The V1 discovery endpoint advertises the authenticated account lifecycle resource, and duplicate public account-request identifiers are converted to the same bounded conflict response as duplicate open requests.
- The explicit mobile adapter never mutates in local preview. The Account & Safety and Account Deletion views now show sign-out, export, deletion-review, recent-auth, and no-persistence states in the same generated-image color/card system.

Six focused account-lifecycle tests and all 98 database integration tests pass. Eleven authenticated-domain tests and all 19 API integration tests pass. `pnpm verify` passes all nine workspaces with 41 mobile tests, deterministic OpenAPI/client reconstruction, and production local-marker exclusion. `db:check` verifies 96 tables; the security scan passes 408 text files; and Gitleaks finds no leak in approximately 14.03 MB.

JUnit evidence: [`test-results/account-mutations-api-junit.xml`](./test-results/account-mutations-api-junit.xml), [`test-results/account-mutations-db-junit.xml`](./test-results/account-mutations-db-junit.xml)

Real Entra verifier/registrations, provider cancellation and email-code flows, PKCE callback execution, and physical-device system-browser/deep-link proof remain open M4 gates.

## Root mobile auth/session context and role switching

- Added one app-root auth/session provider with restoring, anonymous, authenticated, expired, and blocked account states. Expired, disabled, deletion-requested, malformed, and roleless protected state is cleared before private routes can render.
- Added Expo SecureStore `57.0.2` and its config plugin. Native session/refresh material uses a this-device-only, after-first-unlock keychain boundary. The browser/local-preview adapter is memoryless and persists no token, session, role, identity, recent-auth, or cache state.
- Added explicit route and resource rules for Creator, Business, Venue Staff, and root account surfaces. A mode switch changes navigation and invalidates role-scoped caches but cannot create a role not returned by the server.
- Added an obvious generated-image-aligned Creator/Business switcher to the shared shell, a five-minute nonpersistent recent-auth preview on Account & Safety, a safe local-preview entry on both sign-in views, and working logout/local purge.
- Updated account, mission, and Reach hooks to consume the single session source, access token only in memory, and cache epoch rather than independently inventing auth state.

Thirteen focused session/storage/logout tests and all 52 mobile tests pass. `pnpm verify` passes all nine workspaces, including formatting, prerequisites, lint, strict TypeScript, contracts, and builds. Resolved Expo config and web export pass. The security scan passes 414 text files, and Gitleaks finds no leak in approximately 14.08 MB. A visible 390 × 844 browser run switched Creator to Business, activated recent-auth preview, signed out to the public home, and re-entered the Creator preview. The two retained screenshots were visually inspected and show no critical horizontal clipping.

JUnit evidence: [`test-results/mobile-auth-session-junit.xml`](./test-results/mobile-auth-session-junit.xml)

Visual evidence: [`screenshots/mobile-auth-creator-session.png`](./screenshots/mobile-auth-creator-session.png), [`screenshots/mobile-auth-business-mode.png`](./screenshots/mobile-auth-business-mode.png)

No Entra, Azure, Stripe, identity/social provider, phone, payment, message, external account, or real customer data was used. Real PKCE/system-browser/deep-link/provider execution and the physical-device gate remain open.

## Mobile OIDC and PKCE client boundary

- Added a production-fail-closed OIDC configuration parser. It requires a complete HTTPS Entra authorization endpoint, UUID client ID, exact `localmissions://auth/callback` redirect, and unique OpenID/profile/offline/API scopes; absent or partial configuration cannot start authentication.
- Added independent 256-bit verifier, state, and nonce generation, S256 PKCE, a ten-minute transaction, and exact authorization-code request construction. Provider choice is local UI intent and is never sent as a trusted authorization parameter.
- Added serialized one-use callback consumption with exact scheme/host/path checks, an allowlisted query surface, replay/expiry/wrong-state/wrong-redirect/client-provider denial, bounded cancellation/provider-error results, and generic errors that do not expose transaction or provider details.
- Added native SecureStore transaction protection with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. Browser/local preview uses a memory store and never persists a verifier, state, nonce, URL, token, identity, or session.
- Updated Creator and Business sign-in views with a visible request-ready state. The retained 390 × 844 Creator screenshot shows the generated-image-aligned warm/navy/teal UI after Google preparation, explicitly stating that no browser or provider opened.

Ten focused OIDC/storage tests and all 62 mobile tests pass. Mobile lint, strict TypeScript, resolved Expo config, web export, and the complete repository verification pass. The security scan passes 421 text files, and Gitleaks finds no leak in approximately 14.12 MB. The visible flow produced no request to a real or synthetic provider hostname and was visually inspected without critical clipping.

JUnit evidence: [`test-results/oidc-client-boundary-junit.xml`](./test-results/oidc-client-boundary-junit.xml)

Visual evidence: [`screenshots/oidc-pkce-request-ready.png`](./screenshots/oidc-pkce-request-ready.png)

No Entra registration, provider launch, token exchange, JWT validation, Azure resource, Stripe action, phone, payment, message, external account, or real customer data was used. Real provider routing/round trips, system-browser/deep-link execution, server token verification, and the physical-device gate remain open.

## Entra access-token verifier boundary

- Added a production-buildable, fail-closed Entra verifier configuration boundary. It requires one exact HTTPS v2 issuer, same-host discovery JWKS URI, external tenant UUID, API audience UUID, and delegated API scope; absent configuration stays unavailable and partial/unsafe values are rejected.
- Added pinned `jose` 6.2.10 RS256 signature verification with exact issuer, audience, tenant, v2 version, scope, type, key ID, issued-at, not-before, expiration, subject, token-size, and lifetime checks. Header-supplied key URLs/material are rejected.
- Added trusted remote JWKS resolution with a three-second timeout, bounded refresh cooldown, ten-minute cache age, no redirect following, cached reuse, and unknown-key rotation reload.
- The verified result contains only external issuer/subject evidence, tenant, version, and scopes. Token-carried role, email, and profile fields are ignored and cannot become app authorization. External identity mapping, selected Creator/Business mode, and workspace membership remain separate server/database decisions.

Fourteen locally signed fixture tests pass every positive and negative verifier path, including algorithm confusion, wrong signature, attacker key location, cache reuse, rotation, and generic errors with no token/provider detail. API lint, strict TypeScript, production build, and the complete nine-workspace repository verification pass. The security scan passes 424 text files, and Gitleaks finds no leak in approximately 14.14 MB.

JUnit evidence: [`test-results/entra-token-verifier-junit.xml`](./test-results/entra-token-verifier-junit.xml)

No Entra metadata endpoint, provider, external JWKS, Azure resource, token exchange, real identity, phone, payment, message, or customer data was used. Production bearer activation, issuer/subject account mapping, ID-token nonce validation, real provider round trips, and physical-device proof remain open.

## External principal and selected-context mapping

- Connected the production bearer injection boundary to the Entra access-token verifier only when the complete trusted configuration is present. Missing configuration still returns the existing bounded unavailable response; partial or unsafe configuration prevents API startup.
- Kept external token evidence intentionally narrow: only the verified issuer and subject locate an active immutable `external_identities` row. The server then re-reads the active root account, Creator profile, or exact Business membership/workspace from PostgreSQL for every request.
- Added explicit `x-local-missions-role` and `x-local-missions-business` request context. These values are never treated as claims: malformed combinations, invented roles, missing workspaces, cross-tenant workspaces, and membership-role elevation all receive the same bounded access denial.
- Updated the reviewed OpenAPI snapshots, generated TypeScript client, mobile session projection, and account/mission/Reach adapters. Creator mode emits Creator context only; Business mode emits the selected server-resolved workspace and the account's available owner/manager role; contradictory context fails locally before a request.
- Preserved privacy-safe logs. Bearer tokens, role headers, and workspace values are excluded from structured request logs.

Twenty-one focused database-backed domain tests and all twenty-nine API integration tests pass. The same external evidence maps to Creator or Business only after current database authorization; unknown and revoked identities share one authentication response; disabled accounts and memberships take effect on the next request; and a newly revoked identity immediately stops the same token. All 64 mobile tests pass, including deterministic OIDC clock handling and the new role/workspace header contract. `pnpm verify` passes all nine workspaces and production marker checks; `db:check` verifies 96 tables; the security scan passes 426 text files; and Gitleaks finds no leak in approximately 14.21 MB.

JUnit evidence: [`test-results/external-principal-mapping-junit.xml`](./test-results/external-principal-mapping-junit.xml), [`test-results/external-context-mobile-junit.xml`](./test-results/external-context-mobile-junit.xml)

No Entra metadata/provider endpoint, real token, Azure resource, Stripe action, physical phone, payment, message, external account, or customer data was used. Real authorization-code exchange, ID-token nonce validation, refresh/revocation behavior, provider round trips, network JWKS proof, system-browser/deep-link execution, and the physical-device gate remain open.

The disposable Creator App PostgreSQL container, volume, and Compose network were destroyed after verification. The unrelated Post Proof database container was left running and unchanged.

## Mobile authorization-code exchange and refresh boundary

- Added a fail-closed mobile token-endpoint interface. Its default implementation cannot exchange or refresh anything; real provider configuration and transport remain a later external gate.
- Added pinned `jose` RS256 ID-token verification with exact issuer, mobile client audience, trusted key resolver, type, key ID, issued-at, expiry, subject, maximum age, and expected nonce. Header-supplied key locations/material are rejected. Locally signed fixtures prove the cryptographic path without contacting Entra or another provider.
- Bound the consumed callback's one-use authorization code, PKCE verifier, and expected nonce to the exchange. Cancellation and bounded provider errors return before token exchange; replay, wrong code/verifier, wrong nonce, and expired signed tokens fail generically without exposing token/provider details.
- Added an explicit server-session bootstrap boundary. ID-token email, profile, and an injected platform-administrator role are discarded; Creator/Business roles, workspace, provider, user, and Local Missions session metadata come only from the server projection.
- Access tokens remain runtime memory only. Rotated refresh credentials and non-secret session metadata are written atomically through the existing native SecureStore boundary; browser preview remains memoryless. Restored protected state now rejects unknown/duplicate roles, contradictory workspace roles, malformed public IDs, and malformed refresh material.
- Existing logout coordination confirms server session revocation when available and clears protected local state even when remote revocation cannot be confirmed.

Nine focused exchange/refresh tests and fifteen retained exchange/storage/logout tests pass. All 74 mobile tests, mobile lint, strict TypeScript, Expo web export with `jose` 6.2.10, and the complete nine-workspace `pnpm verify` gate pass. The security scan passes 429 text files, and Gitleaks finds no leak in approximately 14.25 MB.

JUnit evidence: [`test-results/mobile-code-exchange-junit.xml`](./test-results/mobile-code-exchange-junit.xml)

No authorization code, token, refresh credential, Entra/provider endpoint, external JWKS, real identity, Azure resource, Stripe action, physical phone, payment, message, external account, or customer data was used. A real HTTPS token transport, server bootstrap/refresh endpoint, session-bound bearer enforcement, network-key proof, system-browser return, and provider round trips remain open.

## Identity-bound server session bootstrap and refresh

- Added production-buildable bootstrap and refresh routes that accept only verified external bearer evidence. Missing Entra configuration remains unavailable, and local synthetic role tokens cannot bootstrap a production-style session.
- The mobile boundary generates a 256-bit opaque `ses_` public ID. PostgreSQL creates or idempotently reuses one session only when the public ID, active root user, and active external identity all match. Cross-user/cross-identity collisions, revoked sessions, and expired sessions are denied without revival or enumeration.
- Bootstrap returns only active account status, the provider label, current Creator/Business roles, and safe Business workspace name/public-ID/owner-or-manager projections. Provider subject, issuer, token, email, address, bank, payment, and private locality evidence are absent.
- Every later external request requires the provider bearer token plus `x-local-missions-session`. The server rechecks the same active identity/session/user tuple and then current Creator profile or exact Business membership/workspace, so logout, session expiry, identity unlink/revocation, account disablement, and membership removal take effect on the next request.
- Regenerated production/local OpenAPI snapshots and the shared client. Mobile bootstrap/refresh, account, mission, Reach, and logout adapters now carry the server-bound session while access tokens remain runtime-memory-only.

Pinned Node 24.19.0 and pnpm 11.24.0 passed the full nine-workspace verification. All 99 database integration tests and 33 API integration tests passed; focused JUnit evidence retained 25 API, seven account-lifecycle PostgreSQL, and 32 mobile tests with zero failures/errors. All 77 mobile tests passed. The deterministic seed and 96-table database check passed, the final local security scan passed 435 text files, and Gitleaks found no leak in approximately 14.39 MB.

JUnit evidence: [`test-results/server-session-bootstrap-api-junit.xml`](./test-results/server-session-bootstrap-api-junit.xml), [`test-results/server-session-bootstrap-db-junit.xml`](./test-results/server-session-bootstrap-db-junit.xml), [`test-results/server-session-bootstrap-mobile-junit.xml`](./test-results/server-session-bootstrap-mobile-junit.xml)

The app remained visible at 390 × 844 on the generated-image-aligned Business dashboard. The disposable Creator App PostgreSQL container, volume, and Compose network were destroyed; the unrelated Post Proof database remained running on its separate port. No Entra/provider endpoint, external JWKS, authorization code, real token, real identity, Azure resource, Stripe action, phone, payment, message, external account, or customer data was used. Real provider registration/round trips, system-browser/deep-link execution, multi-workspace choice, network-key proof, and the physical-device gate remain open.

## Mobile authentication orchestration and Business workspace selection

- Connected the sign-in UI to one mobile orchestration boundary covering OIDC request creation, protected one-use transaction storage, system-browser return handling, authorization-code exchange, ID-token verification, server-session bootstrap, protected refresh, and logout state. The installed runtime stays deliberately unavailable until reviewed external provider configuration and transport are supplied, so API mode fails before opening a browser or making a token request.
- Added explicit preparing, waiting-for-browser, exchanging, cancelled, bounded error, retry, request-ready, workspace-required, and authenticated states. A per-orchestrator attempt lock ignores duplicate provider taps while one browser attempt is active.
- Multi-workspace sessions now preserve every server-returned Business name/public ID/owner-or-manager role. Accounts with more than one workspace no longer silently select the first; Business API context remains unavailable until the user chooses an authorized workspace, and the choice is protected with the rest of the session metadata.
- Updated the generated-image-aligned Creator and Business sign-in views with progress/error cards, retry controls, and an explicit Business chooser. The Business dashboard greeting now reflects the selected workspace instead of a hard-coded demo name.
- Local preview remains memory-only. Provider buttons create only a synthetic PKCE/state/nonce request-ready state, and the Business preview uses synthetic workspaces. The visible 390 × 844 run kept the same localhost tab after Creator Apple preparation, opened no provider tab, displayed both Business workspace choices, and showed `Good morning, Lake Eola Cafe` after selecting the manager workspace.

Thirty-three retained orchestration/session/storage/exchange/adapter tests and all 84 mobile tests pass. Pinned Node 24.19.0 and pnpm 11.24.0 passed formatting, prerequisites, lint, strict type checks, all repository unit tests, contract checks, production marker checks, and all nine builds. The security scan passes 439 text files, and Gitleaks finds no leak in approximately 14.44 MB.

JUnit evidence: [`test-results/mobile-auth-orchestration-junit.xml`](./test-results/mobile-auth-orchestration-junit.xml)

No Entra/provider endpoint, external JWKS, authorization code, real token, refresh credential, real identity, Azure resource, Stripe action, physical phone, payment, message, external account, or customer data was used. Real tenant/app/API registration, reviewed HTTPS token transport, network JWKS proof, provider consent/cancellation/email-code round trips, native system-browser/deep-link execution, and the physical-device M4 gate remain open.

## External authentication configuration gate

- Added a versioned machine-readable contract for the mobile public client, customer API resource, and deferred participant web client. It fixes the native callback, PKCE grant, API delegated scope, separate environment requirement, V1 provider set, and explicit approval ownership without recording a tenant/client ID or credential.
- Added a stepwise operational runbook covering registration inputs, Apple/Google/Microsoft/passwordless-email hosted-flow mappings before role selection, secret entry boundaries, HTTPS authorization/token/JWKS transport review, provider and email-code cases, redaction, rollback, and seven approval stops.
- Reconciled both `.env.example` files with the actual mobile/API parsers. The mobile OIDC parser now requires complete same-origin HTTPS authorization/token/issuer/JWKS endpoints on one tenant path, a UUID public client, the exact `localmissions://auth/callback`, and exactly `openid profile offline_access api://<API_CLIENT_ID>/access_as_user`. Partial, wrong-origin, cross-tenant-path, wrong-callback, malformed-client, or malformed-scope configuration fails closed.
- Added `pnpm external-auth:check` to `pnpm verify`. The validator keeps the manifest, runbook, checked-in examples, and source parsers synchronized; forbids mobile/provider secret fields; requires every external test and approval to remain unpassed; and requires the physical-iPhone row to stay deferred.

Pinned Node 24.19.0 and pnpm 11.24.0 passed 24 focused mobile tests and 14 focused API tests, all 84 mobile tests, formatting, prerequisite/external-auth checks, lint, strict type checks, all repository unit tests, contract checks, production local-marker exclusion, and all nine builds. The security scan passes 444 text files, and Gitleaks finds no leak in approximately 14.49 MB.

JUnit evidence: [`test-results/external-auth-config-mobile-junit.xml`](./test-results/external-auth-config-mobile-junit.xml), [`test-results/external-auth-config-api-junit.xml`](./test-results/external-auth-config-api-junit.xml)

Contract evidence: [`../../../config/external-auth-gate.v1.json`](../../../config/external-auth-gate.v1.json), [`../../operations/external-auth-configuration-gate.md`](../../operations/external-auth-configuration-gate.md)

No Entra tenant/app/API registration, provider credential, provider/JWKS network request, authorization code, token, refresh credential, real identity, Azure resource, Stripe action, physical phone, payment, message, external account, or customer data was used. The installed token transport remains unavailable. External registration/activation, network-key proof, provider consent/cancellation/email-code round trips, native system-browser/deep-link execution, final authorization matrix, and the physical-device M4 gate remain open.

## Mobile HTTPS token and JWKS transport

- Added a production-buildable token endpoint for authorization-code/PKCE exchange and refresh. It revalidates exact same-origin, UUID-tenant HTTPS endpoints; exact client/callback/proof inputs; and posts form-encoded public-client fields without a client secret, cookies, ambient credentials, or referrer data.
- Added manual redirect/followed-redirect denial, a ten-second token timeout, 64 KiB streamed response cap, exact JSON content type, strict token-set shape/lifetime limits, required initial ID/refresh tokens, optional refresh rotation, and failure-specific but detail-free exchange/refresh errors.
- Added a mobile JWKS resolver with exact-URL credential-free GET, manual redirect denial, three-second timeout, 64 KiB/twenty-key limits, ten-minute in-memory cache, thirty-second cooldown, and unknown-key rotation reload. Existing RS256/issuer/audience/nonce/header checks remain authoritative after key resolution.
- Strengthened OIDC endpoint parsing to reject localhost, IP literals, non-UUID tenant paths, mixed tenant paths, and mixed origins. Updated the external-auth manifest/runbook/validator while preserving `planned_not_activated`; the validator proves the installed runtime imports neither concrete adapter and still uses the unavailable token endpoint.
- Added one complete fixture-backed path from concrete token response through concrete JWKS fetch, signed ID-token nonce verification, server bootstrap, and protected mobile session. The stored projection contains neither access token nor ID token.

Twenty-seven focused transport tests and all 111 mobile tests pass. Pinned Node 24.19.0 and pnpm 11.24.0 passed formatting, prerequisite/external-auth checks, lint, strict type checks, all repository unit tests, contract checks, production local-marker exclusion, and all nine builds. The security scan passes 447 text files, and Gitleaks finds no leak in approximately 14.53 MB.

JUnit evidence: [`test-results/mobile-auth-transport-junit.xml`](./test-results/mobile-auth-transport-junit.xml)

No Entra tenant/app/API registration, provider credential, provider/JWKS network request, authorization code, real token, refresh credential, real identity, Azure resource, Stripe action, physical phone, payment, message, external account, or customer data was used. The production transport exists but the installed runtime remains unavailable. External registration/activation, real network-key proof, provider consent/cancellation/email-code round trips, native system-browser/deep-link execution, final authorization matrix, and the physical-device M4 gate remain open.

## Consolidated local authorization matrix

- Added a production PostgreSQL authorization policy that derives the current root-user state, platform role, Creator ownership, Business membership, Venue Staff assignment, and Finance authority from the database on every decision. Caller-shaped role data cannot grant authority, and cross-owner or cross-tenant reads are concealed with the same bounded not-found response.
- Added a distinct `support_agent` platform role and a privacy-minimized dispute projection. Support can investigate status, reason, date, and public identifiers but cannot perform financial mutations. Finance authority remains a separate exact active role.
- Added reason-bounded Admin overrides with one high-priority audit event. Migration `0019_ambiguous_kate_bishop.sql` makes `audit_events` append-only at the database boundary, and the N-1 failure/recovery test proves the new enum value and trigger roll forward atomically.
- Tightened identity lifecycle concurrency. One provider subject racing across two populated accounts creates one binding without merging either root. Same-grant replay and concurrent unlink preserve one active method, and successful unlink emits audit and security-notification evidence.
- Tightened total-lockout recovery. Placing a recovery hold revokes active sessions, blocks new sessions and sensitive funding, payout-destination, provider, and deletion actions, emits a security notification, and requires a different authorized staff user to release it.
- Added a machine-validated 12-row matrix covering anonymous access, Creator ownership, Business isolation, Venue Staff scope, Support/Finance separation, Admin audit, disabled-state propagation, untrusted caller roles, email-independent identity binding, provider-subject collision, dual-control linking, and unlink/recovery behavior.

Focused JUnit evidence retains 15 PostgreSQL tests and 30 API tests with zero failures or errors. The full database regression passes 107 tests across 16 files, and the full API regression passes 38 tests across two files. A fresh disposable PostgreSQL volume migrated and seeded successfully, `db:check` verified 96 tables, and the reviewed manifest verified 20 migration hashes. Pinned Node 24.19.0 and pnpm 11.24.0 passed `pnpm authorization:check` with all 12 local rows and all five external/native gates still open, plus the complete repository verification. The final security scan passed 456 text files, and Gitleaks found no leaks in approximately 15.18 MB.

Matrix evidence: [`authorization-matrix.md`](./authorization-matrix.md), [`test-results/authorization-matrix-db-junit.xml`](./test-results/authorization-matrix-db-junit.xml), [`test-results/authorization-matrix-api-junit.xml`](./test-results/authorization-matrix-api-junit.xml)

This is a local authorization checkpoint, not final M4 completion. Entra registrations and activation, real issuer/audience/network-key proof, Apple/Google/Microsoft/passwordless-email provider round trips, native system-browser/deep-link execution, and physical-iPhone verification remain open. No provider endpoint, real identity, Azure resource, Stripe action, or phone was used. The disposable Creator App PostgreSQL container, volume, and Compose network were destroyed after verification.
