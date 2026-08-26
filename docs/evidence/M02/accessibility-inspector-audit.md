# Xcode Accessibility Inspector checkpoint

Date: 2026-08-26

Target: Expo Go on `Local Missions iPhone SE`, iOS 26.5, Light and Dark appearances, `accessibility-large` content size.

## Audit configuration

Xcode Accessibility Inspector targeted the running Expo Go process. Every available audit option was enabled:

- Element Description
- Contrast
- Hit Region
- Element Detection
- Clipped Text
- Traits
- Dynamic Type

## Audited routes and results

Light appearance:

- Venue Staff — Confirm arrival
- Business — Campaign results
- Creator — Account deletion
- Business — Complete semantic state sheet after grouped alert/progress announcements

Dark appearance:

- Venue Staff — Confirm arrival
- Business — Campaign results
- Creator — Payout setup, rerun after the provider-wordmark repair
- Business — Submission review after the objective-approval and dark-success contrast repairs
- Creator — Earnings after the balance-card, expanded timeline, and spoken-payment-state repairs

Each audit completed with an empty warning outline. This is a representative automated checkpoint, not a claim that every off-screen state or route has passed a complete accessibility audit.

## Native findings repaired during this checkpoint

- All 197 current Ionicons now route through one decorative-icon wrapper that removes them from the accessibility reading order. Four avatar initials are also hidden as decorative text.
- Business capacity and results switch to expanded layouts on narrow devices or enlarged text.
- Results metrics, reward/campaign totals, Local Pass attribution, efficiency, and payment states are announced as complete label/value phrases.
- Creator locality dates, payout status, consent versions, and Business submission timeline events are announced as complete phrases.
- The shared Creator header moves its status badge to a separate row at accessibility sizes so titles such as `Payout setup` wrap by words instead of clipping or collapsing.
- The small `STRIPE` provider wordmark uses a bounded font multiplier so it remains inside its visual mark in Dark appearance at Accessibility Large.
- The shared Creator and Business wizard headers move long titles onto full-width rows at accessibility sizes, preventing mid-word breaks in `Mission instructions` and `Deliverables & rights`.
- Creator accepted-mission, deliverable, revision, and earnings states now stack on compact large-text layouts and announce complete progress, file, reward, and timeline phrases.
- Dark check-in/media previews use a stable navy surface instead of the adaptive text token, and completed Business actions use a dark green that preserves white-label contrast.
- Semantic success, warning, error, pending, locked, empty, loading, and offline cards now expose each state, consequence, and safety boundary as one alert/progress phrase while retaining separate recovery or explanation controls.

## VoiceOver limitation

The iOS 26.5 Simulator Accessibility settings did not expose VoiceOver, and Settings search returned `No Results for “VoiceOver”`. Accessibility Inspector audit output and the native accessibility tree are retained as partial evidence only. Actual VoiceOver gesture/focus testing remains open for a physical iPhone or another environment that exposes VoiceOver.
