# M03 dispute and resolution checkpoint

Checkpoint: `M03-dispute-resolution-006`  
Date: 2026-08-27  
Result: Passed; M3 overall remains open

## Boundary implemented

- A business can open a dispute only while its PostgreSQL-controlled review window is active. It must be an active owner or manager in the submission's exact business workspace and cite an approved objective reason, the accepted deliverable requirement, and at least one additional mission-bound evidence record.
- A creator can dispute only the one active correction request, before its PostgreSQL deadline, using `correction_outside_contract` or `requirement_already_satisfied`. Opening the case moves the submission to `disputed`, so the correction path is paused until an independent decision.
- Subjective style, appearance, personality, voice, follower count, and popularity do not exist in the dispute reason enum. Cross-mission evidence, duplicate references, and evidence that does not match the reason are rejected before any case row is written.
- Each mission assignment and submission can have only one dispute. Opening locks the submission and assignment together, so approval and dispute cannot both win.
- Resolution requires an active platform `dispute_reviewer` or `admin` membership. The creator, dispute opener, and active members of the mission's business are disqualified from resolving that case.
- The only outcomes are `earned_full` and `no_payout`. Earned-full resolution atomically moves the submission to `resolved_approved`, completes the application/assignment/slot, and writes one `creator_payable_full` intent. No-payout resolution atomically moves all four records to explicit no-payout states and writes one `slot_refund_full` intent.
- Financial intents contain no editable reward, refund, or prorated amount. They are immutable all-or-nothing instructions for the later ledger milestone; no Stripe or payment action occurs in this checkpoint.
- Dispute opening, evidence references, status history, resolution, mission/submission histories, financial intent, and audit event are committed or rolled back together.

## Real PostgreSQL proof

1. Applied migrations `0000`–`0004`, created and approved a complete synthetic submission using the prior schema, then applied forward migration `0005_huge_agent_brand.sql`; the submission and assignment were preserved and one pending full-payable intent was deterministically backfilled from the immutable approval decision.
2. Confirmed all six new tables and inspected dispute/resolution/financial-intent columns for follower, appearance, style, reward amount, and refund amount fields; none were present.
3. Rejected a different business, a runtime subjective-style reason, and insufficient evidence with zero dispute, evidence, or history rows.
4. Allowed the assigned creator to dispute one timely correction, denied another creator, moved the submission to `disputed`, and prevented resubmission while the case remained open.
5. Advanced only synthetic database timestamps and proved late business and creator openings fail with zero case rows.
6. Rejected media from another mission, then raced two valid openings. Exactly one case, two evidence references, and one opening-history row committed.
7. Raced objective business approval against dispute opening. Exactly one terminal action committed; the submission ended either `approved` with one full-payable intent or `disputed` without a premature financial intent.
8. Denied an ordinary user and a conflicted business reviewer. An independent reviewer overturned the correction and atomically produced completed mission state plus one full creator-payable intent.
9. Raced two independent reviewers on an upheld correction. Exactly one no-payout resolution and one full slot-refund intent committed; no full-payable intent or prorated value existed.

Retained result: [`test-results/dispute-store-junit.xml`](./test-results/dispute-store-junit.xml), with the machine hostname replaced by `local-development-host` before retention.

## Safety and later gates

All records use synthetic users, businesses, venues, media metadata, evidence references, and timestamps on loopback PostgreSQL. No media bytes, real identity, creator work, Azure resource, Stripe object, payment, refund, payout, notification, or external record was used.

The pending financial intents are not a ledger, payable, refund, transfer, or promise that money moved. M12 must convert them through balanced integer-minor-unit ledger entries and Stripe test-mode webhook-authoritative workflows. Content-license activation, admin web API wiring, notifications, legal retention, and physical-device dispute UX remain later milestones.
