# M03 shared identity and tenant checkpoint

Checkpoint: `M03-shared-identity-tenant-002`
Date: 2026-08-27
Result: Passed; M3 overall remains open

## Boundary implemented

- `users` is the shared root account. Creator and Business modes attach to this root instead of creating separate logins.
- `external_identities` stores only the approved provider type and its opaque issuer/subject binding. Unique issuer/subject prevents one provider account from controlling two Local Missions users; unique user/provider prevents accidental same-provider duplicates.
- `creator_profiles` stores status, private verified postal area, annual verification dates, and payout-onboarding state. It does not expose a business-facing query.
- `business_memberships` scopes owner, manager, and Venue Staff roles to one business. Business management queries require active owner/manager membership.
- `business_locations` stores the business venue address needed for campaign operations. This is separate from creator locality evidence.

## Real PostgreSQL proof

1. Applied migration `0000_giant_snowbird.sql` to an empty database.
2. Inserted a pre-upgrade synthetic business and `$575.00` campaign.
3. Applied forward migration `0001_empty_tyrannus.sql`.
4. Queried and matched the original business name, campaign title, and exact Total Due after migration.
5. Confirmed all ten expected tables and confirmed `users`/`external_identities` have no email column.
6. Raced two new root users for one provider issuer/subject; exactly one committed, leaving one user, one identity, and one audit event.
7. Linked a second provider, then proved another binding for that same provider fails with `USER_IDENTITY_PROVIDER_ALREADY_LINKED` and no partial audit row.
8. Proved verified locality requires a private five-digit postal area plus valid verification/expiry dates.
9. Created two owners and businesses. Owner A received `BUSINESS_ACCESS_DENIED` when creating, reading, transitioning, or replaying Business B's campaign and when reading or creating Business B locations; Owner B retained access.

Retained result: [`test-results/tenant-store-junit.xml`](./test-results/tenant-store-junit.xml), with the machine hostname replaced by `local-development-host` before retention.

## Safety boundary

All values are synthetic. No real provider, email address, creator address, bank detail, location event, Azure resource, Stripe object, notification, or external record was created. Application-level tenant checks are proven for this repository slice; broader row-level-security evaluation and full authorization remain later gates.
