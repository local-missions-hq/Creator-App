# M03 immutable ledger and provider-reference checkpoint

Checkpoint: `M03-immutable-ledger-007`  
Date: 2026-08-27  
Result: Passed; M3 overall remains open

## Boundary implemented

- An approved campaign becomes funded only through `LedgerStore.recordCampaignFunding`, the domain boundary intended for a future signature-verified provider event. A Business user can no longer call the ordinary campaign transition method to mark its own campaign funded.
- One immutable provider reference stores `provider`, provider account reference, object type, and immutable object ID. It deliberately stores no copied payment status, secret, payment method, card, bank, tax, identity, or webhook payload.
- Funding locks the approved `$Creator Reward Pool`, 15% platform fee, Total Due, currency, provider event ID, transfer group, and one immutable allocation per mission slot. A deferred PostgreSQL constraint trigger rejects any snapshot whose slot count, reward sum, fee sum, total, currency, campaign, or locked slot reward does not reconcile.
- The 15% fee is calculated in integer minor units. Per-slot floor values are ranked by fractional remainder and slot ordinal, so any rounding cents are assigned deterministically and the allocations exactly equal the disclosed campaign fee.
- Ledger transactions and entries form balanced double-entry-style journals. Deferred PostgreSQL constraint triggers require at least two entries, one currency, and debit and credit totals that each equal the immutable transaction total before commit.
- Funding debits provider clearing and credits campaign funds. A full creator-payable intent debits the slot's complete funded allocation, credits the creator's locked reward, and credits only that slot's earned platform fee. A full-refund intent debits the same complete allocation and credits the Business refund payable for reward plus fee.
- Financial action intents can move only once from `pending_ledger` to `posted`. The intent's identity, assignment, source, action, and creation time cannot change, and a posted intent cannot be edited or deleted.
- Provider references, funding snapshots, slot allocations, ledger accounts, transactions, and entries reject `UPDATE` and `DELETE`. Corrections are new balanced `finance_adjustment` journals with a required reason and audit event.
- Only a separately authorized active `finance_operator` may post a compensating adjustment. Admin, dispute reviewer, Business, and Creator roles do not inherit this authority.
- This checkpoint creates internal obligations only. It does not create a Stripe object, charge a payment method, send a transfer, issue a refund, mark an external payout paid, or claim live-money readiness.

## Real PostgreSQL proof

1. Applied migrations `0000`–`0005`, inserted a prior full-payable intent, then applied `0006_dapper_mordo.sql`; the user, assignment, and pending intent were preserved and received the new one-way status metadata.
2. Confirmed all six new financial tables. The provider-reference table contains immutable IDs but no status, secret, amount, bank, card, or payment-method field.
3. Proved a Business cannot self-fund. A synthetic authoritative event funded a canonical 10 × `$50` campaign as `$500.00` reward pool + `$75.00` fee = `$575.00`, with ten allocations and one balanced funding journal.
4. Proved deterministic rounding for five `$33.33` slots: each received a `$5.00` fee allocation, the fee summed to `$25.00`, and each all-in slot allocation was `$38.33`.
5. Raced duplicate funding delivery and received one immutable result. Reusing the event with changed immutable input failed, and two different provider events for one campaign produced exactly one winner.
6. Raced two consumers of a completed `$50` slot. Exactly one journal posted: `$57.50` campaign-funds debit, `$50.00` creator-payable credit, and `$7.50` platform-fee credit.
7. Consumed a no-payout `$125` slot. Exactly one `$143.75` refund-payable journal posted, including the full `$125.00` creator reward and `$18.75` platform fee, with no creator-payable account or processing deduction.
8. Consumed a final no-payout Level 3 Reach slot and posted the full `$150.00` base-plus-Reach reward and `$22.50` fee as one `$172.50` Business refund payable, proving the Reach bonus is not lost or prorated.
9. Rejected an unfunded intent and a final-state/action mismatch with no partial non-funding journal.
10. Denied an Admin finance adjustment, allowed the active Finance Operator, made concurrent retries idempotent, and rejected changed-input reuse.
11. Direct attempts to rewrite a ledger entry or delete a provider reference failed with PostgreSQL `55000`. A direct one-sided journal failed at commit with PostgreSQL `23514`.

Retained result: [`test-results/ledger-store-junit.xml`](./test-results/ledger-store-junit.xml), with the machine hostname replaced by `local-development-host` before retention.

## Safety and later gates

All users, businesses, provider IDs, events, transfer groups, amounts, and timestamps are synthetic and remain on loopback PostgreSQL. No Azure resource, Stripe API, payment, refund, transfer, payout, notification, or external record was created.

M12 must still verify Stripe signatures, persist/deduplicate webhook events, create test-mode PaymentIntents/transfers/refunds, converge out-of-order provider events, reconcile processor fees and chargebacks, enforce reserve controls, and pass legal/financial launch gates. The internal ledger is the source-of-truth obligation model that those later provider actions must reconcile against; it is not escrow, a wallet, or evidence that money moved.
