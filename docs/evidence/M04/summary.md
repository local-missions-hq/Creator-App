# M04 authentication and account lifecycle evidence

Status: M4 in progress; phone-free account lifecycle, authenticated read/UI, and mutation checkpoints passed

Date: 2026-08-28

Checkpoints: `M04-account-lifecycle-local-001`, `M04-account-read-ui-local-002a`, `M04-account-mutations-local-002b`

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

The native SecureStore-backed mobile session implementation, real Entra verifier/registrations, provider cancellation and email-code flows, complete role/resource authorization matrix, and physical-device system-browser/deep-link execution remain open M4 gates.
