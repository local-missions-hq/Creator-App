# M00 tabletop — Orlando family-attraction campaign

Status: Synthetic design walkthrough; no real participant, venue, payment, upload, or provider action  
Date: 2026-08-26

## Scenario

Lakeview Discovery Center is a fictional approved Orlando family attraction. It proposes a Visit & Create campaign for 10 Community creators at a $50 base reward plus one free adult admission. Each slot requires mission-window check-in, five original photos, and two 5–15 second vertical 1080p clips. No public post or positive sentiment is required. The base 90-day organic owned-social license is included.

The Creator Reward Pool is `$500.00`; the 15% coordination fee is `$75.00`; Total Due is `$575.00` before any legally required tax. Each funded slot is allocated `$50.00` reward and `$7.50` fee. All values below are synthetic integer-minor-unit ledger examples.

## Normal path

1. Business saves a test payment method. No charge occurs.
2. Business submits the versioned brief. Platform review confirms the safe template, objective criteria, capacity, rights, disclosure, and pricing.
3. Business sees the final `$575.00` invoice and explicitly selects **Fund and Publish**.
4. The API creates one idempotent test PaymentIntent. Only its verified webhook records `$575.00` business cash/control and the ten immutable slot allocations, then publishes the campaign.
5. Community matching assigns qualified local creators without follower data. A creator sees `$50.00`, admission, checklist, schedule, locality band, rights, and cancellation rule before accepting.
6. Venue QR proves timely check-in. Supporting location, if requested, is purpose-limited to this window.
7. Creator uploads all seven readable, correctly formatted original files and marks a complete submission.
8. Business approves against the checklist within 48 hours. The platform records a `$50.00` creator payable and `$7.50` earned platform fee and queues the test transfer automatically.
9. Signed processor events advance transfer/payout status. The ledger remains balanced and the business has no payout-release control.

Expected result: creator receives the full `$50.00`; the slot costs the business `$57.50`; no positive-review or audience condition exists.

## Branch A — no-show

A scheduled creator never checks in before the window closes. The server records `no_show -> not_completed -> cancelled_no_payout`. It creates one idempotent `$57.50` refund intent: `$50.00` reward allocation plus `$7.50` platform-fee allocation.

Expected result: creator receives `$0`; business receives `$57.50`; Local Missions earns `$0` for the slot and absorbs any unrecovered processing expense. Duplicate jobs/webhooks cannot issue a second refund.

## Branch B — venue closed

The creator arrives on time but the venue is unexpectedly closed, so QR/staff check-in is impossible. Support records venue evidence and a business-caused access failure. The creator is not labeled a no-show or made less eligible for future Community work. Operations offers the policy-approved reschedule/replacement path; if the slot reaches final no-payout, the same full `$57.50` refund applies.

Expected result: no invented completion, no creator reliability penalty, no partial payout invented by support, and no stranded business funds. The final compensation treatment remains subject to the versioned cancellation policy and external legal review before live use.

## Branch C — invalid content

The creator checks in but uploads only four photos and one clip. The client cannot mark the submission complete because required count validation fails. If unreadable files initially pass client checks, server validation identifies the exact failed checklist items without evaluating appearance, personality, follower count, or artistic taste.

Expected result: incomplete work is not silently auto-approved; the creator can finish before the deadline. If it becomes final non-completion, reward is `$0` and the business receives the full `$57.50` slot refund.

## Branch D — one objective revision

The creator submits five photos and two clips, but one clip is 720p. Within 48 hours the business requests the one allowed correction and cites only the locked 1080p requirement. It cannot ask for an extra testimonial, a positive review, more files, different rights, or a professional camera.

The creator replaces the clip. A new 48-hour review starts. The business may approve, open a supported evidence-based dispute, or take no action; it may not request a second correction.

Expected result: approval or timeout creates the full `$50.00` payable. The correction adds no unpaid work beyond the accepted checklist.

## Branch E — business silence and auto-approval

All objective criteria are complete, but the business takes no valid action for 48 hours. The worker idempotently transitions `under_review -> auto_approved -> payout_ready` and records the actor as the platform policy job plus policy/version evidence.

Expected result: the creator earns `$50.00`; the business cannot withhold payment indefinitely.

## Branch F — subjective rejection and dispute

The business says the creator was “not enthusiastic enough” and wants a more positive review. Those are not accepted criteria. The attempted rejection fails closed. If the business opens a dispute, it must select an objective criterion and evidence; otherwise support resolves it approved.

Expected result: valid completion produces the full `$50.00` payable. No state transition lets subjective preference, appearance, personality, follower count, or positive sentiment create a no-payout result.

## Branch G — evidence-backed no-payout dispute

The creator submits seven technically valid files, but audit evidence proves they were old, unrelated to the required venue experience, and accompanied by a false check-in. A timely dispute cites the locked location/experience and check-in criteria. A separately authorized reviewer resolves `disputed -> resolved_no_payout`.

Expected result: creator receives `$0`; business receives the full `$57.50` refund; the investigation, reason, evidence access, decision, refund, and any trust/safety restriction are audited. Support does not edit ledger history.

## Ledger reconstruction

For an example final campaign with eight approved slots, one no-show, and one resolved no-payout dispute:

| Outcome                |  Count | Creator payable | Earned fee | Business refund |
| ---------------------- | -----: | --------------: | ---------: | --------------: |
| Approved/auto-approved |      8 |         $400.00 |     $60.00 |           $0.00 |
| No-show                |      1 |           $0.00 |      $0.00 |          $57.50 |
| Resolved no-payout     |      1 |           $0.00 |      $0.00 |          $57.50 |
| **Final totals**       | **10** |     **$400.00** | **$60.00** |     **$115.00** |

`$400.00 + $60.00 + $115.00 = $575.00`, matching the original charge. Processor expense is recorded separately as a Local Missions expense and cannot reduce creator pay or business refund.

## Tabletop conclusion

The founder-approved rules resolve every required branch without inventing a new product behavior. This is documentation evidence only: none of the state transitions, authorization checks, webhooks, ledger entries, timers, deletion jobs, or UI states has been implemented or executed yet.
