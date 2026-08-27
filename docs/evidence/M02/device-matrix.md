# M2 iPhone device, appearance, text, and state matrix

Status: M2 display, semantic-state, accessibility-inspector, and actual Maestro gates passed; physical VoiceOver deferred to M16 by ADR-059
Date: 2026-08-26  
Scope: representative high-risk routes per combination; not every route repeated in every cell

## Completion rule

A device cell passes only when a live native route is inspected in that exact Simulator, appearance, and text-size combination; critical content and controls are present in the accessibility tree; no critical horizontal clipping or unreachable action is visible; and at least one screenshot or an existing retained route set records the result.

`Standard` below means the iOS `large` content-size category. `Accessibility Large` means `accessibility-large`.

## Twelve-cell display matrix

| Device                     | Appearance | Text size           | Status | Current representative evidence                                                                                                          |
| -------------------------- | ---------- | ------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone SE (3rd generation) | Light      | Standard            | Pass   | Role choice with every role/account/Venue action present in the native tree                                                              |
| iPhone SE (3rd generation) | Dark       | Standard            | Pass   | Business dashboard, metrics, actions, mission overview, checklist, and tabs                                                              |
| iPhone SE (3rd generation) | Light      | Accessibility Large | Pass   | Creator Discover, semantic states, Business dashboard/budget/review, account/support/payment/results/Venue routes                        |
| iPhone SE (3rd generation) | Dark       | Accessibility Large | Pass   | Creator lifecycle/account/payment, Business creation/review/results, Venue Staff, both role state sheets, and narrated terminal journeys |
| iPhone 17 Pro              | Light      | Standard            | Pass   | Complete Creator/Business/Venue prototype route set and employee-web companion evidence                                                  |
| iPhone 17 Pro              | Dark       | Standard            | Pass   | Creator Discover, Creator semantic states, and Business dashboard                                                                        |
| iPhone 17 Pro              | Light      | Accessibility Large | Pass   | Repaired role choice headline plus every role/account/Venue action in the native tree                                                    |
| iPhone 17 Pro              | Dark       | Accessibility Large | Pass   | Business sign-in title, all four provider previews, security explanation, and profile action                                             |
| iPhone 17 Pro Max          | Light      | Standard            | Pass   | Creator Discover, mission contract, and Business Review & publish with repaired accessibility order                                      |
| iPhone 17 Pro Max          | Dark       | Standard            | Pass   | Business sign-in with all provider/profile controls present and no horizontal clipping                                                   |
| iPhone 17 Pro Max          | Light      | Accessibility Large | Pass   | Business setup title, purpose, fields, verification states, and continuation control                                                     |
| iPhone 17 Pro Max          | Dark       | Accessibility Large | Pass   | Business sign-in title, all provider/profile controls, and vertically scrollable large-text content                                      |

## Semantic-state axis

| Role     | Success | Warning | Error | Pending | Locked | Empty | Loading | Offline | Native evidence                                                                 |
| -------- | ------- | ------- | ----- | ------- | ------ | ----- | ------- | ------- | ------------------------------------------------------------------------------- |
| Creator  | Pass    | Pass    | Pass  | Pass    | Pass   | Pass  | Pass    | Pass    | iPhone SE, Light and Dark, Accessibility Large; standard iPhone 17 Pro captures |
| Business | Pass    | Pass    | Pass  | Pass    | Pass   | Pass  | Pass    | Pass    | iPhone SE, Light and Dark, Accessibility Large; standard iPhone 17 Pro captures |

The state sheets were reviewed from top to bottom, not only at their initial scroll position. Error/offline retry and the Business locked explanation remain separate reachable controls and end in `No request was sent.`

## Matrix repair found during completion

The first iPhone 17 Pro Light/Accessibility Large run split `experiences` across lines in the welcome headline. The headline and supporting paragraph now use iOS word-aware line breaking with a bounded `1.6` font multiplier. The repaired native screen keeps `experiences` intact, remains vertically scrollable, and retains Creator, Business, existing-account, and Venue Staff actions in the accessibility tree.

New exact-cell captures:

- [`role-choice-iphonese-light-standard.png`](./screenshots/ios/role-choice-iphonese-light-standard.png)
- [`business-dashboard-iphonese-dark-standard.png`](./screenshots/ios/business-dashboard-iphonese-dark-standard.png)
- [`role-choice-iphone17pro-light-accessibility-large-fixed.png`](./screenshots/ios/role-choice-iphone17pro-light-accessibility-large-fixed.png)
- [`business-sign-in-iphone17pro-dark-accessibility-large.png`](./screenshots/ios/business-sign-in-iphone17pro-dark-accessibility-large.png)
- [`business-sign-in-iphone17promax-dark-standard.png`](./screenshots/ios/business-sign-in-iphone17promax-dark-standard.png)
- [`business-setup-iphone17promax-light-accessibility-large.png`](./screenshots/ios/business-setup-iphone17promax-light-accessibility-large.png)
- [`business-sign-in-iphone17promax-dark-accessibility-large.png`](./screenshots/ios/business-sign-in-iphone17promax-dark-accessibility-large.png)

## Separate accessibility/tooling gates

- Touch target: Pass for the current prototype through the shared 44 × 44 point wrapper and source regression test.
- Light/Dark ordinary-text contrast: Pass for the current semantic palette through automated contrast tests and representative visual inspection.
- Xcode Accessibility Inspector: Representative pass with all seven available checks enabled and empty warning outlines on the retained routes.
- Actual VoiceOver gesture/focus: Not yet performed; deferred to the mandatory M16 physical-iPhone gate by ADR-059 because iOS 26.5 Simulator does not expose VoiceOver.
- Actual Maestro execution: Pass; Maestro 2.9.0 ran the Creator and Business flows on the pinned iPhone 17 Pro Simulator, with retained JUnit, command, driver, and screenshot artifacts.

The 12-cell display matrix and actual Maestro execution are complete, so the local M2 gate passes under ADR-059. Actual VoiceOver remains a separate mandatory M16 gate; the native tree and Xcode Accessibility Inspector evidence must not be described as actual VoiceOver gesture/focus proof.
