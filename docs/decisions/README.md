# Local Missions architecture decisions

ADR-001 through ADR-058 are the founder-approved V1 baseline frozen on 2026-08-26. ADR-059 is the founder-approved milestone scheduling decision added on 2026-08-27 without weakening the physical-device accessibility gate. ADR-060 is a deferred paid M5/M14 infrastructure option. ADR-061 accepts the current GitHub Free and reviewed local Terraform operator path. These records make the register reviewable as individual decisions; [../../architecture.md](../../architecture.md) remains the detailed architecture overview and [../../plans.md](../../plans.md) remains the build-and-verification contract.

| ADR | Decision | Source status at freeze |
|---|---|---|
| [ADR-001](./ADR-001.md) | React Native/Expo for the shared iPhone app | Accepted 2026-08-26 |
| [ADR-002](./ADR-002.md) | Modular monolith on Azure Container Apps | Accepted 2026-08-26 |
| [ADR-003](./ADR-003.md) | PostgreSQL as transactional source of truth | Accepted 2026-08-26 |
| [ADR-004](./ADR-004.md) | Entra External ID browser-delegated OIDC + PKCE | Accepted 2026-08-26 |
| [ADR-005](./ADR-005.md) | Stripe Connect test-mode architecture and controlled live-money gate | Accepted baseline 2026-08-26; live configuration gated |
| [ADR-006](./ADR-006.md) | Mission-window-only location | Accepted 2026-08-26 |
| [ADR-007](./ADR-007.md) | One V1 iPhone app with first-class Creator and Business modes | Confirmed 2026-08-26 |
| [ADR-008](./ADR-008.md) | Transactional outbox, Service Bus, and idempotent workers | Accepted 2026-08-26 |
| [ADR-009](./ADR-009.md) | Private direct-to-Blob resumable media uploads | Accepted 2026-08-26 |
| [ADR-010](./ADR-010.md) | Versioned V1/V2/V3 scaling without premature microservices | Accepted 2026-08-26 |
| [ADR-011](./ADR-011.md) | One identity can hold and switch between multiple roles/workspaces | Confirmed 2026-08-26 |
| [ADR-012](./ADR-012.md) | Save payment method during setup; charge only after approval through **Fund and Publish** | Confirmed 2026-08-26 |
| [ADR-013](./ADR-013.md) | Creator rewards are all-or-nothing per slot; incomplete or canceled work earns no partial reward | Confirmed 2026-08-26 |
| [ADR-014](./ADR-014.md) | Objective complete submission starts a 48-hour review; one correction is allowed, then inactivity auto-approves | Confirmed 2026-08-26 |
| [ADR-015](./ADR-015.md) | A no-payout slot automatically returns its reward and allocated fees to the original payment; Local Missions absorbs unrecoverable processing cost | Confirmed 2026-08-26 |
| [ADR-016](./ADR-016.md) | At least 80% Community Slots with no follower minimum; at most 20% separately priced verified-local Reach Slots | Confirmed 2026-08-26 |
| [ADR-017](./ADR-017.md) | Local Missions assigns Community creators; businesses have 24 hours to submit a narrowly permitted, platform-reviewed objection | Confirmed 2026-08-26 |
| [ADR-018](./ADR-018.md) | Reach rewards use fixed +50%, +100%, or +200% creator bonuses; the standard platform percentage applies transparently to the total | Confirmed 2026-08-26 |
| [ADR-019](./ADR-019.md) | Reach levels use consented 90-day local-audience verification: 1,000–4,999; 5,000–19,999; and 20,000+, while businesses see only the tier | Confirmed 2026-08-26 |
| [ADR-020](./ADR-020.md) | Reach qualification is per social platform; one primary platform per slot and every cross-post is a separate paid deliverable | Confirmed 2026-08-26 |
| [ADR-021](./ADR-021.md) | Campaign budget is labeled **Creator Reward Pool**; the platform fee and exact **Total Due** are displayed separately | Confirmed 2026-08-26 |
| [ADR-022](./ADR-022.md) | Standard platform fee is 15% and includes ordinary payment processing; no separate card-processing line | Confirmed 2026-08-26 |
| [ADR-023](./ADR-023.md) | Multi-platform Reach reward equals one base reward plus each contracted platform's tier bonus | Confirmed 2026-08-26 |
| [ADR-024](./ADR-024.md) | V1 sign-in providers are Apple, Google, Microsoft, and passwordless email; Facebook/Meta is deferred to V2 | Confirmed 2026-08-26 |
| [ADR-025](./ADR-025.md) | Provider accounts never auto-merge by email; linking requires proof of control of the authenticated account and new provider | Confirmed 2026-08-26 |
| [ADR-026](./ADR-026.md) | Provider removal requires recent authentication and another verified method; total lockout uses controlled recovery with temporary financial holds | Confirmed 2026-08-26 |
| [ADR-027](./ADR-027.md) | Locality uses annual private home-ZIP proof; businesses see only an area badge and coarse distance band, never address or payment/KYC data | Confirmed 2026-08-26 |
| [ADR-028](./ADR-028.md) | Raw locality proof is deleted 30 days after verification or appeal closure, whichever is later, except for documented expiring legal holds | Confirmed 2026-08-26 |
| [ADR-029](./ADR-029.md) | Business-visible distance bands are Under 10, 10–25, 25–50, and More than 50 miles using ZIP-area centroids | Confirmed 2026-08-26 |
| [ADR-030](./ADR-030.md) | V1 templates are Visit & Create, Visit & Share, Event Attendance, and Private Experience Feedback | Confirmed 2026-08-26 |
| [ADR-031](./ADR-031.md) | Businesses customize only versioned structured checklist fields within approved ranges; free text is non-enforceable, and out-of-range work requires a separately priced deliverable and admin review | Confirmed 2026-08-26 |
| [ADR-032](./ADR-032.md) | V1 template defaults and limits use 5 photos/2 clips for Visit & Create, one disclosed single-platform post for Visit & Share, 60-minute attendance plus 3 photos/2 clips for Event Attendance, and a 10-question/10-minute ceiling for Private Feedback | Confirmed 2026-08-26 |
| [ADR-033](./ADR-033.md) | The base reward includes 90-day organic owned-social use; 12-month extended owned-media adds 50% of base, 30-day paid-ad use adds 100% of base, and prohibited rights are unavailable by default | Confirmed 2026-08-26 |
| [ADR-034](./ADR-034.md) | V1 accepts ordinary phone media: raw clips are 5–15 seconds, Visit & Share videos are 15–60 seconds, carousels contain 3–5 items, and acceptance uses objective technical checks rather than subjective production taste | Confirmed 2026-08-26 |
| [ADR-035](./ADR-035.md) | Standard add-ons use fixed base-reward percentages: +25% for 1–5 photos, +50% for 1–2 raw clips, +100% for one edited video, and +50% per additional 30 minutes onsite | Confirmed 2026-08-26 |
| [ADR-036](./ADR-036.md) | License renewals require creator opt-in and new funding: +25% of original base for 90-day organic, +50% for 12-month owned media, and +100% for 30-day paid ads | Confirmed 2026-08-26 |
| [ADR-037](./ADR-037.md) | Orlando live pilot is capped at 10 businesses, 100 creators, 20 slots and $2,500 reward pool per campaign, and $25,000 unsettled rewards, with manual approvals, separated operators, and scoped kill switches | Confirmed 2026-08-26 |
| [ADR-038](./ADR-038.md) | Local Pass uses a seven-day single-use rotating QR redemption tied to the first creator claim; V1 reports verified redemptions without claiming purchase or incremental causation | Confirmed 2026-08-26 |
| [ADR-039](./ADR-039.md) | Local Pass customers use SMS OTP without an account; encrypted phone data is deleted 30 days after pass closure, a keyed dedup/audit token lasts 12 months, and marketing consent is separate | Confirmed 2026-08-26 |
| [ADR-040](./ADR-040.md) | A Local Pass claim reserves inventory and must be honored; businesses may pause future claims but cannot cancel active passes, and closures extend affected passes | Confirmed 2026-08-26 |
| [ADR-041](./ADR-041.md) | Reach accepts only official/approved consented analytics connections; no screenshots/manual proof, 90-day validity with one 14-day outage grace, and raw evidence deletion after 30 days | Confirmed 2026-08-26 |
| [ADR-042](./ADR-042.md) | V1 intends Stripe-hosted Express/recipient creator accounts plus platform indirect charges and separate transfers; Local Missions is merchant of record and carries fee/refund/dispute liability behind external approval gates | Confirmed 2026-08-26 |
| [ADR-043](./ADR-043.md) | Approved creator rewards are final against ordinary business disputes/chargebacks; recovery is limited to proven duplicate transfer, creator fraud, or legal order with notice, approval, and appeal | Confirmed 2026-08-26 |
| [ADR-044](./ADR-044.md) | Reserve floor is the greater of `$5,000` or 10% of trailing-90-day gross payment volume, plus 100% of open payment exposure; warn below 125% and pause only new funding below 100% while owed transfers/refunds continue | Confirmed 2026-08-26 |
| [ADR-045](./ADR-045.md) | Platform-wide admin, support, trust/safety, and finance work remains in a protected employee web console; the shared iPhone app contains only Creator, Business, and restricted Venue Staff modes | Confirmed 2026-08-26 |
| [ADR-046](./ADR-046.md) | V1 uses one active Azure region, one modular-monolith API, one worker/job, and one PostgreSQL application database per isolated environment; no Kubernetes or microservices, with Terraform, budgets, alerts, backups, and restore drills from the start | Confirmed 2026-08-26 |
| [ADR-047](./ADR-047.md) | Pre-private-network Azure development is ephemeral and synthetic: use low-cost tiers, baseline firewall/TLS/RBAC controls, test and capture evidence, then destroy and verify the billable workload the same day | Confirmed 2026-08-26 |
| [ADR-048](./ADR-048.md) | Same-day destroy removes all disposable Azure workload resources while a separately managed minimal control plane retains Terraform state, OIDC/identity registrations, domain/DNS ownership, budgets/policy, code, and sanitized evidence | Confirmed 2026-08-26 |
| [ADR-049](./ADR-049.md) | Every ephemeral workload expires at the earlier of eight hours or 11:00 PM America/New_York, warns one hour before, permits one same-day recorded extension, and uses an externally scoped auto-destroy backstop | Confirmed 2026-08-26 |
| [ADR-050](./ADR-050.md) | Community campaigns launch independently of Reach analytics; each Reach platform remains disabled until its own approved integration passes feasibility, security, privacy, provider-policy, reliability, and operational review | Confirmed 2026-08-26 |
| [ADR-051](./ADR-051.md) | Before live creator payments are approved, TestFlight missions are synthetic or clearly noncommercial; no public promotion, commercial content right, or real value is exchanged for simulated payment | Confirmed 2026-08-26 |
| [ADR-052](./ADR-052.md) | Pre-live distribution remains TestFlight-only; public App Store release waits for every live-money/production gate and a ready funded Orlando pilot, then uses manual/phased release with invite-only pilot access | Confirmed 2026-08-26 |
| [ADR-053](./ADR-053.md) | After public release, uninvited Orlando adults may join a data-minimized creator waitlist; sensitive verification waits for invitation, and cohort admission uses mission demand and fair local rotation rather than popularity | Confirmed 2026-08-26 |
| [ADR-054](./ADR-054.md) | After public release, uninvited Orlando businesses may submit a data-minimized interest request; payment and full verification wait for invitation, and admission considers readiness, demand, coverage, and capacity rather than budget alone | Confirmed 2026-08-26 |
| [ADR-055](./ADR-055.md) | Creator/business waitlist entries require annual reconfirmation, withdraw/expire out of selection immediately, delete role-specific data within 30 days, and retain only a non-personal deletion/fairness audit for 12 additional months | Confirmed 2026-08-26 |
| [ADR-056](./ADR-056.md) | Creator invitations allow 14 days and business invitations 30 days to submit user-controlled onboarding inputs; reminders and one seven-day support extension apply, provider/platform delay is excluded, and unused capacity returns without penalty | Confirmed 2026-08-26 |
| [ADR-057](./ADR-057.md) | Declined/validly expired or finally denied invited onboarding closes and deletes Local Missions verification, media, draft, and unfunded payment references within 30 days after the applicable appeal boundary, preserving only the minimal waitlist return and a 12-month non-personal audit | Confirmed 2026-08-26 |
| [ADR-058](./ADR-058.md) | Fixable onboarding issues receive a 14-day correction; final creator/business denials use objective reasons and one 14-day independent appeal targeted within 10 business days, with limited fraud-detail withholding and no cross-role/earned-money harm | Confirmed 2026-08-26 |
| [ADR-059](./ADR-059.md) | Physical-iPhone VoiceOver gesture testing is deferred from M2 to M16; it remains mandatory before M16 passes or external TestFlight expansion begins | Confirmed 2026-08-27 |
| [ADR-060](./ADR-060.md) | Use an organization-scoped GitHub larger runner in an Azure VNet for workflow state access; do not weaken the Storage firewall or attach a self-hosted runner to the public repository | Deferred to M14 on 2026-09-01 |
| [ADR-061](./ADR-061.md) | Use GitHub Free and a reviewed local Terraform operator path until private workflow state networking is justified | Accepted 2026-09-01 |

## Change rule

Do not silently edit accepted decision history. A material change requires a new ADR that names the superseded record, migration effect, evidence, and approval.
