# Local Missions V1 product contract

Status: Founder-approved baseline, implementation not yet proven  
Date: 2026-08-26  
Authority: [architecture.md](../../architecture.md), [plans.md](../../plans.md), and [ADR-001 through ADR-059](../decisions/README.md)

## Product promise

Local Missions lets approved Orlando businesses fund objective, local creator missions and lets approved adult creators earn the full advertised reward when they complete the accepted checklist. One iPhone app contains Creator, Business, and restricted Venue Staff modes. Platform-wide review, support, finance, and administration remain in a separately authorized desktop web console.

The product does not promise escrow, purchases, incremental customers, positive reviews, or work based on subjective taste. Stripe is the intended payment and payout processor, but live money remains blocked by legal, accounting, tax, insurance, reserve, processor, security, privacy, and operational approvals.

## Participants and V1 stories

### Creator

- Join the invitation-only Orlando pilot as an adult, complete identity/payout/locality onboarding only after invitation, and switch into Creator mode.
- Discover or receive Community opportunities without a follower minimum; optionally qualify for a per-platform Reach tier without losing Community eligibility.
- See the guaranteed cash reward, in-kind benefit, objective checklist, disclosure, rights, schedule, cancellation terms, and distance band before accepting.
- Check in during the mission window with the venue QR or staff fallback, upload the required media/evidence, receive at most one objective correction request, and receive the full reward after approval or automatic approval.
- See payout and refund-related states without being charged platform or processing fees and without ordinary business chargebacks taking back an earned reward.

### Business owner or manager

- Complete invited business verification, create a location, add a payment method without being charged, and build a campaign from a safe template.
- Set the Creator Reward Pool, slot count, base reward, optional benefits, structured add-ons, Reach bonuses, and content-rights bonuses; see the 15% platform fee and Total Due before submission.
- Submit for platform review and, only after approval, explicitly tap **Fund and Publish** to authorize the charge.
- Receive automatically assigned Community creators, object only for documented objective safety/fit reasons, review completed work against the accepted checklist within 48 hours, and receive automatic slot-level refunds for final no-payout outcomes.
- See pass claims and verified redemptions as attribution evidence without calling them purchases or guaranteed incremental traffic.

### Venue staff

- Access only assigned locations and active mission windows.
- Confirm creator check-in with a rotating venue QR or controlled staff fallback.
- Scan a valid Local Pass rotating QR and record redemption without seeing creator private data, customer contact data, campaign finances, or platform-wide queues.

### Platform reviewer, support, finance, and administrator

- Review businesses, creators, campaigns, objections, submissions, and appeals according to versioned objective policies.
- Reconstruct every sensitive transition from immutable audit events and every money movement from balanced ledger entries.
- Use separate roles and step-up controls for evidence access, refunds, transfer exceptions, reserve controls, identity recovery, and exports.
- Operate independent kill switches for new funding, publishing, assignment, check-in, and payout execution without erasing existing obligations.

## Standard mission templates

| Template                    | Required completion                                                                                            | V1 limits                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Visit & Create              | Verified check-in and original-media upload; no public post                                                    | Default 5 photos and 2 raw vertical clips; 3–10 photos and 1–3 clips                |
| Visit & Share               | Verified check-in, contracted content, proper disclosure, and one post on the selected platform                | One 15–60 second vertical video or one 3–5 item carousel                            |
| Event Attendance            | Attendance within a fixed window and the selected capture checklist; a public post only when selected and paid | Default 60 minutes, 3 photos, and 2 clips; attendance 30–180 minutes                |
| Private Experience Feedback | Private structured feedback; never a required public rating or positive sentiment                              | At most 10 questions designed for about 10 minutes and 0–3 optional evidence photos |

Raw clips are 5–15 seconds, vertical 9:16, at least 1080p, and producible with an ordinary current phone. A checklist may objectively validate readability, quantity, duration, orientation, resolution, required location/experience, selected speech/audio, and unrelated-brand watermarks. Appearance, voice, personality, audience size, positive sentiment, and subjective artistic preference are not rejection criteria.

## Campaign economics and access

- At least 80% of every campaign is Community Slots. Community eligibility and assignment do not use or show follower counts.
- At most 20% may be separately priced Reach Slots on one named platform using a current verified local-audience tier. Community launch does not depend on Reach integrations.
- A creator receives the exact locked offer shown before acceptance: base reward plus any fixed Reach, add-on, and rights bonuses.
- The business funds the Creator Reward Pool plus a 15% platform coordination fee that includes ordinary payment processing. For 10 creators at $50, the pool is $500, the fee is $75, and Total Due is $575 before any legally required tax.
- Compensation is all-or-nothing per accepted slot. Valid objective completion earns the full offer. A final no-show, creator cancellation, or other non-completion earns no partial reward and returns that slot's full reward and fee allocation to the business. Local Missions absorbs unrecovered ordinary processing cost.

## Add-ons and rights

Fixed add-ons use only the base reward: 1–5 extra photos +25%, 1–2 extra raw clips +50%, one extra edited video +100%, and each extra 30 onsite minutes +50% up to 180 minutes. Out-of-range or new work requires platform review, a newly priced deliverable, and creator consent; chat or an in-person request never changes acceptance criteria.

The base reward includes a non-exclusive 90-day organic reposting license on business-owned social accounts. A 12-month owned social/website/email license adds 50% of the base reward, and 30-day paid-ad use adds 100%. Standard terms prohibit permanent ownership, exclusivity, resale, third-party sublicensing, AI training, synthetic-media generation, and face/voice cloning. Final language requires legal review.

## Canonical lifecycle rules

- Campaign: `draft -> pending_admin_review -> approved -> funding_pending -> funded -> published -> paused|closed`, with rejection paths.
- Slot: `submitted -> accepted -> scheduled -> checked_in -> submission_due -> completed`, with rejected, cancelled, and no-show terminal paths.
- Submission: `draft -> complete_submission -> under_review -> approved|revision_requested|disputed|auto_approved -> payout_ready -> paid`.
- Reward obligation: `reserved -> completion_pending -> earned_full -> payout_ready -> paid`, or `not_completed -> cancelled_no_payout -> business_refund_pending -> refunded`, with a documented dispute path.
- Local Pass events distinguish `claimed` from `verified_redemption`; neither affects creator compensation or reliability.

Every transition requires an authorized actor, server-side preconditions, an idempotency key when retryable, and an immutable audit event. Illegal transitions must fail closed and be covered by automated tests.

## Privacy, safety, and controlled-pilot boundaries

- Adult-only V1; no child accounts.
- No unsafe/prohibited mission, misleading endorsement, positive-review requirement, continuous tracking, or reuse of bank/KYC data as locality proof.
- Businesses see only an Orlando-area verification state and one coarse distance band: Under 10, 10–25, 25–50, or More than 50 miles. They never see a home address, exact ZIP, exact distance, proof document, bank, tax, or identity data.
- Location is collected only for a current mission/check-in purpose. Venue QR or staff proof is primary; coarse mission-window location is supporting evidence only.
- The invitation-only pilot is capped at 10 businesses, 100 creators, 20 slots and a $2,500 reward pool per campaign, and $25,000 platform-wide funded-but-unsettled rewards.
- Before live-money readiness, TestFlight uses visibly labeled test money and noncommercial synthetic or controlled test missions. Test media grants no commercial rights.

## Data classes

| Class        | Examples                                                                               | Minimum handling                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Public       | Published business name, approved public offer text                                    | Integrity controls and ordinary retention                                                                           |
| Internal     | Template configuration, aggregate operational metrics                                  | Authenticated workforce/service access                                                                              |
| Confidential | Creator profile, campaign brief, applications, submissions                             | Relationship- and tenant-scoped authorization; private storage                                                      |
| Restricted   | Identity/address evidence, raw coordinates, payout/financial references, audit exports | Least privilege, purpose-bound access, stronger authentication, immutable access audit, explicit retention/deletion |

Retention values remain policy targets until legal review. Raw locality proof is deleted 30 days after review or appeal closes; exact addresses are not retained. Raw Reach evidence follows the same 30-day review/appeal rule. Raw Local Pass phone data is deleted 30 days after redemption or expiry, while the non-reversible deduplication token may remain 12 months. Financial, tax, dispute, audit, media, coordinate, log, backup, and legal-hold schedules require final counsel/accounting/privacy approval before production.

## V1 acceptance boundary

V1 is not complete when screens merely look finished. The minimum meaningful proof is a test-mode funded mission that reaches verified check-in, objective submission review, approval or documented no-payout resolution, balanced ledger reconciliation, and test payout/refund outcomes—with the external live-money gates still closed.
