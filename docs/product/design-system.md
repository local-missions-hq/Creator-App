# Local Missions semantic design system

Status: M2 prototype checkpoint  
Scope: Shared Creator, Business, Venue Staff, and employee-console visual language

## Foundations

### Color roles

| Token            | Light     | Dark      | Role                                               |
| ---------------- | --------- | --------- | -------------------------------------------------- |
| Canvas           | `#FFFAF3` | `#0B1724` | Warm neutral or deep navy app background           |
| Card             | `#FFFFFF` | `#142638` | Elevated content surface                           |
| Primary ink      | `#102A43` | `#F5F8FB` | Primary text, strong controls, employee navigation |
| Muted Slate      | `#526273` | `#B7C6D3` | Supporting text and inactive icons                 |
| Sand Line        | `#E5D8C8` | `#355066` | Borders and separators                             |
| Orlando Lagoon   | `#007C83` | `#50D1CF` | Creator actions and primary navigation             |
| Lagoon Soft      | `#E8F5F3` | `#15383D` | Creator/pending information background             |
| Sunset Tangerine | `#CF3F1F` | `#FF8A65` | Business actions and important highlights          |
| Tangerine Soft   | `#FFF0E3` | `#3A241D` | Warning and Business information background        |
| Success Green    | `#116B49` | `#70D6A7` | Completed and safe outcomes                        |
| Success Soft     | `#E9F7EF` | `#18372C` | Success background                                 |
| Warning Brown    | `#805238` | `#FFC28D` | Time-sensitive warning text and icons              |
| Warning Soft     | `#FFF0E3` | `#3A281E` | Warning background                                 |
| Error Red        | `#922F2A` | `#FFAAA5` | Failure text and icons                             |
| Error Soft       | `#FDECEA` | `#3B2022` | Failure background                                 |
| Locked Slate     | `#465F72` | `#B8C8D5` | Disabled-by-policy or unavailable state            |
| Locked Soft      | `#EDF1F4` | `#243443` | Locked and neutral state background                |

Creator and Business accents communicate role context, not success or failure. Semantic status always includes a text label and icon; color is never the only signal.

The iOS app follows the system appearance automatically through `DynamicColorIOS`; web and unsupported platforms use the light palette for now. Automated ordinary-text checks cover primary, muted, role-accent, and semantic foreground/background pairs in both modes. The lowest measured pair is Sunset Tangerine on a light Card at `4.79:1`, above the WCAG AA `4.5:1` threshold. This token check is evidence for color contrast only; it does not close the broader touch-target, VoiceOver, or Dynamic Type audit.

### Typography

- Screen title: 32–34 pt, 800–900 weight, compact line height.
- Section title: 19–22 pt, 800–900 weight.
- Card title: 13–18 pt, 800–900 weight.
- Body: 10–15 pt in the current standard-text prototype, with 1.4–1.55 line height.
- Eyebrow/status label: 8–10 pt, 900 weight, uppercase, increased letter spacing.
- Money and critical deadlines use the primary text color, strong weight, and a plain-language label.

Dynamic Type verification remains a separate M2 gate. Essential compensation, deadlines, requirements, and actions must wrap rather than truncate when that gate is run. Shared decorative chrome—brand labels, role labels, tab labels, state eyebrows, and preview-only microcopy—keeps font scaling enabled with a bounded multiplier so compact navigation remains operable. Primary content continues to wrap and scroll.

### Spacing, shape, and elevation

- Base spacing rhythm: 4, 8, 12, 16, 20, 24, and 32 pt.
- Standard page inset: 18–20 pt.
- Compact controls: minimum 44 × 44 pt touch target. Every React Native pressable receives this through the shared `AccessiblePressable` component and `minimumTouchTarget` token; a source-level regression test rejects direct `Pressable` imports outside that wrapper.
- Cards: 16–24 pt radius; sheets: 28 pt top radius; badges: pill or 12–15 pt radius.
- Borders: 1 pt Sand Line. Stronger grouping uses filled semantic backgrounds.
- Shadows are reserved for primary cards and floating sheets; borders carry ordinary hierarchy.

### Icons

- Ionicons outline icons are the default; filled icons indicate a completed/selected state. All current icons route through `DecorativeIcon`, which hides them from the accessibility reading order on iOS and Android.
- Icons accompany, but never replace, the visible state label or action text. A future icon that carries meaning without adjacent text must use a separately reviewed accessible-icon component with an explicit label rather than bypassing the decorative wrapper.
- Creator navigation uses Orlando Lagoon; Business navigation uses Sunset Tangerine; Venue Staff uses a restricted Lagoon treatment.

## Semantic state contract

| State   | Meaning                                     | Required content                                       | Allowed action              |
| ------- | ------------------------------------------- | ------------------------------------------------------ | --------------------------- |
| Success | Work completed or current data confirmed    | What succeeded and resulting state                     | Continue/view details       |
| Warning | Time-sensitive or risk-adjacent condition   | Specific issue and deadline/impact                     | Review now                  |
| Error   | Recoverable operation failed                | Nothing changed, retained input, reason when safe      | Retry or support            |
| Pending | Valid work awaits another actor/event       | Who/what is pending and whether action is needed       | View timeline               |
| Locked  | Policy or safety gate prevents a new action | Why unavailable and what obligations remain protected  | View reason/support         |
| Empty   | Valid query/list has no entries             | Why empty and a useful next step                       | Adjust/create               |
| Loading | Data is being obtained                      | Named content being loaded; do not blank the whole app | Cancel only when meaningful |
| Offline | Network unavailable or cached data shown    | Freshness boundary and blocked mutations               | Retry when online           |

The reusable mobile implementation is `SemanticStateCard`. Creator and Business state-preview sheets exercise all eight states locally. Retry and explanation controls in the prototype terminate locally and make no provider or network request.

## Safety language

- Never label the payment flow as escrow. Use Funded, Pending review, Available, Paid, or Refunded.
- A locked funding state must say that approved creator rewards and owed refunds remain obligations.
- Offline state must distinguish saved/read-only data from blocked mutations.
- Error state must state whether input or work was preserved.
- Empty state must never imply that low follower count caused exclusion from Community opportunities.
- Location status exposes only approved coarse locality language, never a street address, exact ZIP, or raw proof.
