# Local Pass transactional state machine

Status: passed as checkpoint `M03-local-pass-008`  
Date: 2026-08-27

## Scope proved

This checkpoint implements the privacy-minimized Local Pass core without SMS, real customer data, payment-provider calls, or a phone dependency. A published campaign can issue one opaque, creator-specific link per completed mission assignment. Only the SHA-256 hash of each link and rotating claim token is retained.

A successful claim atomically locks the first creator attribution for one versioned HMAC-style synthetic customer token per campaign, reserves one offer unit, creates a pass that expires exactly seven days later, and emits only `pass_claimed` evidence. Link opening is separate `link_open` evidence and does not reserve inventory. Pausing future claims does not cancel a valid claimed pass.

Authorized Business owners/managers or Venue Staff with an active assignment for the exact venue can redeem an unexpired active rotating token once. Redemption requires staff to confirm the offer was honored and records `verified_pass_redemption`. Original, preapproved equal-or-greater, and customer-accepted equal-or-greater fulfillment shapes are explicit. Local Pass does not modify mission completion, creator reward, reliability, Reach status, or any financial intent.

## Database protections

- Eight new tables separate offer terms/status history, opaque creator links, claims, rotating claim tokens, claim history, redemption, and attribution evidence.
- Offer terms, creator attribution, claim identity, seven-day lifetime, token identity, status histories, redemption rows, and attribution events reject mutation or deletion at the database layer.
- Unique campaign/customer, offer inventory row locks, one-active-token, one-redemption-per-claim, and one-evidence-kind-per-claim constraints reinforce application transactions.
- No Local Pass column stores a phone number, email, IP address, device identifier, raw link token, or raw claim token.
- Evidence vocabulary intentionally excludes purchase, sale, revenue, or incremental-lift claims.

## Real PostgreSQL proof

Five integration tests passed against PostgreSQL 17:

1. Forward migration preserved a prior user, installed the privacy-minimized schema, stored hashes instead of raw tokens, and rejected offer/evidence mutation.
2. Two creators claiming for the same synthetic customer concurrently produced exactly one winner and permanently retained the winning creator attribution.
3. Two customers racing for the final unit produced exactly one winner; a future-claim pause rejected a new claim while preserving the active claim.
4. Token rotation invalidated the old screenshot; wrong-venue and unauthorized scans failed; two simultaneous authorized redemptions produced one success and one replay rejection; mission and payment state remained unchanged.
5. An unredeemed seven-day claim expired and atomically released its reserved inventory.

Evidence report: [`test-results/local-pass-store-junit.xml`](./test-results/local-pass-store-junit.xml). Migration: [`../../../packages/db/drizzle/0007_thick_sharon_ventura.sql`](../../../packages/db/drizzle/0007_thick_sharon_ventura.sql).

## Deliberate later work

The no-install claim web/API, OTP delivery and recovery, encrypted short-retention contact handling, customer refusal/remedy flows, offer closure/reversal operations, aggregate reporting endpoints, and rate/fraud controls remain later M13/API work. This checkpoint makes no claim that a redemption proves a purchase or incremental foot-traffic lift.
