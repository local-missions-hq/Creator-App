# Content rights and fixed-license state machine

Status: passed as checkpoint `M03-content-rights-009`  
Date: 2026-08-27

## Scope proved

This checkpoint persists the exact Creator terms, sponsorship-disclosure version, mission brief, rights offer, compensation, and four explicit acknowledgements accepted by the assigned Creator before check-in. Legal document records retain a SHA-256 body hash rather than duplicating legal text in transactional rows.

Every completed full-payout mission receives the included nonexclusive 90-day organic license for accepted assets on Business-owned social channels. A selected 12-month Business-owned social, website, and email license adds 50% of the base Creator reward. A selected 30-day paid-advertising license adds 100% of the base Creator reward. Those fixed add-ons are part of the Creator Reward Pool before the disclosed 15% platform fee.

Activation requires the exact accepted contract, final objective approval, completed assignment/application/slot, published campaign, at least one accepted verified media asset, and the full Creator-payable financial obligation. Canceled, incomplete, unpaid, or final no-payout/refund-obligation work creates no license. Activation records fixed covered assets, exact channels, compensation component, permitted edits, start, expiry, and immutable status history without calling Stripe, sending a message, or moving money.

## Rights boundaries

- Permitted edits are limited to crop, resize, caption, logo placement, and minor formatting without misrepresentation.
- The included license covers only Business-owned social channels for 90 days.
- The 12-month add-on covers Business-owned social, website, and email channels.
- The 30-day paid add-on covers paid advertising only.
- The model grants no ownership transfer, exclusivity, resale, third-party sublicensing, AI training, synthetic media, or face/voice cloning rights.
- Expiration is a one-way server-time transition with immutable history. Re-running activation after expiry returns the same expired license set and never renews or backdates it.

## Database protections

- Seven new tables separate legal document versions, slot-level rights offers, Creator contract acceptance, licenses, licensed assets, licensed channels, and license status history.
- Legal documents, offers, acceptances, asset/channel mappings, and license history reject update or deletion at the database layer.
- Database triggers independently verify draft-campaign offer scope, exact Creator/assignment acceptance, completed full-payout activation, fixed economics, permitted edits, exact channel sets, covered accepted assets, valid terms, and matching status history.
- A second migration separates Reach bonuses from contract add-on bonuses. Community Slots may receive transparent rights compensation without becoming follower-gated Reach Slots, while the total slot reward still reconciles exactly.
- Existing Reach rows are safely backfilled during the forward migration, and the application supports the expand phase while upgrading from the prior slot schema.

## Real PostgreSQL proof

Six integration tests passed against PostgreSQL 17:

1. Forward migration preserved prior data, installed the rights schema, restricted document publication to an active platform admin, retained only document hashes, and rejected mutation.
2. Fixed 50% and 100% rights bonuses reconciled to the slot contract; only the exact assigned Creator could accept; a duplicate-acceptance race produced one winner.
3. Incomplete, unpaid, canceled, and final no-payout/refund-obligation workflows produced zero licenses.
4. Two simultaneous activation attempts produced the same single three-license set with exact compensation, channels, and accepted assets; cross-Business access and row mutation failed; payment state did not change.
5. A final approval without accepted verified content produced no license.
6. Server-time expiry wrote matching immutable history, blocked continued use, and did not auto-renew.

The combined M3 database suite passes 58 tests across nine transactional slices. Evidence report: [`test-results/rights-store-junit.xml`](./test-results/rights-store-junit.xml). Migrations: [`../../../packages/db/drizzle/0008_fair_sheva_callister.sql`](../../../packages/db/drizzle/0008_fair_sheva_callister.sql) and [`../../../packages/db/drizzle/0009_nifty_scorpion.sql`](../../../packages/db/drizzle/0009_nifty_scorpion.sql).

## Deliberate later work

Creator-opt-in renewal acceptance and funding state are now implemented and proved separately in [`content-rights-renewal.md`](./content-rights-renewal.md). Suspension and revocation operations, delivered expiry notifications, rendered legal-document storage, API routes, live Stripe execution, provider status convergence, chargebacks, payout transfer execution, and actual paid-media channel integrations remain later work. These checkpoints record enforceable internal rights state only; they do not claim that external platforms or businesses complied with the recorded license.
