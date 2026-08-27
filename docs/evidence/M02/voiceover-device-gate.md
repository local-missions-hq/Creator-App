# Deferred physical-iPhone VoiceOver gate

Status: Deferred from M2 to M16 by ADR-059; mandatory before M16 closes or external TestFlight expansion begins

Date last checked: 2026-08-27

## Current target evidence

- `xcrun devicectl list devices` returned `No devices found`.
- `xcrun xctrace list devices` listed the Mac and installed Simulators, with no physical iPhone.
- The restarted iPhone 17 Pro Simulator on iOS 26.5 exposes Hover Text, Display & Text Size, Motion, and Spoken Content under Settings → Accessibility, but it does not expose VoiceOver.
- [`voiceover-unavailable-iphone17pro.png`](./screenshots/ios/voiceover-unavailable-iphone17pro.png) records the current Simulator Accessibility screen.

This gate cannot be closed by the native accessibility tree, Xcode Accessibility Inspector, Spoken Content, macOS VoiceOver around the Simulator window, or Maestro. It requires iOS VoiceOver focus and gestures on a compatible target.

## Target preparation

1. Connect and unlock a physical iPhone with a cable, accept the trust prompt, and confirm it appears in Xcode's Devices and Simulators window.
2. Install or open Expo Go on the iPhone. Keep the iPhone and development Mac on the same trusted local network.
3. Start the existing local Metro server from `apps/mobile`; do not connect identity, payment, location, messaging, or other provider services.
4. Open the local Local Missions prototype in Expo Go.
5. Enable Settings → Accessibility → VoiceOver on the iPhone. Use the device's Accessibility Shortcut if already configured.
6. Use synthetic prototype data only. Do not enter a real name, address, bank detail, provider credential, or precise location.

Record the iPhone model and iOS version, but do not retain its serial number, UDID, Apple Account, phone number, or notification content.

## Creator critical path

Use right and left swipes for sequential focus, one-finger double-tap to activate, three-finger swipes to scroll, and the rotor only where ordinary sequential navigation cannot reach an expected item.

1. Start at role choice and confirm focus announces the Local Missions purpose before the Creator action.
2. Enter Creator mode and confirm the sign-in choices, existing-profile action, and security explanation are understandable without visual context.
3. Open Discover and confirm each featured mission is one coherent focus target with reward, date/time, coarse distance, Community Slot treatment, and remaining capacity.
4. Open Family Adventure Preview and confirm the spoken order keeps reward, deadline, coarse locality, deliverables, expectations, rights/disclosure, terms checkbox, and Apply action together in that sequence.
5. Confirm Apply is announced as unavailable before accepting terms, the checkbox announces unchecked then checked, and Apply becomes available afterward.
6. Continue through accepted instructions, synthetic check-in, deliverables, one bounded revision, and Earnings. Confirm every screen has one discoverable back action and no decorative icon or avatar initial enters focus.
7. On Earnings, confirm the reward and progress are announced as `Funded`, `Pending review`, `Available`, then `Paid`; activate the local paid-state preview and confirm the changed state is announced.
8. Traverse all four Creator tabs in order and confirm the selected tab is announced.

## Business critical path

1. Start at role choice, enter Business mode, and confirm sign-in choices, existing-profile action, and disconnected-preview explanation are understandable without visual context.
2. Continue through setup and Dashboard. Confirm campaign metrics, checklist items, current mission, and Create mission are separate coherent targets.
3. In the creation wizard, confirm the step number/title precedes the current contract content and the back action is discoverable.
4. Confirm template selection, deliverables, content-use rights, and disclosure requirements announce selected/current state rather than color alone.
5. On Budget, confirm `Creator Reward Pool: 500 dollars`, `Platform fee: 75 dollars`, `Total Due: 575 dollars`, and `Not funded` are announced before Continue.
6. On Review & publish, confirm mission terms and money precede status/checklist/audit content. Submit the synthetic review, then confirm `Admin-approved demo, ready to fund` before the Fund and Publish action becomes available.
7. Activate Fund and Publish and confirm the published terminal state and disabled completed action are announced. Confirm the footer states that no real mission, approval, payment intent, charge, or publication was created.
8. Traverse all four Business tabs in order and confirm the selected tab is announced.

## Pass criteria

Both paths pass only when:

- every critical fact and action is reachable by ordinary VoiceOver navigation;
- focus order matches the visible task order and never becomes trapped or jumps behind a modal/sheet;
- every control announces an understandable name, role, value/state, and disabled/selected/checked status where applicable;
- dynamic state changes are announced or become the next predictable focus target;
- decorative images, icon glyphs, and avatar initials remain silent;
- money, locality, rights, disclosure, deadline, and payment-state labels are not detached from their values;
- dismissal/back controls are reachable, and modal focus returns predictably;
- no critical action depends only on color, placement, or sighted interpretation;
- both paths complete without entering real personal data or contacting an external service.

## Evidence required to close the deferred M16 gate

- A dated test note containing only the iPhone model, iOS version, app/Expo version, tester role, and pass/fail result for each numbered step.
- A screen recording or focused screenshots showing representative Creator consent/application, Creator Paid, Business budget, and Business published states. Review captures before committing them so no notifications, account details, identifiers, or other personal information are visible.
- A defect-and-retest note for every failed step, including the repaired file and the successful rerun.
- A fresh `pnpm verify`, `pnpm test:security`, `pnpm test:gitleaks`, and both Maestro Simulator runs after any repair.

ADR-059 allows M3 development to begin without this physical-device evidence. The gate is not optional: all evidence above must pass before M16 closes or the app expands from internal to external TestFlight testing. Any defect found during the physical run must be repaired, reverified, and reflected in the affected milestone evidence.
