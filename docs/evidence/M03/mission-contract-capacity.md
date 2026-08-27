# M03 mission contract and capacity checkpoint

Checkpoint: `M03-mission-contract-capacity-003`  
Date: 2026-08-27  
Result: Passed; M3 overall remains open

## Boundary implemented

- Four immutable, versioned mission-template codes: Visit & Create, Visit & Share, Event Attendance, and Private Experience Feedback.
- A versioned campaign brief locks the selected template, plain-language explanation, and objective checklist. The business must be an active owner or manager in the campaign's exact workspace.
- Campaign slots distinguish Community from Reach. Slot rewards use integer minor units and reconcile base reward plus a fixed Reach bonus. PostgreSQL enforces the confirmed +50%, +100%, and +200% Reach levels.
- Contract configuration is transactional. Slot ordinals, count, currency, and reward total must exactly match the campaign, and at least `ceil(total slots × 0.80)` must be Community Slots.
- A campaign cannot leave draft until its versioned brief and complete slot allocation pass the same contract checks.
- Creator applications require an approved profile and a current verified locality credential. The Community path contains no follower field, follower minimum, audience gate, or Reach-provider dependency.
- A Community application atomically reserves one available slot with `FOR UPDATE SKIP LOCKED`. Campaign/creator uniqueness prevents duplicate applications. The active-reservation partial unique index prevents two live claims on one slot.
- Withdrawal records status history and audit evidence in the same transaction, releases the reservation, and returns the slot to availability for a replacement creator. A withdrawn creator still cannot apply twice to the same campaign.
- Application acceptance is restricted to an active owner or manager in the campaign's business workspace.

## Real PostgreSQL proof

1. Applied migrations `0000` and `0001`, inserted a synthetic `$575.00` campaign, then applied forward migration `0002_material_rachel_grey.sql`; the campaign title and Total Due were preserved.
2. Confirmed all six new tables and confirmed the schema contains no column whose name includes `follower`.
3. Rejected and fully rolled back a 10-slot contract with only seven Community Slots. The same incomplete campaign was also blocked from `draft → submitted`.
4. Raced two applications from one qualified creator. Exactly one application, reservation, history row, and reserved slot committed; the loser returned `APPLICATION_ALREADY_EXISTS`.
5. Raced six qualified creators for three Community Slots. Exactly three committed and three returned `MISSION_CAPACITY_FULL`; the database retained three applications, three live reservations, and zero available slots.
6. Withdrew one application, proved its slot returned to availability, rejected the same creator's second application, and reserved the exact released slot for a replacement creator.
7. Proved an unrelated business owner receives `APPLICATION_ACCESS_DENIED`, while the correct owner can accept and atomically convert the reservation and slot.

Retained result: [`test-results/mission-application-store-junit.xml`](./test-results/mission-application-store-junit.xml), with the machine hostname replaced by `local-development-host` before retention.

## Safety boundary

All people, businesses, campaigns, locality credentials, and identifiers are synthetic. PostgreSQL ran only on loopback Docker. This slice did not create an Azure resource, contact a social analytics provider, use a real address or identity, create a Stripe object, move money, send a notification, or require a physical phone.
