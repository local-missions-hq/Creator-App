# External legal, financial, policy, and provider gates

Status: Open gates; these are not engineering assumptions  
Date: 2026-08-26

No item below prevents local M1–M4 development with synthetic data and test tooling. Every applicable item blocks live money, commercial missions, or public release until an accountable specialist/provider approves it and the decision is recorded.

## Marketplace and creator relationship

- Confirm marketplace structure, Local Missions' intended merchant-of-record responsibilities, and whether separate charges and transfers are permitted for the final business model.
- Confirm creator classification, onboarding disclosures, age/eligibility checks, tax reporting, payout timing, and treatment of cash plus in-kind benefits.
- Review cancellation, no-show, objective-completion, auto-approval, dispute, refund, chargeback, reserve, recovery, and insolvency language.
- Confirm prohibited mission categories, safety duties, accessibility obligations, insurance, incident handling, venue liability, and required business representations.

## Advertising and content

- Review FTC/platform disclosure language for compensated posts, free meals, products, discounts, and experiences.
- Confirm the rule against positive-review requirements and the difference between honest sponsored content, private feedback, reviews, and endorsements.
- Finalize base and paid content licenses, renewal terms, permitted edits, archival organic posts, takedown duties, model/property releases, music/third-party rights, and AI/synthetic-media prohibitions.
- Confirm how app-store rules apply to marketplace services, content rights, and payments occurring through Stripe rather than in-app purchase.

## Privacy and identity

- Approve the data map, controller/processor roles, privacy notice, consent records, data-subject workflows, incident notice duties, and state/federal applicability.
- Approve collection and deletion schedules for address/locality evidence, raw coordinates, media, identity/business documents, Reach evidence, Local Pass phone data/tokens, logs, audit events, backups, disputes, taxes, and legal holds.
- Confirm SMS OTP/marketing consent separation, anti-abuse deduplication, customer no-account flow, children's-data exclusion, biometrics/identity-provider boundaries, and cross-provider deletion limitations.
- Confirm that Stripe/KYC/bank data cannot be repurposed as locality evidence and that coarse locality/distance-band disclosure is appropriate.

## Payments, accounting, tax, insurance, and reserve

- Obtain Stripe account/configuration approval for saved methods, campaign PaymentIntents, Connect onboarding, separate charges/transfers, transfer groups, refunds, disputes, negative balances, and payout behavior.
- Validate balanced-ledger accounting, revenue recognition for the 15% fee, treatment of processing expenses, slot-level refunds, taxes, discounts, in-kind benefits, rights renewals, and creator reporting.
- Approve insurance coverage and the operating reserve formula; identify where reserve cash is held and how finance certifies availability without commingling creator obligations.
- Document who bears fraud, processor, chargeback, refund, and insolvency losses and the exact exceptional-recovery process.

## Providers and distribution

- Select and approve Entra External ID tenant/configuration, Apple/Google/Microsoft/passwordless identity methods, account-linking/recovery policy, and Apple private-relay handling.
- Select per-platform Reach evidence/provider methods only after API terms, privacy, consent, retention, reliability, and evidence defensibility review. Community launch must remain independent.
- Approve SMS, email/push, object storage, analytics, observability, security scanning, and support providers plus their retention and subprocessor terms.
- Confirm Apple Developer, App Store Connect, Expo/EAS, Azure, Stripe, domain/email, privacy-policy, support, and incident contacts before the applicable milestone.

## Required recorded outcome

Each gate needs an owner, reviewer/authority, evidence link, approval date, scope/environment, expiry or re-review trigger, resulting contract/configuration, and any superseding ADR. Silence, a provider default, a code path, or a successful test transaction is not legal or financial approval.
