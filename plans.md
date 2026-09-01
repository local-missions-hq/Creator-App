# Local Missions — Build, Deployment, and Launch Plan

Working title: Local Missions

Primary market: Orlando, Florida

Primary client: Native iPhone app with Creator, Business, and restricted Venue Staff modes

Companion client: Protected employee web console

Cloud: Microsoft Azure

Current milestone: **M5 — Azure development foundation and continuous delivery**

Current checkpoint: **M05-free-org-federation-saved-plan-reviewed-027**

Next exact task: **Approve or reject federation-only plan SHA-256 `5fbc63430b4778a3e18039109bbe66c065663621fd0025cbd51cffc71a0d3903` and the coordinated still-public repository transfer window; no apply or transfer before approval**

Last updated: 2026-09-01

The former detailed build contract, verification protocols, and dated work entries are preserved in [`historical-completion-log.md`](historical-completion-log.md). Product behavior remains governed by [`architecture.md`](architecture.md), [`docs/product/mvp.md`](docs/product/mvp.md), and [ADR-001 through ADR-059](docs/decisions/README.md).

## How to use this plan

- Work from the first unchecked item in the current milestone. Do not skip ahead because a later task is locally possible.
- A checked item means implementation and its required evidence both passed. Code without external, device, payment, or cloud proof remains unchecked.
- Every Azure plan, Azure apply, Azure destroy, provider configuration, Stripe mode change, TestFlight submission, and App Store release is a separate approval boundary.
- A plan approval never authorizes apply. An apply approval never authorizes a later phase, deployment, live-money change, or destroy.
- Keep secrets, account identifiers, participant data, payment details, raw location evidence, and private media out of Git, screenshots, Terraform state, command arguments, and chat.
- Use synthetic data until the production privacy, security, legal, payment, and operational gates pass.
- Recheck cloud inventory, prices, SKUs, quotas, public IP rules, plan expiry, and artifact digests at action time.
- Preserve unrelated worktree changes. Run focused verification before the full repository gate.
- Record detailed completion evidence under `docs/evidence/Mxx/`; do not append dated session narratives to this file.
- A material change to the accepted V1 product contract requires a superseding ADR.

## Current verified state

| Area | Verified now | Not yet proven |
| --- | --- | --- |
| Product and domain | Founder-approved V1 contract, state machines, PostgreSQL migrations, API contracts, and synthetic workflows are implemented locally. | Production data behavior and provider-backed end-to-end operation. |
| iOS | Shared Expo/React Native Creator and Business prototype builds and runs in Simulator with local adapters and automated UI evidence. | External Identity sign-in, Azure API connectivity, physical-iPhone VoiceOver, signed TestFlight build, and App Store release. |
| Web/API/worker | Local dashboard, API, worker boundaries, authorization, audit, queue, upload, and recovery contracts exist. | Running Azure endpoints and production operations. |
| Azure | Dedicated `Local Missions Development` subscription contains the applied three-resource retained-state bootstrap and 20-resource retained control/landing-zone plane. The empty workload landing zone, budget, alerting, least-privilege workflow RBAC, remote state, locking, and live security controls were independently verified. | Disposable workload, immutable images, endpoints, cloud tests, and same-day teardown. |
| Identity | OIDC/PKCE, token verification, server session, role/workspace, and secretless workflow contracts pass locally. Three protected GitHub environment identities successfully exchanged immutable-subject OIDC tokens and proved their exact live ARM/data permissions without mutation. The `local-missions-hq` GitHub Free organization now exists with one owner and no payment method; its future immutable subjects produced an independently reviewed three-update federation-only saved plan. | Entra External ID tenant/app activation, customer registrations, real-user sign-in, coordinated federation apply/public repository transfer, and end-to-end workflow state access through a later paid private-network path. |
| Stripe | Ledger, funding, payout, refund, idempotency, reconciliation, and webhook behavior are modeled and tested locally with no provider contact. | Stripe test-mode Connect configuration, real test webhooks/transactions, live-mode approval, and real-money operation. |
| Release | Local quality gates and Simulator evidence exist. | Physical-device release candidate, TestFlight, App Review, and controlled Orlando production launch. |

## Milestone map

| Milestone | Outcome | Status |
| --- | --- | --- |
| M0 | Product contract and architecture | Complete |
| M1 | Reproducible local foundation | Complete |
| M2 | Native clickable prototype | Complete; physical VoiceOver intentionally deferred to M16 |
| M3 | Database, API, and domain state machines | Complete locally |
| M4 | Authentication, authorization, and account lifecycle | Complete locally; providers not activated |
| M5 | Low-cost Azure development foundation and deployment cycle | **In progress** |
| M6 | Entra External ID and Azure-connected iOS | Pending |
| M7 | Business onboarding and campaign creation | Pending cloud/provider proof |
| M8 | Creator onboarding, mission discovery, and application | Pending cloud/provider proof |
| M9 | Selection, scheduling, check-in, and location controls | Pending cloud/device proof |
| M10 | Media submission, review, disputes, and rights | Pending cloud/device proof |
| M11 | Stripe Connect test-mode funding, payouts, and reconciliation | Pending |
| M12 | Local Pass, notifications, and worker reliability | Pending provider/cloud proof |
| M13 | Admin, support, trust, safety, and finance operations | Pending |
| M14 | Private staging and production-grade Azure foundation | Pending |
| M15 | Security, privacy, legal, finance, and operational readiness | Pending |
| M16 | Physical-iPhone accessibility, performance, and resilience | Pending |
| M17 | Full release-candidate verification | Pending |
| M18 | TestFlight internal and external beta | Pending |
| M19 | App Store and controlled Orlando production launch | Pending |
| M20 | Post-launch reliability and measured scale gates | Pending |

## M0 — Product contract and architecture

- [x] Freeze the founder-approved V1 behavior and ADR-001 through ADR-059.
- [x] Define roles, state machines, fees, compensation, rights, privacy, pilot limits, and safety boundaries.
- [x] Produce architecture, trust-boundary, product, and synthetic walkthrough evidence.
- [x] Pass the M0 gate without inventing unresolved behavior.

## M1 — Reproducible local foundation

- [x] Create and pin the pnpm/Turborepo monorepo, workspaces, Node, pnpm, lint, type, test, build, and CI policies.
- [x] Add local PostgreSQL/Azurite, synthetic fixtures, environment contracts, and local cleanup.
- [x] Verify API, dashboard, and native iPhone Simulator shells from a clean checkout.
- [x] Pass repository, security, Gitleaks, screenshot, and reproducibility gates.

## M2 — Native clickable prototype

- [x] Implement Creator, Business, Venue Staff, and employee-console prototype flows.
- [x] Verify representative iPhone sizes, dark mode, large text, accessibility order, touch targets, semantic states, and Maestro flows.
- [x] Capture and inspect native and responsive-web evidence.
- [x] Defer actual physical-iPhone VoiceOver gesture testing to M16 under ADR-059 without claiming it complete.

## M3 — Database, API, and domain state machines

- [x] Implement versioned PostgreSQL migrations, constraints, tenant isolation, audit history, immutable ledger behavior, and deterministic fixtures.
- [x] Implement campaign, application, check-in, submission, dispute, payment, Local Pass, rights, notification, locality, and Reach state machines.
- [x] Implement the `/v1` API, OpenAPI snapshot, typed clients, production-fail-closed boundaries, and recovery procedure.
- [x] Pass positive, negative, concurrency, idempotency, authorization, migration, and recovery tests with local PostgreSQL.

## M4 — Authentication, authorization, and account lifecycle

- [x] Implement local account lifecycle, provider binding, sessions, recent authentication, role/workspace switching, export, deletion, and recovery controls.
- [x] Implement mobile OIDC/PKCE orchestration, secure storage boundaries, Entra JWT/JWKS verification, code exchange, refresh rotation, and logout purge.
- [x] Implement server-side authorization matrices and production-fail-closed external-identity configuration.
- [x] Pass local auth, transport, token, role, tenant, replay, cancellation, and failure-path verification without contacting Entra.

## M5 — Low-cost Azure development foundation and continuous delivery

Goal: prove a reproducible, least-privilege Azure development deployment using synthetic data, bounded low tiers, secretless automation, and independently verified same-day teardown.

### M5.1 — Local infrastructure and safety contracts

- [x] Build guarded Terraform bootstrap, retained control-plane, and disposable workload roots.
- [x] Define the three-resource retained-state bootstrap, 20-resource retained control/landing zone, 27-resource workload core, and three-app activation delta. The control-plane count includes three required container-scoped state-backend role assignments discovered and corrected during real migration.
- [x] Define Local Missions-only naming, East US 2 candidate placement, required tags, scale ceilings, expiration, recovery, and destroy boundaries.
- [x] Define separate plan/apply/destroy identities, immutable GitHub federation subjects, constrained RBAC, and no-long-lived-secret policy.
- [x] Define low-cost public estimates: `$1/month` retained-state ceiling, a `$2` two-hour smoke tier for the first workload run, and a `$5` absolute eight-hour fallback ceiling; the owner later raised the monthly alert budget from the original `$25` proposal to `$100` without making it a spend target.
- [x] Pass local Terraform, placement, readiness, saved-plan, run-ledger, cost, security, and aggregate M5 checks without Azure mutation.

### M5.2 — Dedicated subscription and retained-state plan

- [x] Create and verify the dedicated `Local Missions Development` subscription with zero resource groups and zero resources.
- [x] Confirm the current operator has the required owner boundary without changing the unrelated subscription default.
- [x] Detect the operator IPv4 process-only and generate a provider-backed saved plan with exactly three creates, zero changes, and zero destroys.
- [x] Independently inspect and record the sanitized plan digest, provider lock, source digest, expiry, resource counts, and zero-mutation Azure inventory.

### M5.3 — Retained-state bootstrap apply and migration

- [x] Obtain explicit owner approval to apply only the reviewed three-resource bootstrap saved plan.
- [x] Reject the expired prior plan; revalidate the replacement saved-plan SHA-256, source/provider-lock digests, current public IPv4, exact tenant/subscription, operator authority, and zero-resource inventory.
- [x] Explicitly register only `Microsoft.Storage`, verify registration creates no resources, and keep Terraform automatic provider registration disabled.
- [x] Apply only the exact reviewed replacement plan: retained-state resource group, hardened Storage account, and private state container.
- [x] Verify Microsoft Entra data-plane access, shared-key disablement, public/anonymous denial, narrow network rule, TLS, encryption, versioning, retention, tags, and `prevent_destroy` expectations.
- [x] Add one temporary operator `Storage Blob Data Contributor` assignment at the private container scope because subscription Owner does not grant Entra Blob data access.
- [x] Migrate bootstrap state to `local-missions/bootstrap.tfstate`, reserve distinct control/workload keys, and prove remote locking and clean initialization without credentials in Terraform state.
- [x] Remove the consumed plans and one-time local state only after remote-state/version verification; retain sanitized evidence and hashes.
- [x] Reconcile Azure to exactly the three expected Terraform-managed retained-state resources plus the explicitly tracked provider registration and temporary container-scoped operator RBAC assignment.

### M5.4 — Retained control and landing zone — current gate

- [x] Supply the monitored cost-alert destination process-only and verify its email shape without committing the address as a fixture.
- [x] Approve the revised `$100/month` alert budget, select the `$2` two-hour smoke tier first, retain `$5`/eight hours only as a fallback ceiling, and retain 50%/80%/100% actual and forecast alerts through the owner's 2026-09-01 direction.
- [x] Reverify current East US 2 control-plane availability, zero assigned policy, no dedicated control-plane SKU quota, exact provider registrations, and all 17 unchanged public workload meters before planning; defer workload provider/quota proof to M5.5.
- [x] Create and verify the security-enabled `Local Missions PostgreSQL Administrators` Entra group with one explicit human owner/member and no application runtime use.
- [x] Configure three main-only GitHub environments, require `stratiosai` review with no administrator bypass, record the single-human self-review exception, enable immutable OIDC, and process-confine the three exact owner/repository-ID subjects.
- [x] Generate a real saved plan for exactly 20 retained control-plane resources; record its sanitized digest/count/cost/security evidence and stop.
- [x] Obtain separate approval for the exact 20-resource plan.
- [x] Apply only the reviewed control-plane plan and verify two retained resource groups, three identities, three federated credentials, two custom roles, five workload scoped assignments, three state-container assignments, one action group, and one budget. Azure normalized the protected budget period to September 1, 2026 through September 1, 2027; the local defaults were corrected and a normal provider-backed plan then proved zero changes.
- [x] Obtain separate approval to activate a no-apply GitHub OIDC proof that each workflow identity receives only its intended environment subject, control command policy, remote-state access, and landing-zone permissions.
- [x] Approve and complete the three protected GitHub environment jobs. Prove OIDC token exchange, exact landing-zone ARM permissions, control-group denial, and state data-action assignment without Azure mutation. The actual Blob read remained blocked by the default-deny firewall as designed.
- [x] Design and locally validate the least-privilege workflow state-network method and operator recovery sequence. Reject global/dynamic IP allowlists, all-networks mode, trusted-service bypass, and a self-hosted runner on the public repository; propose an organization-scoped GitHub Team larger runner in an exact East US 2 VNet subnet.
- [x] Reject the current paid GitHub Team/larger-runner option and defer its `$4/month` seat, paid minutes, and Azure VNet integration to M14. No payment information was entered and no paid plan or runner was created.
- [x] Create `local-missions-hq` on GitHub Free under the personal `stratiosai` account, with one owner, zero repositories, no invitations, and no payment method. Keep the existing repository public and untransferred.
- [x] Preview the future immutable organization/repository subjects and generate one federation-only retained saved plan. Independent review proved exactly three in-place federated-credential subject updates, zero creates/deletes/replacements, zero network/RBAC/budget/workload changes, mode `0600`, and SHA-256 `5fbc63430b4778a3e18039109bbe66c065663621fd0025cbd51cffc71a0d3903`.
- [ ] Independently approve or reject that exact saved plan and a coordinated transfer window. The apply must occur immediately before the still-public repository transfer, with rollback and environment reconciliation ready; approval authorizes neither workload planning nor any paid GitHub feature.
- [ ] Revalidate the plan/source/provider-lock digests, current personal repository ownership, free organization ownership, unchanged Azure inventory, and current operator state access; apply only the three reviewed subject updates and independently reconcile Azure.
- [ ] Transfer the still-public `Creator-App` repository to `local-missions-hq`, verify the stable repository ID, all three protected environments, main-only review rules, immutable OIDC setting, branch protection, Actions permissions, and origin redirect, then run a no-Terraform OIDC/ARM proof that still expects the default-deny Blob refusal.
- [ ] Keep provider-backed Terraform plan/apply/destroy on the reviewed local operator path while GitHub Free is selected. Do not allowlist standard-runner IP ranges, discover/add dynamic runner IPs, open Storage, enable trusted-service bypass, or attach a self-hosted runner to the public repository.
- [ ] Retain the temporary operator state-container role until a separately approved recovery path and later paid private-runner proof exist; do not misreport GitHub workflow remote-state access as complete.
- [ ] Prove plan cannot apply/delete, apply cannot delete, destroy cannot delete the landing-zone group, and delegated RBAC is limited to the five approved application data roles.

### M5.5 — Disposable workload core and immutable images

- [ ] Replace the historical single-plan evidence/run-ledger fixtures with an activation-valid V2 contract covering bootstrap, control plane, core, image publication, app activation, tests, destroy, and reconciliation.
- [ ] Revalidate the Node base-image digest, dependency lockfiles, Docker build inputs, current public IP allowlist, low-cost SKUs, quota, and the selected `$2` two-hour smoke duration; use the `$5` eight-hour tier only after a separately recorded need.
- [ ] Generate and independently review a saved plan containing exactly the 27-resource workload core and no Container Apps; stop before apply.
- [ ] Obtain separate approval for the exact core plan and cost ceiling.
- [ ] Apply the core plan, run migrations, and seed synthetic data only.
- [ ] Build API, dashboard, and worker images from the recorded commit; scan, sign/attest, push to the disposable registry, and record immutable SHA-256 digests.
- [ ] Generate and independently review the three-Container-App activation plan using only those immutable digests; stop before apply.
- [ ] Obtain separate approval and apply only the reviewed three-app activation delta.

### M5.6 — Azure cloud proof and same-day teardown

- [ ] Verify build/commit endpoints, liveness/readiness, TLS, CORS, network restrictions, managed identities, database auth, storage, queue, Key Vault, telemetry, and dashboard-to-API connectivity.
- [ ] Run synthetic migration, API, authorization, upload, queue, worker, retry/DLQ, backup/restore, rollback, and recovery checks.
- [ ] Verify budget/action-group delivery, cost tags, scale ceilings, expiry warning, and the externally retained cleanup control.
- [ ] Capture sanitized resource, identity, endpoint, test, trace, cost, and recovery evidence.
- [ ] Generate and independently review a destroy plan scoped to the exact stamped 30-resource workload; stop before destroy.
- [ ] Obtain separate destroy approval, destroy the disposable workload, and independently reconcile Terraform plus live Azure to zero stamped workload resources.
- [ ] Prove the three-resource state bootstrap and expected 20-resource control plane remain intact and separately reported.
- [ ] Pass the M5 gate with one reproducible create/test/rollback/destroy cycle, no unexplained orphan, no long-lived Azure credential, and no participant or payment data.

## M6 — Entra External ID and Azure-connected iOS

Goal: replace local preview identity and transport with real development identity and an Azure API while retaining production-fail-closed behavior.

- [ ] Create or approve the Entra External ID tenant and development app registrations for iOS, API, and web with exact issuer, audience, scopes, callbacks, and logout URLs.
- [ ] Configure approved sign-in providers, consent text, test users, redirect/deep-link ownership, and recovery rules without client secrets in the iOS app.
- [ ] Store unavoidable provider secrets through the approved direct secret-entry process, never Terraform variables/state or chat.
- [ ] Activate Azure API auth and validate JWKS rotation, token expiry, nonce/state/PKCE, cancellation, email-code, unknown-user, disabled-user, and provider-outage paths.
- [ ] Connect the iOS development build to the Azure API using memory-only access tokens, protected rotating refresh tokens, and server-resolved roles/workspaces.
- [ ] Verify Creator, Business, and Venue Staff authorization on Simulator and at least one physical iPhone; prove cross-role and cross-tenant denial.
- [ ] Capture sanitized auth/network/device evidence and pass the M6 gate without production users or live money.

## M7 — Business onboarding and campaign creation

- [ ] Connect business interest, invitation, verification, correction, appeal, expiry, and deletion lifecycle to the real API.
- [ ] Implement and verify organization membership, locations, venue contacts, staff readiness, and tenant-scoped permissions.
- [ ] Complete all four structured mission templates, objective checklist limits, media requirements, disclosures, content rights, add-ons, and renewal terms.
- [ ] Enforce Community/Reach allocation, fixed Reach formulas, 15% processing-inclusive platform fee, Creator Reward Pool, and exact Total Due server-side.
- [ ] Implement admin review, rejection/correction, versioning, re-review, and creator re-consent after material changes.
- [ ] Verify local and Azure positive/negative/concurrency paths and pass the M7 gate with no Stripe charge yet.

## M8 — Creator onboarding, mission discovery, and application

- [ ] Connect creator waitlist, invitation, adult eligibility, locality verification, payout-readiness placeholder, correction, appeal, expiry, and deletion lifecycle.
- [ ] Implement real API-backed mission feed, detail, filters, eligibility, Community protection, and optional per-platform Reach status.
- [ ] Show exact reward, in-kind value, schedule, locality band, checklist, disclosure, rights, cancellation, and objective acceptance terms before application.
- [ ] Implement idempotent application, withdrawal, capacity reservation, duplicate/race handling, and tenant-safe visibility.
- [ ] Verify offline/retry, stale data, empty/error/loading states, Dynamic Type, and accessibility on Simulator and physical iPhone.
- [ ] Pass the M8 gate with synthetic identities and no live payment obligation.

## M9 — Selection, scheduling, check-in, and location controls

- [ ] Implement business selection with qualification snapshots, capacity enforcement, replacement rules, and immutable acceptance terms.
- [ ] Implement creator schedule acknowledgement, reminders, cancellation/no-show, venue-closed, and business-caused failure paths.
- [ ] Implement rotating QR and staff-code check-in with server time, venue scope, replay protection, throttling, and offline-safe retry messaging.
- [ ] Collect location only during the disclosed mission window and store the minimum evidence needed for objective verification.
- [ ] Verify staff authorization, expired/replayed challenges, wrong venue, clock skew, duplicate scans, denied permissions, and location deletion.
- [ ] Pass the M9 cloud/device gate with sanitized synthetic evidence.

## M10 — Media submission, review, disputes, and rights

- [ ] Implement short-lived direct Blob upload grants, private containers, content-type/size limits, checksum, resumable uploads, quarantine, and malware-processing states.
- [ ] Prevent media bytes from traversing API memory and prove identity-scoped read/write access.
- [ ] Implement checklist completion, submission finalization, one bounded revision, 48-hour auto-approval, dispute, independent decision, and audit timeline.
- [ ] Activate content rights only after valid full payment state; enforce exact assets/channels/terms, expiry, renewal, archive, and removal behavior.
- [ ] Verify interrupted/duplicate/oversized/invalid uploads, unauthorized media access, unreasonable revisions, races, deletion, and recovery.
- [ ] Pass the M10 gate on Azure and physical iPhone using synthetic noncommercial media.

## M11 — Stripe Connect test-mode funding, payouts, and reconciliation

Goal: prove the marketplace money lifecycle in Stripe test mode before any live-mode or commercially useful mission.

- [ ] Confirm Stripe platform/Connect account model, country/currency, controller responsibilities, onboarding approach, and current API version with Stripe, legal, accounting, and tax owners.
- [ ] Create development/test-mode restricted keys and webhook endpoint through a secret-safe direct configuration path; keep all Stripe secrets out of Terraform, Git, logs, screenshots, and chat.
- [ ] Implement connected-account onboarding/status, requirements, capability checks, and payout-readiness without storing prohibited bank/identity data.
- [ ] Implement test-mode business funding only after campaign approval and explicit **Fund and Publish** confirmation.
- [ ] Verify the 15% processing-inclusive platform fee, integer-minor-unit calculations, PaymentIntent/idempotency behavior, provider references, and immutable double-entry ledger.
- [ ] Implement signed webhook ingestion, event persistence, duplicate/out-of-order handling, retries, dead-lettering, replay controls, and safe operational visibility.
- [ ] Implement full creator payable, transfer/payout status, refund, dispute, chargeback, failure, retry, and manual finance-exception boundaries.
- [ ] Build daily/provider-triggered reconciliation and prove zero unexplained difference across campaign funds, creator obligations, platform fees, refunds, and Stripe test objects.
- [ ] Run Stripe CLI/official test fixtures plus one complete test-mode mission; prove no live key, live object, real charge, or real payout was used.
- [ ] Capture sanitized evidence and pass the M11 gate. Live mode remains blocked until M19.

## M12 — Local Pass, notifications, and worker reliability

- [ ] Connect opaque Local Pass claim, verification, resend/risk limits, rotating redemption QR, venue authorization, inventory, substitution, and customer-safe status.
- [ ] Keep claim/redemption/verified-purchase confidence classes separate and prevent performance from changing guaranteed creator pay.
- [ ] Activate transactional email/SMS/push providers with consent, minimization, templates, deep links, unsubscribe rules, and provider-specific secret controls.
- [ ] Run notification and Local Pass work through durable outbox/Service Bus workers with leasing, idempotency, retry, DLQ, replay, and audit visibility.
- [ ] Verify provider outage, delayed/duplicate messages, bad numbers, opt-out, token rotation, replay, inventory races, and retention/deletion deadlines.
- [ ] Pass the M12 gate with provider sandboxes/test destinations and no production marketing sends.

## M13 — Admin, support, trust, safety, and finance operations

- [ ] Complete protected employee sign-in, device/session controls, least-privilege roles, and separation between admin, support, trust/safety, and finance.
- [ ] Connect business/campaign approval, disputes, appeals, payout/refund exceptions, content/license operations, deletion jobs, and provider replays to audited workflows.
- [ ] Implement immutable audit search, reason codes, before/after views, dual control for sensitive actions, and safe evidence access.
- [ ] Implement kill switches for funding, publishing, assignment, check-in, payout, notifications, and provider integrations without corrupting in-progress obligations.
- [ ] Build operational dashboards, queues, aging/SLA alerts, on-call ownership, incident templates, and manual reconciliation/runbooks.
- [ ] Pass role-abuse, cross-tenant, enumeration, support-escalation, finance-separation, and audit-reconstruction tests.

## M14 — Private staging and production-grade Azure foundation

- [ ] Revisit the deferred GitHub Team/larger-runner private-network option only if automated Terraform state access is still justified; recheck current pricing, use a separate GitHub spend approval/budget, and require an exact Azure VNet/network-settings saved plan before any purchase or network change.
- [ ] Create separate staging and production naming, subscriptions/resource groups, Terraform state, identities, secrets, databases, storage, queues, telemetry, budgets, and approval environments.
- [ ] Revalidate architecture, East US 2 availability, low-cost production-capable SKUs, quotas, pricing, backup retention, scaling assumptions, and cost alerts.
- [ ] Add VNet integration, private endpoints, private DNS, disabled public data-service access, egress controls, WAF/managed edge decision, custom domains, and certificates.
- [ ] Use immutable artifacts promoted from tested builds; prohibit rebuild drift between development, staging, and production.
- [ ] Implement safe migrations, revision traffic control, health gates, rollback, backup/PITR, Blob recovery, and independent restore drills.
- [ ] Generate/review/apply staging through separate approvals; verify isolation and complete a full synthetic staging deployment.
- [ ] Generate and review the production Terraform plan and cost model; do not apply until M19 production authorization.
- [ ] Pass the M14 gate with private staging, zero environment crossover, tested recovery, and documented lowest-safe operating tiers.

## M15 — Security, privacy, legal, finance, and operational readiness

- [ ] Complete threat modeling for auth, tenant isolation, QR, upload, webhooks, payments, employee access, and infrastructure control paths.
- [ ] Run dependency, secret, SAST, container, Terraform, authorization, rate-limit, abuse, and independent penetration reviews; close all critical/high findings.
- [ ] Complete data inventory, retention/deletion/backup-aging proof, account export/deletion, locality/Reach/Local Pass/media privacy controls, and App Privacy worksheet.
- [ ] Obtain counsel-approved Terms, Privacy Policy, content/license language, disclosures, prohibited missions, support/refund/dispute terms, and age/eligibility rules.
- [ ] Obtain Stripe, accounting, tax, insurance, reserve, chargeback, escheatment, and money-flow approvals required for live marketplace operation.
- [ ] Staff named operations, finance, trust/safety, privacy, security, and technical on-call owners with escalation and incident runbooks.
- [ ] Verify pilot caps, reserve gate, manual business/campaign approval, support coverage, kill switches, and continuity procedures.
- [ ] Pass the M15 launch-readiness audit with every blocker owned and no silent waiver.

## M16 — Physical-iPhone accessibility, performance, and resilience

- [ ] Complete ADR-059 physical-iPhone VoiceOver Creator and Business gesture paths; record defects and successful retests.
- [ ] Verify supported physical iPhones/iOS versions, Dynamic Type, contrast, Reduced Motion, permissions, camera, photos, location, notifications, deep links, backgrounding, and relaunch.
- [ ] Define and meet app-start, mission-feed, API p95, upload-success, crash-free-session, queue-lag, and telemetry-cost budgets.
- [ ] Load-test feed, capacity races, check-in, uploads, Stripe webhook bursts, notification jobs, and employee queues within low-tier scale ceilings.
- [ ] Drill PostgreSQL, Blob, Service Bus, Stripe, notification provider, Entra, bad revision, and migration failures with documented recovery outcomes.
- [ ] Pass M16 with no critical/high security or accessibility issue and no unmet launch-blocking resilience objective.

## M17 — Full release-candidate verification

- [ ] Freeze one immutable staging release candidate across API, dashboard, worker, database migrations, contracts, and iOS build inputs.
- [ ] Run unit, property, component, integration, OpenAPI, Playwright, Maestro, Stripe test-mode, Terraform, accessibility, security, load, restore, and rollback suites.
- [ ] Complete the golden mission from business approval/funding through creator payout, Local Pass redemption, audit reconstruction, and zero-difference reconciliation.
- [ ] Complete launch-blocking negative journeys: races, cancellations, venue failure, no-show, QR replay, upload failure, revision dispute, payment failure, webhook disorder, cross-tenant access, deletion, and network loss.
- [ ] Capture JUnit, coverage, traces, screenshots, redacted API examples, correlation traces, reconciliation, accessibility, security, load, and recovery evidence.
- [ ] Pass M17 only when the golden and negative journeys succeed on the same immutable candidate.

## M18 — TestFlight internal and external beta

- [ ] Freeze bundle ID, Expo project, EAS profiles, signing ownership, permissions, universal links, privacy manifests, versioning, and App Store Connect record.
- [ ] Build and submit the exact staging candidate to internal TestFlight using approved Apple/EAS credential handling.
- [ ] Keep persistent **TEST MODE — no real payment** treatment and prohibit commercially useful missions, marketing reuse, content licenses, and production reliability effects.
- [ ] Complete internal real-device scripts for install/upgrade, auth, roles, permissions, deep links, check-in, upload, background/relaunch, offline behavior, accessibility, and support.
- [ ] Expand to a small external beta only after M16 VoiceOver proof and internal exit criteria pass.
- [ ] Complete at least five synthetic/noncommercial missions with no duplicate application, notification, approval, transfer, or payout.
- [ ] Meet selected crash-free, check-in, upload, support, and tester-feedback exit criteria; exercise rollback and support runbooks.
- [ ] Pass M18 while all distribution remains TestFlight-only and Stripe remains test mode.

## M19 — App Store and controlled Orlando production launch

- [ ] Confirm one approved funded Community campaign, sufficient invited verified creators, staffed support, and named go/no-go, rollback, finance, and technical owners.
- [ ] Reconfirm every M11/M14/M15 live-money, private-network, reserve, legal, accounting, tax, insurance, privacy, security, and operations gate.
- [ ] Provision production only from the separately reviewed and explicitly approved Terraform plan; verify budgets, private networking, backups/restores, identities, alerts, and zero test/prod crossover.
- [ ] Configure Stripe live mode through the approved secret-safe procedure; verify mode isolation, Connect capabilities, webhooks, controlled transactions, reconciliation, refund, and payout controls.
- [ ] Verify production Entra registrations, domains, policies, support/marketing/privacy URLs, account deletion, App Privacy details, age rating, and App Review instructions.
- [ ] Submit the signed production iOS build, answer review questions, and hold manual release until the final go/no-go record is approved.
- [ ] Start a phased Orlando release with invitation-only paid workflows, data-minimized public interest/waitlist paths, production pilot caps, reserve checks, and independent kill switches.
- [ ] Run one controlled funded Community campaign, pay creators, handle any refunds/disputes, reconcile money and audit history manually, and close every launch alert.
- [ ] Pass M19 only after the campaign reconciles to zero unexplained difference and the launch review accepts the operational evidence.

## M20 — Post-launch reliability and measured scale gates

- [ ] Review weekly mission fill, completion, no-show, business-caused failure, approval/payout latency, disputes, refunds, fraud loss, support effort, retention, and unit economics.
- [ ] Review crash-free sessions, API SLOs, uploads, queues, notifications, Stripe reconciliation, Azure cost, restore readiness, privacy requests, and security events.
- [ ] Keep Community launch independent of Reach; activate any social platform only after its own feasibility, security, privacy, policy, reliability, and operations approval.
- [ ] Keep Orlando pilot caps until at least 50 creator slots complete and an explicit review supports a controlled increase.
- [ ] Add Android, new markets, POS integrations, AI matching, or higher Azure tiers only from measured demand and a separately approved ADR/cost plan.
- [ ] Mark the V1 roadmap complete only when production remains reliable, financially reconciled, privacy-safe, supportable, and within its approved operating budget.

## Completion definition

Local Missions reaches the requested completed state when all M0–M19 gates are checked and the first controlled Orlando Community campaign has:

- run through the production iOS app and protected employee console;
- authenticated through production Entra External ID;
- used the approved production Azure architecture and lowest safe reviewed tiers;
- funded, paid, refunded where necessary, and reconciled through Stripe live mode;
- preserved objective mission, content-rights, locality, privacy, audit, and support rules;
- passed physical-iPhone accessibility, security, recovery, and operational evidence gates; and
- ended with zero unexplained financial, infrastructure, privacy, or security discrepancy.

M20 is the continuing operating and measured-scale phase after that controlled launch.
