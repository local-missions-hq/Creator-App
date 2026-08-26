# Local Missions Figma Phase 0

Date: 2026-08-23
Milestone context: M0 discovery supporting the future M2 clickable prototype
Figma file: https://www.figma.com/design/ahnZLBPtoxs6wmtEdSUEeR

## Source of truth

- Product workflow and safety rules: `plans.md`
- Color source: `docs/concepts/local-missions-color-system-final.svg`
- Existing visual references: `docs/concepts/*.png`
- Product type: native iPhone participant app, with business/admin web views handled separately

## Participant journey

### Flow A — Join and become eligible

1. Welcome
2. Sign in through the system browser
3. Adult eligibility and consent
4. Participant profile
5. Payout setup status

### Flow B — Discover and apply

1. Mission feed
2. Search and filter sheet
3. Mission details
4. Application confirmation with compensation, deadline, location, deliverables, disclosure, and rights summary
5. Application submitted
6. My Missions status view

### Flow C — Complete a mission

1. Accepted mission instructions
2. QR check-in
3. Manual check-in fallback
4. Deliverable checklist
5. Upload progress and retry
6. Submission confirmation
7. Revision request
8. Resubmission

### Flow D — Track payment

1. Funded
2. Pending review
3. Available
4. Paid
5. Failed payout or support path

The interface must not use the word “escrow.” Payment status uses funded, pending, available, paid, or refunded.

## First Figma build scope

### Pages

1. `00 — Cover`
2. `01 — Foundations`
3. `02 — User Flows`
4. `03 — Participant Screens`
5. `04 — Components`

### Priority screens

1. Welcome
2. Mission feed
3. Filter sheet
4. Mission details
5. Apply confirmation
6. Application submitted
7. My Missions
8. Mission instructions
9. QR check-in
10. Deliverable checklist
11. Upload progress
12. Submission pending review
13. Revision requested
14. Earnings
15. Profile and payout setup

### Required failure and accessibility variants

- Empty mission feed
- Offline cached feed marked stale
- Mission full
- Camera permission denied
- Expired or wrong-venue QR
- Upload interrupted
- Failed payout
- Large Dynamic Type reference for mission details and compensation

## Color tokens

| Token            | Value     | Intended use                              |
| ---------------- | --------- | ----------------------------------------- |
| Midnight Navy    | `#102A43` | Headings, trust, payment surfaces         |
| Orlando Lagoon   | `#007C83` | Navigation, links, selected controls      |
| Sunset Tangerine | `#CF3F1F` | Primary actions and compensation emphasis |
| Warm Sand        | `#FFF7ED` | App background                            |
| Palm Green       | `#137A50` | Success and paid states                   |
| Golden Hour      | `#D97706` | Pending and warning states                |
| Slate            | `#526273` | Secondary text                            |
| White            | `#FFFFFF` | Cards and text on dark fills              |
| Border Warm      | `#E5D8C8` | Dividers and card borders                 |

Verified contrast combinations from the local palette artifact:

- White on Midnight Navy: 14.64:1
- White on Orlando Lagoon: 4.99:1
- White on Sunset Tangerine: 4.79:1
- White on Palm Green: 5.35:1

## Foundation proposal

- Typography: Apple system/SF Pro, pending connected-file font verification
- Spacing: 4, 8, 12, 16, 20, 24, 32
- Radii: 12, 16, 24, full
- Touch target: 44 points minimum
- Status: always pair color with text and an icon
- Navigation: Discover, My Missions, Earnings, Profile
- Native surfaces: iOS status bar, tab bar, sheets, permission dialogs, and system-browser authentication

## Reusable component scope

- Primary and secondary button
- Mission card
- Compensation badge
- Status chip
- Bottom tab bar
- Filter chip and filter row
- Information/requirement row
- Checklist row
- Upload progress row
- Payment timeline row
- Empty, loading, offline, error, and locked-state panels

## Figma discovery

The target file was created as `Local Missions — iOS User Flows` and currently contains one blank page.

Available libraries include Apple `iOS and iPadOS 26`, Apple `iOS and iPadOS 27`, Simple Design System, and Material 3. For the first stable native baseline, use Apple iOS 26 components unless the product explicitly raises its minimum target to iOS 27.

Reusable iOS 26 assets found before the connection reached its call limit:

- Tab Bar — iPhone
- Status bar — iPhone
- Button — Liquid Glass — Text
- Button — Liquid Glass — Symbol
- Toolbar — Top — Sheet
- Sheets (Modals)
- Sidebar Search Field

## Gap analysis

### Exists in the repository but not yet in Figma

- Local Missions color tokens
- Semantic token aliases
- Typography and effect styles
- Local mission cards, status chips, checklist rows, upload rows, and payment timeline
- Participant screens and prototype connections

### Exists in Figma libraries but not in the repository

- Apple-native chrome and system controls
- Apple text, color, and material styles
- iOS 26 and iOS 27 component variants

### Conflicts and resolutions

- The repository has no implemented app or design-token code yet. The checked-in SVG palette is the temporary visual source of truth.
- iOS 27 assets are available, but the plan calls for a stable native baseline. Proposed resolution: use iOS 26 system components and keep product-specific content forward-compatible.
- The current milestone is M0. These designs are discovery/prototype preparation and do not mark M2 complete.

## Blocker and restart

The connected Figma Starter plan reached its MCP tool-call limit during library search. No app screens, variables, styles, or components were created on the canvas.

Restart after the Figma MCP limit resets or the connected plan is upgraded:

1. Inspect local variables, styles, components, and available SF Pro font styles.
2. Confirm iOS 26 as the native baseline.
3. Create primitive and semantic variables with explicit scopes and code syntax.
4. Create text/effect styles and the Foundations page.
5. Build reusable local components.
6. Compose the fifteen priority screens.
7. Add prototype navigation and capture screenshots for visual inspection.
