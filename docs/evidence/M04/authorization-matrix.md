# M04 local authorization matrix

Checkpoint: `M04-authorization-matrix-audit-local-012`

Date: 2026-08-28

Status: 12 of 12 local authorization rows proven with synthetic fixtures and ephemeral Creator App PostgreSQL. External identity-provider and native-device completion is not claimed.

The machine-readable source of truth is [`../../../config/authorization-matrix.v1.json`](../../../config/authorization-matrix.v1.json). `pnpm authorization:check` keeps each row tied to retained source and test evidence.

| Authorization row                          | Locally proven outcome                                                                                                                                                                                                                                  | Primary retained evidence                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous private data                     | Anonymous requests cannot read account, Creator mission/application/submission, or Business campaign/Reach data.                                                                                                                                        | `apps/api/src/domain-api.integration.test.ts`; `packages/db/src/authorization-policy-store.integration.test.ts`                                                                  |
| Creator-owned applications and submissions | A current Creator can read only applications and submissions owned by that Creator; another Creator's resource is concealed.                                                                                                                            | `packages/db/src/authorization-policy-store.ts`; `packages/db/src/authorization-policy-store.integration.test.ts`                                                                |
| Business tenant isolation                  | Current database membership is required, and one Business cannot read or mutate another Business's campaign resources.                                                                                                                                  | `apps/api/src/domain-api.integration.test.ts`; `packages/db/src/authorization-policy-store.integration.test.ts`; `packages/db/src/tenant-store.integration.test.ts`              |
| Venue Staff assignment scope               | Venue Staff can read only an active assigned location/date window and receives no street address, private reward, billing, or platform data.                                                                                                            | `packages/db/src/authorization-policy-store.ts`; `packages/db/src/authorization-policy-store.integration.test.ts`; `packages/db/src/check-in-store.integration.test.ts`          |
| Support and Finance separation             | Support receives a bounded dispute projection but cannot mutate financial state; the exact active Finance role is required.                                                                                                                             | `packages/db/src/authorization-policy-store.ts`; `packages/db/src/authorization-policy-store.integration.test.ts`; `packages/db/src/ledger-store.integration.test.ts`            |
| Admin reason and audit                     | An active Admin override requires a 20-to-500-character reason and creates one high-priority append-only audit event. PostgreSQL rejects update or deletion of that event.                                                                              | `packages/db/src/authorization-policy-store.integration.test.ts`; `packages/db/src/migration-recovery.integration.test.ts`; `packages/db/drizzle/0019_ambiguous_kate_bishop.sql` |
| Disabled-user propagation                  | Disabling a root user is effective on the next authorization check; no stale caller-shaped role restores access.                                                                                                                                        | `apps/api/src/domain-api.integration.test.ts`; `packages/db/src/authorization-policy-store.integration.test.ts`                                                                  |
| Untrusted client role                      | Client mode, headers, token-carried role, and email fields cannot create server authority; roles and memberships are reread from PostgreSQL.                                                                                                            | `apps/api/src/domain-api.service.ts`; `apps/api/src/domain-api.integration.test.ts`; `packages/db/src/authorization-policy-store.ts`                                             |
| Email-independent identity binding         | Identity ownership remains the immutable issuer-subject binding. Matching, changed, or private-relay email values cannot merge or move an account.                                                                                                      | `packages/db/src/schema.ts`; `packages/db/src/tenant-store.integration.test.ts`; `packages/contracts/src/index.ts`                                                               |
| Concurrent provider-subject collision      | Two accounts racing to link one provider subject produce one binding, preserve both root accounts, and create no partial merge.                                                                                                                         | `packages/db/src/account-lifecycle-store.integration.test.ts`; `packages/db/src/tenant-store.integration.test.ts`                                                                |
| Dual-control link proof and audit          | Linking requires a current-account recent-auth grant and separate proof of control of the new provider. Success and collision failure are audited and notified without account enumeration.                                                             | `apps/api/src/domain-api.integration.test.ts`; `packages/db/src/account-lifecycle-store.ts`; `packages/db/src/account-lifecycle-store.integration.test.ts`                       |
| Last method, replay, unlink, and recovery  | Replayed or concurrent unlink cannot remove the last verified method; a successful unlink notifies the owner. A recovery hold revokes sessions, blocks sensitive money/account actions, and requires a different authorized staff member to release it. | `packages/db/src/account-lifecycle-store.ts`; `packages/db/src/account-lifecycle-store.integration.test.ts`                                                                      |

## Retained test results

- [`test-results/authorization-matrix-db-junit.xml`](./test-results/authorization-matrix-db-junit.xml): 15 focused PostgreSQL policy and account-lifecycle tests, zero failures or errors.
- [`test-results/authorization-matrix-api-junit.xml`](./test-results/authorization-matrix-api-junit.xml): 30 focused API authorization tests, zero failures or errors.
- Full database integration regression: 107 tests across 16 files.
- Full API integration regression: 38 tests across two files.

## Open M4 gates

The following are deliberately not represented as passed by local fixtures:

1. Entra tenant, mobile-client, and API registrations.
2. Runtime activation and real issuer, audience, and network-key proof.
3. Apple, Google, Microsoft, and passwordless-email external round trips.
4. Native system-browser and deep-link execution.
5. Physical-iPhone M4 verification.

No Entra/provider endpoint, real identity, Azure resource, Stripe action, or physical phone was used for this checkpoint. The installed external-auth runtime remains unavailable.
