# Local Pass claim-edge checkpoint

Status: passed  
Date: 2026-08-27  
Checkpoint: `M03-local-pass-claim-edge-015`  
Implementation commit: `d672439`

## Scope proved

This checkpoint replaces caller-trusted Local Pass customer tokens with an application-derived verification boundary. A claim, pass recovery, refusal report, customer-visible status read, or acceptance of a non-preapproved substitute now requires a fresh five-minute customer challenge. The store derives versioned customer and risk HMAC tokens, retains only an application-encrypted destination ciphertext, stores a keyed OTP digest rather than the code, permits at most five verification attempts, enforces a 60-second resend delay, and limits sends to three per 15 minutes by destination, link, and risk token. PostgreSQL advisory locks keep those limits bounded under concurrency. No message provider is called.

Successful claim and recovery challenges are consumed in the same transaction as the protected action. Verification replay, challenge reuse, an incorrect destination, and stale or superseded challenges fail closed. Marketing consent defaults to false and is never inferred from pass verification. Contact ciphertext becomes eligible for deletion 30 days after the relevant terminal point; customer linkage tokens become eligible after 12 months while aggregate attribution evidence remains.

## Fulfillment and reporting boundary

- A verified customer can report offer refusal, an incorrect substitute, or an incorrect redemption without invalidating the active pass.
- An open report blocks redemption until a separate Trust and Safety reviewer or administrator confirms or dismisses it. A business member cannot review the business's own report.
- A confirmed intentional failure, or repeated confirmed failures, pauses future claims while preserving already claimed passes.
- A customer-accepted substitute requires its own verified, single-use acceptance challenge. The existing exact-venue and equal-or-greater-value rules still apply.
- The customer status response contains the offer, coarse venue, expiry, and plain-language fulfillment state; it contains no customer token, contact, internal business ID, complaint statement, or precise customer location.
- Business and Creator reports expose only aggregate claims, verified redemptions, conversion basis points, confirmed fulfillment incidents, completed campaign cost, and cost per verified redemption. Business reads require current membership in the exact tenant; Creator reads are limited to that Creator's own attribution.
- Claims and redemptions remain separate facts and are not described as purchases, revenue, incremental customers, or lift. None of these outcomes changes creator mission completion, reward, reliability, Reach, or financial state.

## Real PostgreSQL proof

Nine Local Pass integration tests passed:

1. Forward migration, privacy shape, immutable terms, and immutable evidence.
2. Concurrent duplicate-customer claims with exactly one first-attribution winner.
3. Final-inventory one-winner behavior and future-claim pause with active-pass preservation.
4. Fresh recovery, rotating-token invalidation, exact-venue authorization, and redemption replay protection.
5. Five-attempt OTP lockout, resend throttling, challenge replay rejection, hash-only destination storage, and separate default-off marketing consent.
6. Wrong-destination recovery denial and one-time recovery challenge consumption.
7. Verified refusal reporting, independent review, active-pass preservation, business enforcement, safe customer status, aggregate reporting, and cross-tenant denial.
8. Verified customer acceptance for a non-preapproved equal-value substitute.
9. Seven-day unredeemed expiry and inventory release.

The complete database integration suite passed 78 tests, and the API suite passed 12 tests. The empty/N-1/failure-recovery proof now covers all 15 migrations and 72 tables. `pnpm verify`, deterministic seed/check, `drizzle-kit check`, the 360-file security scan, and Gitleaks over approximately 11.09 MB all passed.

Evidence report: [`test-results/local-pass-claim-edge-junit.xml`](./test-results/local-pass-claim-edge-junit.xml). Migration: [`../../../packages/db/drizzle/0014_serious_terror.sql`](../../../packages/db/drizzle/0014_serious_terror.sql).

## Deliberate later work

This is the transactional domain boundary, not a public no-install claim site or provider integration. M13 must still expose reviewed HTTP/web flows, choose and contract an SMS or equivalent provider, validate provider-side retention and fraud controls, and run accessibility/device tests. No SMS, email, phone, customer record, Azure resource, Entra call, Stripe call, payment, or external record was created in this checkpoint.
