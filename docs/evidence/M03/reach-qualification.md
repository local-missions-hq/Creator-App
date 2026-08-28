# Reach qualification checkpoint

Status: passed  
Date: 2026-08-27  
Checkpoint: `M03-reach-qualification-017`  
Implementation commit: `50cfbca`

## Scope proved

Reach qualification is an optional, per-platform path for Instagram, TikTok, and YouTube. Every platform starts disabled and can be enabled only by an administrator after feasibility, security, privacy, provider-policy, reliability, retention, and operational reviews all pass. Qualification requires explicit Creator consent and an exact approved official API or read-only analytics provider; screenshots, recordings, spreadsheets, emailed reports, exports, manual counts, and combined audiences are not accepted.

The platform derives independent 90-day tiers from an estimated verified local audience: Level 1 at 1,000–4,999, Level 2 at 5,000–19,999, and Level 3 at 20,000 or more. A Reach slot names exactly one platform and one level. Reservation requires a current qualification for that exact offer, then snapshots the platform, level, locked reward, and qualification so later consent changes cannot reduce an already accepted reward.

Community remains a separate inclusive path. Community applications never inspect Reach consent, qualification, audience size, provider status, or outage state. Revoking Reach consent removes future Reach eligibility only; it does not change Community eligibility or an accepted mission reward.

## Privacy, outage, and appeal boundary

- Businesses receive only platform, tier, validity dates, and current/grace status for their own accepted reservation. They cannot read a raw audience count, combined follower total, provider connection, private evidence, or unrelated-platform qualification.
- Private provider/evidence references and the estimated local-audience count are scheduled for deletion 30 days after review or appeal closure. A successful leased deletion clears those fields while retaining only the derived tier, platform, source/methodology, dates, and audit history.
- A documented provider outage may grant one nonrenewable 14-day grace only to a qualification that was valid when that exact outage began. Resolving that outage ends its eligibility, and a later outage cannot reuse the old grace.
- A rejected Creator may submit one timely appeal. The original reviewer cannot decide it; a separate authorized reviewer must use corrected evidence from the same approved provider boundary.
- Immutable database histories protect consent, verification, deletion-attempt, and retention-alert records. Reservation constraints enforce exact Creator/platform/tier qualification at the write boundary.

## Real PostgreSQL proof

Six dedicated integration scenarios passed:

1. All three platforms migrate disabled by default, the schema contains no follower field, and a Community application succeeds while Reach is unavailable.
2. Platform activation fails if any required review is missing; verification fails without consent, with manual evidence, with the wrong provider, or against a disabled platform.
3. Boundary counts derive Levels 1, 2, and 3 for each platform independently without summing audiences.
4. Exact-platform/tier reservation allows one concurrent winner, exposes only derived Business data, rejects another tenant, preserves the accepted reward after consent revocation, and leaves Community available.
5. Grace is tied to one active outage, lasts exactly 14 days after normal expiry, is not renewable, and never revives a qualification that expired before the outage.
6. Independent appeal can produce a corrected tier; the evidence worker then clears private references and raw/derivative count while the retained tier and immutable history remain.

The complete database suite passed 88 tests, and the API suite passed 12 tests. Empty-database and N-1 recovery cover all 17 migrations and 87 tables. Repeated deterministic seed/check, `drizzle-kit check`, manifest verification, `pnpm verify`, the 369-file security scan, and Gitleaks over approximately 12.32 MB all passed.

JUnit evidence: [`test-results/reach-qualification-junit.xml`](./test-results/reach-qualification-junit.xml). Migration: [`../../../packages/db/drizzle/0016_normal_meltdown.sql`](../../../packages/db/drizzle/0016_normal_meltdown.sql).

## Deliberate later work

This checkpoint contacted no social platform or analytics provider and activated no platform capability. It added no live OAuth connection, Azure resource, Stripe action, payment, message, phone dependency, API route, or visible Creator/Business screen. The next UI slice can now present optional Reach setup and exact-platform campaign offers without weakening the Community path. Provider feasibility/compliance review, external adapters, HTTP authorization, mobile/dashboard UI, production retention storage deletion, monitoring, and final policy/legal review remain gated work.
