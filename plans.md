Local Missions — iOS App Build and Verification Plan

Working title: Local Missions
Primary market: Orlando, Florida
Primary client: Native iPhone app with Creator and Business modes
Companion client: Responsive admin/support web dashboard and optional desktop business views
Cloud: Microsoft Azure
Plan status: Executing locally; external/live gates remain closed
Current milestone: M1 gate remediation; M2 native prototype prework in progress
Last updated: 2026-08-26

## Live execution checklist

This checklist is the current proof-based status view. The detailed milestone sections below remain the build contract. A checked item has current code plus the evidence required by the checking rules; a partially implemented or externally gated item remains unchecked.

### M0 — Product contract and architecture

- [x] Freeze the founder-approved V1 product contract and ADR-001 through ADR-058.
- [x] Generate the ADR files and verify the register has no drift.
- [x] Record the trust boundaries, legal/provider gates, and synthetic Orlando tabletop walkthrough.
- [x] Save M0 evidence under `docs/evidence/M00/`.
- [x] Pass the M0 explainability gate without inventing behavior.

### M1 — Local foundation and reproducibility

- [ ] Identify and record all external prerequisites: Apple Developer/App Store Connect, Expo organization, Azure region/cost owner/alert destination, Stripe test account, Entra External ID tenant plan, and domain/email placeholders.
- [x] Initialize the pnpm/Turborepo monorepo and all eight planned workspaces.
- [x] Pin Node/pnpm and add shared TypeScript, ESLint, Prettier, CI, dependency, pre-commit, and pull-request policies.
- [x] Add local PostgreSQL/Azurite services, synthetic fixtures, environment-name-only examples, and a same-day destroy path.
- [x] Add empty Terraform environment/module boundaries without creating Azure resources.
- [x] Make `pnpm verify` pass formatting, lint, type checks, tests, contracts, and builds.
- [x] Run and verify the local API health endpoint.
- [x] Run and verify the dashboard shell.
- [x] Run and visually verify the mobile shell in a native iPhone Simulator.
- [x] Capture native iPhone shell screenshots under `docs/evidence/M01/` and inspect them for clipping or exposed values.
- [x] Confirm sensitive environment/signing artifacts are ignored and pass the repository fallback secret scan.
- [ ] Prove a clean install from a separate fresh committed checkout.
- [ ] Prove independent hot reload for mobile, dashboard, and API sessions.
- [ ] Run Gitleaks rather than only the repository fallback scanner.
- [x] Capture and inspect the dashboard shell at desktop and mobile widths.
- [ ] Pass the complete M1 gate.

### M2 — Native clickable prototype

Participant/Creator iPhone views:

- [x] Welcome, shared role choice, and Creator/Business sign-in views.
- [x] Creator profile setup preview.
- [x] Mission feed with Community Slot and optional Reach treatment.
- [x] Search/filter sheet.
- [x] Mission details with compensation, locality, deliverables, disclosure, rights, and consent.
- [x] Local-only application confirmation and accepted-state handoff.
- [x] My Missions list with status sections.
- [x] Full mission-instructions view.
- [x] Accepted schedule and preparation state.
- [x] Synthetic QR check-in and staff-code fallback view.
- [x] Deliverable checklist with upload progress, pause/retry, and resume messaging.
- [x] Submission timeline and one bounded revision-request view.
- [x] Earnings view with `Funded → Pending review → Available → Paid` preview states.
- [x] Profile, annual locality verification, payout setup, consent history, support, and account-deletion views.

Business iPhone views:

- [x] Business setup and location-verification preview.
- [x] Business dashboard with campaign summary and launch checklist.
- [x] Complete the clickable campaign creation wizard, including brief, deliverables, rights, budget, review, synthetic admin approval, and local-only Fund and Publish states.
- [x] Applicants and capacity.
- [x] Submission review and revision decision.
- [x] Campaign results and Local Pass attribution.
- [x] Restricted Venue Staff check-in view.

Admin/support web views:

- [x] Admin review queue.
- [x] Admin audit timeline.
- [x] Support/dispute view.

Prototype quality and verification:

- [x] Complete and document the semantic design system and all success/warning/error/pending/locked/empty/loading/offline patterns.
- [ ] Complete WCAG AA, touch-target, VoiceOver, and Dynamic Type audits.
- [x] Add native-feeling tab navigation.
- [x] Add native-feeling sheets.
- [x] Use realistic synthetic Orlando data without personal information or live payment identifiers.
- [x] Show exact compensation, deadline, locality, deliverables, disclosure, and rights before Creator application confirmation.
- [ ] Finish the smallest/standard/max iPhone, dark mode, large text, empty/long/loading/error/offline verification matrix.
- [x] Verify the current standard-size iPhone 17 Pro in light mode with standard text and save native screenshots.
- [x] Verify representative Creator and Business routes on iPhone 17 Pro in Dark appearance and save native screenshots.
- [x] Inspect Business funding/review on iPhone SE at Accessibility Large and repair the observed critical horizontal clipping.
- [x] Verify representative Creator and Business contract/payment routes on iPhone 17 Pro Max with standard text.
- [x] Audit and repair native accessibility order on Creator application and Business review/publish money paths.
- [x] Enforce a 44 × 44 pt minimum touch target on every React Native Pressable through a shared wrapper and regression test.
- [x] Silence decorative icons and avatar initials across the prototype, with a source-level regression test.
- [x] Inspect remaining Creator account/support, Business review/results, and Venue Staff routes on iPhone SE at Accessibility Large; repair observed clipping and reading-order defects.
- [x] Run representative Xcode Accessibility Inspector audits with description, contrast, hit-region, detection, clipped-text, traits, and Dynamic Type checks enabled.
- [x] Verify representative Creator account/payout, Business results, and Venue Staff routes on iPhone SE at Accessibility Large in Dark appearance.
- [x] Verify the Creator mission lifecycle and Business creation/review routes on iPhone SE at Accessibility Large in Dark appearance, including synthetic publish and approval terminal states.
- [x] Verify Creator and Business success/warning/error/pending/locked/empty/loading/offline state sheets on iPhone SE at Accessibility Large in Light and Dark appearances.
- [ ] Add and run the Creator and Business Maestro prototype flows.
- [x] Add stable accessibility labels/test IDs to every critical control in the complete prototype.
- [x] Add Creator and Business Maestro YAML flows and statically validate every referenced test ID.
- [ ] Execute both Maestro flows against the iPhone Simulator and retain run artifacts.
- [x] Implement and inspect the required admin/support web routes at desktop and mobile widths.
- [x] Pass the narrated end-to-end M2 gate with no critical large-text clipping.

1. How to use this file

This is the build contract for the project. Keep it in the repository root as plans.md and update it continuously.

Rules for checking boxes:

Do not check off an implementation task until the code is committed or intentionally recorded as a local checkpoint.

Do not check off a verification task until the command or manual test actually passes.

Do not check off a visual task until the required screenshot exists in docs/evidence/<milestone>/screenshots/.

Do not advance to the next milestone until the milestone gate passes.

If a task is intentionally skipped, leave it unchecked and add an ADR explaining why.

Record failures as evidence too. A failed test should not disappear from the history without a short cause and resolution note.

Never put secrets, personal information, access tokens, Stripe identifiers, raw location history, or participant media into screenshots or committed fixtures.

At the start of every work session:

Read this entire file.

Read README.md, docs/architecture/, and any repository-specific agent instructions.

Check git status and preserve unrelated user changes.

Identify the first unchecked task in the current milestone.

Run the milestone's fast baseline tests before modifying code.

Implement the smallest complete slice.

Run focused tests, then the milestone gate.

Capture evidence and update this file.

At the end of every work session, append a short entry:

### YYYY-MM-DD — short session title

- Milestone: Mx
- Completed: ...
- Verification: `command` — PASS/FAIL
- Evidence: `docs/evidence/Mx/...`
- Decisions: ADR-00x or none
- Blockers: ...
- Next exact task: ...

2. Product outcome

Local Missions connects businesses with local adults who complete clearly defined, paid promotional missions.

A business can create a mission such as:

Visit our family activity center Wednesday afternoon, check in, capture three vertical videos and five photos, submit the original files, and optionally share an honestly disclosed post.

A participant uses the iPhone app to discover the mission, understand the compensation and requirements, apply, attend, check in, submit work, respond to a valid revision request, and track the payment state.

The platform helps the business coordinate visits, obtain licensed content, and measure stronger outcomes through unique Local Pass links, codes, bookings, or redemptions. The platform earns a fee for coordination, verification, reporting, and payment operations.

MVP success path

flowchart TD
    A[Business submits mission] --> B[Admin approves]
    B --> C[Business funds and publishes]
    C --> D[Participant applies]
    D --> E[Business accepts]
    E --> F[Participant checks in]
    F --> G[Participant submits]
    G --> H[Business approves]
    H --> I[Payout released]
    I --> J[Results reported]

MVP roles

Role

Primary interface

Main capability

Participant

iPhone app

Discover and complete paid missions

Business owner/manager

Native iPhone app; optional desktop web companion

Create, fund, staff, and review campaigns

Venue staff

Restricted iPhone app mode; mobile-web fallback

Confirm mission and check-in details

Platform admin/support

Web dashboard

Approve, investigate, override, and audit

MVP non-goals

No social feed, swiping, public comments, or creator-to-creator chat.

No continuous background location tracking.

No automated positive-review requirement.

No follower-count requirement for regular UGC missions.

No cryptocurrency, stored-value wallet, or language suggesting funds are held in escrow.

No government dashboard, satellite data, POS integration, AI matching, or multiple-city launch.

No native Android release until the iOS workflow is stable, although React Native must remain Android-capable.

3. Architecture and technology decisions

3.1 Recommended stack

Layer

Technology

Reason

iPhone app

React Native with the current stable Expo SDK and TypeScript

Native app behavior, rapid iteration, EAS builds, future Android path

Navigation

Expo Router

File-based routing, deep links, protected route groups

Mobile data

TanStack Query

Server-state caching, retries, invalidation, offline-friendly reads

Mobile forms

React Hook Form + Zod

Typed validation shared with API contracts

Small local state

Zustand

Only for transient UI state; server data stays in TanStack Query

Secure mobile values

Expo SecureStore

Token/cache secrets; never AsyncStorage for tokens

Admin/support web and optional desktop business companion

Next.js + TypeScript + Tailwind + shadcn/ui

Platform-wide operational UI, optional desktop business efficiency, and strong browser testing

Confirmed surface boundary: employee admin, support, trust/safety, and finance operations are web-console only and optimized for laptop/desktop use. Creator, Business, and restricted Venue Staff remain the only shared iPhone-app modes; the optional business web companion cannot replace complete native Business workflows.

API

NestJS using Fastify adapter

Structured TypeScript service, OpenAPI, validation, testability

API hosting

Azure Container Apps

Containers, managed identity, revisions, scale-to-zero, predictable API runtime

Background work

Azure Service Bus + Container Apps Jobs/worker

Reliable retries for webhooks, notifications, media, and payout work

Database

Azure Database for PostgreSQL Flexible Server

Relational transactions fit applications, payments, and state machines

ORM/migrations

Drizzle ORM + SQL migrations

Explicit schema and TypeScript types without hiding SQL

File storage

Azure Blob Storage

Direct media uploads with short-lived, narrowly scoped SAS URLs

Customer identity

Microsoft Entra External ID

Azure-aligned customer identity and standards-based OIDC

Initial mobile auth flow

System-browser authorization code flow with PKCE

Safer and lower risk in Expo than custom password handling

Payments

Stripe Connect in test mode first

Marketplace onboarding, collection, transfers, and webhooks

Web hosting

Azure Static Web Apps or Container Apps for the dashboard

Low operations; choose based on final Next.js rendering needs

Secrets

Azure Key Vault + managed identity

No production secrets in source, images, or ordinary app settings

Observability

OpenTelemetry + Azure Monitor/Application Insights

Traces, logs, metrics, dependency and request correlation

Mobile crash reporting

Sentry for React Native, or a scrubbed first-party event endpoint

Azure Monitor covers backend well; mobile needs symbolicated native crashes

Infrastructure

Terraform with AzureRM/AzAPI providers

Reproducible environments and alignment with the founder's Azure skill set

CI/CD

GitHub Actions with Azure workload identity federation

No long-lived Azure client secret in GitHub

iOS builds

Expo Application Services Build/Submit

Cloud iOS builds and App Store Connect delivery

Mobile UI automation

Maestro

Readable iOS flows, screenshots, artifacts, simulator support

Web UI automation

Playwright

Browser behavior, accessibility smoke tests, screenshots, traces

Unit/integration tests

Vitest, React Native Testing Library, Supertest, Testcontainers

Fast logic tests plus realistic API/database tests

3.2 Why Container Apps instead of Azure Functions for the core API

Azure Functions remains useful for isolated scheduled jobs, but the core API should begin as one containerized service because it provides:

A conventional long-running TypeScript API process.

Easier local parity, OpenAPI generation, middleware, and database connection management.

Straightforward Stripe webhook handling and background-worker reuse.

Revision-based deployments and scale-to-zero without forcing function-shaped domain code.

Do not split the API into microservices. Start with a modular monolith and one worker deployment.

3.3 Authentication decision

Use Entra External ID with system-browser OIDC authorization code flow and PKCE first. The app must never collect or store a user's Entra password. Fully branded native authentication can be reconsidered only after a supported React Native/Expo path is proven in a spike; current Microsoft native mobile examples emphasize native Swift and Kotlin.

3.4 Payment decision

Use Stripe-hosted/embedded Connect onboarding and platform-controlled charges/transfers in test mode. Before any live money moves:

Marketplace counsel/accounting must review worker classification, payout timing, refunds, tax reporting, reserves, and the exact Connect configuration.

The product must say funded, pending, available, paid, or refunded; never escrow unless a licensed structure truly exists.

Webhook state, not the browser redirect, is authoritative.

Every money-changing operation must be idempotent and written to an immutable ledger/audit trail.

3.5 High-level deployment

flowchart TD
    A[iPhone app] --> C[Container Apps API]
    B[Business and admin web] --> C
    C --> D[PostgreSQL]
    C --> E[Blob Storage]
    C --> F[Service Bus]
    C --> G[Stripe Connect]
    C --> H[Entra External ID]
    F --> I[Worker and jobs]
    C --> J[Azure Monitor]
    I --> J

3.6 Repository structure to create

/
  apps/
    mobile/                 # Expo shared Creator/Business/Venue Staff iPhone app
    dashboard/              # Next.js admin/support and optional business desktop web
    api/                    # NestJS/Fastify API
    worker/                 # asynchronous Service Bus consumers/jobs
  packages/
    contracts/              # Zod schemas, OpenAPI-derived/shared types
    db/                     # Drizzle schema, migrations, seed data
    config/                 # shared lint, TypeScript, environment validation
    test-fixtures/          # synthetic fixtures only
  infra/
    terraform/
      modules/
      environments/dev/
      environments/staging/
      environments/prod/
  .github/workflows/
  .maestro/
  tests/e2e-api/
  docs/
    architecture/
    decisions/
    evidence/
    operations/
    privacy/
  scripts/
  plans.md
  README.md
  pnpm-workspace.yaml
  turbo.json

4. Environments, evidence, and quality gates

4.1 Environments

Environment

Purpose

Data rule

Local

Fast development

Synthetic seed data only

Dev

Shared integration

Synthetic data; resettable

Staging

Release candidate and beta validation

Synthetic or explicitly consented tester data

Production

App Store users

Real data with retention and access controls

Production must use a separate resource group, database, storage account, Key Vault, Stripe mode, External ID registration, telemetry workspace, and deployment approval.

4.2 Required evidence tree

For each milestone create:

docs/evidence/Mxx/
  summary.md
  commands.txt
  test-results/
  api/
  screenshots/
    ios/
    web/
  traces/
  accessibility/

summary.md must state:

Commit SHA or checkpoint identifier.

Environment and build number.

What passed and failed.

Known limitations.

Links/paths to evidence.

Whether the milestone gate passed.

4.3 Definition of done for every product slice

Acceptance criteria are written before implementation.

Happy path is implemented.

At least one permission, validation, or failure path is implemented.

Domain operation is idempotent where retries are possible.

Unit tests pass.

API/database integration tests pass where applicable.

Mobile or web component tests pass where applicable.

E2E path passes on the real target surface.

Loading, empty, error, offline/retry, and success states are considered.

Accessibility labels and stable test IDs exist.

No secrets or personal data appear in logs or screenshots.

Screenshot evidence was visually inspected, not merely generated.

API contract and operational documentation are updated.

Observability exists for the new critical action.

4.4 Standard commands the completed repository should expose

corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e:api
pnpm test:e2e:web
pnpm test:e2e:mobile
pnpm test:security
pnpm build
pnpm verify

pnpm verify must become the one-command local quality gate. It should run formatting, linting, type checking, unit tests, contract checks, and builds. Expensive simulator/cloud tests can remain separate but must run in release CI.

Milestone execution plan

M0 — Product contract, safety boundaries, and architecture records

Goal

Turn the idea into explicit rules before code begins.

Build tasks

Confirm working product name, bundle identifier, and domain placeholders.

Write docs/product/mvp.md with participant, business, venue, and admin stories.

Define the four confirmed initial mission templates: Visit & Create, Visit & Share, Event Attendance, and Private Experience Feedback.

Visit & Create requires check-in and original-media upload but no public post. Visit & Share requires check-in, contracted content, proper disclosure, and the selected platform post; Community Share promises no audience level while Reach Share uses the locked tier bonus. Event Attendance uses a fixed event window and capture checklist with posting only when preselected and paid. Private Experience Feedback uses a structured private form and cannot require a public rating or positive sentiment.

Define a versioned, server-enforced checklist schema and approved adjustment ranges for every template. Treat the plain-language brief, chat, comments, support notes, and in-person requests as context only, never as acceptance criteria.

Define a separately priced additional-deliverable/change-request record for new or out-of-range work. Require admin review before publication, invalidate prior campaign approval after a material change, and require explicit creator re-consent plus the updated reward when a creator has already accepted.

Lock the V1 checklist defaults and limits: Visit & Create defaults to 5 original photos and 2 short vertical clips, adjustable only to 3–10 photos and 1–3 clips; Visit & Share requires one disclosed post on one selected platform using one video or carousel; Event Attendance defaults to 60 minutes, 3 photos, and 2 short clips with attendance adjustable only from 30–180 minutes; Private Experience Feedback is limited to no more than 10 structured questions designed for about 10 minutes and 0–3 optional evidence photos.

Define versioned content licenses. Include a non-exclusive 90-day organic reposting license on business-owned social accounts in the base reward; price 12-month use across business-owned social, website, and email at a 50% base-reward creator bonus; and price 30-day paid-ad use at a 100% base-reward creator bonus. Make the bonuses additive, include them in the Creator Reward Pool, and apply the standard platform fee transparently.

Prohibit permanent ownership, exclusivity, resale, third-party sublicensing, AI training, synthetic-media creation, and creator face/voice cloning in the standard V1 builder. Permit only crop, resize, caption, logo, and minor formatting edits that do not misrepresent the creator or experience. Mark the final license language for legal review.

Define the V1 media contract: raw short clips are 5–15 seconds, vertical `9:16`, and at least 1080p; Visit & Share videos are 15–60 seconds with the same orientation and resolution; and Visit & Share carousels contain 3–5 original items. State that an ordinary current phone is sufficient and professional production equipment is never implied.

Limit acceptance to objective checks for file readability, locked quantity, duration, orientation, minimum resolution, required location/experience, and unrelated-brand watermarks. Require speech/audio only when selected in the structured checklist, and prohibit rejection based on creator appearance, voice, personality, follower count, or subjective artistic preference.

Define fixed V1 add-on packages calculated only from the base mission reward: 1–5 additional photos for +25%; 1–2 additional raw clips for +50%, subject to the template ceiling; one additional edited 15–60-second video for +100%; and each additional 30 onsite minutes beyond the included 60 for +50%, up to 180 minutes.

Allow at most one photo, one raw-clip, and one edited-video package per creator slot; do not permit repeated stacking around workload ceilings. Add selected package bonuses to the Creator Reward Pool, apply the 15% platform fee, and prohibit private negotiation. Route professional equipment, complex production, and other specialty work to an admin-reviewed custom offer.

Define creator-opt-in license renewals available beginning 30 days before expiry: 90-day organic owned-social use for +25% of the original locked base reward; 12-month owned social/website/email use for +50%; and 30-day paid-ad use for +100%. Apply the 15% platform fee to a new renewal transaction and prohibit automatic renewal.

Require businesses to stop expired paid ads and active website/email placements. Permit an existing organic post to remain only as an unboosted, unedited historical archive; prohibit republishing, downloading for reuse, or moving it into a new campaign without renewed rights.

Define server-enforced Orlando pilot limits: invitation-only access; at most 10 approved businesses, 100 verified creators, 20 creator slots and a `$2,500` Creator Reward Pool per campaign, and `$25,000` in platform-wide funded-but-unsettled creator rewards.

Require manual approval of every pilot business and campaign. Assign a named operations lead for support/disputes, a separately authorized finance operator for payout/refund exceptions, and a technical on-call owner for infrastructure controls. Schedule staffed support during active mission windows.

Define independent kill switches for new funding, publishing, creator assignment, check-in, and payout execution. Preserve all in-progress state, creator payables, ledger history, and audit events; allow payout pauses only for documented fraud, security, Stripe, or reconciliation incidents.

Define V1 Local Pass as a creator/campaign-specific opaque link with a no-install mobile-web claim and a seven-day, single-use rotating QR redeemed by authorized venue staff. Lock attribution to the creator whose pass is first validly claimed for that campaign.

Report `pass_claimed` and `verified_pass_redemption` separately, plus aggregate conversion and actual completed-campaign cost per verified redemption. Do not label a pass event as a purchase, sale, incremental customer, or incremental revenue, and never condition creator reward or reliability on pass performance.

Define what is guaranteed compensation versus performance bonus.

Write objective acceptance criteria for every initial deliverable type.

Define adult-only MVP eligibility and prohibit child accounts.

Define prohibited missions, unsafe categories, positive-review requirements, and misleading endorsements.

Define the role/permission matrix.

Define canonical state machines for campaign, slot, application, check-in, submission, dispute, payment, and Local Pass.

Define data classification: public, internal, confidential, restricted.

Define initial retention targets for raw coordinates, uploaded evidence, logs, audit events, and financial records; mark legal review required.

Write ADR-001 for Expo/React Native.

Write ADR-002 for modular monolith on Azure Container Apps.

Write ADR-003 for PostgreSQL.

Write ADR-004 for Entra External ID browser-delegated PKCE.

Write ADR-005 for Stripe Connect test-mode architecture.

Write ADR-006 for mission-window location only.

Draw a trust-boundary and data-flow diagram.

State-machine minimums

Campaign:
draft -> pending_admin_review -> approved -> funding_pending -> funded -> published
      -> rejected                                      -> paused -> closed

Application:
submitted -> accepted -> scheduled -> checked_in -> submission_due -> completed
          -> rejected  -> cancelled -> no_show

Submission:
draft -> complete_submission -> under_review -> approved -> payout_ready -> paid
                                  -> revision_requested -> resubmitted -> under_review
                                  -> disputed -> resolved_approved | resolved_no_payout
under_review -> auto_approved -> payout_ready

Creator reward obligation:
reserved -> completion_pending -> earned_full -> payout_ready -> paid
         -> not_completed -> cancelled_no_payout -> business_refund_pending -> refunded
         -> disputed -> resolved_earned_full | resolved_no_payout

Creator compensation is all-or-nothing per accepted slot. Cancellation, no-show, or other non-completion earns no partial reward. Valid completion earns the full advertised reward; a business cannot cancel after valid completion to avoid the obligation.

Every transition has an authorized actor.

Every transition has preconditions.

Every transition emits an audit event.

Terminal states are identified.

Illegal transitions are listed for automated tests.

Verification

Conduct a tabletop walkthrough using one realistic Orlando family-attraction campaign.

Walk through a no-show, venue closed, invalid content, revision, refund, and dispute.

Verify a business cannot demand a positive review.

Verify location is unnecessary outside a check-in window.

Verify every payment number can be reconstructed from ledger entries.

Review all ADRs for contradictions.

Evidence

Save the walkthrough and diagrams in docs/evidence/M00/.

Record unresolved legal questions separately from engineering assumptions.

Gate

M0 passes only when the end-to-end rules can be explained without inventing behavior during the walkthrough.

M1 — Accounts, local toolchain, and repository foundation

Goal

Create a reproducible monorepo that a fresh developer or coding agent can validate with one command.

Local-first cost rule

Complete ordinary UI, API, data-model, workflow, and automated-test development against local PostgreSQL, Azurite/storage adapters, synthetic queue/event adapters, Stripe test tooling, and synthetic identities/data. Do not require a persistent billable Azure application/data environment for the M1–M4 inner loop.

Prerequisites

Apple Developer Program account identified; do not share the password.

App Store Connect access and roles identified.

Expo account/organization identified.

Azure subscription and least-privilege dev resource group strategy identified.

One active V1 Azure region selected, with separate development, staging, and production resource/state/identity boundaries and a named cost owner plus monitored alert destination.

Stripe test-mode account identified.

Entra External ID external tenant plan recorded.

GitHub repository selected.

Domain/email placeholders selected.

Build tasks

Initialize pnpm workspaces and Turborepo.

Scaffold apps/mobile with current stable Expo, TypeScript, and Expo Router.

Scaffold apps/dashboard with Next.js and TypeScript.

Scaffold apps/api with NestJS/Fastify.

Scaffold apps/worker as a separate entry point reusing domain modules.

Create shared TypeScript, ESLint, Prettier, and environment-validation packages.

Add .editorconfig, .nvmrc or Volta config, and package-manager pinning.

Add docker-compose.yml for PostgreSQL, Azurite, and local dependencies.

Add synthetic seed strategy.

Add root scripts listed in section 4.4.

Create .env.example files containing names only, never credentials.

Add pre-commit checks without making them the only CI enforcement.

Add Dependabot or Renovate.

Add a pull-request template requiring tests and screenshot evidence.

Baseline commands

node --version
corepack enable
pnpm --version
docker version
az version
eas --version
pnpm install
docker compose up -d
pnpm verify

Verification

Delete generated dependency/build directories and prove a clean install succeeds.

Run the API health endpoint locally.

Open the dashboard shell in a browser.

Open the mobile shell in an iOS development build or Simulator.

Confirm hot reload works independently for mobile, web, and API.

Confirm Ctrl-C or process shutdown closes resources cleanly.

Confirm .env*, signing artifacts, and native credentials are ignored.

Search the repository for likely secrets using Gitleaks.

UI evidence

Capture the iPhone app shell showing version/environment.

Capture the dashboard shell at desktop and mobile browser widths.

Inspect images for clipping, default template text, and exposed values.

Gate

M1 passes when a clean checkout can reach green pnpm verify and both UI shells render.

M2 — Design system and clickable end-to-end prototype

Goal

Prove the information architecture and native iPhone experience before wiring every backend feature.

Participant app screens

Welcome/sign in.

Mission feed.

Search/filter sheet.

Mission details.

Apply/claim confirmation.

My Missions with status sections.

Mission instructions.

QR check-in scanner and manual fallback.

Deliverable checklist.

Upload progress/retry.

Submission status and revision request.

Earnings/payment status.

Profile, verification, payout setup, consent, support, and account deletion.

Business iPhone app screens

Business onboarding and location management.

Campaign list and creation wizard.

Applicants and capacity.

Submission review.

Campaign results.

Venue staff check-in view.

Admin/support web screens

Admin review queue.

Admin audit timeline.

Support/dispute view.

Do not create an employee-admin route group, hidden administrator mode, or platform-wide privileged token path in the iPhone app. Employee console authorization is separately granted and never obtained through the Creator/Business mode switcher.

Design system tasks

Define semantic colors, typography, spacing, radii, shadows, and icon rules.

Meet WCAG AA contrast for ordinary text and interactive controls.

Define success, warning, error, pending, locked, empty, loading, and offline patterns.

Use native-feeling tab navigation and sheets.

Define minimum touch target size and VoiceOver labels.

Add Dynamic Type support without truncating essential compensation or requirements.

Do not encode status only through color.

Use realistic synthetic Orlando mission data.

Include exact compensation, deadline, location, deliverables, disclosure, and rights summary above application confirmation.

UI verification matrix

Smallest supported iPhone display.

Current standard-size iPhone display.

Max-size iPhone display.

Light mode.

Dark mode.

Standard text size.

Large accessibility text size.

Empty data.

Long business/mission names.

Slow network/loading.

Error and offline states.

Automated screenshot flows

Create Maestro flows with explicit screenshot steps:

appId: com.example.localmissions
---
- launchApp:
    clearState: true
- tapOn: "Use demo participant"
- assertVisible: "Missions near Orlando"
- takeScreenshot: docs/evidence/M02/screenshots/ios/mission-feed
- tapOn: "Family Adventure Preview"
- assertVisible: "$35 guaranteed"
- takeScreenshot: docs/evidence/M02/screenshots/ios/mission-details

Add stable accessibility labels/test IDs to every critical control.

Run all prototype Maestro flows.

Add a second Maestro prototype flow that enters Business mode, creates a campaign draft, reviews applicants, reviews a submission, and reaches the funding/results screens.

Run Playwright screenshot tests for admin/support dashboard routes and any optional desktop business routes.

Use a controlled browser session to inspect each web route at desktop and mobile widths.

Visually compare screenshots; do not approve only because automation exited zero.

Record design corrections and recapture the affected screens.

Gate

M2 passes when a tester can narrate the complete workflow from the prototype without guidance and no critical iPhone screen clips at large text size.

M3 — Database, API contract, and domain state machines

Goal

Build the transactional foundation and prove legal and illegal transitions through automated tests.

Schema tasks

Create users and external identities.

Create participant profiles, eligibility, and payout-onboarding state.

Create businesses, memberships, locations, and venue contacts.

Create campaigns, templates, brief versions, mission slots, and capacity.

Create applications/reservations and status history.

Create check-in challenges/events.

Create submissions, deliverables, assets, review decisions, and revisions.

Create disputes and resolutions.

Create immutable payment ledger and provider references.

Create Local Pass links/codes, claims, redemptions, and attribution confidence.

Create consent, content-rights, disclosure, notification, and audit events.

Add UTC timestamps and stable public IDs.

Add unique constraints preventing duplicate applications, check-ins, redemptions, and webhook processing.

Add indexes for feed, business review queues, user missions, and audit timelines.

Never use floating point for currency; store integer minor units plus currency.

Never hard-delete ledger/audit records.

API tasks

Define /v1 REST resources and error envelope.

Generate OpenAPI from the API.

Generate or validate typed mobile/dashboard clients from the contract.

Add request IDs, structured logs, validation, and consistent pagination.

Require idempotency keys for retryable writes such as funding, submission, approval, and payout.

Add optimistic concurrency/version fields where two actors may edit the same record.

Add /health/live, /health/ready, and build-info endpoints.

Add a local/test-only dev-token endpoint that cannot compile or activate in staging/production.

Local database commands

docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:check
pnpm --filter api dev
curl -fsS http://localhost:4000/health/live
curl -fsS http://localhost:4000/health/ready
curl -fsS http://localhost:4000/openapi.json > docs/evidence/M03/api/openapi.json

Verification

Migration applies to an empty database.

Migration upgrades the previous schema without data loss.

Roll-forward recovery is documented; production rollback does not depend on destructive down migrations.

Seed is deterministic and contains no real personal data.

Parallel applications cannot overbook capacity.

Duplicate idempotency key returns the original result.

Illegal state transitions return a stable conflict error and do not mutate data.

Audit event is in the same transaction as the important state change.

API contract snapshot changes require intentional review.

Integration tests run against a real ephemeral PostgreSQL instance.

Gate

M3 passes when all state-transition tables have green positive, negative, concurrency, and idempotency tests.

M4 — Authentication, authorization, and account lifecycle

Goal

Prove real customer identity, tenant isolation, role enforcement, logout, and deletion-request flow.

Build tasks

Create separate Entra External ID app registrations for mobile and web/API as required.

Configure authorization code flow with PKCE and exact redirect URIs.

Configure iOS universal/custom scheme return path.

Use system browser session; never embedded username/password collection.

Configure Apple, Google, Microsoft, and passwordless email one-time-code entry points for the shared V1 identity. Do not show Facebook/Meta in V1 configuration or screenshots.

Expose the same providers before role selection so authentication does not create separate Creator and Business accounts.

Store refresh/token material only in SecureStore on mobile.

Validate issuer, audience, signature, expiration, and scopes in the API.

Map external subject identifiers to internal users without using email as the immutable key.

Store each provider subject as an identity binding to one root user and test provider cancellation, denied consent, expired/single-use email code, resend throttling, disabled provider, and failed return.

Never auto-link or merge because provider emails match. Show a non-enumerating existing-account prompt and require the user to sign in with the existing method before entering an authenticated add-provider flow.

Require recent authentication to the current account and successful authentication with the new provider; create the issuer/subject binding transactionally under a uniqueness constraint and emit security audit/notification events.

Route collisions between two populated root accounts to a high-risk support case with sensitive financial mutations paused where appropriate; do not implement a destructive self-service merge.

Require recent authentication to unlink a provider and reject the mutation unless a different verified identity binding remains. Guide last-method users through adding and verifying a backup before retrying.

After unlinking, revoke affected sessions, clear sensitive mobile caches, preserve the root account and all domain/ledger history, emit an immutable audit event, and send a security notification through the remaining method.

Implement total-lockout recovery as a dual-authorized support workflow with identity/account-context proof, global session revocation, provider rebinding, and a temporary hold on new funding, payout-destination changes, provider changes, and other sensitive financial actions. Never cancel an earned creator reward or owed business refund because of the hold.

Implement business memberships rather than one global business Boolean.

Implement participant, business member, venue staff, support, and admin policies.

Add step-up/recent-auth requirements for payout, email, phone, and account deletion changes.

Add logout and local sensitive-cache purge.

Add account deletion request and export-request records.

Add a synthetic local auth adapter for automated tests only.

Authorization test matrix

Anonymous cannot read private mission/application data.

Participant can read only their applications and submissions.

Business A cannot read or mutate Business B.

Venue staff sees only assigned location/date details.

Support can investigate without changing financial state unless separately authorized.

Admin override requires reason and creates a high-priority audit event.

Disabled user token is rejected after the designed propagation interval.

API ignores client-supplied role claims that are not trusted server claims.

Matching emails, changed emails, and Apple private-relay addresses cannot move or duplicate an external identity binding.

Concurrent attempts to link the same provider subject result in one binding and no partial merge.

Linking requires proof of control of both methods, and every success/failure is audited without leaking whether an unrelated email has an account.

The last verified sign-in method cannot be removed under concurrent or replayed requests.

Unlinking revokes access and notifies the remaining method exactly once without deleting business memberships, missions, rewards, refunds, or audit history.

Recovery cannot be completed by one support actor, and financial holds block risky mutations while preserving existing obligations.

UI verification

Sign up, sign in, cancel browser login, expired session, logout, and sign back in on iPhone.

Complete real-device round trips for Apple, Google, Microsoft, and passwordless email in the configured test tenant; record any provider review/configuration gate without substituting fake production proof.

Confirm deep link returns to the expected screen.

Confirm protected routes never flash private content before redirect.

Capture screenshots without email, token, tenant ID, or other personal data.

Use browser control to test business login and forbidden-route behavior.

Gate

M4 passes when cross-tenant automated tests are green and a real iPhone authentication round trip succeeds.

M5 — Azure dev foundation and continuous delivery

Goal

Deploy an empty but secure vertical shell to Azure using Terraform and secretless CI authentication.

Confirmed deployment shape

Use one active Azure region. Deploy one modular-monolith API Container App and one worker/job entry point, backed by one application PostgreSQL database per isolated environment. Do not introduce Kubernetes, microservices, database sharding, replicas, or multi-region application deployment in V1 without a later measured gate.

Keep development, staging, and production resources, Terraform state, managed identities, secrets, databases, storage containers, Service Bus entities, telemetry, and application configuration separate. Never copy production credentials or participant data into a lower environment.

Staged cost and network rollout

Phase A — local build: finish the infrastructure code shell and functional UI/API flows locally with synthetic data. Terraform format, validate, security scan, and plan may run, but no cost-incurring apply is implied.

Phase B — low-cost ephemeral Azure development: only after local infrastructure and UI are complete enough to need cloud integration, review the Terraform plan and estimated cost, then create a minimal development environment using the lowest functional tiers and explicit scale ceilings. Keep all data synthetic. In the same working day, deploy, migrate, test, capture evidence, reconcile, produce a scoped destroy plan, destroy the billable workload, and verify both Terraform and live Azure state. Repeat this create/test/destroy cycle as needed until everything except private networking is complete.

Phase C — private staging/production: after the infrastructure and UI are functionally complete, implement and verify the VNet, private endpoints, private DNS, disabled public data-service access, and production network controls. Complete this phase before production-like staging, real participant data, external beta workflows that create sensitive records, or live money.

Do not create staging or production merely because development deploys. Each cost-incurring environment requires its own reviewed plan, cost approval, security gate, and explicit apply.

Retained-control-plane boundary

Create separate bootstrap/control-plane and disposable-workload Terraform roots with different backend state keys, permissions, and resource groups. The workload root may reference explicit control-plane outputs but must never own or destroy the control plane.

Retain only secured remote state/locking, GitHub-Azure OIDC identities and federated credentials, Entra External ID tenant/app registrations and provider/redirect configuration, domain ownership and stable verification DNS, subscription-level budgets/alerts/policy, source/Terraform/runbooks, external Stripe/social test configuration, and sanitized test evidence.

Keep Stripe/provider secrets out of Terraform state and evidence. Use federated identity where supported and a separately controlled secret-entry procedure when a provider secret is unavoidable.

Destroy Container Apps/environment, PostgreSQL, workload storage, Service Bus, Key Vault, workload telemetry, Container Registry/images, dashboard hosting, and temporary network resources. Rebuild images from the recorded commit on the next run.

Ephemeral expiration policy

At apply time, require an owner, commit SHA, workload resource group, creation timestamp, and expiration timestamp. Set expiration to the earlier of creation plus eight hours or 11:00 PM in the `America/New_York` timezone on the creation date; reject an apply that cannot establish and externally monitor that deadline.

Send a warning one hour before expiration with the exact cleanup scope and current test status. Allow one extension only when requested before expiry with a recorded owner and reason; the new deadline must remain no later than 11:00 PM that same `America/New_York` day.

Run expiration enforcement outside the disposable workload using short-lived GitHub-Azure OIDC or another approved retained controller. Give it permission only to inspect and destroy the explicit development workload scope, never the bootstrap/control-plane state or subscription root.

At expiration, acquire the workload lock, stop new test writes, capture final status, create/review the machine-validated scoped destroy target, destroy, and query both Terraform and Azure. Refuse cleanup and alert urgently if the target is missing, unexpectedly broad, changed, or overlaps retained resources.

Terraform modules

Resource group and standardized tags.

Log Analytics and Application Insights.

Container Registry.

Container Apps environment, API app, and worker app/job.

PostgreSQL Flexible Server and database.

Storage account and private media containers.

Service Bus namespace, queues/topics, and dead-letter handling.

Key Vault.

Static Web App or dashboard Container App.

Managed identities and least-privilege RBAC.

Budget alerts and cost tags.

DNS/custom domain placeholders.

Security baseline

Disable public anonymous blob access.

Use managed identity from API/worker to Blob, Service Bus, Key Vault, and supported database auth.

Do not put storage keys or Azure client secrets in GitHub.

Configure GitHub Actions Azure login through workload identity federation.

Restrict CORS to known dev/dashboard origins.

Configure TLS-only endpoints.

Use separate state backend and state locking for Terraform.

Scan Terraform and container images.

Make database network exposure an explicit ADR; prefer private connectivity before production.

Require narrow documented firewall allowlists, TLS, authentication, managed identity/RBAC, and disabled anonymous Blob access from the first ephemeral development deployment. Full VNet/private-endpoint topology is deferred, but no temporary resource may be public to all networks merely because it will be destroyed later.

Cost and recovery baseline

Create an approved monthly budget for each environment with actual-cost and forecast alerts at documented thresholds, routed through an action group to a monitored human. Record that budget notifications do not automatically stop Azure consumption.

Use conservative initial service sizes, explicit autoscaling ceilings, required ownership/environment tags, and reviewed Terraform plans before any cost-incurring apply. Add a scheduled cost review and a runbook for intentionally scaling down or destroying disposable nonproduction resources without touching retained state unexpectedly.

Configure PostgreSQL managed backup and point-in-time recovery with an approved retention period. Test restoration with synthetic data before production and after a material backup, database, or network change; a configured backup without a successful restore drill is not accepted as recovery evidence.

Configure Blob soft delete, versioning, backup, and lifecycle behavior by data class and cost/risk need. Ensure recovery settings cannot extend access to raw locality proof, Reach analytics, customer phone data, or other privacy-limited evidence beyond their confirmed deletion and backup-aging rules.

Deployment workflows

Pull request: format, lint, types, unit, integration, OpenAPI diff, Terraform validate/plan, dependency and secret scans. Do not apply Azure infrastructure automatically.

Main branch: build immutable images and sign/tag with commit SHA. Run the ephemeral Azure development workflow only on explicit invocation and approval.

Ephemeral development invocation: review plan and estimated cost; apply only the scoped development workload; migrate and seed synthetic data; run smoke, integration, E2E, authorization, upload, queue, webhook, backup/restore, and reconciliation checks; capture evidence; inventory live resources; review a scoped destroy plan; destroy; then verify no billable development workload remains in Terraform state or Azure.

The destroy workflow accepts only the explicit disposable-workload Terraform root and expected workload resource group. It refuses the subscription root, retained-control-plane resource group, state-backend storage account, identity resource group/tenant, or an unresolved/empty target variable. Do not implement broad recursive deletion.

Staging: manual or protected promotion of the same tested artifact.

Production: approval, backup check, migration review, gradual revision traffic, smoke tests, rollback instruction.

Azure verification commands

az account show
terraform -chdir=infra/terraform/environments/dev fmt -check -recursive
terraform -chdir=infra/terraform/environments/dev init
terraform -chdir=infra/terraform/environments/dev validate
terraform -chdir=infra/terraform/environments/dev plan
az containerapp list --resource-group <dev-resource-group> --output table
curl -fsS https://<dev-api-host>/health/ready
terraform -chdir=infra/terraform/environments/dev plan -destroy
terraform -chdir=infra/terraform/environments/dev destroy
terraform -chdir=infra/terraform/environments/dev state list
az resource list --resource-group <dev-workload-resource-group> --output table

Verification

A clean Terraform plan has no unexpected replacements.

API deployment reports commit/build info.

Readiness fails when the database is unavailable; liveness remains meaningful.

Managed identity can access only the intended container/queue/secrets.

Old Container Apps revision can be restored.

Database backup/restore procedure is tested using synthetic data.

Budget and availability alerts are delivered to a real monitored address/channel.

Actual-cost and forecast budget alerts fire in a controlled test, autoscaling ceilings are visible, and the cost owner can identify every active environment resource by tag.

Development, staging, and production tests prove that identities, secrets, databases, storage, queues, telemetry, and data cannot cross environment boundaries.

Dashboard renders in a controlled browser and calls the dev API successfully.

Every ephemeral run records start time, commit SHA, approved plan/cost summary, test/evidence result, destroy-plan target list, destroy result, final Terraform state, final Azure resource inventory, and any retained-control-plane resources.

Record the original expiration, warning delivery, extension request/decision if any, cleanup-controller identity, lock result, automated destroy outcome, and alert/reconciliation trail. Test normal expiry, 11:00 PM cutoff, daylight-saving boundaries, one allowed extension, rejected second/overnight extension, target-scope refusal, failed destroy, and successful independent teardown proof.

The final report contains two separate inventories: **Disposable workload: empty** and **Retained control plane: expected list**. It reports any unexpected retained or orphaned resource as a teardown failure rather than calling the subscription empty.

Same-day teardown leaves no billable development workload, orphaned managed resource, private test data, dangling secret, or unexplained Terraform object. A failed destroy remains attached and escalated until independently reconciled; it is never reported as complete from Terraform output alone.

Gate

M5 passes when the Azure dev shell is reproducible from Terraform, deploys from CI without long-lived Azure secrets, and can roll back.

It also requires documented environment isolation, functioning cost alerts, bounded scale settings, and a successful synthetic PostgreSQL restore drill.

Until private networking is implemented, M5 also requires at least one fully evidenced same-day create/test/destroy cycle with no unexplained live workload remaining.

M6 — Business onboarding and campaign creation

Goal

Allow an approved business to create a location and a complete draft mission brief.

Build tasks

Add a post-public-release, pre-admission business-interest state. An uninvited business may authenticate and record only its display name, work contact, optional website/public listing, category, self-selected broad Orlando area, number of locations, desired campaign type, approximate Creator Reward Pool, and preferred launch month.

Apply the shared waitlist lifecycle: month-11 reconfirmation notice, month-12 expiry without reconfirmation, immediate selection removal on withdrawal/expiry, role-specific data deletion within 30 days, and no effect on another active role or the shared account.

Do not collect a payment method, EIN/tax document, owner or representative identification, bank information, exact venue address, ownership/authority evidence, or full business-verification document while the business is waitlisted. Do not permit organization/location verification, campaign creation or access, funding, publishing, creator review, content-right activation, or production money actions.

Admit businesses through an audited process based on campaign readiness, local creator demand, category/geographic coverage, and current operational capacity. Budget size alone cannot determine admission order. Invitation unlocks full setup but never guarantees campaign approval; charging still requires an approved campaign and explicit **Fund and Publish** action.

Give an invited business 30 calendar days to begin verification and submit its initial campaign brief. Send reminders around days 14 and 25. Permit one recorded support extension of up to seven days for accessibility, technical failure, or pending provider/document review; platform/provider delay cannot expire the invitation. No action by the adjusted deadline atomically releases pilot capacity and returns the business to its waitlist without penalty.

On decline or valid expiry, immediately close incomplete business onboarding and revoke verification/campaign/payment access. Within 30 days delete Local Missions business/authority/identity documents, verification drafts, unfinished campaign drafts and derivatives, and any unfunded customer/payment-method reference; request provider cleanup where permitted while respecting provider-mandated retention. Preserve only the pre-existing minimal interest record and non-personal invitation/deletion audit.

For fixable business-verification information, set **Correction needed**, identify the objective field/evidence problem, allow 14 days, and pause invitation expiry during timely correction/review. A final denial requires an objective reason and one 14-day appeal reviewed by a different authorized reviewer with a 10-business-day decision target. Budget size or subjective preference cannot be denial reasons. Final cleanup begins only after the appeal window closes unused or the appeal is unsuccessful.

Business organization request/onboarding.

Admin approval state.

Business member invitations and roles.

Location create/edit with address normalization and timezone.

Venue contact and staff-readiness fields.

Campaign creation wizard.

Mission template selection.

Expose only `VISIT_CREATE`, `VISIT_SHARE`, `EVENT_ATTENDANCE`, and `PRIVATE_FEEDBACK` in V1; reject a blank/free-form template type.

Include a versioned creator-facing checklist, reward/in-kind benefit, visit window, location/accessibility notes, rights, disclosure, cancellation/no-show, one-correction rule, and objective completion evidence in every template.

Enforce every customizable checklist field and allowed range on the server. Generate the creator preview from the structured values and preserve the exact template, schema, and campaign-checklist versions accepted by the creator.

Do not allow descriptive text, chat, comments, support notes, or venue instructions to add enforceable work. Route a new or out-of-range request to a separately priced additional deliverable and admin review; if the campaign was approved or a creator accepted, require re-review and creator re-consent as applicable.

Apply the confirmed template values in the campaign builder: `VISIT_CREATE` defaults to 5 photos/2 clips and enforces 3–10 photos/1–3 clips; `VISIT_SHARE` contracts one disclosed post on one selected platform using one video or carousel; `EVENT_ATTENDANCE` defaults to 60 minutes/3 photos/2 clips and enforces a 30–180 minute attendance range; `PRIVATE_FEEDBACK` enforces no more than 10 questions/about 10 minutes and 0–3 optional evidence photos. Treat every additional platform, public post, out-of-range quantity, or unrelated deliverable as separately priced work.

Offer only the confirmed versioned content-rights choices: included 90-day organic business-owned social reposting; 12-month business-owned social/website/email use for `base × 0.50`; and 30-day paid advertising for `base × 1.00`. Show each creator bonus, license period, covered channels, attribution requirement, permitted edits, and expiry before submission and creator acceptance. Add selected bonuses to the Creator Reward Pool before calculating the 15% platform fee.

Reject perpetual, exclusive, resale, third-party sublicensing, AI-training, synthetic-media, face-cloning, and voice-cloning requests in V1. Make renewals separate non-automatic transactions requiring a new creator-visible agreement.

Enforce the confirmed V1 media contract in the builder and creator preview: 5–15-second vertical 1080p raw clips; a 15–60-second vertical 1080p Visit & Share video; or a 3–5-item Visit & Share carousel. Do not expose professional-equipment requirements in standard templates.

Offer the confirmed fixed add-ons: `PHOTO_PACK_1_5 = base × 0.25`, `RAW_CLIP_PACK_1_2 = base × 0.50`, `EDITED_VIDEO_1 = base × 1.00`, and `ONSITE_30_MIN = base × 0.50` per increment beyond 60 minutes. Enforce template ceilings and one-per-type package limits except for onsite increments up to 180 minutes.

Calculate all add-ons independently from the base reward in integer minor units; never compound from Reach, rights, or another add-on. Show every package and resulting creator reward before acceptance, and require admin review plus creator re-consent for a later change.

Dates, visit windows, capacity, guaranteed reward, optional bonus, and total budget.

Label campaign budget as **Creator Reward Pool**, never as the all-in business spend. Bind slot count and per-creator reward to a visible multiplication, then show the platform fee and exact **Total Due** separately before submission and again before **Fund and Publish**.

Community/Reach slot allocation with server-enforced `community >= ceil(capacity × 0.80)` and `reach <= floor(capacity × 0.20)`.

Separately price every Reach Slot with a disclosed distribution deliverable, creator bonus, and platform charge.

Use fixed Reach reward formulas: Level 1 pays `base × 1.50`, Level 2 pays `base × 2.00`, and Level 3 pays `base × 3.00`, rounded deterministically in integer minor units. Apply the standard platform percentage to the resulting creator reward.

Require one primary social platform per Reach Slot. Model every additional cross-post as a separate versioned paid deliverable with its own platform, current tier snapshot, disclosure, deadline, proof, and acceptance criterion; never aggregate audience counts across platforms.

Calculate multi-platform creator compensation as `base reward + sum(each contracted platform tier bonus)`. Do not duplicate the base reward for a distribution-only cross-post; require a separate priced base content deliverable when the business requests materially new content.

Show base reward, Reach bonus, final creator reward, 15% platform fee, and all-in slot cost as separate invoice lines; include ordinary payment processing inside the platform fee and do not permit a separate card-processing line, custom follower minimums, auctions, or private rate negotiation.

Deliverables with objective acceptance criteria.

Disclosures and content-rights selection.

Optional Local Pass offer configuration with exact offer, approved inventory, participating location, hours, purchase requirement, exclusions, normal expiration, and any preapproved equal-or-greater-value substitute. Preview all terms as the customer will see them and require admin approval.

Cancellation/no-show/revision rules.

All-or-nothing creator compensation: full advertised reward for valid completion, otherwise no creator reward or cancellation payment for that slot.

Preview participant-facing brief.

Draft version history.

Submit for admin review.

API smoke sequence

API_BASE_URL=http://localhost:4000
ACCESS_TOKEN=<synthetic-business-token>

curl -fsS -X POST "$API_BASE_URL/v1/businesses" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-business-001" \
  -d '{"name":"Demo Family Fun Center"}'

curl -fsS -X POST "$API_BASE_URL/v1/campaigns" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-campaign-001" \
  -d @packages/test-fixtures/campaigns/family-adventure.json

Verification

Waitlisted businesses cannot access organization, venue, campaign, creator-work, rights, payment, or money routes, and attempts fail server-side rather than only disappearing in the UI.

Tests prove that admission considers the approved readiness/demand/coverage/capacity fields and cannot sort or automatically admit by approximate budget alone.

Required-field and business-rule validation is shared but revalidated server-side.

Capacity × reward and platform fee preview reconcile to total.

The canonical Community example displays `10 × $50 = $500 Creator Reward Pool`, `$75 platform fee` at the confirmed 15% rate, and `$575 Total Due` before legally required tax. Ordinary payment processing is included in the fee.

The canonical multi-platform example displays `$50 base + $50 Level 2 Instagram bonus + $25 Level 1 TikTok bonus = $125 creator offer`, `$18.75 platform fee`, and `$143.75 slot cost` before legally required tax.

The invoice allocates reward and platform-fee components to slots in integer minor units so a no-payout slot can be refunded exactly. Processing cost is recorded separately as a Local Missions expense and is never deducted from creator pay or a no-payout refund.

Currency and timezone behavior are explicit.

A business cannot publish until approved and funded.

Editing a published brief creates a new version and triggers participant acknowledgment when material.

Competing edits produce a clear conflict instead of silent overwrite.

Playwright covers create, save draft, resume, validation, preview, and submission.

Controlled-browser walkthrough completes at desktop and mobile widths.

Screenshots show each wizard step, errors, and final preview.

Gate

M6 passes when a seeded business can create a valid versioned campaign and no other business can access it.

M7 — Participant onboarding, mission discovery, and application

Goal

Allow an eligible participant to find an appropriate mission and apply with informed consent.

Build tasks

Add a post-public-release, pre-admission creator waitlist state. An uninvited adult may authenticate and record only sign-in contact, display name, adult-eligibility attestation, self-selected broad Orlando area, mission interests, general availability, and optional notification consent.

Apply the shared waitlist lifecycle: month-11 reconfirmation notice, month-12 expiry without reconfirmation, immediate selection removal on withdrawal/expiry, role-specific data deletion within 30 days, and no effect on another active role or the shared account.

Do not collect address proof, exact home address, precise location, government identification, Stripe/bank/tax data, social analytics, portfolio links, or uploaded media while the account is waitlisted. Do not expose private pilot missions or allow application, assignment, submission, reliability scoring, or production money actions.

Invite small cohorts through an audited server-side process based on funded mission demand, broad area coverage, relevant interests/availability, and fair opportunity rotation. Prohibit follower count, appearance, and business subjective preference as admission inputs. Invitation unlocks full onboarding but never guarantees a mission or bypasses verification and assignment rules.

Give an invited creator 14 calendar days to begin onboarding and submit the required creator-controlled verification inputs. Send reminders on days 7 and 12. Permit one recorded support extension of up to seven days for accessibility, technical failure, or pending provider/document review; platform/provider delay cannot expire the invitation. No action by the adjusted deadline atomically releases pilot capacity and returns the creator to the waitlist without a reliability penalty.

Do not reserve a mission slot, campaign capacity, reward, payment, or content right from invitation alone.

On decline or valid expiry, immediately close incomplete creator onboarding and revoke verification/media/payment access. Within 30 days delete Local Missions address/identity proof, verification drafts, portfolio/media uploads, thumbnails, derivatives, and temporary processing artifacts. Preserve only the pre-existing minimal waitlist record and non-personal invitation/deletion audit.

For fixable creator-verification information, set **Correction needed**, identify the objective field/evidence problem, allow 14 days, and pause invitation expiry during timely correction/review. A final denial requires an objective reason and one 14-day appeal reviewed by a different authorized reviewer with a 10-business-day decision target. Popularity, appearance, follower count, or subjective preference cannot be denial reasons. Final cleanup begins only after the appeal window closes unused or the appeal is unsuccessful.

Participant profile and adult eligibility attestation.

Private home-ZIP locality verification with one recent approved non-financial proof of address, annual expiry, immediate invalidation on declared address change, accessible proof alternatives, failed-verification appeal, and audited evidence access/deletion.

Retain only the derived normalized ZIP/area, status, method, verification/expiry timestamps, reviewer/audit fields, and temporary evidence reference needed during the review/appeal window. Do not reuse Stripe KYC, bank, tax, payout, or payment-method data.

Schedule raw-proof deletion 30 days after verification completion or 30 days after appeal closure, whichever is later. Clear the evidence reference and remove document content, metadata copies, thumbnails, and derivatives while retaining only derived locality and a non-document deletion audit.

Permit a legal hold only with authorized case ID, reason, scope, owner, review/expiry date, and audit event; automatically enqueue deletion when the hold expires.

Optional Reach verification consent, revocation, evidence upload/connection, review status, tier, verified date, expiry date, re-verification, and appeal flow. Community eligibility must not depend on this consent or data.

Interests, general home area, availability, content abilities, and portfolio links.

Mission feed with pagination.

Community Slot discovery and application must not expose or rank by follower count; matching uses locality, eligibility, availability, fit, reliability, and opportunity rotation with a path for creators who have no platform history.

Label Reach Slots and their additional distribution requirement and bonus distinctly from Community Slots.

Show the exact locked reward before a Reach creator accepts; an analytics refresh cannot reduce an accepted reward.

Implement Reach Level 1 for an estimated verified local audience of 1,000–4,999, Level 2 for 5,000–19,999, and Level 3 for 20,000+. Require refresh every 90 days.

Accept Reach evidence only through creator-authorized official-platform APIs or specifically approved read-only analytics-provider connections. Reject screenshots, screen recordings, self-entered counts, spreadsheets, emailed reports, and uploaded exports.

When a platform lacks reliable approved proof, disable Reach qualification only for that platform; preserve Community eligibility and independently verified Reach eligibility elsewhere.

Make Community release readiness independent of every Reach provider. Default each platform's Reach capability to disabled and activate it only through a separately reviewed server-side feature flag after feasibility, security, privacy, provider-policy/terms, reliability, retention, and operational checks pass.

Do not make creator onboarding, business onboarding, Community campaign creation/funding, Community discovery/matching, accepted work, refunds, creator payments, App Store release, or Orlando pilot start depend on an Instagram, TikTok, YouTube, or third-party Reach connection.

For a documented provider outage, allow one non-renewable 14-day grace only when the tier was valid at incident start. Never reduce an accepted reward because a tier expires, an integration disconnects, or a provider fails.

Delete raw analytics 30 days after verification or appeal closure, whichever is later, including temporary exports, cached responses, and ordinary derivatives. Retain only platform, derived tier, verification/expiry/grace dates, methodology/source, and audit fields.

Maintain independent qualification records for Instagram, TikTok, YouTube, and each future platform. A creator qualifies for a Reach deliverable only through the current tier on that contracted platform.

Filters for date, distance bucket, category, reward, deliverable type, and accessibility notes.

Mission detail with guaranteed reward, optional bonus, deadline, distance, included experience, disclosure, rights, and cancellation.

Apply/claim flow with explicit acknowledgment.

Application question responses.

My Missions grouped by action needed and status.

Withdrawal before acceptance and cancellation after acceptance according to policy.

Show clearly that creator cancellation, no-show, or incomplete work earns no partial reward.

Empty, no-results, offline, stale-cache, and server-error states.

Do not request precise location merely to browse; allow manual Orlando area selection.

Require current locality verification before Community assignment, while still allowing an unverified creator to complete onboarding, browse manually selected areas, and resolve proof issues.

Verification

Waitlisted creators cannot access mission details or sensitive/money routes, and attempts fail server-side rather than only disappearing in the UI.

Tests prove that waitlist admission never reads follower count, Reach tier, appearance/media, payment status, or business preference and that optional notification denial does not affect eligibility.

Feed excludes draft, unfunded, paused, full, expired, or ineligible missions.

Cursor pagination has no duplicate or missing items under stable data.

Duplicate application is prevented by database constraint and friendly UI.

Two users racing for the final reservable slot cannot overbook it.

Participant sees the exact brief version accepted.

With every Reach integration absent or disabled, the complete Community golden journey still passes from onboarding through campaign result, refund, and creator payment states. Enabling or disabling one Reach platform changes only that platform's Reach qualification and builder options.

Offline cached feed is visibly marked stale and cannot falsely complete a write.

VoiceOver reads reward, requirements, and application action in a sensible order.

Large text does not hide compensation or conditions.

Maestro captures feed, detail, confirmation, success, duplicate, full, and offline states.

Example API checks

curl -fsS "$API_BASE_URL/v1/missions?area=orlando&limit=20"

curl -fsS -X POST "$API_BASE_URL/v1/missions/<mission-id>/applications" \
  -H "Authorization: Bearer <participant-token>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-application-001" \
  -d '{"briefVersion":1,"answers":[]}'

Gate

M7 passes when a real iPhone can discover, inspect, and apply to a dev mission, including reliable retry behavior.

M8 — Applicant selection, scheduling, and venue readiness

Goal

Connect an accepted participant, business, and venue staff around one unambiguous visit.

Build tasks

Business assignment view with privacy-minimized Community profiles and a separate Reach applicant view.

Separate Community and Reach capacity. Community applicant ordering excludes follower/audience size; Reach ordering may use creator-consented verified local-audience bands and authenticity signals.

Automatic, concurrency-safe Community assignment from the qualified rotation pool.

Twenty-four-hour objection timer with only documented safety, direct-conflict, and unmet preapproved-requirement reason codes.

Platform-review queue for objections, evidence, creator appeal, valid replacement rotation, and invalid-objection confirmation.

Schedule and visit-window confirmation.

Participant acknowledgment of final brief and schedule.

Venue staff contact/confirmation workflow.

Venue mode showing only necessary participant, time, inclusion, and check-in instructions.

Calendar file/link export without exposing other participants.

Cancellation and waitlist behavior.

Reminder schedule.

Staff-not-ready warning and admin intervention queue.

Verification

Only authorized business members can act on Reach selections or submit Community objections.

A business cannot directly accept, reject, browse, sort, or cycle through Community candidates.

Accepted count never exceeds capacity under concurrent requests.

No campaign can accept more than `floor(capacity × 0.20)` Reach creators or fewer than `ceil(capacity × 0.80)` Community creators.

Community matching and business views contain no follower-count field, hidden follower sort, or audience-size filter.

The Reach business view exposes only verified tier, validity status, and required delivery channel; it cannot retrieve raw analytics, total followers, or unrelated geography.

Business and venue APIs expose only the creator's verified area badge and coarse venue-distance band; deny home street, unit, ZIP, raw proof, document metadata, exact distance, and payment/KYC data.

Calculate distance server-side from the derived ZIP-area centroid to the verified venue and return only `UNDER_10`, `FROM_10_TO_25`, `FROM_25_TO_50`, or `OVER_50`. Never return the centroid or decimal distance.

Use exact boundaries `<10`, `>=10 and <25`, `>=25 and <=50`, and `>50` miles. Missing, expired, changed, or pending locality returns no band and invalidates cached business display.

The API rejects a Reach Slot without one primary platform, rejects summed cross-platform audience fields, and requires a separate paid deliverable for every cross-post.

No objection within 24 hours confirms the Community assignment exactly once.

Popularity, appearance, audience size, follower count, protected characteristics, and subjective preference are rejected as Community objection reasons.

A valid objection rotates a replacement without lowering the original creator's reliability score; an invalid objection confirms the original assignment.

Repeated invalid objections and disparate objection patterns create an auditable business-risk alert.

Rejected applicants do not receive private business notes.

Venue staff link expires and is location/date scoped.

Material brief changes require acknowledgment.

DST/timezone formatting is tested even though Orlando normally uses Eastern Time.

Browser control verifies applicant acceptance and venue view.

Maestro verifies participant status, schedule, and acknowledgment.

Gate

M8 passes when all three actors see consistent visit information and concurrency tests prove capacity safety.

M9 — QR check-in and mission-window location proof

Goal

Produce strong, privacy-minimized evidence that the right participant arrived at the right location and time.

Build tasks

Generate short-lived rotating QR challenges server-side.

Add iPhone camera permission explanation and QR scanner.

Bind challenge to mission slot, participant, location, and time window.

Add replay protection and one-time challenge use.

Add staff-assisted manual code fallback with reason.

Add optional foreground location confirmation only during check-in.

Store derived check-in statement and accuracy class; minimize/raw-coordinate retention.

Handle denied camera, denied location, poor GPS, no network, expired QR, duplicate scan, and wrong venue.

Queue suspicious cases for human review rather than silently denying earned compensation.

Security verification

Screenshotting/replaying an expired QR fails.

Participant A cannot use Participant B's challenge.

Challenge from Location A cannot check into Location B.

Device clock manipulation does not control server time.

API rate limits repeated guesses.

Manual override requires staff/admin identity and reason.

Raw coordinates are deleted or transformed according to retention design.

UI verification

Maestro covers camera permission accepted/denied where simulator support allows.

Use a physical iPhone for camera, QR focus, low-light, and poor-network tests.

Capture successful, expired, wrong-location, and manual-fallback screens.

Confirm app remains usable after returning from iOS Settings.

Gate

M9 passes when a physical iPhone check-in succeeds and replay/cross-user attempts fail with auditable reasons.

M10 — Direct media upload and deliverable submission

Goal

Reliably upload photos/videos without routing large bytes through the API container.

Build tasks

Create an upload-intent endpoint that validates mission, deliverable, file type, count, and maximum size.

Generate short-lived, write-only, blob-specific SAS upload authorization using managed identity/user delegation where supported.

Use unguessable server-selected blob paths.

Upload directly from iPhone to Blob Storage.

Record checksum, MIME type, bytes, dimensions/duration, and uploader after completion callback.

Validate the locked media contract server-side: file readability, item count, duration, orientation, minimum 1080p resolution, required-location/experience evidence, and unrelated-brand watermark review. Normalize compatible iPhone encodings where practical instead of rejecting ordinary phone output.

Verify server-side that the uploaded blob matches the intent.

Add resumable/retry behavior appropriate for large video.

Add foreground progress and safe background/interruption behavior.

Add thumbnail/preview processing through the worker.

Add malware/file-validation hook before business access.

Add social URL fields separately from uploaded media.

Add deliverable checklist and final submission acknowledgment.

Prevent mutation of submitted originals; create new versions for revisions.

Verification

Valid image upload succeeds.

Valid large video succeeds on Wi-Fi and constrained network.

Oversize, wrong MIME, renamed executable, too many files, expired SAS, and foreign blob path fail safely.

Interrupted upload can retry without creating duplicate assets.

A business cannot access an unverified/quarantined asset.

SAS expiry and permission scope are inspected.

Storage container remains private.

Media URLs shown to users are time-limited or proxied, never permanently public.

App memory remains stable during video selection/upload.

Capture upload progress, retry, validation error, checklist, and submitted states.

Gate

M10 passes when physical-device photo and video uploads survive interruption and unauthorized reads fail.

M11 — Review, revision, approval, dispute, and audit timeline

Goal

Make review objective, time-bound, fair, and fully auditable.

Build tasks

Business deliverable review against the brief version/checklist.

Allow approval, correction, rejection, or dispute reasons to cite only the locked structured checklist and its objective evidence requirements. Descriptive brief text, chat, comments, support notes, and in-person requests cannot block payment.

Reject appearance-, voice-, personality-, follower-count-, equipment-, and subjective-style-based review reasons. A media correction must name the failed objective count, duration, orientation, resolution, required-subject, watermark, disclosure, or other locked checklist requirement.

Approve complete submission.

Request one scoped revision with reason and deadline.

Start a 48-hour review SLA only when verified check-in and every required checklist deliverable have been submitted and validated.

Participant resubmission/version history.

Reject only using allowed reason codes plus explanation.

Participant dispute opening with evidence.

Admin investigation timeline.

Resolution outcomes with financial consequences represented as ledger intents, not manual number edits.

Approval SLA countdown and automatic approval after 48 hours without a valid business action.

Permit only approval, one checklist-based correction request, or an evidence-backed dispute during the review window; reject subjective or out-of-scope demands.

Restart one 48-hour review window after the single allowed resubmission; do not permit a second correction request.

Content-rights license record tied to accepted assets and compensation.

Activate the content license only when the submission becomes approved and the full creator reward obligation is established. A canceled, incomplete, disputed-no-payout, or refunded slot grants no content-use license.

Persist the rights version, covered assets, channels, permitted edits, attribution, start/expiry timestamps, compensation, and renewal history. Verify that expired licenses are visibly expired, renewals cannot be backdated or automatic, and business asset access does not imply continuing usage rights.

Allow a renewal request only within 30 days of expiry. Show the creator the assets, channels, duration, original base-reward snapshot, renewal reward, and business identity; allow acceptance or refusal without reliability effects.

Keep an accepted renewal pending until explicit business funding succeeds. On authoritative funding success, activate the new term and create the full creator payable without a second content-review period. On failure or abandonment, preserve the old expiry and grant no additional rights.

At expiry, require paid ads and active website/email placements to stop. Treat old organic posts as non-boostable, non-editable archives and audit any renewal, expiry, removal, or reported misuse event.

Append-only audit timeline visible at appropriate detail to each role.

Verification

Business cannot request work outside the agreed deliverable without a new agreement.

Business cannot require removal of an honest disclosed opinion merely because it is not positive.

Revision count and deadline rules are enforced.

No valid business action within 48 hours auto-approves exactly once and creates the full creator payable.

A subjective preference not present in the accepted checklist cannot block approval or payout.

Approval and dispute race resolves once, transactionally.

The ledger never creates a prorated creator payable: the final obligation is either the full advertised reward or zero.

For a multi-platform Reach slot, missing any contracted platform deliverable prevents full completion under the all-or-nothing rule; the one allowed correction can cure a checklist failure before final no-payout resolution.

Every override includes actor, reason, previous state, new state, and request ID.

Business A cannot retrieve Business B's assets.

Browser control verifies review, revision, and admin dispute routes.

Maestro verifies participant revision and dispute flows.

Screenshots redact participant contact and media metadata not needed for review.

Gate

M11 passes when all conflict/race tests are green and the audit trail reconstructs the entire submission history.

M12 — Stripe Connect test-mode funding and payouts

Goal

Prove the payment state machine end to end in Stripe test mode without claiming legal readiness for live funds.

Build tasks

Document the confirmed product intent and finalize the exact stable Stripe account/controller configuration only after Stripe, marketplace counsel, accounting/tax, insurance, and reserve review.

Implement Stripe-hosted Express/recipient connected-account onboarding, or the stable Stripe-approved equivalent available at implementation time. Keep raw bank and payout credentials entirely within Stripe-hosted surfaces.

Track requirements due, onboarding complete, payouts enabled, and disabled reasons.

Create a SetupIntent-based business payment-method flow that saves a reusable method without charging it.

Submitting a campaign records the proposed invoice and sends it to admin review without creating or confirming a campaign charge.

After approval, show the final invoice and require an explicit **Fund and Publish** action before creating and confirming the PaymentIntent.

Keep failed, canceled, and authentication-incomplete payments approved but unpublished and retryable.

Invalidate approval and require re-review after a material change to campaign price, capacity, reward, deliverables, rights, or schedule.

Create the business's full `Total Due` as an indirect platform PaymentIntent with Local Missions as intended merchant of record. Use separate charges and transfers, or only a legally reviewed Stripe-required equivalent, so one campaign charge can fund multiple creator connected accounts.

Associate the charge, slot allocations, refunds, and creator transfers through immutable internal IDs, a Stripe transfer group, and `source_transaction` where supported. Transfer only the locked creator reward; retain the 15% platform-fee allocation only for completed slots.

Store provider objects by immutable IDs, not copied mutable status alone.

Verify webhook signatures from the raw request body.

Persist webhook event IDs before processing and make handlers idempotent.

Send processing to durable queue where appropriate.

Create double-entry-style internal ledger entries for funding, fee, participant payable, transfer, refund, dispute, and adjustment.

Represent each selected add-on as its own immutable reward component. Test that all percentage calculations use the base mission reward, round deterministically in integer minor units, enter the Creator Reward Pool, and receive the standard 15% fee without compounding.

Implement renewal funding as a separate immutable invoice and PaymentIntent using 25%, 50%, or 100% of the original locked base reward. Creator acceptance alone cannot charge the business or extend rights; explicit business funding plus the authoritative success webhook activates the license and creator payable.

Automatically create an idempotent partial refund to the original business payment when a slot reaches final no-payout status. Refund that slot's full reward and proportional platform fee; record unrecoverable processor cost as a Local Missions expense.

For a Reach no-payout slot, include the base reward, full Reach bonus, and 15% platform-fee allocation in the automatic refund; deduct no processing amount.

Queue the creator transfer automatically and idempotently when approval, auto-approval, or approved dispute resolution commits the full payout-ready obligation. Do not expose a separate business payout-release control.

Track the connected-account transfer and subsequent Stripe payout as separate states. A transfer means funds reached the creator's Stripe balance; only the authoritative payout webhook means Stripe paid the external account.

Model Stripe fees, refunds, disputes, chargebacks, negative balances, reconciliation differences, and reserve movements as Local Missions responsibilities. A transfer reversal or recovery is a privileged audited exception and cannot silently rewrite creator earnings.

Calculate the provisional required operating reserve as `max($5,000, 10% of trailing-90-day gross payment volume) + 100% of unresolved refunds, disputes, chargebacks, and negative balances`, with every exposure counted once in integer minor units. Treat gross payment volume as successful campaign and license-renewal charges before refunds or chargebacks.

Count only unrestricted platform-owned cash or cash equivalents allocated to payment risk as available reserve. Exclude creator payables, refunds owed, taxes, customer funds, credit facilities, receivables, and expected revenue.

Recalculate required and available reserve daily and after a major payment, dispute, fraud, or reconciliation incident. Warn finance below 125% coverage and atomically reject new **Fund and Publish** attempts below 100% before creating additional exposure.

Keep approved creator transfers and owed refunds moving during a reserve funding pause. Preserve approved campaigns as private and retryable, and do not overload the reserve gate to pause unrelated workflows.

Treat an approved/auto-approved creator reward as final against ordinary business refund requests, payment disputes, and card chargebacks. Never allocate processing, dispute, chargeback, or platform-loss fees to a creator or create a creator receivable merely because the business disputes the charge.

Permit recovery only for a proven duplicate transfer, documented creator fraud tied to the payment, or binding legal order. Require a case, evidence, creator notice, separation between investigator and finance approver, an appeal period unless legally barred, and an exact recoverable amount.

Do not create silent negative creator balances or offset unrelated future mission earnings. A credible unresolved fraud case may pause future payout execution and sensitive account changes, but every earned obligation remains in the ledger and is released when the allegation is not sustained.

Add refund, partial refund, failed payment, failed transfer, account-disabled, dispute, and chargeback paths.

Reconcile internal ledger to Stripe test objects.

Prove one campaign PaymentIntent can reconcile to multiple creator transfers and retained completed-slot platform-fee allocations. Verify a no-payout slot refunds before transfer and an approved/auto-approved slot queues exactly one transfer without another business action.

Verify an ordinary post-approval business chargeback debits the Local Missions reserve/chargeback accounts without changing the creator payable, transfer, paid status, or future earnings. Verify duplicate/fraud/legal-order recovery requires dual-role approval, notice/appeal state, and exact-amount entries.

Test the reserve formula at the `$5,000` floor, the 10% volume crossover, and every open-exposure component. Test the 125% warning and exact 100% funding boundary, concurrent **Fund and Publish** attempts, incident-triggered recalculation, recovery after replenishment, and continued creator-transfer/refund execution while new funding is disabled.

Add admin reconciliation report and stuck-payment alert.

Stripe CLI checks

stripe listen --forward-to localhost:4000/v1/webhooks/stripe
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger account.updated
pnpm test:integration -- payments
pnpm payments:reconcile -- --environment local --dry-run

Verification

Duplicate webhook delivery creates no duplicate financial effect.

Out-of-order webhooks converge on the correct provider-derived state.

Browser redirect cannot mark payment successful by itself.

Saving a payment method or submitting a campaign creates no campaign charge.

An unapproved campaign cannot create a campaign PaymentIntent, and an approved campaign cannot publish before the authoritative successful-payment webhook is processed.

The PaymentIntent amount equals the immutable final Total Due snapshot that the business approved; no undisclosed amount may be added after **Fund and Publish**.

Retrying **Fund and Publish** with the same idempotency scope creates no duplicate charge.

Two payout release requests create one transfer.

Failed transfer remains owed and visible; it is not marked paid.

Refund and dispute totals reconcile in minor currency units.

A final no-payout slot produces one automatic refund to the original payment method without a manual request, store credit, duplicate refund, or deduction for unrecoverable processor cost.

The business-facing campaign statement reconciles the original charge, completed slots, no-payout slot refunds, absorbed processor costs, and final paid total.

For a `$50` base reward, pricing tests produce creator rewards of `$75`, `$100`, and `$150`; the confirmed 15% fee produces transparent platform-fee lines of `$11.25`, `$15`, and `$22.50`, with ordinary processing included.

The Level 2 Instagram plus Level 1 TikTok example reconciles to a `$125` creator payable, `$18.75` platform fee, and `$143.75` funded slot; final no-payout refunds `$143.75` before any tax adjustment.

Platform fee display matches actual ledger entries.

No bank, tax, identity, secret, or full payment details enter application logs.

Test-mode onboarding works on physical iPhone and desktop browser.

Legal/accounting/live-readiness questions remain visibly unchecked until reviewed.

Live-money blockers

Marketplace counsel approves terms and worker classification approach.

Accountant approves reporting/reconciliation/tax plan.

Insurance review is complete.

Refund, cancellation, reserve, and chargeback policies are approved.

Stripe production configuration and business verification are complete.

Gate

M12 engineering passes when test-mode reconciliation reaches zero unexplained difference; live payments remain blocked until every live-money item is checked.

M13 — Local Pass, redemption, and attribution confidence

Goal

Measure real outcomes without overstating weak signals.

Build tasks

Generate unique opaque creator-and-campaign Local Pass links and QR codes without public internal identifiers.

Provide a lightweight mobile-web claim flow that does not require app installation; deep-link installed users only as an optional convenience.

Record link open, `pass_claimed`, and `verified_pass_redemption` as distinct events. A link open is not a visit, and V1 does not record a confirmed purchase or incremental-lift result without a future separately approved integration or experiment.

Issue a short-lived rotating claim token and create an authorized Business/Venue Staff scanner with clear confirmation and auditable reversal.

Make each pass single-use, venue-specific, and valid for seven days after claim. Prevent brute-force enumeration, screenshots/replay, concurrent duplicate redemption, and wrong-location redemption transactionally.

Attach source campaign/creator/content internally without exposing creator or customer identity publicly. Allow one attributed pass per customer/campaign and lock attribution to the first valid claim so later links cannot overwrite it.

Store explicit V1 attribution evidence:

pass_claimed

verified_pass_redemption

Reserve future versioned evidence classes for confirmed booking/POS purchase and experimental incremental lift, but do not populate or blend them into V1 results.

Report aggregate claims, verified redemptions, claim-to-redemption conversion, and actual completed-campaign cost per verified redemption to the business.

Show a creator only their own aggregate attributed claims/redemptions. Do not expose customer identity, contact information, precise location, or cross-campaign behavior to businesses or creators.

Keep Local Pass results separate from mission acceptance, guaranteed reward, Reach qualification, and creator reliability.

Verify the customer by short-lived, single-use SMS OTP without creating a full account. Normalize and encrypt the phone number with restricted platform-only access, permit active-pass recovery only after a new OTP challenge, and enforce one pass per normalized number/campaign.

Keep Local Pass marketing consent separate, optional, and unchecked. Never expose the phone number to businesses, creators, analytics, logs, or pass payloads.

Delete the encrypted/raw phone number 30 days after redemption or expiry. Retain only a versioned Key Vault-backed HMAC deduplication token and minimal redemption audit for 12 months, then delete or irreversibly anonymize the customer-level linkage so only aggregate statistics remain.

Rate-limit OTP send/verify by pass, destination token, IP/device risk, and time window. Use short-lived, single-use, attempt-limited codes; configure SMS-provider logs for the shortest practical retention and never log codes in plaintext.

Model approved offer inventory, active claim reservations, redemption, expiry release, future-claim pause, emergency closure, extension, substitute, refusal report, and review as explicit versioned states/events.

Reserve one inventory unit transactionally on successful claim. Reject oversubscription under concurrency, prohibit reducing quantity below active claims, and allow a business pause to stop only future claims.

Require venue staff to review the exact offer and confirm it was honored before redemption. Allow only a preapproved or customer-accepted equal-or-greater-value substitute and record the substitute in the audit.

For a documented emergency closure, pause redemption and extend active passes by the closure duration. Preserve reported refused passes during review and route repeated or intentional failures to business campaign pause and trust/safety review.

Verification

Universal link opens the correct campaign/pass on iPhone.

Web fallback works when the app is not installed.

Expired, revoked, already redeemed, and wrong-location codes behave clearly.

Staff cannot redeem for an unauthorized business/location.

Reversal leaves immutable history.

Dashboard never describes a claim or verified redemption as a purchase, sale, incremental customer, or incremental revenue.

First-claim attribution cannot be overwritten by a later creator link for the same customer/campaign.

No Local Pass outcome changes creator completion, payout, Reach tier, or reliability.

One normalized phone cannot claim two creator passes for the same campaign, including under concurrent requests.

Pass recovery requires a fresh OTP and never changes first-claim attribution.

Business, creator, analytics, and ordinary support responses contain no customer phone number.

Deletion tests remove encrypted contact data 30 days after redemption/expiry and remove or anonymize the HMAC/audit linkage after 12 months while preserving aggregate campaign totals.

Marketing remains off unless the customer completes a separate explicit consent action.

Concurrent final-inventory claims produce exactly one reservation and no oversubscription.

Pausing future claims leaves every active claimed pass redeemable and prevents inventory reduction below active reservations.

Emergency closure extends affected passes without marking them expired, redeemed, or revoked.

Staff cannot mark a pass redeemed before confirming the offer or an allowed equal-or-greater substitute was provided.

A refusal report preserves the pass and creates a reviewable incident; repeated confirmed failures pause the business's campaigns.

Playwright and browser control cover claim/redeem/report paths.

Physical iPhone covers universal link path.

Gate

M13 passes when one synthetic post-to-pass-to-redemption journey is traceable without claiming more confidence than the evidence supports.

M14 — Notifications, reminders, and asynchronous reliability

Goal

Deliver timely action requests without duplicate spam or lost work.

Build tasks

Register Expo push tokens per installation and rotate/remove invalid tokens.

Add email provider abstraction for critical transactional messages.

Define notification event catalog and user preferences.

Queue acceptance, reminder, check-in, submission due, revision, approval, payout, and dispute notifications.

Add quiet-hour/timezone rules where appropriate.

Add idempotency/deduplication keys.

Add exponential retry, dead-letter queue, and admin replay with reason.

Deep-link notifications to the correct authorized screen.

Avoid sensitive mission details on locked-screen notifications.

Add in-app notification center as a durable record for important actions.

Verification

Duplicate event results in one user-visible notification.

Dead-lettered message is visible and replayable.

Revoked/invalid push token is disabled.

Unauthorized recipient cannot open a deep link's protected content.

Locked-screen copy exposes no unnecessary private information.

Test foreground, background, and terminated-app delivery on a physical iPhone.

Test disabled notifications and email fallback.

Test creator invitation reminders on days 7/12, business reminders around days 14/25, deduplication across push/email, stopped reminders after completion/decline/expiry, and accessibility-safe service-message content.

Correlate event, queue message, provider response, and user notification using request/event IDs.

Gate

M14 passes when critical action notifications are deduplicated, traceable, and recoverable from the dead-letter path.

M15 — Admin/support console and operational control

Goal

Operate the marketplace safely without direct database edits.

Build tasks

Build the protected employee console as a desktop-oriented web surface separate from the shared iPhone app. Require separately granted staff access, MFA, recent step-up for high-risk actions, least-privilege roles, and session revocation; never make platform-wide administration a selectable mobile mode.

Queues for business approval, campaign review, suspicious check-ins, quarantined media, overdue reviews, disputes, failed payouts, and dead letters.

Separate creator/business onboarding correction and appeal queues. Enforce reason-code policy, correction/appeal deadlines, reviewer independence, limited fraud/security redaction, and explicit final outcome; the original decision maker cannot decide the appeal.

Search by public ID and constrained metadata; do not create a broad personal-data browser.

Read-only user/business/campaign timeline.

Explicit privileged actions with confirmation, reason, and audit.

Role separation for support, finance operations, trust/safety, and admin.

Break-glass procedure with alerts and periodic review.

Feature flags/kill switches for applications, check-ins, uploads, payments, and notifications.

Provide a restricted creator-recovery case queue with evidence, notice, appeal deadline, investigator, separate finance approver, exact amount, legal basis/reason code, and immutable actions. Ordinary business chargebacks must not create a case automatically.

Implement independently scoped pilot switches for new funding, campaign publishing, creator assignment, check-in, and payout execution. Record actor, reason, scope, incident/case ID, activation time, review/expiry time, and restoration evidence.

Enforce role separation: the operations lead can coordinate support and disputes but cannot edit ledger history; the finance operator can resolve authorized payout/refund exceptions but cannot approve their own business/campaign or alter immutable entries; the technical on-call owner can operate scoped controls but cannot convert or erase money owed.

Display current pilot counts and financial exposure against the 10-business, 100-creator, 20-slot, `$2,500` per-campaign, and `$25,000` unsettled-reward caps. Alert before the threshold and reject new exposure atomically at the hard limit.

Display the current required reserve, eligible available reserve, coverage percentage, formula components, last calculation time, warning state, and new-funding gate state. Notify finance below 125%, disable new funding below 100%, and require a recorded restoration calculation before re-enabling it.

Provide a restricted monthly reserve review and require another review before any pilot-cap increase. Preserve immutable snapshots and audit events for calculations, alerts, gate transitions, acknowledgments, and restoration; ordinary support cannot alter reserve inputs or force funding through a failed gate.

Data export/deletion-request workflow.

Runbooks linked from each operational queue.

Service-level dashboards for stuck workflows.

Verification

Support cannot silently modify money or audit history.

High-risk override requires recent authentication and reason.

Every privileged action is queryable in the audit report.

Browser control walks each queue and one safe synthetic resolution.

Playwright asserts authorization for every admin route and action.

Mobile routing and authorization tests prove that Creator, Business, and Venue Staff sessions cannot discover, request, or receive platform-wide employee capabilities. Static inspection confirms the iPhone bundle contains no employee-console route or privileged operational secret.

Kill switch stops new actions without corrupting in-progress records.

Restore behavior after re-enabling is tested.

Gate

M15 passes when the synthetic pilot can be operated and recovered without SQL edits or secret production shell access.

M16 — Security, privacy, accessibility, performance, and resilience hardening

Goal

Turn the feature-complete staging system into a defensible release candidate.

Security tasks

Threat model authentication, authorization, QR replay, upload abuse, webhook forgery, payout fraud, business isolation, admin misuse, and enumeration.

Run dependency, secret, SAST, container, and Terraform scans.

Add rate limits by route/risk and safe abuse responses.

Validate all authorization server-side.

Add security headers and restrictive CORS.

Validate request sizes and timeouts.

Protect logs from injection and personal data.

Rotate a nonproduction secret and document the process.

Test backup restoration and point-in-time recovery using synthetic staging data.

Run an independent penetration review before meaningful live money/volume.

Privacy tasks

Complete data inventory and data-flow map.

Verify both waitlist lifecycles: one service reconfirmation notice around month 11, expiry at month 12 without explicit reconfirmation, immediate withdrawal/expiry removal from selection, stopped waitlist messaging, separate marketing consent, role-specific data deletion within 30 days, and a maximum 12-month non-personal audit record containing no contact, area, interest, availability, budget, or campaign-intent values.

Verify invitation timers, one-extension enforcement, exclusion/pausing for platform or provider review time, atomic pilot-capacity release, no reliability penalty, re-invitation eligibility, and the absence of any mission/money reservation from an invitation alone.

Verify incomplete-onboarding closure and 30-day deletion across database fields, Blob versions, thumbnails/derivatives, temporary processing, unfinished campaigns, local payment references, provider-cleanup requests, backups/aging, expiring legal/security holds, and privacy alerts. Prove that pending timely reviews do not enter cleanup, the minimal waitlist return contains no copied sensitive field, and another active role/shared account remains intact.

Verify correction/appeal state transitions, 14-day windows, paused invitation timers, independent reviewer authorization, 10-business-day target monitoring, objective reason/versioning, fraud-detail redaction boundaries, successful resume, final-denial cleanup handoff, and denial of popularity/appearance/follower/budget/subjective reason codes. Prove no appeal path can alter another role or earned money.

Verify that waitlist expiry/deletion does not remove the shared identity, another active role, an invited/approved profile, or records governed by a separately disclosed legal/financial lifecycle. Test account deletion as an independent workflow.

Verify mission-window-only location collection.

Verify raw coordinate deletion/minimization job.

Verify the raw locality-proof lifecycle: 30-day deadline calculation, appeal extension, idempotent deletion, object-version/derivative cleanup, evidence-reference clearing, backup aging, expiring legal holds, and operations alerts on failure.

Verify private media access and retention lifecycle.

Verify the Local Pass contact lifecycle: encrypted phone deletion 30 days after redemption/expiry, SMS delivery-log minimization, HMAC key/version access controls, 12-month dedup/audit deletion or anonymization, and preservation of non-identifying aggregates.

Verify the Reach analytics lifecycle: official/approved source enforcement, consent revocation, no manual-evidence path, 90-day expiry, one 14-day outage grace, accepted-reward immutability, raw/cached/derivative deletion 30 days after verification/appeal closure, and derived-tier-only business responses.

Implement account export and deletion handling, including justified retained records.

Create privacy policy and in-app permission explanations for counsel review.

Create App Store privacy-label worksheet including every third-party SDK.

Prohibit raw location-data sale and sensitive-location missions.

Accessibility tasks

VoiceOver traversal of every critical participant flow.

Dynamic Type at accessibility sizes.

Color contrast and non-color status indicators.

Reduced Motion support.

Keyboard navigation and visible focus in web dashboard.

Accessible names for QR, camera, upload, charts, dialogs, and status badges.

Error summary and focus management in forms.

Performance budgets

Define p95 API latency budgets per critical endpoint.

Define cold-start and first-use expectations.

Define mission-feed time-to-content on representative cellular network.

Define app startup, crash-free session, and upload success targets.

Load test feed, application race, check-in, webhook burst, and dashboard queues.

Verify database connection limits during scale-out.

Verify media never traverses API memory.

Cap telemetry cost and retention.

Resilience drills

PostgreSQL temporarily unavailable.

Blob upload interrupted.

Service Bus delayed and dead-lettered.

Stripe unavailable or webhook delayed.

Notification provider unavailable.

Bad API revision deployed and rolled back.

Migration fails before/after partial deployment.

External ID temporarily unavailable.

Gate

M16 passes only when no open critical/high security issue remains, critical accessibility flows pass, and recovery drills meet documented outcomes.

M17 — Full release-candidate verification

Goal

Run one repeatable, evidence-producing test program across local, Azure staging, browsers, iOS Simulator, and physical iPhone.

Automated test pyramid

Unit tests for domain rules and UI logic.

Property/table tests for state transitions and money arithmetic.

Component tests for forms, status, permissions, and errors.

Integration tests with real PostgreSQL, Blob emulator/controlled storage, and queue emulator/test namespace.

Contract tests against OpenAPI.

Stripe webhook fixture tests and test-mode E2E.

Playwright web E2E with traces/screenshots.

Maestro mobile E2E with screenshots.

Terraform validation and policy scans.

Load, security, accessibility, and recovery tests.

Golden E2E journey

Admin approves a synthetic business.

Business creates a location.

Business creates and test-funds a five-slot mission.

Admin approves and publishes it.

Participant signs in on iPhone.

Participant finds and applies.

Business accepts participant.

Venue staff confirms readiness.

Participant acknowledges final brief.

Participant checks in with QR.

Participant uploads photo/video and submits.

Business requests one valid revision.

Participant resubmits.

Business approves.

Stripe test payout/transfer succeeds.

Participant sees paid state.

Local Pass is claimed and redeemed.

Dashboard report shows correct confidence class and totals.

Admin audit timeline reconstructs every important event.

Internal ledger reconciles to Stripe test mode.

Negative E2E journeys

Duplicate application/final slot race.

Canceled mission.

Venue closed/business-caused failure.

No-show.

Expired/replayed QR.

Interrupted/invalid upload.

Unreasonable revision request and participant dispute.

Payment failure and retry.

Out-of-order/duplicate Stripe webhooks.

Unauthorized business cross-tenant access.

Account disabled/deletion requested.

Network loss at each participant write step.

Exact evidence requirements

JUnit/XML test results.

Code coverage report with meaningful threshold and exclusions reviewed.

Playwright trace for the golden web flow.

Maestro flow output for the golden mobile flow.

iOS screenshots at every major state.

Desktop/mobile browser screenshots at every business/admin state.

Redacted API request/response examples.

Reconciliation report showing zero unexplained difference.

Azure trace showing end-to-end correlation IDs.

Accessibility report.

Load-test report.

Security-scan summaries.

Restore/rollback drill record.

Final verification command target

pnpm verify
pnpm test:integration
pnpm test:e2e:api -- --environment staging
pnpm test:e2e:web -- --environment staging
pnpm test:e2e:mobile -- --environment staging
pnpm test:accessibility
pnpm test:security
pnpm test:load -- --profile release-candidate
pnpm payments:reconcile -- --environment staging

Gate

M17 passes when the golden journey and every launch-blocking negative journey pass on the same immutable staging release candidate.

M18 — TestFlight internal and external beta

Goal

Validate the real signed iOS app with humans, real devices, real permissions, and staging/test-mode services.

Pre-live-money beta boundary

Until all legal, Stripe, accounting/tax, insurance, reserve, security, and operational live-money gates pass, every TestFlight mission is synthetic or clearly noncommercial.

Show a persistent **TEST MODE — no real payment** treatment anywhere a reward, charge, transfer, refund, balance, or payout appears.

Do not ask a tester to publish a promotional post, create commercially useful marketing work, or grant a content license. The business and platform cannot export, download for reuse, advertise, boost, repost, or otherwise use beta submissions for marketing.

Allow real-world QR/check-in testing only with staff, paid QA workers, or informed consenting participants in a controlled noncommercial test. Handle any travel, meal, or other expense reimbursement outside the app, disclose it separately, and never describe it as an app payout.

Treat submitted media and evidence as test data. Delete them under the staging/test retention policy, do not activate usage rights, and do not use beta participation to change production reliability, payment history, or Community access.

Reserve the first commercially useful mission for the funded controlled Orlando pilot after every live-money gate passes.

Build/release tasks

Freeze bundle ID and Expo project identifiers.

Configure eas.json for development, preview, staging, and production profiles.

Configure app icon, splash, display name, version, build number, permissions, universal links, and privacy manifests.

Create App Store Connect app record.

Configure signing credentials through the approved EAS/Apple process.

Build the exact staging candidate with EAS.

Submit with EAS Submit.

Complete encryption/export-compliance answers accurately.

Add beta description, test focus, support email, and reviewer login/instructions.

Start with internal testers.

Expand to a small external group only after internal exit criteria pass.

Example release commands

eas whoami
eas build --platform ios --profile staging
eas submit --platform ios --profile staging

Internal beta test script

Fresh install.

Upgrade from previous beta without losing safe state.

Sign up/sign in/logout.

Deny then enable camera, photos, notifications, and foreground location.

Deep link from email, notification, and Local Pass.

Complete golden journey.

Upload on Wi-Fi and cellular.

Background/foreground the app during upload/auth.

Kill/relaunch during an in-progress mission.

Test small/large iPhones and current supported iOS versions.

Test VoiceOver and large Dynamic Type.

Verify no production data or live Stripe mode is used.

Verify commercial-use/export endpoints and business media actions deny access to beta submissions.

Verify no beta workflow activates a content license, public-post obligation, production reliability event, or real payment obligation.

Beta metrics/exit criteria

No known crash in the golden path.

Crash-free sessions meet the chosen threshold.

Check-in success meets the chosen threshold.

Media upload success meets the chosen threshold.

No duplicate applications, notifications, approvals, or payouts.

All critical tester feedback has disposition.

At least five full synthetic/noncommercial beta missions complete end to end.

Support and rollback runbooks have been used at least once.

Screenshot review

Capture final App Store screenshots from the actual release-candidate UI.

Use synthetic attractive Orlando examples and no private tester data.

Verify screenshots correspond to current app behavior.

Keep between one and ten screenshots per required display class according to current App Store Connect rules.

Gate

M18 passes when internal/external testers complete the workflow on real iPhones, the noncommercial/test-money boundary is proven, beta content cannot be used commercially, and no launch-blocking defect or policy issue remains.

All user distribution remains TestFlight-only after M18 until the M19 public-release gate passes. Do not publish a public waitlist shell or a public build with the paid mission workflow disabled.

M19 — App Store and controlled production launch

Goal

Release safely to a limited Orlando pilot, not to an uncontrolled national marketplace.

Production-readiness tasks

Community launch must pass without any Reach analytics integration. Treat each approved Reach platform as an optional post-baseline feature activation, not an App Store, live-money, or Orlando-pilot prerequisite.

No commercially useful creator mission may begin before every live-money blocker has passed. TestFlight participation and synthetic/noncommercial beta missions are product-validation evidence, not paid traction or business marketing inventory.

Public App Store release is blocked until every production payment, reserve, legal/accounting/tax/insurance, private-networking, security, privacy, support, monitoring, and operational gate below has passed.

Before release, one approved Orlando business must have a funded and approved Community campaign ready, enough qualified invited creators must be available to fill it, and staffed support must cover its mission window.

All M12 live-money blockers are checked.

The approved reserve is funded with eligible platform-owned cash, the calculation and automatic gate are verified in production, and external legal/accounting/insurance/Stripe review has accepted the treatment or required a documented higher floor.

Production infrastructure is created from reviewed Terraform.

Production database backup and restore are verified.

Production Stripe webhooks, Connect configuration, and reconciliation are verified with controlled transactions.

Production Entra tenant/app registrations and redirect URIs are verified.

Terms, privacy policy, support URL, marketing URL, account deletion, and disclosure rules are live.

App privacy details accurately include every SDK and data use.

App age rating and content declarations are accurate.

App Review notes explain QR, camera, location, uploads, business role, admin role, and test credentials.

Reviewer can reach the full app without needing to visit a real Orlando venue; provide demo mode or precise review instructions.

Monitoring dashboards, on-call contact, alerts, feature flags, and kill switches are active.

Status/incident communication template exists.

Production seed creates no fake public opportunities.

Launch sequence

Deploy production API/dashboard/worker revision with new user actions disabled.

Run infrastructure, health, auth, storage, queue, and webhook smoke tests.

Submit the signed production iOS build to App Review.

Respond to review questions with evidence and screenshots.

Hold the approved build under manual release control until every public-release gate passes.

Start a phased public release only after the named launch approver records the release checklist, gate evidence, ready funded campaign, invited cohort, support schedule, rollback owner, and go/no-go decision.

Enable production mission access only for invited Orlando businesses and creators. After public release, uninvited adults may use only the data-minimized creator waitlist, and uninvited businesses may use only the data-minimized business-interest request.

Enforce the confirmed pilot caps in production: 10 approved businesses, 100 verified creators, 20 slots and `$2,500` Creator Reward Pool per campaign, and `$25,000` funded-but-unsettled creator rewards platform-wide.

Recalculate reserve coverage before every new funding action. When coverage is below 100%, keep **Fund and Publish** disabled while continuing already-approved creator transfers and refunds owed.

Require manual approval for every pilot business and campaign, named operations/finance/technical owners, staffed support during mission windows, and tested independent switches for funding, publishing, assignment, check-in, and payout execution.

Run one controlled funded campaign.

Reconcile money and audit every mission manually.

Expand volume only after operational thresholds hold.

Do not raise any pilot cap until at least 50 creator slots have completed successfully and an explicit review covers completion, disputes, support load, reconciliation, incidents, and unit economics. Expansion requires a recorded approval and configuration change, never an automatic threshold action.

Production smoke tests

App Store/TestFlight production binary points only to production endpoints.

Production endpoint rejects dev/test tokens and test-only routes do not exist.

Authentication issuer/audience are production values.

Blob containers are private and upload grants are narrow/short-lived.

Stripe live/test mode cannot be mixed.

Business isolation smoke test passes.

One-cent/dollar controlled payment plan follows Stripe and accounting guidance; no destructive ad hoc testing.

Logs/traces contain correlation but no forbidden personal/financial data.

Alerts fire from a synthetic canary and are acknowledged.

Gate

M19 public release begins only when the production app is approved, every release gate passes, one controlled funded Community campaign and its invited cohort are ready, support can operate it, and no critical alert remains. M19 completes after that campaign reconciles correctly and the launch review accepts the evidence.

M20 — Post-launch learning, reliability, and scale gates

Goal

Use evidence to decide what to automate or expand next.

Weekly operating review

Funded mission slots, fill rate, and time to fill.

Completion, no-show, and business-caused failure rate.

Approval and payout latency.

Disputes, refunds, chargebacks, and fraud loss.

Support minutes per completed mission.

Participant second-mission rate.

Community opportunity exposure, application, offer, acceptance, and completion rates; new-creator participation; and repeat-opportunity concentration.

Reach Slot share never exceeds 20%, and Reach analytics access remains consented and auditable.

Track tier verification age, expiry, re-verification, appeals, and suspected analytics manipulation without using Reach data in Community matching.

Business 30/90-day repeat rate.

Confirmed Local Pass claims/redemptions/purchases by confidence class.

Platform revenue, GMV, fee rate, and contribution margin.

Crash-free sessions, API SLOs, upload success, notification success, and cost.

Privacy/access/deletion requests and security events.

Expansion gates

Do not build Android until the iOS workflow is stable and participant demand justifies it.

Do not add a second Orlando cell until the first has consistent fill/completion/repeat behavior.

Do not add POS integrations until several paying businesses use the same provider.

Do not add AI matching until manual selection produces labeled outcomes and a measurable decision problem.

Do not add sponsor/government dashboards until private campaigns generate credible outcome data.

Do not add continuous location, sell raw location, or weaken privacy to improve attribution.

Likely next product increments

Participant reliability and business quality scores with appealable inputs.

Base plus verified-performance bonuses.

Better business cohort/ROI reports.

Reusable campaign templates and multi-location hierarchy.

Booking/POS integration selected from actual customer concentration.

Android build from the existing React Native codebase.

5. Browser-control and screenshot verification protocol

Browser control is for the business/admin/venue web application and web fallbacks. It does not prove native iOS behavior.

For every web milestone:

Start the exact application/API build under test.

Seed a named synthetic scenario.

Open the page in a controlled browser session.

Set viewport to one desktop and one narrow mobile width.

Inspect browser console and failed network requests.

Complete the happy path using visible UI controls.

Complete at least one permission or validation failure.

Refresh mid-flow and verify durable state.

Use Back/Forward navigation and direct URLs.

Capture screenshots after the page is stable.

Run Playwright for repeatability and preserve trace on retry/failure.

Compare API/database state with what the UI claims.

Suggested web command:

pnpm --filter dashboard dev
pnpm exec playwright test --project=chromium --trace=retain-on-failure
pnpm exec playwright show-report

For every native milestone:

Use an Expo development build, not Expo Go, once native modules are present.

Run a Maestro flow on an iOS Simulator.

Capture screenshots with stable synthetic data and deterministic time where possible.

Test smallest, standard, and Max-size layouts.

Run a physical-iPhone pass for camera, push, deep links, secure storage, cellular network, and large uploads.

Verify the screen manually after automation; a passing assertion cannot detect every visual defect.

Capture screen/video for intermittent bugs.

Repeat critical flows against the immutable staging release candidate.

Important constraint:

EAS can build and submit iOS binaries from Linux/Windows/macOS, but a local iOS Simulator requires macOS/Xcode. If the coding environment is not macOS, use EAS for the build and validate on a physical iPhone through development/TestFlight distribution or use a macOS/Maestro cloud runner. Expo web screenshots are useful layout smoke tests but never replace native iOS verification.

6. API smoke-test script requirements

By M7 create scripts/smoke-api.sh that:

Uses strict shell behavior.

Accepts API_BASE_URL and synthetic credentials through environment variables.

Checks health/build info.

Creates or resolves a synthetic business/location.

Creates a draft campaign.

Submits/admin-approves/test-funds/publishes it.

Applies as a synthetic participant.

Accepts/schedules/checks in.

Creates an upload intent using a tiny safe fixture.

Submits and approves.

Simulates or uses Stripe test mode for payout.

Creates, claims, and redeems Local Pass.

Fetches the report and verifies expected totals with jq -e.

Writes redacted responses to docs/evidence/<milestone>/api/.

Fails immediately on non-2xx responses or unexpected state.

Can rerun safely through idempotency keys and cleanup/reset strategy.

The script must never target production unless a separate, explicitly named production-canary mode is implemented with strong safeguards.

7. Required final test matrix

Area

Local

Azure staging

iOS Simulator

Physical iPhone

Browser

Domain/state rules

Yes

Smoke

N/A

N/A

N/A

Database/concurrency

Yes

Yes

N/A

N/A

N/A

Auth/deep links

Synthetic + real dev

Yes

Yes

Yes

Yes

Mission feed/apply

Yes

Yes

Yes

Yes

Dashboard only

Business creation/review

Yes

Yes

Limited

Limited

Yes

QR/camera/location

Mock

API security

Partial

Yes

Venue fallback

Photo/video upload

Emulator

Yes

Partial

Yes

Business review

Stripe

CLI/test mode

Test mode

Onboarding return

Yes

Yes

Local Pass

Yes

Yes

Deep link

Yes

Claim/redeem

Push notifications

Mock

Provider test

Partial

Yes

N/A

Accessibility

Components

Smoke

VoiceOver where available

Yes

Keyboard/axe

Performance

Yes

Load test

Startup/layout

Cellular/upload

Web vitals

Recovery/rollback

Local data

Yes

Upgrade/relaunch

Upgrade/relaunch

Revision rollback

8. Launch-blocking checklist

The app must not launch while any of these is true:

A participant can see another participant's private data.

One business can access another business's campaigns, submissions, or media.

Capacity can overbook under concurrency.

Duplicate webhook/request can duplicate a charge, transfer, refund, or payout.

Uploaded media is public or permanently accessible by bearer URL.

Check-in QR can be trivially replayed.

Production accepts dev tokens or contains test-only endpoints.

Account deletion is absent from an app that supports account creation.

App privacy details omit collected data or third-party SDK practices.

Location permission is requested without immediate mission context.

The system pays for positive reviews or hides material connections.

Live funds move before legal/accounting/Stripe production review.

No production backup restore has been tested.

No monitored human receives critical alerts.

App Review lacks functional demo credentials/instructions.

Golden E2E fails on the exact release candidate.

9. Official implementation references

Check these again at the milestone where they matter because platform requirements change:

Expo EAS Build: https://docs.expo.dev/build/introduction/

Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/

Expo App Store submission: https://docs.expo.dev/submit/ios/

Microsoft Entra External ID native/browser authentication concepts: https://learn.microsoft.com/en-us/entra/identity-platform/concept-native-authentication

Microsoft OAuth authorization code + PKCE: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

Azure Container Apps scaling: https://learn.microsoft.com/en-us/azure/container-apps/scale-app

Azure Container Apps managed identity: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity

Azure Database for PostgreSQL: https://learn.microsoft.com/en-us/azure/postgresql/overview

Azure Storage SAS guidance: https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview

Stripe Connect marketplace: https://docs.stripe.com/connect/marketplace

Stripe separate charges and transfers: https://docs.stripe.com/connect/separate-charges-and-transfers

Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/

Apple TestFlight overview: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/

Apple screenshot requirements: https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/

Maestro documentation: https://maestro.mobile.dev/

10. Recommended first coding run

When beginning implementation, execute only M0 and M1 first.

The first tangible result should be:

A clean monorepo in which an Expo development build opens a polished participant shell on an iPhone, a Next.js dashboard opens in a controlled browser, a NestJS API reports healthy against local PostgreSQL, and one command verifies formatting, types, tests, and builds.

Then complete M2 with realistic clickable screens before adding payment or location complexity. After M3–M5 establish state machines, identity, and Azure delivery, build the real vertical workflow from M6 through M12. Do not mark the project “MVP complete” at a visually polished feed; the minimum meaningful completion point is the test-mode funded mission that reaches verified check-in, submission, approval, and reconciled payout.

11. Work log

2026-08-09 — Plan created

Milestone: M0

Completed: Architecture selection and beginning-to-end implementation/verification plan.

Verification: Structural validation PASS — 21 milestones found, 20 advancement gates found, 34 balanced code-fence markers, all required technology/testing terms present, and final newline confirmed.

Evidence: plans.md

Decisions: Proposed ADR-001 through ADR-006; create the actual ADR files during M0.

Blockers: Product name, bundle ID, repository, Apple/Expo/Azure/Stripe accounts, and legal decisions remain intentionally unresolved.

Next exact task: Complete the M0 product contract and state-transition tables.

### 2026-08-23 — Figma participant-flow discovery

- Milestone: M0
- Completed: Added the supplied build contract as `plans.md`; created the connected Figma file `Local Missions — iOS User Flows`; extracted participant flows, color tokens, priority screens, failure states, and reusable component scope; discovered Apple iOS 26 library assets.
- Verification: Figma file creation and metadata/library discovery — PASS; Figma library search — PARTIAL PASS, then blocked by the connected Starter-plan MCP tool-call limit.
- Evidence: `docs/design/figma-phase-0.md`, `docs/concepts/local-missions-color-system-final.svg`, and https://www.figma.com/design/ahnZLBPtoxs6wmtEdSUEeR
- Decisions: Proposed Apple iOS 26 components as the stable native baseline; no ADR created and no M2 task marked complete.
- Blockers: Figma MCP tool-call limit must reset or the connected Figma plan must be upgraded before variables, styles, components, screens, and prototype links can be created.
- Next exact task: Resume Figma Phase 0 inspection, confirm the iOS baseline, then create the Local Missions foundations before composing participant screens.

### 2026-08-23 — Generated dual-role UX walkthrough

- Milestone: M0
- Completed: Replaced the blocked Figma-first direction with a repository-based visual walkthrough; generated a shared role-entry screen, nine creator iPhone views, ten business dashboard views, two overview sheets, and two silent walkthrough videos; documented SSO, cross-role transitions, funding/payout language, and every screen in sequence.
- Verification: 20 numbered PNG screens present; creator video 30 seconds; business video 33 seconds; image dimensions and video readability inspected; continuity correction pass removed follower metrics and aligned the business name, mission, reward, and August schedule; no production credentials or real personal data included.
- Evidence: `ux-walkthrough/README.md`, `ux-walkthrough/shared/`, `ux-walkthrough/creator/`, `ux-walkthrough/business/`, and `ux-walkthrough/video/`.
- Decisions: Use native iPhone UI for creators and responsive web UI for businesses; present configurable Entra External ID browser-based sign-in options; use `Funded → Pending review → Available → Paid` instead of making a legal escrow claim; no M2 implementation task marked complete.
- Blockers: Final product name, account/role model, enabled SSO providers, legal payment structure, refund/dispute policy, and production Stripe configuration remain M0 decisions.
- Next exact task: Complete the M0 product contract and authoritative state-transition tables using the walkthrough as the discussion artifact.

### 2026-08-26 — Architecture decision interview started

- Milestone: M0
- Completed: Reconciled the investor business plan, build contract, and synthetic UX walkthrough; created the initial root `architecture.md` with confirmed constraints, provisional Azure/Expo/Next.js/NestJS/PostgreSQL/Stripe decisions, V1/V2/V3 scale boundaries, trust boundaries, domain modules, funds-flow candidate, and ordered decision backlog.
- Verification: Downloaded `BUSINESS PLAN` and repository DOCX SHA-256 match (`4263856e26b5b8a65becf4a23c539b59ea9ed113829ddb5cdd2fb17a330c11e9`); architecture source paths inspected; no implementation milestone or ADR falsely marked complete.
- Evidence: `architecture.md`, `plans.md`, `ux-walkthrough/README.md`, and `docs/business-plan/Local_Missions_Investor_Business_Plan_2026.docx`.
- Decisions: Confirmed native iPhone requirement, Stripe intent, staged V1/V2/V3 scaling, inclusive base missions, private creator identity/payment data, and non-escrow payment language; all architecture recommendations remain provisional until the grill-me interview resolves their product dependencies.
- Blockers: Active Question 1 must decide whether V1 business workflows are responsive web only or also native iOS; payment ordering, refund/dispute rules, role model, SSO set, and live-money configuration remain open.
- Next exact task: Resolve Question 1 and update ADR-007 status in `architecture.md`.

### 2026-08-26 — Shared Creator and Business iPhone app confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 1; changed V1 from a creator-only native app plus business web to one shared iPhone app with first-class Creator and Business modes, a restricted Venue Staff mode, and a separate admin/support web console; updated architecture, role surfaces, M2 screen scope, and verification expectations.
- Verification: `architecture.md` and `plans.md` searched for stale creator-only/business-web assumptions; ADR-007 marked confirmed; no implementation milestone marked complete.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: One V1 iOS binary must support complete Creator and Business workflows. A web dashboard may improve desktop efficiency but cannot replace native Business functionality. Admin/support remains web-based.
- Blockers: Active Question 2 must decide whether one human login can hold both Creator and Business roles or whether those roles require separate accounts.
- Next exact task: Resolve Question 2 and define identity, role switching, permissions, and cache isolation.

### 2026-08-26 — Single identity with multi-role switching confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 2; defined one root user identity with optional Creator profile, organization-scoped Business memberships, restricted Venue Staff grants, an explicit mode/workspace switcher, server-enforced permissions, role-scoped client caches, and role-context audit events.
- Verification: ADR-011 marked confirmed in `architecture.md`; role-switching security and cache-isolation rules recorded; no implementation milestone marked complete.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: One login may hold multiple roles. Switching modes changes navigation and effective workspace, not identity or server authorization.
- Blockers: Active Question 3 must decide whether a business is charged before mission review or only after admin approval.
- Next exact task: Resolve Question 3 and finalize the campaign approval/funding state order.

### 2026-08-26 — Approval-before-charge funding order confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 3; defined payment-method collection during business setup without a charge, no charge on campaign submission, admin approval before payment, explicit **Fund and Publish** confirmation, webhook-authoritative funding, safe payment retry behavior, and re-review after material campaign changes.
- Verification: ADR-012 marked confirmed in `architecture.md`; the MVP flow, campaign state machine, and UX walkthrough text were corrected so they no longer place funding before admin review; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: A saved payment method is not permission to charge a campaign. An approved campaign remains private until the business taps **Fund and Publish** and Stripe confirms payment through an authoritative webhook.
- Blockers: Active Question 4 must define creator compensation and business refunds when a business cancels after creators have accepted.
- Next exact task: Resolve Question 4 and define the cancellation-compensation schedule and refund ledger behavior.

### 2026-08-26 — All-or-nothing creator compensation confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 4; defined creator compensation as all-or-nothing per accepted slot, with no prorated reward or cancellation payment for canceled, no-show, or incomplete work and the full advertised reward owed after valid completion.
- Verification: ADR-013 marked confirmed in `architecture.md`; canonical reward states and M0/M6/M8/M11 requirements updated; no implementation milestone marked complete.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: Campaigns settle slot by slot. An incomplete creator slot earns zero even when other creators complete the same campaign; valid completion creates the full obligation, and a business cannot cancel afterward to avoid it.
- Blockers: Active Question 5 must define the objective completion trigger, review deadline, and protection against arbitrary nonpayment. Refund timing and processor/platform-fee treatment remain open.
- Next exact task: Resolve Question 5 and finalize the completion, review, revision, auto-approval, and dispute state transitions.

### 2026-08-26 — Objective completion and 48-hour auto-approval confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 5; defined complete submission as verified check-in plus every timely, validated checklist deliverable; added a 48-hour business review, one criterion-specific correction, a fresh 48-hour review after resubmission, and automatic approval when no valid business action occurs.
- Verification: ADR-014 marked confirmed in `architecture.md`; canonical submission states and M11 build/verification requirements updated; walkthrough review text aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Objective checklist completion starts the review clock. Businesses cannot add requirements or withhold payment because of an undocumented subjective preference. Approval or auto-approval creates the full reward obligation.
- Blockers: Active Question 6 must define how unearned creator-slot funds return to the business and whether processor/platform costs are refundable.
- Next exact task: Resolve Question 6 and define unused-funds ledger, refund destination, timing, and fee treatment.

### 2026-08-26 — Full automatic no-payout slot refunds confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 6; defined automatic refunds to the original business payment for each final no-payout slot, including its creator reward and proportional platform/payment-fee allocations, with Local Missions absorbing any processor cost that is not returned.
- Verification: ADR-015 marked confirmed in `architecture.md`; campaign pricing, M6 invoice allocation, M12 refund ledger, idempotency, reconciliation, and business-statement tests updated; no implementation milestone marked complete.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: Businesses pay only for successfully completed creator slots. V1 returns unused slot funds automatically to the original payment method rather than issuing app credit or requiring a manual request.
- Blockers: Active Question 7 must define creator selection and fair-access rules. Exact Connect configuration remains subject to legal/accounting review and Stripe production approval.
- Next exact task: Resolve Question 7 and define base-slot discovery, business controls, rejection reasons, and any separately priced reach tier.

### 2026-08-26 — Community and Reach Slot mix confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 7; defined a minimum 80% Community Slot share with no follower minimum and opportunity rotation based on locality, availability, fit, reliability, and recency, plus a maximum 20% separately priced Reach Slot share using consented, verified local-audience bands.
- Verification: ADR-016 marked confirmed in `architecture.md`; M6 campaign allocation, M7 discovery, M8 capacity/selection tests, and M20 fairness telemetry updated; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Community capacity is the default and cannot use follower counts. Reach is an optional distinct paid deliverable and cannot consume more than one-fifth of campaign capacity.
- Blockers: Active Question 8 must define whether and why a business may reject a platform-rotated Community creator. Exact Reach pricing and external analytics providers remain open.
- Next exact task: Resolve Question 8 and finalize Community assignment, objection reason codes, replacement rotation, and anti-discrimination audit rules.

### 2026-08-26 — Platform-assigned Community creators and limited objections confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 8; made Local Missions responsible for Community creator assignment, added a 24-hour business objection window, limited objections to documented safety, direct conflict, or unmet preapproved requirements, and required platform review before replacement.
- Verification: ADR-017 marked confirmed in `architecture.md`; Community assignment states and M8 build, concurrency, objection, replacement, creator-protection, and business-risk tests updated; walkthrough selection copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Businesses cannot browse or cycle through Community candidates. Popularity, appearance, audience size, follower count, protected characteristics, and subjective preference are invalid reasons; valid replacement does not penalize the creator.
- Blockers: Active Question 9 must define simple Reach pricing and how much of the add-on becomes creator compensation. Exact audience verification provider remains open.
- Next exact task: Resolve Question 9 and define Reach bands, creator bonuses, platform fees, invoice display, and refund allocation.

### 2026-08-26 — Fixed Reach reward multipliers confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 9; defined three non-negotiable Reach reward levels at base plus 50%, 100%, or 200%, allocated the full bonus to creator compensation, and applied the standard platform percentage transparently to the resulting reward.
- Verification: ADR-018 marked confirmed in `architecture.md`; M6 price calculation/invoice requirements, M7 creator disclosure, and M12 Reach refund/reconciliation examples updated; `$50` examples reconcile to `$75`, `$100`, and `$150` creator rewards; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Reach pricing is fixed and visible, not an auction or private negotiation. Accepted reward snapshots cannot be reduced by later analytics changes, and a no-payout Reach slot refunds its base reward, bonus, and allocated fees.
- Blockers: Active Question 10 must define the verified local-audience thresholds and acceptable proof. The current 18% platform rate remains a planning assumption until the pricing decision is finalized.
- Next exact task: Resolve Question 10 and define Reach qualification bands, analytics consent, proof freshness, downgrade behavior, and appeals.

### 2026-08-26 — Verified local-audience Reach bands confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 10; defined Reach Level 1 at 1,000–4,999 estimated local audience, Level 2 at 5,000–19,999, and Level 3 at 20,000+, with creator consent, 90-day verification, private evidence, tier-only business visibility, re-verification, and appeal behavior.
- Verification: ADR-019 marked confirmed in `architecture.md`; M7 consent/verification requirements, M8 business-data minimization, and M20 expiry/appeal/fraud telemetry updated; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Reach analytics are optional and cannot affect Community eligibility. Businesses see the tier and required channel, not raw analytics, total followers, or unrelated audience geography. Accepted rewards remain locked after analytics expiry or downgrade.
- Blockers: Active Question 11 must decide whether qualification is per platform or can combine multiple social audiences. Provider feasibility and raw-evidence retention remain open technical/privacy reviews.
- Next exact task: Resolve Question 11 and define per-platform qualification, cross-post deliverables, overlap handling, and reward calculation.

### 2026-08-26 — Per-platform Reach qualification confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 11; prohibited cross-platform audience aggregation, required one primary platform per Reach Slot, and modeled each additional cross-post as a separate paid deliverable using that platform's own current verification tier and proof.
- Verification: ADR-020 marked confirmed in `architecture.md`; M6 campaign contract, M7 qualification, and M8 API/privacy requirements updated; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Instagram, TikTok, YouTube, and future platform audiences remain independent because audience overlap cannot be treated as additive. Each contracted channel has its own locked tier, disclosure, deadline, proof, and acceptance criterion.
- Blockers: Active Question 12 must define the creator payment for additional cross-posts. Analytics-provider feasibility and proof retention remain open.
- Next exact task: Resolve Question 12 and finalize primary-platform versus cross-post reward formulas, invoice lines, creator disclosure, and no-payout refunds.

### 2026-08-26 — Creator Reward Pool and separate Total Due confirmed

- Milestone: M0
- Completed: Recorded the founder's campaign-budget clarification as architecture Question 12; defined campaign budget as the Creator Reward Pool, required visible slot-count multiplication, and separated the platform fee and exact Total Due before payment confirmation.
- Verification: ADR-021 marked confirmed in `architecture.md`; M6 campaign-builder labels/calculation tests and M12 immutable PaymentIntent amount requirement updated; `10 × $50 = $500`, `18% = $90`, and `$500 + $90 = $590` reconcile; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: A business choosing 10 Community creators at `$50` creates a `$500` Creator Reward Pool. The platform fee is not taken from creator compensation; it is displayed separately to the business.
- Blockers: Active Question 13 must decide whether ordinary payment processing is absorbed within the 18% platform fee. Cross-post reward calculation remains open after that clarification.
- Next exact task: Resolve Question 13 and finalize invoice treatment for processor costs, taxes, refund allocations, and the no-surprise Total Due promise.

### 2026-08-26 — Fifteen-percent processing-inclusive platform fee confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 13; replaced the 18% planning assumption with a confirmed 15% standard platform fee, included ordinary payment processing inside that fee, and prohibited a separate card-processing checkout line.
- Verification: ADR-022 marked confirmed in `architecture.md`; active M6/M12 price, invoice, ledger, refund, and Reach examples updated; `15% × $500 = $75` and `$500 + $75 = $575` reconcile; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, `ux-walkthrough/README.md`, [Stripe Payments pricing](https://stripe.com/pricing), and [Stripe Connect pricing](https://stripe.com/connect/pricing).
- Decisions: Normal payment-processing cost is a Local Missions expense covered by the 15% fee. The business sees no additional card fee, creators receive the full promised reward, and no-payout refunds deduct no processing amount.
- Follow-up: The investor business-plan DOCX still contains the superseded 18% assumption and must be regenerated and visually re-verified before external distribution.
- Blockers: Active Question 14 must define additional cross-post compensation. Exact Stripe Connect configuration, taxes, and international/currency edge cases still require legal/accounting/provider review.
- Next exact task: Resolve Question 14 and finalize the cross-post reward formula, invoice disclosure, completion test, and no-payout refund allocation.

### 2026-08-26 — Multi-platform Reach reward formula confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 14; defined multi-platform Reach compensation as one base reward plus every contracted platform's verified tier bonus, with materially new content requiring a separate priced base deliverable.
- Verification: ADR-023 marked confirmed in `architecture.md`; M6 invoice formula, M11 all-or-nothing completion, and M12 ledger/refund tests updated; `$50 + $50 + $25 = $125`, `15% × $125 = $18.75`, and `$125 + $18.75 = $143.75` reconcile; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: The business selects every platform and tier before publishing; the creator sees one locked total before accepting. Distribution-only cross-posts add tier bonuses without duplicating the visit/content base reward.
- Blockers: Active Question 15 must define the V1 SSO provider set and account-linking behavior. Analytics-provider feasibility and exact Stripe Connect configuration remain open technical/legal reviews.
- Next exact task: Resolve Question 15 and finalize provider availability by role, passwordless fallback, account linking, duplicate-email handling, and recovery.

### 2026-08-26 — V1 shared-identity sign-in providers confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 15; selected Apple, Google, Microsoft, and passwordless email one-time codes for the shared Creator/Business identity and deferred Facebook/Meta to V2 unless launch demand supports it.
- Verification: ADR-024 marked confirmed in `architecture.md`; M4 provider configuration, external-subject binding, failure-path, and physical-device verification requirements updated; walkthrough provider copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Provider choice does not determine app role. The app never receives provider passwords, and email is not used as an immutable authorization key.
- Blockers: Active Question 16 must define safe provider linking and duplicate-email behavior. Entra tenant/provider configuration and Apple/Microsoft/Google credentials remain external setup gates.
- Next exact task: Resolve Question 16 and define proof-of-control linking, merge prohibitions, recovery, unlinking, audit, and account-takeover tests.

### 2026-08-26 — Proof-of-control provider linking confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 16; prohibited email-based automatic merging, required recent authentication to the existing account plus authentication with the new provider, and routed populated duplicate accounts to controlled support recovery.
- Verification: ADR-025 marked confirmed in `architecture.md`; M4 identity-binding uniqueness, collision, non-enumeration, concurrency, audit, notification, and account-takeover tests updated; walkthrough account-linking copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Email is not identity proof. Apple private relay, provider email changes, and matching addresses cannot transfer a provider binding or merge root users. Financially populated duplicates cannot be self-merged.
- Blockers: Active Question 17 must define provider removal and recovery requirements. Entra/provider configuration remains an external setup gate.
- Next exact task: Resolve Question 17 and define recent-auth unlinking, last-method protection, recovery holds, notifications, and lost-provider support flow.

### 2026-08-26 — Provider removal and controlled lockout recovery confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 17; required recent authentication and a remaining verified method before provider removal, added session revocation/security notifications, and defined dual-controlled support recovery with temporary sensitive-money holds after total lockout.
- Verification: ADR-026 marked confirmed in `architecture.md`; M4 unlink concurrency/replay, session/cache revocation, notification, last-method protection, dual authorization, and obligation-preservation tests updated; no implementation milestone marked complete.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: Users cannot remove their last sign-in method. Recovery holds block risky changes but do not erase earned creator rewards, business refunds, missions, organization access history, or audit records.
- Blockers: Active Question 18 must define private locality verification and business-visible locality. Entra/provider configuration remains an external setup gate.
- Next exact task: Resolve Question 18 and define locality proof, coarse business display, refresh cadence, retention, appeals, and the prohibition on reusing bank/KYC data as a public location credential.

### 2026-08-26 — Private annual creator-locality verification confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 18; defined annual private home-ZIP verification using recent non-financial address proof, reverification after address changes, coarse business-visible locality, restricted evidence, appeals, and separation from Stripe/bank/KYC data.
- Verification: ADR-027 marked confirmed in `architecture.md`; M7 verification/expiry/appeal requirements and M8 business/venue API denial tests updated; walkthrough privacy copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Businesses never receive creator home addresses, ZIP codes, raw proof, document metadata, exact distance, or payment/KYC information. Unverified creators may browse but cannot receive a Community assignment until verification succeeds.
- Blockers: Active Question 19 must define raw-proof deletion timing and distance-band boundaries. A final proof provider and acceptable-document policy remain implementation/legal/privacy reviews.
- Next exact task: Resolve Question 19 and finalize proof-retention deletion jobs, legal holds, distance-band calculation, API redaction, and tests.

### 2026-08-26 — Thirty-day raw locality-proof deletion confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 19; set raw locality-proof deletion to 30 days after verification or appeal closure, whichever is later, retained only derived locality/status/dates and a non-document audit, and constrained legal holds to documented expiring cases.
- Verification: ADR-028 marked confirmed in `architecture.md`; M7 lifecycle requirements and M16 deletion, derivative/version cleanup, legal-hold expiry, backup-aging, idempotency, and alert tests updated; no implementation milestone marked complete.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: Raw proof, thumbnails, metadata copies, derivatives, and ordinary recovery access are removed after the deadline. Failed deletion alerts operations/privacy, and an expired legal hold automatically returns to the deletion queue.
- Blockers: Active Question 20 must define the coarse distance bands shown to businesses. Provider-specific backup/soft-delete settings remain an implementation verification item.
- Next exact task: Resolve Question 20 and finalize ZIP-centroid distance calculation, band boundaries, boundary tests, stale-verification behavior, and business API copy.

### 2026-08-26 — Coarse business-visible distance bands confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 20; defined four approximate venue-distance bands—Under 10, 10–25, 25–50, and More than 50 miles—calculated server-side from the verified ZIP-area centroid rather than a street address or device location.
- Verification: ADR-029 marked confirmed in `architecture.md`; M8 API redaction, exact boundary, expired/changed locality, and stale-cache invalidation tests updated; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Businesses receive only the band enum/label and locality badge. Exact ZIP, centroid, device position, and decimal distance remain private; unavailable verification returns no band.
- Blockers: Active Question 21 must confirm the four standardized V1 mission templates and their objective completion checklists. Provider-specific locality proof and storage lifecycle remain implementation/privacy review items.
- Next exact task: Resolve Question 21 and define each template's required/optional deliverables, posting/disclosure rules, rights defaults, check-in proof, and completion checklist.

### 2026-08-26 — Four standardized V1 mission templates confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 21; confirmed Visit & Create, Visit & Share, Event Attendance, and Private Experience Feedback, with check-in, posting/disclosure, private-feedback, Reach, and positive-review boundaries.
- Verification: ADR-030 marked confirmed in `architecture.md`; M0 product-contract and M6 campaign-template requirements updated; walkthrough campaign-wizard copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: V1 exposes no blank free-form mission type. Visit & Create has no required public post; Community Visit & Share provides no audience guarantee; Private Experience Feedback cannot require a public rating or positive sentiment.
- Blockers: Active Question 22 must define safe checklist customization and default quantities. Rights-duration defaults and exact posting-proof rules remain open.
- Next exact task: Resolve Question 22 and define fixed checklist fields, adjustable ranges, admin re-review triggers, and rejection of free-text scope expansion.

### 2026-08-26 — Structured checklist customization confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 22; limited business customization to versioned structured checklist fields within approved ranges and made descriptive text non-enforceable.
- Verification: ADR-031 marked confirmed in `architecture.md`; M0 product-contract, M6 campaign-builder, and M11 review requirements updated; walkthrough brief and deliverable copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: New or out-of-range work becomes a separately priced additional deliverable requiring admin review. Material post-approval changes require re-review, and an accepted creator must explicitly re-consent to the updated checklist and reward.
- Blockers: Active Question 23 must define default checklist quantities and allowed ranges for all four V1 templates. Exact additional-deliverable prices remain open until those limits are confirmed.
- Next exact task: Resolve Question 23 and lock the default media counts, clip lengths, attendance duration, post requirements, feedback-form size, and safe adjustment ranges.

### 2026-08-26 — V1 checklist defaults and limits confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 23; locked measurable defaults and safe workload ceilings for all four V1 mission templates.
- Verification: ADR-032 marked confirmed in `architecture.md`; M0 product-contract and M6 campaign-builder requirements updated; walkthrough checklist examples aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Visit & Create defaults to 5 photos/2 clips within a 3–10 photo and 1–3 clip range; Visit & Share is one disclosed post on one platform; Event Attendance defaults to 60 minutes/3 photos/2 clips within 30–180 minutes; Private Feedback is capped at 10 questions/about 10 minutes and 0–3 optional evidence photos.
- Blockers: Active Question 24 must define default business content-use rights and paid extensions. Exact short-clip duration and additional-deliverable prices also remain open.
- Next exact task: Resolve Question 24 and define organic reposting, paid-ad use, duration, editing restrictions, creator attribution, renewal, and pricing treatment.

### 2026-08-26 — Content-use rights and paid licenses confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 24; defined the included organic license, paid extended-owned-media and paid-ad licenses, editing limits, prohibited uses, activation, and creator compensation.
- Verification: ADR-033 marked confirmed in `architecture.md`; M0 product-contract, M6 campaign-builder, and M11 license-lifecycle requirements updated; walkthrough rights and budget copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: The base reward includes only 90-day non-exclusive organic reposting on business-owned social accounts. Twelve-month owned social/website/email use adds 50% of base; 30-day paid-ad use adds 100% of base; selected bonuses are additive and enter the Creator Reward Pool before the 15% fee.
- Blockers: Active Question 25 must define exact clip/post duration and carousel limits. License-renewal and other additional-deliverable pricing beyond the confirmed initial terms remain open.
- Next exact task: Resolve Question 25 and lock short raw-clip duration, Visit & Share video duration, carousel size, orientation, and basic technical acceptance criteria.

### 2026-08-26 — Phone-friendly media standards confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 25; defined phone-friendly clip, video, carousel, orientation, resolution, and objective acceptance standards.
- Verification: ADR-034 marked confirmed in `architecture.md`; M0 product-contract, M6 campaign-builder, M10 upload-validation, and M11 review requirements updated; walkthrough media copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Raw clips are 5–15 seconds; Visit & Share videos are 15–60 seconds; carousels contain 3–5 items; vertical media is 9:16 at 1080p minimum. Current phone footage qualifies, and subjective production taste or creator appearance cannot justify rejection.
- Blockers: Active Question 26 must define standard additional-deliverable pricing. Exact license-renewal pricing also remains open.
- Next exact task: Resolve Question 26 and set transparent price formulas for extra photos, clips, edited videos, attendance time, and any specialty production request.

### 2026-08-26 — Fixed additional-deliverable packages confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 26; defined fixed, non-negotiable pricing packages for additional photos, raw clips, edited video, and onsite time.
- Verification: ADR-035 marked confirmed in `architecture.md`; M0 product-contract, M6 builder/calculation, and M12 ledger requirements updated; walkthrough add-on and budget copy aligned; `$50 × 25% = $12.50`, `$50 × 50% = $25`, and `$50 × 100% = $50` reconcile; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Add-ons calculate independently from the base reward, are additive in the Creator Reward Pool, receive the 15% platform fee, and cannot be repeatedly stacked to bypass workload ceilings. Specialty work requires an admin-reviewed custom offer; private negotiation is prohibited.
- Blockers: Active Question 27 must define license-renewal pricing and consent. Final specialty-offer boundaries remain an admin/legal policy item.
- Next exact task: Resolve Question 27 and define renewal duration, price basis, creator opt-in, payment timing, expiry enforcement, and non-renewal behavior.

### 2026-08-26 — Content-license renewal pricing confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 27; defined creator-opt-in renewal windows, fixed renewal rewards, explicit funding, expiry behavior, and archived-organic-post restrictions.
- Verification: ADR-036 marked confirmed in `architecture.md`; M0 product-contract, M11 license lifecycle, and M12 renewal-funding requirements updated; walkthrough rights copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Renewals use the original locked base reward: +25% for 90-day organic, +50% for 12-month owned media, and +100% for 30-day paid ads. Creator refusal has no reliability effect; business funding activates the term and immediate payable; renewals are never automatic.
- Blockers: Active Question 28 must define Orlando controlled-live pilot caps, operational ownership, and emergency controls. Final license text still requires legal review.
- Next exact task: Resolve Question 28 and set business/creator/campaign caps, live-dollar exposure, manual approval and payout gates, support coverage, and kill-switch behavior.

### 2026-08-26 — Controlled Orlando live-pilot guardrails confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 28; defined invitation-only pilot caps, manual approval gates, separated operational ownership, staffed support, scoped emergency controls, and a 50-completed-slot expansion review.
- Verification: ADR-037 marked confirmed in `architecture.md`; M0 product-contract, M15 operational-control, and M19 production-launch requirements updated; walkthrough pilot copy aligned; no implementation or live-money milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: The pilot is capped at 10 businesses, 100 creators, 20 slots and a `$2,500` Creator Reward Pool per campaign, and `$25,000` unsettled creator rewards. A payout pause preserves money owed and requires a documented fraud, security, Stripe, or reconciliation incident.
- Blockers: Active Question 29 must define Local Pass redemption proof and attribution confidence. Live money remains blocked by legal, accounting/tax, insurance, Stripe approval/configuration, production readiness, and reconciliation gates.
- Next exact task: Resolve Question 29 and define pass issuance, venue redemption proof, anti-replay controls, creator privacy, attribution windows, confidence labels, and business reporting.

### 2026-08-26 — Local Pass redemption evidence confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 29; defined creator-specific pass issuance, no-install claiming, seven-day rotating QR redemption, first-claim attribution, anti-replay behavior, privacy boundaries, and honest reporting labels.
- Verification: ADR-038 marked confirmed in `architecture.md`; M0 product-contract and M13 Local Pass requirements updated; walkthrough results copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: V1 distinguishes pass claims from verified venue redemptions and reports conversion/cost per verified redemption. It does not claim a purchase, sale, incremental customer, or incremental revenue, and pass performance never affects guaranteed creator pay or reliability.
- Blockers: Active Question 30 must define customer verification and data retention for one-pass-per-person enforcement. Offer inventory/honoring rules also remain open.
- Next exact task: Resolve Question 30 and define OTP method, no-account claim identity, deduplication, pass recovery, marketing-consent separation, raw contact retention, and deletion.

### 2026-08-26 — No-account Local Pass verification confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 30; defined SMS OTP verification without account creation, one-pass deduplication, pass recovery, separate marketing consent, restricted contact access, and staged deletion.
- Verification: ADR-039 marked confirmed in `architecture.md`; M13 claim/security tests and M16 privacy-lifecycle requirements updated; walkthrough claim copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: The encrypted phone number is deleted 30 days after redemption/expiry. A non-reversible Key Vault-backed HMAC token and minimal audit remain for 12 months, then customer-level linkage is removed while aggregate campaign statistics remain.
- Blockers: Active Question 31 must define Local Pass inventory, pause, and honoring rules. SMS provider selection and provider-side retention require implementation/privacy review.
- Next exact task: Resolve Question 31 and define offer quantity, claim reservation, business pause behavior, treatment of already-claimed passes, stockout exceptions, customer remedies, and venue-staff enforcement.

### 2026-08-26 — Local Pass inventory and honoring confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 31; defined approved offer terms, transactional inventory reservation, future-claim pauses, active-pass honoring, equal-or-greater substitutions, emergency extensions, refusal reporting, and business enforcement.
- Verification: ADR-040 marked confirmed in `architecture.md`; M6 campaign-offer and M13 inventory/redemption requirements updated; walkthrough results copy aligned; no implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Every successful claim reserves inventory and remains valid even if the business pauses future claims. Inventory cannot fall below active reservations, closures extend affected passes, and repeated intentional refusal pauses the business for review.
- Blockers: Active Question 32 must define acceptable Reach analytics proof and fallback behavior. Exact analytics provider feasibility and raw-evidence retention remain implementation/privacy review items.
- Next exact task: Resolve Question 32 and decide whether Reach requires official OAuth/API or approved-provider evidence, how outages behave, whether screenshots are ever accepted, and how long raw analytics may remain.

### 2026-08-26 — Defensible Reach analytics evidence confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 32; required official/approved creator-consented analytics connections, rejected manual proof, protected Community access, defined outage grace, and minimized raw-evidence retention.
- Verification: ADR-041 marked confirmed in `architecture.md`; M7 Reach onboarding and M16 privacy/security lifecycle requirements updated; walkthrough Reach copy aligned; no provider integration or implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Reach tiers last 90 days and may receive one 14-day grace only during a documented outage when valid at incident start. Raw analytics are deleted 30 days after verification/appeal closure; only the derived per-platform tier and audit fields remain. Community access and accepted rewards are protected.
- Blockers: Active Question 33 must confirm the intended Stripe Connect account/funds-flow model. Exact analytics provider selection still requires official API/partner feasibility review.
- Next exact task: Verify current official Stripe marketplace options, then resolve connected-account experience, charge ownership, separate transfers, fee collection, refund/dispute liability, payout timing, and legal/accounting gates.

### 2026-08-26 — Intended Stripe Connect marketplace funds flow confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 33 after checking current official Stripe marketplace documentation; selected hosted Express/recipient creator accounts, one indirect platform campaign charge, and separate creator transfers after slot approval.
- Verification: ADR-042 marked confirmed in `architecture.md`; M12 onboarding, charge, transfer, fee, refund, payout-state, liability, and reconciliation requirements updated; walkthrough payout copy aligned; no Stripe integration or live-money milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, `ux-walkthrough/README.md`, and current official Stripe Connect marketplace documentation.
- Decisions: Local Missions is the intended merchant of record and accepts platform responsibility for Stripe fees, refunds, disputes, chargebacks, negative-balance exposure, support, reconciliation, and an approved reserve. Approval/auto-approval queues the creator transfer automatically; businesses cannot separately delay it.
- Blockers: Active Question 34 must define whether ordinary post-payment business chargebacks can ever reduce creator earnings. Exact stable Stripe API/controller fields, reserve size, tax treatment, insurance, and live approval remain external gates.
- Next exact task: Resolve Question 34 and define creator-payment finality, fraud/duplicate-payment exceptions, appeal, negative-balance prohibition, reserve use, and business-chargeback handling.

### 2026-08-26 — Approved creator-payment finality confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 34; made approved rewards final against ordinary business disputes/chargebacks and constrained exceptional recovery to duplicate transfer, proven creator fraud, or legal order with due process.
- Verification: ADR-043 marked confirmed in `architecture.md`; M12 chargeback/recovery ledger requirements and M15 restricted recovery-case controls updated; walkthrough earnings copy aligned; no implementation or live-money milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Local Missions bears ordinary post-approval payment loss and never charges creators processor/dispute fees or silently offsets future earnings. Credible fraud may pause future payout execution temporarily, but existing obligations remain recorded and are restored when unproven.
- Blockers: Active Question 35 must define the operating-reserve formula and automatic funding pause. Exact reserve treatment still requires accounting, legal, insurance, and Stripe review.
- Next exact task: Resolve Question 35 and define reserve floor, volume/risk component, open-dispute coverage, permitted reserve assets, calculation cadence, alert thresholds, and funding kill-switch behavior.

### 2026-08-26 — Provisional operating reserve and automatic funding gate confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 35; defined the reserve formula, eligible assets, calculation cadence, warning and hard-gate thresholds, continued payment obligations, audit evidence, and pilot-expansion review.
- Verification: ADR-044 marked confirmed in `architecture.md`; M12 reserve calculation, concurrency, ledger, and payment-continuity requirements updated; M15 finance controls, M19 live-launch gate, and the business funding walkthrough aligned; no implementation or live-money milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Required reserve is the greater of `$5,000` or 10% of trailing-90-day gross payment volume, plus 100% of unresolved refunds, disputes, chargebacks, and negative balances. Finance is warned below 125%; below 100%, new **Fund and Publish** actions stop while approved creator transfers and owed refunds continue.
- Blockers: Active Question 36 must confirm the V1 platform-operations surface. Final reserve treatment and any higher required floor remain subject to legal, accounting/tax, insurance, Stripe, and observed-risk review.
- Next exact task: Resolve Question 36 and decide whether admin, support, trust/safety, and finance operate from a protected web console while Creator, Business, and restricted Venue Staff workflows remain in the shared iPhone app.

### 2026-08-26 — Protected employee web-console boundary confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 36; separated platform-employee operations from customer-facing iPhone modes while preserving complete Creator and Business app workflows.
- Verification: ADR-045 marked confirmed in `architecture.md`; the software-stack status, security controls, M2 screen boundary, M15 authorization requirements, and UX sign-in explanation aligned; no web console or iPhone implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Admin, support, trust/safety, and finance use a protected desktop-oriented web console with separately granted access, MFA, step-up authentication, least privilege, separation of duties, and audited actions. The shared iPhone app exposes only Creator, Business, and restricted Venue Staff modes.
- Blockers: Active Question 37 must confirm the V1 cloud baseline. Exact framework/package versions, production topology sizing, identity configuration, and cloud budget remain implementation and external-account decisions.
- Next exact task: Resolve Question 37 and decide whether managed Azure Container Apps, PostgreSQL Flexible Server, Blob Storage, Service Bus, Entra External ID, Key Vault, Azure Monitor, and Terraform form the V1 infrastructure baseline while Stripe handles payments.

### 2026-08-26 — Managed Azure modular-monolith baseline confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 37; confirmed the managed Azure services, one-region modular-monolith topology, isolated environment model, cost controls, backup expectations, and explicit exclusions of Kubernetes and microservices.
- Verification: ADR-046 marked confirmed in `architecture.md`; the cloud decision, topology, decision log, M1 prerequisites, and M5 deployment/cost/recovery gates aligned; current official Microsoft documentation for Container Apps, PostgreSQL Flexible Server, Service Bus, External ID, Cost Management budgets, and managed backup behavior was reviewed; no Azure resources were created or changed.
- Evidence: `architecture.md`, `plans.md`, and current official Microsoft Azure documentation.
- Decisions: V1 has one active application region, one API, one worker/job, and one application PostgreSQL database per isolated environment. Development, staging, and production separate resources and data. Terraform, budget/forecast alerts, bounded scaling, managed backups, privacy-compatible Blob recovery, and tested restoration are required from the beginning.
- Blockers: Active Question 38 must define database and managed-service network exposure. Exact region, approved monthly budget amounts, service sizes, backup retention, and external account configuration remain implementation approvals.
- Next exact task: Resolve Question 38 and decide whether staging/production require private Azure connectivity while development may use a tightly restricted public endpoint to control early cost and complexity.

### 2026-08-26 — Local-first and low-cost Azure phasing partially confirmed

- Milestone: M0
- Completed: Recorded the founder's clarification to architecture Question 38; established a local-first build loop, deferred billable Azure deployment until cloud integration is useful, required low-cost disposable development tiers with synthetic data, and deferred full VNet/private-endpoint topology until the infrastructure and UI are functionally complete.
- Verification: `architecture.md` and M1/M5 in `plans.md` now distinguish local build, low-cost Azure development, and private staging/production phases; no Azure resources were created or changed.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: Full private networking must be complete before production-like staging, real participant data, external beta workflows that create sensitive records, or live money. Staging and production require separate cost/security approval and are never created automatically with development.
- Blockers: Question 38 remains open only on the timing of inexpensive public-endpoint firewall restrictions for the first Azure development deployment. Exact low-cost tiers and budget amounts require a reviewed current Azure price estimate before apply.
- Next exact task: Confirm whether narrow firewall allowlists, TLS, authentication, and managed-identity authorization apply from the first Azure development deployment even though VNet/private endpoints wait until the UI and infrastructure are complete.

### 2026-08-26 — Same-day ephemeral Azure development loop confirmed

- Milestone: M0
- Completed: Recorded the founder's final clarification to architecture Question 38; converted pre-private-network Azure development into an explicitly invoked same-day create/test/destroy workflow and required low-cost tiers, synthetic data, baseline network/auth controls, evidence capture, and independent teardown verification.
- Verification: ADR-047 marked confirmed in `architecture.md`; M5 phasing, CI/CD, command sequence, evidence, teardown, and gate requirements aligned; no Azure resources were created or changed.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: Local work remains the default. Each needed Azure development run uses a reviewed plan and low-cost disposable workload, applies firewall/TLS/RBAC controls immediately, completes cloud tests, and destroys the billable workload that day. Private networking is built only after everything else is complete and before persistent staging, real data, beta workflows, or live money.
- Blockers: Active Question 39 must define the retained control plane so same-day destroys are safe and repeatable. Current Azure prices and exact low-cost tiers must be reviewed immediately before each apply.
- Next exact task: Classify Terraform state/backend, GitHub-Azure OIDC identities, Entra tenant/app registrations, DNS/domain records, container artifacts, and test evidence as retained or disposable across each workload teardown.

### 2026-08-26 — Retained rebuild control plane confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 39; separated retained bootstrap/control-plane state from disposable workload state and classified every named resource category for same-day teardown.
- Verification: ADR-048 marked confirmed in `architecture.md`; M5 Terraform ownership, secret, destroy-target, inventory, image-rebuild, and teardown-report requirements aligned; no Azure resources were created or changed.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: Retain secured Terraform state/locking, OIDC and Entra registrations, domain/verification DNS, subscription cost controls/policy, code/runbooks/evidence, and external test-provider configuration. Destroy all billable application, data, queue, secret, telemetry, registry, dashboard, and temporary-network workload resources the same day.
- Blockers: Active Question 40 must define an expiration and auto-cleanup backstop for a forgotten or stuck ephemeral deployment. Exact retained inventory and cost must be verified against live Azure whenever the control plane is bootstrapped or changed.
- Next exact task: Decide the default deployment lifetime, warning interval, one-time extension rule, and safe scoped automatic-destroy behavior.

### 2026-08-26 — Ephemeral expiration and auto-cleanup backstop confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 40; defined the eight-hour/11:00-PM deadline, one-hour warning, single same-day extension, external least-privilege cleanup controller, scope refusal, failure escalation, and independent completion proof.
- Verification: ADR-049 marked confirmed in `architecture.md`; M5 apply metadata, timezone, warning, extension, OIDC authorization, lock, cleanup, failure, audit, and boundary-test requirements aligned; no Azure resources were created or changed.
- Evidence: `architecture.md` and `plans.md`.
- Decisions: Every ephemeral deployment ends by the earlier of eight hours or 11:00 PM America/New_York unless one recorded same-day extension changes the earlier deadline without passing 11:00 PM. Automatic cleanup can touch only the disposable workload and succeeds only with independent **Disposable workload: empty** evidence.
- Blockers: Active Question 41 must decide whether unavailable Reach analytics integrations can delay V1 Community launch. The exact cleanup implementation must be selected and tested before the first ephemeral apply.
- Next exact task: Decide whether Community campaigns launch independently while Reach remains disabled per platform until an approved analytics connection passes feasibility, security, privacy, and provider-policy review.

### 2026-08-26 — Community launch independence from Reach confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 41; made Community release readiness independent of social-platform analytics and constrained Reach activation to separate per-platform approval gates.
- Verification: ADR-050 marked confirmed in `architecture.md`; M7 feature-flag, dependency, and Community golden-journey requirements plus M19 launch criteria and the UX walkthrough aligned; no Reach integration or implementation milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Community onboarding, campaigns, matching, funding, refunds, and creator payments launch without Reach. Instagram, TikTok, YouTube, or another platform activates only after its own approved connection passes feasibility, security, privacy, provider-policy, reliability, retention, and operational review.
- Blockers: Active Question 42 must define what TestFlight testers may do before live creator payment is approved. Exact Reach provider selection remains an external implementation/partner gate, not a Community launch blocker.
- Next exact task: Decide whether pre-live-money beta missions are strictly synthetic/noncommercial or may involve real visits, public posts, business content rights, or other commercially useful work.

### 2026-08-26 — Noncommercial pre-live TestFlight boundary confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 42; prohibited exchanging simulated payment for real promotional value and defined the only permitted controlled real-world beta activity.
- Verification: ADR-051 marked confirmed in `architecture.md`; M18 now requires visible test-money treatment, no public promotion or commercial content rights, restricted real-world check-ins, separate expense handling, test-data deletion, and negative checks for export/license/reliability effects; M19 and the UX walkthrough are aligned; no implementation or live-money milestone marked complete.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Before live-money approval, TestFlight missions are synthetic or clearly noncommercial. Businesses and Local Missions cannot use beta submissions for marketing, and the first commercially useful mission is a funded mission in the approved controlled Orlando pilot.
- Blockers: Active Question 43 must decide whether public App Store release waits for every live-money gate and a ready funded Orlando pilot. Legal, Stripe, accounting/tax, insurance, reserve, security, private-networking, and operational approvals remain live-launch gates.
- Next exact task: Decide whether all pre-live distribution remains in TestFlight and the public App Store release begins only when production payments and one controlled paid Orlando campaign are ready.

### 2026-08-26 — Public App Store release readiness boundary confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 43; kept pre-live user distribution in TestFlight and tied public release to all live-money/production gates plus a ready funded Orlando Community campaign.
- Verification: ADR-052 marked confirmed in `architecture.md`; M18 prohibits an early public shell; M19 distinguishes App Review submission from manual public release, requires the funded campaign, invited cohort, support schedule, go/no-go evidence, and phased rollout, and the UX walkthrough is aligned; no App Store submission, production deployment, live payment, or Azure change was performed.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: App Review may proceed under a manual release hold, but public availability waits for production readiness. The App Store launch does not make the Orlando pilot open-access; all pilot caps and approval controls remain server-enforced.
- Blockers: Active Question 44 must define whether uninvited Orlando creators may enter a pre-admission waitlist and what data that waitlist may collect. External legal, Stripe, accounting/tax, insurance, security, private-networking, and operational gates remain mandatory before public release.
- Next exact task: Decide the pilot waitlist and pre-invitation data-minimization boundary.

### 2026-08-26 — Data-minimized creator pilot waitlist confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 44; allowed a lightweight creator waitlist after public release while keeping private missions, sensitive onboarding, assignments, work, and money flows invitation-gated.
- Verification: ADR-053 marked confirmed in `architecture.md`; M7 now defines the waitlist fields, forbidden pre-invitation data, server-side route restrictions, fair cohort inputs, and negative tests; M19 limits uninvited accounts to that waitlist; the UX walkthrough is aligned; no implementation, live account, notification, payment, or Azure action was performed.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Pre-invitation creator data is limited to sign-in contact, display name, adult attestation, broad Orlando area, interests, availability, and optional notification consent. Invitations follow funded demand, area coverage, fit/availability, and fair rotation—not followers, appearance, or subjective business choice.
- Blockers: Active Question 45 must define whether an uninvited Orlando business may submit a lightweight pilot-interest request and whether payment or verification data is collected before invitation.
- Next exact task: Decide the business pilot-interest and pre-admission data-minimization boundary.

### 2026-08-26 — Data-minimized business pilot-interest list confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 45; allowed a lightweight business-interest request after public release while keeping verification, campaign access, payment setup, funding, creator work, and content rights invitation-gated.
- Verification: ADR-054 marked confirmed in `architecture.md`; M6 now defines allowed and forbidden pre-invitation data, route restrictions, admission factors, budget-fairness tests, and the unchanged **Fund and Publish** charge boundary; M19 and the UX walkthrough are aligned; no implementation, business contact, payment method, App Store, or Azure action was performed.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Pre-invitation business data is limited to display/contact/public-listing, broad Orlando area, category/location count, desired campaign, approximate Creator Reward Pool, and timing. Payment and full verification wait for invitation; admission considers readiness, demand, category/geography, and capacity rather than budget alone.
- Blockers: Active Question 46 must define reconfirmation, expiry, withdrawal, and deletion timing for creator and business waitlist records.
- Next exact task: Decide the shared waitlist retention and deletion boundary.

### 2026-08-26 — Shared waitlist reconfirmation and deletion lifecycle confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 46; defined annual reconfirmation, immediate withdrawal/expiry effects, 30-day role-data deletion, a temporary non-personal audit, and separation from shared-account and other-role deletion.
- Verification: ADR-055 marked confirmed in `architecture.md`; M6 and M7 reference the shared lifecycle; M16 now requires lifecycle, deletion, messaging/consent, audit-minimization, and cross-role/account-isolation tests; the UX walkthrough is aligned; no message, deletion, account, payment, or Azure action was performed.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Waitlist entries expire at 12 months without reconfirmation after one month-11 service notice. Withdrawal/expiry removes selection eligibility immediately and role-specific fields are deleted within 30 days; only a non-personal lifecycle/deletion audit remains for 12 additional months.
- Blockers: Active Question 47 must define creator and business invitation acceptance windows, reminders/extensions, and the no-penalty return of unused invitations to the waitlist pool.
- Next exact task: Decide the invitation acceptance and unused-capacity release boundary for each role.

### 2026-08-26 — Pilot invitation windows and no-penalty capacity release confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 47; defined creator/business invitation windows, reminder timing, one limited support extension, provider/platform-delay exclusion, and atomic unused-capacity return.
- Verification: ADR-056 marked confirmed in `architecture.md`; M6 and M7 define the role-specific timers and outcomes; M14 covers deduplicated service reminders; M16 covers timer, extension, delay, capacity, penalty, and reservation tests; the UX walkthrough is aligned; no invitation, message, account, payment, or Azure action was performed.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Creators have 14 days and businesses 30 days to submit inputs they control. One seven-day support extension is available for defined blockers; Local Missions/provider delay cannot count against the recipient; expiry returns capacity and the account to the waitlist without penalty or reserved mission/money.
- Blockers: Active Question 48 must define deletion and retention for partially submitted verification/onboarding data when an invitation is declined or expires.
- Next exact task: Decide the incomplete invited-onboarding data lifecycle.

### 2026-08-26 — Incomplete invited-onboarding cleanup confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 48; defined immediate workflow closure and 30-day cleanup for sensitive documents, drafts, media, derivatives, and unfunded payment references after a declined or validly expired invitation.
- Verification: ADR-057 marked confirmed in `architecture.md`; M6/M7 define role-specific closure and cleanup; M16 covers active stores, derivatives, provider cleanup, backup aging, holds, alerts, pending-review exclusion, minimal waitlist isolation, and cross-role safety; the UX walkthrough is aligned; no document, draft, payment reference, provider record, account, or Azure resource was changed.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: A timely submission under platform/provider review stays active. Otherwise, sensitive Local Missions onboarding data is removed within 30 days, provider-mandated records stay only with the provider, and only the pre-existing minimal waitlist entry plus a 12-month non-personal lifecycle audit remain unless a documented expiring hold applies.
- Blockers: Active Question 49 must define objective creator/business onboarding denials, correction opportunities, appeal timing, reviewer independence, and limits on withheld fraud/security detail.
- Next exact task: Decide the shared onboarding denial and appeal boundary.

### 2026-08-26 — Shared onboarding correction and independent appeal confirmed

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 49; separated fixable corrections from final denials and defined objective notice, one independent appeal, timing, fraud/security-detail limits, prohibited subjective reasons, and cross-role/earned-money protection.
- Verification: ADR-058 marked confirmed and ADR-057 cleanup trigger clarified in `architecture.md`; M6/M7 define role-specific correction/appeal behavior; M15 adds separated queues and reviewer independence; M16 covers state, timing, authorization, reason, redaction, resume/cleanup, and harm-prevention tests; the UX walkthrough is aligned; no review, appeal, account, payment, or Azure action was performed.
- Evidence: `architecture.md`, `plans.md`, and `ux-walkthrough/README.md`.
- Decisions: Fixable issues receive 14 days under **Correction needed** with invitation time paused. Final denial requires an objective explanation and one appeal within 14 days, decided by another reviewer with a 10-business-day target; fraud methods may be protected, but subjective/popularity/budget reasons and cross-role or earned-money harm are prohibited.
- Blockers: Active Question 50 must decide whether to freeze the founder V1 architecture, generate individual ADR files, and begin M1 locally while leaving provider/legal/cloud specifics as gated implementation decisions.
- Next exact task: Decide the V1 architecture freeze and implementation handoff boundary.

### 2026-08-26 — Founder V1 baseline frozen and implementation handoff approved

- Milestone: M0
- Completed: Recorded the founder's answer to architecture Question 50; froze ADR-001 through ADR-058 as the founder-approved V1 baseline, closed the active founder interview, and authorized local M1 work only.
- Verification: Generated and drift-checked 58 individual ADR files plus their index; added the V1 product contract, trust-boundary/data-flow diagram, open external-gate register, and the required synthetic Orlando tabletop evidence.
- Evidence: `architecture.md`, `docs/decisions/`, `docs/product/mvp.md`, `docs/architecture/trust-boundaries.md`, `docs/legal/open-questions.md`, and `docs/evidence/M00/`.
- Decisions: Material product changes require superseding ADRs. Accepted architecture does not bypass legal, payment, cloud, provider, privacy, security, App Store, or live-money gates.
- Blockers: No active founder architecture question. External provider/configuration approvals and implementation proof remain milestone gates.
- Next exact task: Build and verify the local-only M1 monorepo without Azure resources, live Stripe, Apple submission, or real payments.

### 2026-08-26 — Local M1 monorepo and generated-image-aligned iPhone shell started

- Milestone: M1
- Completed: Created the pnpm/Turborepo workspace, Expo app, Next dashboard, Nest/Fastify API, worker, shared contract/config/database/fixture packages, local PostgreSQL/Azurite setup, empty Terraform boundary, CI/dependency/pre-commit policy, and the first interactive role-choice screen.
- Verification: `pnpm peers check`, `pnpm verify`, local secret scan, and ADR drift check passed. PostgreSQL reached healthy, Azurite started, the API health endpoint returned `ok`, and the dashboard returned HTTP 200. Computer Use visually inspected the live Expo UI in Safari's iPhone Pro `402 × 874` responsive viewport. Disposable containers, volumes, and network were destroyed after testing.
- Evidence: `README.md`, workspace/app/package files, `docker-compose.yml`, `infra/terraform/`, and `docs/evidence/M01/summary.md`.
- Decisions: Generated UX images and the approved Midnight Navy/Orlando Lagoon/Sunset Tangerine/Warm Sand system are the visual source of truth. Visual implementation uses real components and may reuse approved source photography, but must not fake the app by displaying an entire mockup screenshot.
- Blockers: M1 is not marked passed because Xcode/Simulator is not installed, native iOS execution and saved screenshot evidence remain outstanding, Gitleaks has not run, and a fresh committed checkout cannot yet be tested. External account/region/domain prerequisites remain records to supply later.
- Next exact task: Install/identify an iOS Simulator-capable Xcode environment or approved physical-device development path, capture native shell evidence, then implement the creator/business authentication and mode-selection routes from the generated walkthrough.

### 2026-08-26 — Native Creator workflow and proof-based checklist advanced

- Milestone: M1 gate remediation with M2 native prototype prework
- Completed: Added the live proof-based Markdown checklist near the top of this file; reconciled completed and incomplete M1/M2 work; implemented and connected Creator mission discovery, terms/consent, accepted schedule, preparation, synthetic QR/staff-code check-in, deliverables, upload progress/retry messaging, one bounded revision, and `Funded → Pending review → Available → Paid` earnings views. The Business setup, dashboard, and first mission-brief step are also represented in the current native prototype.
- Verification: Pinned Node `24.19.0` and pnpm `11.24.0` focused mobile formatting, lint, strict type check, two mobile tests, and Expo export passed. Computer Use navigated the Creator path on the iPhone 17 Pro/iOS 26.5 Simulator, inspected accessibility state for each critical action, and verified the local Available-to-Paid toggle. Full workspace verification is rerun after this checklist/evidence update.
- Evidence: `docs/evidence/M01/summary.md`, `docs/evidence/M02/summary.md`, and `docs/evidence/M02/screenshots/ios/`.
- Decisions: A checked plan item now requires current proof. Broad or partially implemented items remain unchecked. Prototype camera, location, uploads, applications, business funding, Stripe, payouts, and external identity remain synthetic/local only.
- Blockers: M1 still needs external prerequisite records, a fresh committed-checkout install, independent three-session hot reload proof, Gitleaks, and dashboard desktop/mobile screenshot evidence. M2 still needs the remaining Creator/account views, complete Business/Venue/Admin paths, navigation/state patterns, accessibility/display matrix, and Maestro/browser test flows.
- Next exact task: Implement and natively verify the remaining Business mission wizard—deliverables and rights, budget/funding breakdown, and review/publish preview—without charging or contacting Stripe.

### 2026-08-26 — Business mission wizard completed as a local-only native prototype

- Milestone: M2 native prototype prework while M1 gate remediation remains open
- Completed: Connected the Business brief to native deliverables/rights, budget/funding, and review/publish steps. Locked the Visit & Create prototype to two 5–15-second vertical clips and five original photos, no required public post, a 90-day owned-organic-social license, creator ownership, no positive-review requirement, and at most one objective correction. Corrected Creator details/upload views to the same approved defaults. Added the `$500` Creator Reward Pool, `$75` transparent 15% fee, and `$575` Total Due, followed by synthetic admin-approval and Fund and Publish terminal states.
- Verification: Focused mobile formatting, lint, strict type check, two mobile tests, and Expo export passed. Computer Use inspected all three new Business routes on iPhone 17 Pro/iOS 26.5, verified the pre-approval state, changed it to admin-approved, then exercised the final local published state. Accessibility text confirmed the amount, approval gate, explicit Fund and Publish boundary, and no-charge statement.
- Evidence: `docs/evidence/M02/summary.md` and `docs/evidence/M02/screenshots/ios/business-deliverables-rights-iphone17pro.png`, `business-budget-iphone17pro.png`, `business-review-initial-iphone17pro.png`, and `business-review-published-iphone17pro.png`.
- Decisions: Generated images remain visual references, but the current approved plan controls conflicting numbers and rights. No real card, PaymentIntent, charge, approval request, publication, Stripe call, or Azure action occurred.
- Blockers: M1 and the remaining M2 items stay unchecked in the live execution checklist.
- Next exact task: Build and natively verify Business applicants/capacity, Creator selection fairness, and the corresponding accepted-state handoff.

### 2026-08-26 — Business matching, submission review, and results checkpoint verified

- Milestone: M2 native prototype prework while M1 gate remediation remains open
- Completed: Intentionally recorded a local checkpoint for Business applicants/capacity, submission review, one objective correction preview, objective approval, and campaign results. Community matching shows only coarse locality, availability, fit, and reliability; exact ZIP, street address, follower totals, private analytics, appearance, and subjective popularity are excluded. Results keep 42 Local Pass claims separate from 18 verified redemptions and explicitly avoid calling either purchases, sales, or proven incremental customers.
- Verification: Focused mobile formatting, lint, strict type check, two mobile tests, and Expo export passed. Computer Use navigated Applicants to Review submission, exercised the single objective-correction state, approved the objective work, and reached Campaign results on iPhone 17 Pro/iOS 26.5. All three native screenshots were visually inspected and confirmed at `1206 × 2622` with no horizontal overflow or exposed personal/live-payment data.
- Evidence: `docs/evidence/M02/summary.md`, `docs/evidence/M02/screenshots/ios/business-applicants-iphone17pro.png`, `business-submission-review-iphone17pro.png`, and `business-results-iphone17pro.png`.
- Decisions: Current approved plan values override older generated concepts: 10 Community Slots at $50, two clips and five photos per completed slot, $500 Creator Reward Pool, $75 fee, and $575 completed campaign cost. Every action remains synthetic/local; no applicant assignment, replacement request, media upload, approval, charge, transfer, payout, Local Pass record, Stripe call, or Azure action occurred.
- Blockers: M1 remains open for external prerequisites, fresh committed-checkout proof, independent hot reload, Gitleaks, and dashboard screenshots. M2 still needs Creator utility/account views, Venue Staff, admin/support web paths, complete navigation/state/accessibility coverage, device/mode verification, and Maestro flows.
- Next exact task: Build and natively verify the restricted Venue Staff check-in view without exposing Creator earnings, private profile data, business billing, or administrative controls.

### 2026-08-26 — Restricted Venue Staff check-in checkpoint verified

- Milestone: M2 native prototype prework while M1 gate remediation remains open
- Completed: Intentionally recorded a local checkpoint for a separate Venue Staff mode and assigned-visit check-in screen. It shows only the assigned Orlando venue, mission window, Creator display name, included admission/meal, and arrival status. It explicitly withholds Creator earnings, follower/private analytics, home address/ZIP/locality proof, business billing/budget, and all admin/support/dispute controls.
- Verification: Focused mobile formatting, lint, strict type check, two mobile tests, and Expo export passed. Computer Use opened the route on iPhone 17 Pro/iOS 26.5, verified the restricted initial state, exercised the local arrival-confirmation action, and confirmed the terminal checked-in state. Both screenshots were visually inspected with no horizontal overflow or exposed sensitive/live data.
- Evidence: `docs/evidence/M02/summary.md`, `docs/evidence/M02/screenshots/ios/venue-check-in-initial-iphone17pro.png`, and `venue-check-in-confirmed-iphone17pro.png`.
- Decisions: Venue Staff cannot review content, approve work, change campaign or mission state, release money, or access employee powers. This prototype creates no check-in event, location record, message, payment action, or external side effect.
- Blockers: M1 remains open for its external/reproducibility gates. M2 still needs Creator utility/account views, admin/support web paths, complete navigation and UI-state coverage, accessibility/device-mode verification, and Maestro/browser flows.
- Next exact task: Build and natively verify Creator search/filter, My Missions, and full mission instructions as one connected utility flow.

### 2026-08-26 — Creator discovery utilities and instructions checkpoint verified

- Milestone: M2 native prototype prework while M1 gate remediation remains open
- Completed: Intentionally recorded a local checkpoint for Creator search/filter, My Missions status sections, and full accepted-mission instructions. Discovery links to coarse timing/distance/fit filters with no follower-count control; My Missions groups Upcoming, Needs action, and Completed work; accepted instructions show the funded $50 reward, included experience, mission window, two clips, five photos, upload deadline, 90-day organic-use term, Creator ownership, extra-pay usage boundaries, single correction, and mission-window-only location rule.
- Verification: Focused mobile formatting, lint, strict type check, two mobile tests, and Expo export passed. Computer Use applied filters and confirmed two synthetic matches, inspected all My Missions sections, followed Review instructions into the complete contract, and confirmed the route exposes a stable continuation to synthetic check-in. Three `1206 × 2622` Simulator screenshots were visually inspected with no horizontal overflow or critical clipped content.
- Evidence: `docs/evidence/M02/summary.md`, `docs/evidence/M02/screenshots/ios/creator-search-filters-iphone17pro.png`, `creator-my-missions-iphone17pro.png`, and `creator-mission-instructions-iphone17pro.png`.
- Decisions: Search may narrow only objective product-fit inputs and never exclude ordinary Creators by follower total. Full instructions preserve the approved mission contract and do not request camera/location permission, create calendar events, upload files, or change mission/payment state.
- Blockers: M1 remains open for its external/reproducibility gates. M2 still needs Creator profile/account/payout/support/deletion views, admin/support web routes, complete tab/sheet and UI-state patterns, accessibility/device-mode verification, and Maestro/browser flows.
- Next exact task: Build and natively verify the Creator account hub with annual locality verification, payout setup boundary, consent history, support, and account-deletion preview.

### 2026-08-26 — Creator account, privacy, payout, support, and deletion checkpoint verified

- Milestone: M2 native prototype prework while M1 gate remediation remains open
- Completed: Intentionally recorded a local checkpoint for the Creator account hub plus locality verification, payout setup, consent history, support, and account-deletion views. The account hub keeps Creator and Business role scope separate. Locality shows annual expiry and raw-proof deletion timing, never exposes street/ZIP/proof/bank data, and removes the verified badge and distance band immediately in the synthetic address-change state. Payout setup is a disconnected Stripe-hosted handoff preview. Consent history separates required mission terms from optional per-platform Reach permission. Support uses scoped categories and a no-send terminal preview. Deletion distinguishes removable Creator data from justified ledger/tax/fraud/legal/audit records and preserves an active Business role unless separately requested.
- Verification: Focused mobile formatting, lint, strict type check, two mobile tests, and Expo export passed. Computer Use inspected the account hub and all five detail routes on iPhone 17 Pro/iOS 26.5; exercised locality invalidation, payout handoff, optional Reach consent, a support-topic/request preview, and deletion review. Native inspection caught and resolved a stale locality disclosure so the invalidated state now consistently returns `Locality verification unavailable` and no distance band. Six `1206 × 2622` screenshots were visually inspected without horizontal overflow, exposed private values, or accidental external actions.
- Evidence: `docs/evidence/M02/summary.md`, `docs/evidence/M02/screenshots/ios/creator-account-hub-iphone17pro.png`, `creator-locality-reverify-iphone17pro.png`, `creator-payout-setup-iphone17pro.png`, `creator-consent-history-iphone17pro.png`, `creator-support-iphone17pro.png`, and `creator-account-deletion-iphone17pro.png`.
- Decisions: Locality proof is never replaced by Stripe KYC or bank data; payout destination changes require recent authentication; optional Reach consent cannot affect Community access or accepted rewards; deletion cannot silently erase earned money, immutable ledger/audit obligations, or another active role. Every action remains synthetic/local and creates no document, provider account, support case, consent event, export, deletion request, or payment mutation.
- Blockers: M1 remains open for its external/reproducibility gates. M2 now primarily needs admin/support web routes, native tab/sheet and complete UI-state patterns, accessibility/device-mode verification, and Maestro/browser flows.
- Next exact task: Implement and inspect the Admin review queue, audit timeline, and support/dispute web views at desktop and mobile widths.

### 2026-08-26 — Admin and support responsive-web checkpoint verified

- Milestone: M1 gate remediation and M2 clickable-prototype prework
- Completed: Replaced the dashboard scaffold with a restricted operations console containing a linked overview, objective Admin review queue, append-only Admin audit timeline, and Support/dispute case workspace. The prototype uses synthetic Orlando public IDs, structured checklist evidence, independent-appeal language, protected creator-reward treatment, and explicit operations/finance separation. It does not expose address, ZIP, raw locality proof, bank/KYC/tax data, private audience analytics, or a broad user-profile browser.
- Verification: Dashboard formatting, lint, strict type check, two tests, and the Next.js production build passed. A controlled browser loaded `/`, `/admin/review`, `/admin/audit`, and `/support/disputes`, navigated through the actual links, confirmed the correct active destination, and found no browser-console errors. All four routes were inspected and captured at 1440 px and 390 px widths with no horizontal page overflow. The first mobile capture exposed a partially hidden navigation item; mobile navigation was corrected to a two-by-two grid and all affected screenshots were recaptured as valid PNG files.
- Evidence: `docs/evidence/M02/summary.md` and eight images under `docs/evidence/M02/screenshots/web/`: `dashboard-overview-{desktop,mobile}.png`, `admin-review-queue-{desktop,mobile}.png`, `admin-audit-timeline-{desktop,mobile}.png`, and `support-disputes-{desktop,mobile}.png`.
- Decisions: Employee administration remains web-only and cannot be selected from the shared iPhone app. Statuses include text labels rather than color alone. Operations can coordinate objective reviews and cases but cannot modify ledger history, reverse approved rewards, approve its own appeal, alter payout destinations, or override a closed funding gate. Every action remains local and synthetic; no employee identity, support case, audit export, payment mutation, provider request, or Azure resource was created.
- Blockers: M1 still requires external prerequisite records, clean committed-checkout proof, three independent hot-reload sessions, and Gitleaks before its gate can pass. M2 still needs native tab/sheet navigation, complete semantic UI states, accessibility and device/mode verification, Maestro flows, and the narrated end-to-end gate.
- Next exact task: Add native-feeling Creator and Business tab navigation without exposing employee administration as an app mode, then verify every tab destination in the iPhone Simulator.

### 2026-08-26 — Creator and Business native tab navigation verified

- Milestone: M2 native clickable-prototype prework while M1 gate remediation remains open
- Completed: Added one shared role-aware native bottom tab bar. Creator mode exposes Discover, Missions, Earnings, and Account. Business mode exposes Home, Applicants, Review, and Results. Every tab has a stable accessibility label, selected state, and test ID. Venue Staff remains a restricted single-purpose view, and employee Admin/Support is not an iPhone mode or destination.
- Verification: Focused mobile formatting, lint, strict type check, two tests, and Expo export passed. Computer Use opened Creator Discover on iPhone 17 Pro/iOS 26.5 and clicked through Missions, Earnings, and Account, then opened Business Home and clicked through Applicants, Review, and Results. The native accessibility tree reported the expected destination and selected tab after every action. Two `1206 × 2622` screenshots were visually inspected; the fixed tab bars were readable, role-colored, and did not hide critical visible controls.
- Evidence: `docs/evidence/M02/summary.md`, `docs/evidence/M02/screenshots/ios/creator-account-tabs-iphone17pro.png`, and `docs/evidence/M02/screenshots/ios/business-results-tabs-iphone17pro.png`.
- Decisions: Primary navigation remains role-specific, while one identity may still hold both roles through the separate mode-switching model. Creator and Business routes never expose employee controls; Venue Staff does not inherit broad Business navigation. All navigation is local and creates no identity, mission, case, payment, location, message, or provider action.
- Blockers: M2 still needs native sheet behavior, complete semantic UI states, accessibility and device/mode verification, Maestro flows, and the narrated end-to-end gate. M1 remains open for its external and reproducibility gates.
- Next exact task: Convert Creator search/filter into a native-feeling sheet with explicit dismiss and apply behavior, then verify both terminal states in the iPhone Simulator.

### 2026-08-26 — Creator native filter sheet verified

- Milestone: M2 native clickable-prototype prework while M1 gate remediation remains open
- Completed: Replaced the Creator feed's full-page search handoff with an iOS-style bottom sheet. Draft timing, coarse distance, and mission-fit choices remain temporary until Apply; the close control and dimmed backdrop dismiss without committing. Applying closes the sheet and returns a visible two-match summary plus synchronized filter chips to Discover. No follower-count filter exists, and the sheet reiterates the Community/optional-Reach boundary.
- Verification: Focused mobile formatting, lint, strict type check, two tests, and Expo export passed. Computer Use opened the sheet, confirmed its modal accessibility boundary and selected states, dismissed it without an applied summary, reopened it, changed `Today` to `This week` and `Family` to `Attractions`, applied, and confirmed the committed values on Discover. Visual inspection caught stale default shortcut chips in the first applied capture; the chips were synchronized to the committed values and the evidence was recaptured at `1206 × 2622`.
- Evidence: `docs/evidence/M02/summary.md`, `docs/evidence/M02/screenshots/ios/creator-filter-sheet-iphone17pro.png`, and `docs/evidence/M02/screenshots/ios/creator-filter-applied-iphone17pro.png`.
- Decisions: Dismissal is non-committing; Apply is explicit and local. Filters use only timing, coarse distance, and mission fit. No search, location, creator profile, analytics, mission, provider, or network request is created.
- Blockers: M2 still needs the complete semantic state system, accessibility and device/mode verification, Maestro flows, and the narrated end-to-end gate. M1 remains open for its external and reproducibility gates.
- Next exact task: Implement and document reusable loading, empty, offline, error, pending, locked, warning, and success states, beginning with the Creator discovery and Business dashboard surfaces.

### 2026-08-26 — Semantic design system and interface-state patterns verified

- Milestone: M2 native clickable-prototype prework while M1 gate remediation remains open
- Completed: Documented the shared semantic palette, typography, spacing, shape, icon, state, and safety-language rules in `docs/product/design-system.md`. Added one reusable native state card plus role-specific Creator and Business preview sheets covering success, warning, error, pending, locked, empty, loading, and offline. Discovery and the Business dashboard now expose those local previews through clearly labeled controls.
- Verification: Focused mobile formatting, lint, strict type check, two tests, and Expo export passed. Computer Use opened both sheets on iPhone 17 Pro/iOS 26.5, confirmed all eight named states and action labels in the accessibility tree, exercised the Creator error retry and Business funding-lock explanation, and verified both terminate with `No request was sent.` Four `1206 × 2622` native screenshots were captured and visually inspected; the top views show success through empty and the corrected scrolled views show pending through offline plus the local-only result without clipping.
- Evidence: `docs/product/design-system.md`, `docs/evidence/M02/summary.md`, `docs/evidence/M02/screenshots/ios/creator-semantic-states-{top,bottom}-iphone17pro.png`, and `business-semantic-states-{top,bottom}-iphone17pro.png`.
- Decisions: Role accent color never substitutes for semantic status. Every state includes a visible text label and icon or progress indicator; error/offline text says what was preserved and which mutations wait; locked funding protects existing obligations. The prototype performs no network, payment, identity, location, message, or provider action.
- Blockers: M2 still needs the dedicated WCAG/touch-target/VoiceOver/Dynamic Type audit, smallest/standard/max iPhone and dark/large-text matrix, complete critical-control accessibility IDs, Maestro flows, and narrated end-to-end gate. M1 remains open for its external and reproducibility gates.
- Next exact task: Audit the current critical controls and text wrapping on the smallest supported iPhone at a large Dynamic Type size, correct failures, and save native evidence before expanding the device/mode matrix.

### 2026-08-26 — Smallest-iPhone Accessibility Large checkpoint started

- Milestone: M2 accessibility and display-matrix verification in progress
- Completed: Created a local iPhone SE (3rd generation) Simulator on iOS 26.5, reused the local Expo Go bundle, set Light appearance and the official `accessibility-large` content-size category, and inspected Creator Discover, the complete semantic-state sheet, and the Business dashboard. The first runs exposed fragmented brand text, colliding bottom-tab labels, a clipped Business test-data label, split quick-action text, and a clipped Mission overview header. Updated the shared shell, compact preview behavior, wrapped controls, semantic-state typography bounds, and Business dashboard text bounds while keeping primary content scrollable.
- Verification: Focused mobile formatting, lint, strict type check, and two tests passed. Computer Use confirmed the repaired Creator and Business controls plus both four-tab bars are readable, opened the state sheet, and scrolled from success/warning/error to loading/offline. The accessibility tree retained every state, close control, retry action, selected tab, and stable preview test ID. Five `750 × 1334` screenshots were captured from the iPhone SE; the local Expo Go developer-tools bubble remains visible and is not part of the app.
- Evidence: `docs/evidence/M02/summary.md`, `creator-discover-iphonese-large-text.png`, `creator-semantic-states-{top,bottom}-iphonese-large-text.png`, and `business-dashboard-{top,lower}-iphonese-large-text.png` under `docs/evidence/M02/screenshots/ios/`.
- Decisions: This is a truthful partial checkpoint, not completion of the broad WCAG/VoiceOver/Dynamic Type task or the full smallest/standard/max, light/dark, normal/large matrix. Those boxes remain unchecked. Decorative chrome uses bounded scaling; compensation, requirements, deadlines, and actions must still be audited screen by screen for wrapping and reachability.
- Blockers: Additional Business funding/review routes on the iPhone SE, dark appearance, the max-size device, complete VoiceOver order, touch-target measurements, contrast calculations, every critical control ID, Maestro, and the narrated M2 gate remain open.
- Next exact task: Repeat representative Creator and Business routes in dark mode, then inspect the detailed Business funding/review surfaces on the iPhone SE at Accessibility Large.

### 2026-08-26 — Adaptive Dark appearance and Business large-text funding checkpoint verified

- Milestone: M2 accessibility and display-matrix verification in progress
- Completed: Replaced the light-only mobile palette with shared adaptive iOS Light/Dark semantic tokens and enabled automatic system appearance. Creator Discover, Creator semantic states, and the Business dashboard now render role, status, surface, border, text, sheet, and backdrop colors from the same token contract. Added an automated WCAG contrast test for 20 ordinary-text pairs. Inspected Business Budget & funding and Review & publish on iPhone SE at `accessibility-large`; the first Budget run exposed a clipped `$500.00` reward pool, so narrow/large-text layouts now stack money, status, reward-flow, mission, review, and audit content rather than compressing critical values into fixed horizontal rows.
- Verification: Computer Use opened the refreshed Expo runtime on iPhone 17 Pro/iOS 26.5 in Dark appearance and confirmed the Creator and Business accessibility trees before three `1206 × 2622` screenshots were captured and visually inspected. It then opened both Business funding/review routes on iPhone SE/iOS 26.5 in Light appearance at `accessibility-large`; repaired `750 × 1334` captures show the full `$500.00` value and an expanded mission header without horizontal clipping. The repository `verify` gate passed across all eight packages using Node 24.19.0 and the repo-pinned pnpm 11.24.0: formatting, lint, strict type checks, tests, contract checks, and builds all passed. The mobile suite now passes 22 tests, and the local high-confidence secret scan passed for 200 text files.
- Evidence: `docs/product/design-system.md`, `docs/evidence/M02/summary.md`, `apps/mobile/tests/theme-contrast.test.ts`, `creator-discover-iphone17pro-dark.png`, `creator-semantic-states-iphone17pro-dark.png`, `business-dashboard-iphone17pro-dark.png`, `business-budget-iphonese-accessibility-large-fixed.png`, and `business-review-publish-iphonese-accessibility-large-fixed.png` under `docs/evidence/M02/screenshots/ios/`.
- Decisions: The app follows the system iOS appearance; there is no prototype-only manual theme override. The current contrast evidence covers shared palette pairs, not every composited image/overlay/control state. The broad WCAG/touch-target/VoiceOver/Dynamic Type task and full device/mode matrix remain unchecked until their remaining combinations are measured.
- Blockers: The max-size iPhone, remaining Light/Dark and text-size route/state combinations, complete VoiceOver order, touch-target measurements, every critical control ID, Maestro flows, and the narrated M2 gate remain open. M1 remains open for its external and reproducibility gates.
- Next exact task: Add stable accessibility IDs to the remaining critical Creator and Business controls, then begin the two Maestro prototype flows while continuing the max-iPhone and VoiceOver matrix.

### 2026-08-26 — Critical-control IDs and Maestro flow definitions verified

- Milestone: M2 accessibility and automation verification in progress
- Completed: Added human-readable accessibility labels and stable test IDs to every React Native `Pressable` in the current mobile prototype, including role choice, sign-in providers, onboarding, Creator mission consent/application, Business mission creation, all wizard controls, account destinations, fallback/help controls, state actions, and reusable back/dismiss controls. Added a source-level TypeScript AST test that enforces both attributes on every future `Pressable`. Added Expo Go Maestro workspace configuration plus Creator and Business flows. Creator covers discovery, terms, local application preview, accepted instructions, synthetic check-in, deliverables, bounded revision, and Paid preview. Business covers mission creation, deliverables/rights, `$500` reward pool, `$575` total due, synthetic admin approval, and local Fund and Publish.
- Verification: The source audit found 69 controls and zero missing labels/IDs. Mobile formatting, lint, strict type check, and 23 tests passed. Computer Use opened Creator mission details and the Business dashboard on iPhone SE/iOS 26.5 and confirmed the new IDs, checkbox state, disabled application state, and descriptive labels in the native accessibility tree. Ruby parsed both Maestro YAML documents and the workspace config. `pnpm test:e2e:mobile` passed static validation for two flows and 31 source-backed test-ID references. The complete eight-package `verify` gate passed again, and the high-confidence secret scan passed for 206 text files.
- Evidence: `apps/mobile/tests/critical-controls.test.ts`, `.maestro/creator-flow.yaml`, `.maestro/business-flow.yaml`, `.maestro/config.yaml`, `.maestro/README.md`, `scripts/validate-maestro.mjs`, and `docs/evidence/M02/summary.md`.
- Decisions: The source-backed automation gate prevents test selectors from silently drifting. Maestro continues to target Expo Go through a configurable local `EXPO_URL`; a future standalone build can switch to the product bundle ID. Static flow validation is not represented as an executed device test.
- Blockers: Maestro CLI is not installed, so both flows still require real Simulator execution and retained output before the combined Maestro checkbox can pass. VoiceOver order, touch-target measurements, max-iPhone coverage, remaining display combinations, and the narrated M2 gate also remain open.
- Next exact task: Execute the Creator and Business Maestro flows when the CLI is available; meanwhile continue the no-install device matrix with a max-size iPhone and a manual VoiceOver order audit using the existing accessibility tree.

### 2026-08-26 — Max-iPhone and critical accessibility-order checkpoint verified

- Milestone: M2 accessibility and display-matrix verification in progress
- Completed: Reused the installed iOS 26.5 iPhone 17 Pro Max Simulator, installed the existing local Expo Go bundle into that Simulator, set Light appearance with the standard `large` text category, and inspected Creator Discover, Creator mission details, and Business Review & publish. The first Business accessibility tree separated `Creator Reward Pool` and `Total Due` from `$500` and `$575`, while decorative icons entered both money-path reading orders as meaningless glyphs. Grouped the critical mission summary, reward, fee, status, checklist, timeline, compensation, deadline, locality, deliverable, rights, and disclosure content into complete native accessibility phrases.
- Verification: Computer Use confirmed the repaired Creator order as `50 dollars guaranteed`, `Wednesday, 2 to 4 PM`, `Orlando, 4 to 6 miles`, `2 vertical clips`, `5 original photos`, the three objective expectations, the 90-day rights/disclosure boundary, terms checkbox, and disabled Apply action. The repaired Business order now announces `Creator Reward Pool: 500 dollars` followed by `Total Due: 575 dollars`, the complete status consequence, each checklist item as complete or pending, the audit events, and the primary review action. Three `1320 × 2868` Simulator screenshots were captured and visually inspected without horizontal clipping or app-content overlap.
- Evidence: `docs/evidence/M02/screenshots/ios/creator-discover-iphone17promax.png`, `creator-mission-details-iphone17promax.png`, `business-review-publish-iphone17promax.png`, and `docs/evidence/M02/summary.md`.
- Decisions: Accessibility grouping is applied to complete semantic facts so a screen reader does not detach money, time, status, or rights labels from their values. Expo Go's floating developer-tools gear remains external test-runner UI and is not counted as an app control.
- Blockers: This is a critical-path order checkpoint, not the complete VoiceOver audit. Remaining routes, focus movement under actual VoiceOver, touch-target measurements, Dark/large-text combinations, actual Maestro runs, and the narrated M2 gate stay open.
- Next exact task: Measure touch targets and continue actual VoiceOver focus testing across the remaining role/account/support routes; execute Maestro when its CLI is available.

### 2026-08-26 — Shared minimum touch-target enforcement verified

- Milestone: M2 accessibility verification in progress
- Completed: Added one shared `AccessiblePressable` component and a single `minimumTouchTarget` token set to `44 × 44` points. Migrated all 71 current React Native pressable controls across Creator, Business, Venue Staff, setup, navigation, sheets, and semantic-state views to the wrapper. Extended the source-level AST regression test so future direct React Native `Pressable` imports fail outside the wrapper.
- Verification: The source audit reports zero direct React Native `Pressable` imports, 34 files using the shared wrapper, and 71 controls receiving the minimum target. Computer Use reopened Creator mission details, Business dashboard, and Business Review & publish on iPhone 17 Pro Max/iOS 26.5; all three rendered without layout regression, and their native accessibility trees retained the expected labels, IDs, checkbox/disabled states, selected tabs, complete/pending states, and critical contract/payment reading order. The complete eight-package `verify` gate passed with formatting, lint, strict type checks, tests, contracts, and builds; the mobile suite passes 24 tests. Static Maestro validation passed for two flows and 31 test-ID references, and the local high-confidence secret scan passed for 208 text files.
- Evidence: `apps/mobile/components/AccessiblePressable.tsx`, `apps/mobile/components/accessibilityTokens.ts`, `apps/mobile/tests/critical-controls.test.ts`, `docs/evidence/M02/screenshots/ios/business-review-touch-targets-iphone17promax.png`, `docs/product/design-system.md`, and `docs/evidence/M02/summary.md`.
- Decisions: The shared wrapper is the authoritative minimum-size implementation evidence; the native smoke test proves the migration did not break representative layouts or accessibility metadata. This does not claim completion of actual VoiceOver focus testing, remaining Dynamic Type combinations, or the complete M2 accessibility gate.
- Blockers: Remaining-route VoiceOver focus testing, Dark/large-text combinations, actual Maestro runs, and the narrated M2 gate remain open. M1 remains open for external and reproducibility gates.
- Next exact task: Continue actual VoiceOver focus and large-text testing across the remaining role, account, support, and Venue Staff routes while retaining native evidence.

### 2026-08-26 — Compact account, results, Venue, and decorative-accessibility checkpoint verified

- Milestone: M2 accessibility and display-matrix verification in progress
- Completed: Extended the iPhone SE/iOS 26.5 `accessibility-large` pass to Creator Account, Support, Locality, Payout, Consent, Account deletion, Business Applicants, Submission review, Results, and Venue Staff. The native trees exposed meaningless private-use glyphs from decorative icons and avatar initials, detached label/value pairs in account/results/payment/timeline content, a compressed Business capacity card, and a clipped Payout title. Added one shared decorative-icon wrapper for all 197 current Ionicons, hid four avatar initials, expanded narrow/large-text Business capacity/results layouts, grouped critical values into complete phrases, and moved Creator status badges to a separate row at accessibility sizes.
- Verification: Native retesting removed the icon glyphs and avatar initials from the inspected reading orders. Locality lifecycle dates, payout status, consent versions, Results metrics/cost/attribution/payment states, and submission timeline events now appear as complete accessibility phrases. Ten current `750 × 1334` route captures were retained. Xcode Accessibility Inspector targeted Expo Go with all seven available checks enabled—Element Description, Contrast, Hit Region, Element Detection, Clipped Text, Traits, and Dynamic Type—and returned empty warning outlines for Venue Staff, Business Results, and Creator Account deletion. The complete eight-package `verify` gate passed with formatting, lint, strict type checks, tests, contracts, and builds; the mobile suite passes 25 tests. Static Maestro validation passed for two flows and 31 test-ID references, and the local high-confidence secret scan passed for 210 text files.
- Evidence: `apps/mobile/components/DecorativeIcon.tsx`, `apps/mobile/components/CreatorMissionShell.tsx`, `apps/mobile/tests/critical-controls.test.ts`, `docs/evidence/M02/accessibility-inspector-audit.md`, `docs/evidence/M02/summary.md`, and the new `*-iphonese-accessibility-large*.png` captures under `docs/evidence/M02/screenshots/ios/`.
- Decisions: Decorative icons are silent by default because every current action and state already has a visible text label; a future standalone semantic icon requires a separately reviewed accessible component. Xcode's automated audit and native tree are partial evidence, not substitutes for actual VoiceOver gesture testing.
- Blockers: The iOS 26.5 Simulator does not expose VoiceOver in Accessibility settings, and Settings search returns `No Results for “VoiceOver”`; actual VoiceOver focus/gesture proof therefore remains open for a physical iPhone or another compatible environment. Dark plus accessibility-large combinations, actual Maestro execution, and the narrated M2 gate also remain open.
- Next exact task: Repeat the repaired Creator account/payment and Business results routes on iPhone SE at Accessibility Large in Dark appearance, repair any contrast/layout regressions, and retain native evidence.

### 2026-08-26 — Dark plus Accessibility Large compact-device checkpoint verified

- Milestone: M2 accessibility and display-matrix verification in progress
- Completed: Switched the iPhone SE/iOS 26.5 Simulator to Dark appearance while retaining the official `accessibility-large` content size. Inspected Creator Account, Creator Payout, Business Results, and Venue Staff after the shared large-text and reading-order repairs. Manual visual review caught the compact `STRIPE` provider wordmark scaling beyond its purple mark even though the automated audit was empty; bounded that decorative label's font multiplier and recaptured the route.
- Verification: Four current `750 × 1334` Dark plus Accessibility Large screenshots were visually inspected. Titles wrap by words, role colors and semantic cards remain legible, bottom tabs remain operable, critical money/locality/payment phrases stay grouped in the native trees, and no app-owned decorative glyph re-entered the reading order. Xcode Accessibility Inspector ran all seven checks against Dark Venue Staff, Business Results, and the repaired Creator Payout route; every warning outline remained empty. The complete eight-package `verify` gate passed with formatting, lint, strict type checks, tests, contracts, and builds; the mobile suite passes 25 tests. Static Maestro validation passed for two flows and 31 test-ID references, and the local high-confidence secret scan passed for 210 text files.
- Evidence: `creator-account-iphonese-accessibility-large-dark.png`, `creator-payout-iphonese-accessibility-large-dark-fixed.png`, `business-results-iphonese-accessibility-large-dark-fixed.png`, and `venue-check-in-iphonese-accessibility-large-dark.png` under `docs/evidence/M02/screenshots/ios/`, plus `docs/evidence/M02/accessibility-inspector-audit.md` and `docs/evidence/M02/summary.md`.
- Decisions: Automated audits are necessary but not sufficient; the provider-wordmark defect was found by visual review and is now guarded by a bounded decorative-text multiplier. This checkpoint proves representative Dark plus Accessibility Large routes, not the entire route/state matrix.
- Blockers: Actual VoiceOver gesture/focus proof remains unavailable in this Simulator. Remaining display combinations, actual Maestro execution, and the narrated M2 gate remain open.
- Next exact task: Audit the remaining Creator mission lifecycle and Business creation/review routes in Dark appearance at Accessibility Large, prioritizing long content and terminal action states.

### 2026-08-26 — Creator lifecycle and Business terminal-state compact checkpoint verified

- Milestone: M2 accessibility and display-matrix verification in progress
- Completed: Audited Creator mission details, acceptance, instructions, check-in, deliverables, revision, My Missions, and Earnings plus Business setup, mission brief, deliverables/rights, Review & publish, and Submission review on iPhone SE/iOS 26.5 in Dark appearance at `accessibility-large`. Repaired the accepted-mission split word, shared Creator and Business wizard headers, compact cards/actions, dark scanner/media/balance surfaces, earnings progress layout, success-card/button contrast, field/current-value labels, selected-template state, grouped progress/file/money/timeline phrases, and a misleading static `Replace` label by making it a labeled local-preview action.
- Verification: Native Computer Use inspection confirmed all listed routes render, scroll, and expose their critical controls and states. Business Review & publish advanced through synthetic admin approval and `Fund and Publish` to the disabled published terminal state; Submission review advanced through the one-correction preview and objective approval to `View campaign results`. Six new `750 × 1334` screenshots were retained. Xcode Accessibility Inspector ran all seven checks against Dark Creator Earnings and Business Submission review with empty warning outlines. The complete eight-package `verify` gate passed; all mobile 25 tests passed. Static Maestro validation passed for two flows and 31 source-backed test-ID references, and the local high-confidence secret scan passed for 210 text files.
- Evidence: `docs/evidence/M02/screenshots/ios/creator-accepted-iphonese-accessibility-large-dark-fixed.png`, `creator-check-in-iphonese-accessibility-large-dark-fixed.png`, `creator-earnings-iphonese-accessibility-large-dark-fixed.png`, `business-deliverables-rights-iphonese-accessibility-large-dark-fixed.png`, `business-review-publish-terminal-iphonese-accessibility-large-dark-fixed.png`, and `business-submission-approved-iphonese-accessibility-large-dark-fixed.png`, plus `docs/evidence/M02/accessibility-inspector-audit.md` and `docs/evidence/M02/summary.md`.
- Decisions: Adaptive text colors are not safe as dark media/control backgrounds; fixed navy and dark-green action surfaces preserve white-label contrast in both appearances. Large text gets full-width headers and stacked semantic rows instead of smaller critical copy. All exercised actions remain local-only and create no mission, approval, payment, file, notification, or payout record.
- Blockers: Actual VoiceOver gesture/focus proof remains unavailable in this Simulator. The full appearance/text/state matrix, actual Maestro execution, and narrated M2 gate remain open; M1 external/reproducibility gates also remain open.
- Next exact task: Continue the remaining M2 display-state matrix with empty, loading, error, and offline routes in both appearances on the compact device, then retain narrated end-to-end evidence when the execution tooling is available.

### 2026-08-26 — Compact semantic-state matrix checkpoint verified

- Milestone: M2 accessibility and display-matrix verification in progress
- Completed: Inspected the complete Creator and Business semantic-state sheets from top to bottom on iPhone SE/iOS 26.5 at `accessibility-large` in Light and Dark appearances. Success, warning, error, pending, locked, empty, loading, and offline states all state what happened, what remains safe, and the next available action. Moved each card's accessibility semantics to its explanatory header so the complete state is announced as one alert/progress phrase while Retry and `Why is this locked?` remain separate controls.
- Verification: Native trees now expose eight complete state phrases per role plus the three distinct error/locked/offline controls. Creator error retry and Business locked explanation each produced the visible local result ending `No request was sent.` Manual top-to-bottom review confirmed the lower locked, empty, loading, and offline cards and recovery buttons remain readable and reachable in Dark appearance; corresponding Light top-sheet captures were also retained. Xcode Accessibility Inspector ran all seven checks against the Light Business state sheet and returned an empty warning outline. Four top-sheet and two bottom-sheet `750 × 1334` captures are retained.
- Evidence: `docs/evidence/M02/screenshots/ios/creator-semantic-states-iphonese-accessibility-large-light-fixed.png`, `creator-semantic-states-iphonese-accessibility-large-dark-fixed.png`, `creator-semantic-states-bottom-iphonese-accessibility-large-dark-fixed.png`, `business-semantic-states-iphonese-accessibility-large-light-fixed.png`, `business-semantic-states-iphonese-accessibility-large-dark-fixed.png`, and `business-semantic-states-bottom-iphonese-accessibility-large-dark-fixed.png`, plus `docs/evidence/M02/accessibility-inspector-audit.md` and `docs/evidence/M02/summary.md`.
- Decisions: A state card may group its explanation for assistive technology only at the non-interactive header level; grouping the outer card would hide nested recovery controls. The test sheets remain synthetic and never trigger network, payment, identity, location, or message actions.
- Blockers: Actual VoiceOver gesture/focus proof remains unavailable in this Simulator. Actual Maestro execution and the narrated M2 gate remain open, as do M1 external/reproducibility gates and any untested device/appearance/text combinations outside the recorded matrix.
- Next exact task: Build a narrated end-to-end local prototype run using the native Creator and Business flows, retaining screenshots and state narration; keep the actual Maestro execution box open until the CLI exists.

### 2026-08-26 — Narrated native Creator and Business M2 gate verified

- Milestone: M2 narrated prototype gate passed; broader M2 remains in progress
- Completed: Ran two fresh native journeys on iPhone SE/iOS 26.5 in Dark appearance at `accessibility-large` using the app's actual labeled controls. Creator advanced from Discover through mission contract consent, application preview, accepted instructions, synthetic check-in, deliverables, one objective correction, Available, and Paid. Business advanced from disconnected sign-in and profile setup through mission creation, deliverables/rights, `$575` budget, synthetic admin approval, explicit Fund and Publish, and the disabled published terminal.
- Verification: The Creator checkbox changed from unchecked to checked before Apply enabled; the application alert stated no application was sent; accepted progress, upload completion, revision scope, and Paid reward progress were present in the native tree. The Business run preserved the `$500` Creator Reward Pool and `$575` Total Due, remained `NOT FUNDED` in Budget, required a separate approval action before `Preview Fund and Publish for 575 dollars`, and ended with `Mission published in local preview` disabled. No critical horizontal clipping or unreachable required action appeared during either run. Two terminal screenshots and a step-by-step narration were retained. The complete eight-package `verify` gate passed with all 25 mobile tests; static Maestro validation passed for two flows and 31 source-backed test-ID references; and the local high-confidence secret scan passed for 211 text files.
- Evidence: `docs/evidence/M02/narrated-prototype-run.md`, `docs/evidence/M02/screenshots/ios/narrated-creator-paid-terminal-iphonese-dark-large.png`, `narrated-business-published-terminal-iphonese-dark-large.png`, `docs/evidence/M02/summary.md`, and the preceding compact-route/state evidence.
- Decisions: This closes the narrated local prototype gate because both role journeys were executed through native controls with explicit safety outcomes. It does not substitute for actual Maestro execution or actual VoiceOver gestures, and it creates no external record.
- Blockers: Maestro CLI is unavailable, and this Simulator does not expose VoiceOver. Those boxes remain open. M1 external/reproducibility gates and any unrecorded device/appearance/text combinations remain open.
- Next exact task: Continue M1 reproducibility and external-service readiness work that does not create infrastructure or external records; keep all live Azure, Stripe, Entra, payment, location, and message actions behind their existing approval gates.
