# Local Missions iOS readiness and Azure architecture review

Status date: 2026-09-01
Repository proof baseline: `73ef5bd` on `main` / `origin/main`; current checkpoint: `M05-github-oidc-arm-proof-passed-024`
Cloud boundary: the retained-state bootstrap and 20-resource retained control plane are live and verified. No disposable application workload has been deployed.

## Executive status

**A real React Native app runs locally in Expo Go on iOS Simulators. A signed, cloud-connected, physical-device/TestFlight app does not exist yet.**

| Readiness level                | Status                          | Evidence                                                                                                                                                                                                                                                   | What is still missing                                                                                                                                                                  |
| ------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native clickable iOS prototype | Proven                          | Expo Go on iOS 26.5 iPhone SE, iPhone 17 Pro, and iPhone 17 Pro Max Simulators; Creator, Business, and restricted Venue Staff routes                                                                                                                       | A standalone signed development/archive build rather than Expo Go                                                                                                                      |
| Native UI regression           | Proven                          | Complete light/dark, standard/large-text device matrix; actual Creator and Business Maestro Simulator runs; Xcode Accessibility Inspector and native-tree audits                                                                                           | Fresh current-commit Simulator rerun and physical-iPhone VoiceOver traversal                                                                                                           |
| Local code quality             | Proven fresh on 2026-08-31      | 111/111 mobile tests, TypeScript, Expo web export, and static Maestro contract all passed under Node 24.19.0 and pnpm 11.24.0                                                                                                                              | Native compilation/signing is not part of the current managed Expo setup                                                                                                               |
| Local domain/API foundation    | Proven                          | PostgreSQL migrations, state machines, OpenAPI/client generation, tenant authorization, and fixture-backed authenticated API paths passed M3/M4 local gates                                                                                                | The complete mobile UI is not yet connected end to end to every real API/domain path in M6–M15                                                                                         |
| Authentication boundary        | Locally proven, externally open | PKCE/state/nonce, SecureStore boundary, token verification, refresh/logout, and server-derived roles passed fixture-backed tests                                                                                                                           | Real Entra External ID registrations, system-browser consent/cancel/email-code flow, network JWKS/issuer/audience proof, and device deep-link return                                   |
| Azure runtime                  | Retained control plane live     | Dedicated subscription, three-resource state bootstrap, Entra-backed remote state, exact 20-resource retained control plane, and three live no-apply GitHub OIDC/ARM permission proofs independently verified; the retained workload landing zone is empty | Review and prove a temporary least-privilege workflow state-network path, then separately review/approve the 27-resource core, images, three-app activation, cloud tests, and teardown |
| Physical iPhone                | Not proven                      | An exact VoiceOver device-gate script exists; the prior device inventory found no connected iPhone                                                                                                                                                         | Trust/install, SecureStore cold restart, system browser/deep link, VoiceOver gestures/focus, camera/QR, location, media selection/upload, background/resume, Wi-Fi/cellular loss       |
| TestFlight/App Store           | Not started                     | Bundle identifier placeholder exists: `com.stratios.localmissions.dev`                                                                                                                                                                                     | Freeze identifiers, `eas.json`, Apple/EAS ownership, signing, privacy manifest/labels, staged builds, App Store Connect record, beta and release gates                                 |

The current prototype can truthfully demonstrate the approved journeys and safety copy. Its local application, funding, upload, identity, check-in, and payment states are synthetic previews. The real product integrations described in M6–M15—onboarding, QR/location, media upload, Stripe test-mode funding/payouts, Local Pass, notifications, and operational console behavior—must still be implemented and connected before release-candidate testing.

## Fresh local verification

The following local-only gates passed on 2026-08-31:

```text
pnpm --filter @local-missions/mobile test
  17 files passed; 111 tests passed

pnpm --filter @local-missions/mobile typecheck
  PASS

pnpm --filter @local-missions/mobile build
  PASS; Expo web export completed

pnpm --filter @local-missions/mobile test:e2e:mobile
  PASS; 2 flows and 34 testID references statically validated
```

This fresh check did not boot an iOS Simulator. The retained actual native/Simulator evidence is in:

- [`../evidence/M01/summary.md`](../evidence/M01/summary.md)
- [`../evidence/M02/summary.md`](../evidence/M02/summary.md)
- [`../evidence/M02/maestro-runs.md`](../evidence/M02/maestro-runs.md)
- [`../evidence/M02/voiceover-device-gate.md`](../evidence/M02/voiceover-device-gate.md)
- [`../evidence/M04/summary.md`](../evidence/M04/summary.md)

## Tests to run next

### 1. Local and Simulator tests before Azure access

1. Boot Metro and Expo Go from the current commit and repeat the two actual Maestro flows on the pinned Simulator.
2. Run Creator and Business paths against the local API plus ephemeral PostgreSQL, selecting the API adapters instead of local-preview adapters where implemented.
3. Exercise cold start, restored session, logout purge, Creator/Business context switching, stale cache, API timeout, invalid response, offline, reconnect, foreground, and background behavior.
4. Repeat critical iPhone SE Accessibility Large and iPhone 17 Pro dark-mode routes after the M3/M4 changes to detect UI regressions since the retained M2 captures.
5. Confirm that no local preview can accidentally persist, publish, fund, upload, message, or contact an external provider.

### 2. Physical-iPhone and Apple tests that do not require Azure

1. Create an approved development build/signing path and install it on a trusted iPhone; Expo Go alone does not prove archive, entitlements, permissions, or release configuration.
2. Complete the exact Creator and Business VoiceOver traversal in the retained device-gate runbook.
3. Prove the `localmissions://auth/callback` system-browser/deep-link return, SecureStore persistence across process death, and logout/revocation purge on the device. The real Entra round trip remains a separate external-identity approval.
4. When M9 and M10 exist, test camera permission denied/accepted, QR focus and low light, foreground location, photo/video selection, memory pressure, interrupted uploads, Wi-Fi/cellular switching, and background/resume.

### 3. Current Azure execution gate

The dedicated subscription, three-resource retained-state bootstrap, and exact 20-resource retained control plane are live. Remote locking, exact inventory, scoped RBAC, budget/alerts, and a zero-change normal Terraform plan passed. The public repository now belongs to GitHub Free organization `local-missions-hq`; paid private-runner/VNet integration remains deferred to M14. The first post-transfer proof failed safely before ARM because the first subject preview used the wrong string format. An exact three-update correction saved plan is reviewed but unapplied. Provider-backed Terraform remains on the reviewed local operator path and the default-deny firewall remains unchanged. Verification established:

1. Exact subscription, tenant, East US 2 availability, provider registration, quota, policy, and resource naming.
2. Exact retained state backend and locking bootstrap, with separate state, control, and retained Local Missions workload landing-zone groups.
3. Three distinct GitHub-to-Entra plan/apply/destroy identities, immutable subjects, exact RBAC scopes, and protected environments.
4. PostgreSQL Entra administrator and the application/worker database-role bootstrap path; Azure RBAC alone does not create PostgreSQL database grants.
5. ACR image build/scan/sign/publish and immutable digest references; no runtime image is published today.
6. Key Vault population/rotation ownership; Terraform intentionally creates no secret values.
7. Real monitored budget/expiry alert delivery and the retained cleanup controller.
8. Current SKU/price/availability against the saved plan. The first future workload run is the `$2` two-hour smoke tier; `$5`/eight hours is a fallback only. The revised `$100` monthly budget is an alert threshold, not a spend target or hard cap.

The bootstrap, control-plane apply, no-apply OIDC proof, and free-organization creation authorizations have been consumed. The reviewed federation plan has not been applied and the repository has not been transferred. These actions do not authorize a paid GitHub feature, Storage firewall change, temporary-role removal, workload planning, registry push, application deployment, live tests, rollback, restore, or destroy. Every later external action remains separately reviewed and approved.

### 4. Tests only after a separately approved ephemeral deployment

The guarded cloud run requires smoke, integration, mobile/web E2E, authorization, upload, queue, webhook, backup/restore, reconciliation, dashboard, and environment-isolation gates. A critical failure must enter rollback; completion requires a reviewed destroy plan plus independent Terraform-state and live-Azure inventories proving the disposable workload is empty.

## Architecture artifact

- Current imagegen presentation render: [`local-missions-azure-reference-architecture-shared-safe-imagegen.png`](./local-missions-azure-reference-architecture-shared-safe-imagegen.png)
- Earlier presentation render: [`local-missions-azure-reference-architecture-imagegen.png`](./local-missions-azure-reference-architecture-imagegen.png)
- Editable vector: [`local-missions-azure-reference-architecture.svg`](./local-missions-azure-reference-architecture.svg)
- Exact-label reference PNG: [`local-missions-azure-reference-architecture.png`](./local-missions-azure-reference-architecture.png)
- Official icon provenance: [`azure-icons/README.md`](./azure-icons/README.md)

The presentation render was generated with the requested imagegen skill and visually checked at checkpoint 014. The SVG remains the authoritative exact-label/control copy and now shows the retained workload landing zone, 20-resource control target, lifecycle-separated custom workflow roles, three container-scoped state-backend assignments, 27-resource core, three-app delta, and 30-resource activated workload. The diagram is intentionally the M5 **development** topology. Stripe, APNs/notification delivery, social-provider Reach integrations, App Store/EAS, and the final production edge are external or later-milestone systems and are not misrepresented as current Azure resources.

## Principal-architect review callouts

1. **Dev-only edge:** Container Apps and PaaS public networking are temporarily enabled with narrow CIDR/default-deny controls. This is not a production mobile ingress design; private endpoints/VNet, private DNS, egress control, and a managed edge/WAF decision remain Phase C gates.
2. **Identity is intentionally split:** Customer OIDC, workload federation, workload UAMIs, application roles, and database roles are different authority planes. Token claims do not become product roles.
3. **Retained versus disposable ownership is explicit:** State, identity, DNS, budget, policy, cleanup controls, and the empty Local Missions workload landing zone survive same-day teardown. The disposable root reads that group but cannot create or delete it.
4. **No secret-bearing Terraform:** Key Vault receives references and RBAC only. Secrets, tokens, connection strings, plan files, and participant data must not enter source, Terraform state, logs, screenshots, or chat.
5. **Teardown requires two sources:** A zero Terraform state count is insufficient. Independent live-resource inventory must also be empty, while the retained inventory is reported separately.
6. **The retained control plane is not an application deployment:** The state bootstrap and 20-resource control plane are live, but the retained landing zone is empty. The 27-resource workload plan has not been produced, activation switches are false, and no application runtime has been deployed.
