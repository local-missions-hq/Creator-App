# M04 authentication and account lifecycle evidence

Status: M4 in progress; phone-free local account-lifecycle checkpoint passed

Date: 2026-08-27

Checkpoint: `M04-account-lifecycle-local-001`

Environment: Node 24.19.0, pnpm 11.24.0, PostgreSQL 17 Alpine on loopback Docker

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
