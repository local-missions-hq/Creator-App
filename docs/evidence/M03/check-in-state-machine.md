# M03 accepted-mission and check-in checkpoint

Checkpoint: `M03-check-in-state-machine-004`  
Date: 2026-08-27  
Result: Passed; M3 overall remains open

## Boundary implemented

- An accepted application can be scheduled exactly once against its accepted slot, creator, campaign, active business location, UTC mission window, and named timezone.
- Only an active owner or manager in that campaign's business can create the schedule. A different business cannot substitute its own venue.
- Venue Staff requires both active `venue_staff` membership and a separate assignment for the exact location and server-time window. Membership alone grants no check-in authority.
- A QR or staff-code challenge is bound to one scheduled mission assignment. The store hashes the high-entropy challenge token and never stores its plaintext value.
- Issuance uses PostgreSQL `now()`, permits at most a five-minute lifetime, and cannot extend beyond the mission window. Issuing a replacement atomically revokes the prior active challenge.
- Staff-code fallback requires a recorded reason. QR challenges cannot carry a fallback reason.
- Consumption locks the challenge and assignment together, verifies the token, creator, venue, server window, challenge lifetime, and assignment state, then writes the immutable event, challenge consumption, assignment transition, history, and audit event in one transaction.
- The retained event contains only verification method, a server-generated derived statement, and `unavailable`, `coarse`, or `precise` accuracy class. The schema contains no latitude, longitude, raw-coordinate, or plaintext-token column.

## Real PostgreSQL proof

1. Applied migrations `0000`–`0002`, inserted a synthetic `$575.00` campaign, then applied forward migration `0003_orange_tempest.sql`; the campaign title and exact Total Due were preserved.
2. Confirmed all five new tables and inspected their columns for prohibited latitude, longitude, coordinate, and plaintext-token fields.
3. Scheduled only an accepted application at a same-business active location; duplicate scheduling returned `MISSION_SCHEDULE_CONFLICT`, and a different business received `CHECK_IN_ACCESS_DENIED`.
4. Proved an active Venue Staff membership without a location/window assignment cannot issue a challenge. After assignment, missing fallback reason was rejected and the valid staff-code path produced a verified event.
5. Issued two successive QR challenges, confirmed the first became revoked, rejected its token as replayed, and consumed the current token exactly once.
6. Verified a successful QR event atomically moved the assignment from version 1 `scheduled` to version 2 `checked_in`, consumed the challenge, wrote one event, and appended the second history row.
7. Rejected cross-creator, wrong-venue, and server-expired attempts without creating a check-in event.
8. Raced two consumers against one challenge. Exactly one committed; the other returned `CHECK_IN_CHALLENGE_REPLAYED`, leaving one event and one check-in transition.
9. Scheduled a future mission and proved challenge issuance fails with `CHECK_IN_OUTSIDE_WINDOW`; caller/device time cannot override PostgreSQL server time.

Retained result: [`test-results/check-in-store-junit.xml`](./test-results/check-in-store-junit.xml), with the machine hostname replaced by `local-development-host` before retention.

## Safety and later gates

All records use synthetic users, businesses, venues, and tokens on loopback PostgreSQL. No device location, camera, real QR code, identity provider, Azure resource, Stripe object, payment, notification, or external record was used.

This database/state-machine checkpoint does not claim the later M9 physical-camera gate. Camera permissions, rate limiting, poor-network behavior, physical QR focus/low-light testing, suspicious-case review, and any approved short-lived raw-coordinate deletion job remain future work.
