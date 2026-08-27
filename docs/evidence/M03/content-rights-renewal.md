# Content-rights renewal checkpoint

Status: passed  
Date: 2026-08-27  
Checkpoint: `M03-content-rights-renewal-016`  
Implementation commit: `e9d6b55`

## Scope proved

A Business owner or manager may request a renewal only during the final 30 days of an active fixed-term license. The Creator sees the exact Business, accepted assets, covered channels, current expiry, new term, reward, 15% platform fee, and total due before accepting or declining. Declining is terminal for that request and records explicitly that reliability did not change.

Renewal rewards use only the original locked base mission reward: 25% for another 90 days of organic owned-social use, 50% for another 12 months of owned social/website/email use, and 100% for another 30 days of paid advertising. For a $50 original base reward, the respective Business totals are $14.38, $28.75, and $57.50 after the transparent 15% fee.

Creator acceptance grants no additional rights and creates no payable. The Business must separately begin funding, and only authoritative provider-success evidence atomically creates immutable invoice and PaymentIntent references, a new fixed license term, copied accepted asset/channel scope, a funding snapshot, and the full Creator-payable obligation. The new term begins at the later of the exact previous expiry or PostgreSQL server time, so it never backdates or overlaps improperly. Failed or abandoned funding leaves the old expiry unchanged and grants no additional rights.

## Enforcement and audit boundary

- No license renews automatically, and every source term has at most one immutable renewal decision path.
- Exact event replay returns the original funded term; different concurrent funding evidence has exactly one winner.
- Thirty-day, seven-day, and one-day expiry reminder checkpoints are idempotently recorded in the immutable audit timeline for later delivery wiring.
- Before activation, a separately funded future term is visible but unusable.
- After expiry, organic content is marked historical, unboostable, uneditable, and nonreusable. Paid-ad and active website/email placements are marked for removal.
- PostgreSQL triggers protect renewal economics, legal transitions, provider snapshots, payables, assets, channels, and fixed terms from mutation or deletion.

## Real PostgreSQL proof

The rights suite passed 10 tests, including four renewal scenarios:

1. The 30-day window, exact 25%/50%/100% reward calculations, transparent 15% fee, Creator-only view, cross-tenant denial, one-time reminder record, and decline-without-reliability-effect behavior.
2. Creator acceptance without rights or payable, Business-only funding authorization, and provider failure preserving the old expiry.
3. Authoritative funding creating an exact future non-backdated term, immutable invoice/PaymentIntent references, one full payable, idempotent replay, and no second content-review submission.
4. Two different provider-success attempts producing exactly one funded term, one funding snapshot, and one Creator payable.

The complete database suite passed 82 tests, and the API suite passed 12 tests. Empty-database and N-1 recovery cover all 16 migrations and 77 tables. `pnpm verify`, repeated deterministic seed/check, `drizzle-kit check`, the 363-file security scan, and Gitleaks over approximately 11.65 MB all passed.

JUnit evidence: [`test-results/content-rights-renewal-junit.xml`](./test-results/content-rights-renewal-junit.xml). Migration: [`../../../packages/db/drizzle/0015_slim_joshua_kane.sql`](../../../packages/db/drizzle/0015_slim_joshua_kane.sql).

## Deliberate later work

This local checkpoint used synthetic provider identifiers and did not call Stripe, charge a card, transfer money, deliver a reminder, deploy Azure, or contact a social platform. API routes, mobile/Business UI, Stripe test-mode webhook verification, ledger settlement, payout transfer execution, delivered reminders, external compliance monitoring, suspension/revocation operations, and final legal review remain later milestones.
