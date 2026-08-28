# Reach UI preview checkpoint

Status: passed  
Date: 2026-08-27  
Implementation commit: `902b130`

## Visible Creator flow

Creator Account now includes a dedicated **Reach analytics** row. The Reach screen uses the approved Warm Sand, Midnight Navy, Orlando Lagoon, and Sunset Tangerine system and makes the inclusive promise the first card: Community missions remain available without a follower minimum or social connection.

Instagram, TikTok, and YouTube are separate selectable cards. Selecting one updates an illustrative `Level 2 · Current for 90 days` state, the `5,000–19,999` local-audience band, and the exact tier-only phrase a Business would see. The three-step explanation separates consent, approved-provider verification, and the Creator's choice to accept a higher-paid offer. The consent control is reversible and explicitly says that no connection was created.

The preview does not imply a live integration: the footer states that no provider is enabled and no social account is contacted. Revocation affects future Reach offers only and cannot remove Community access or lower an accepted reward.

## Visible Business flow

The existing Budget & funding screen now begins with a plain-language campaign-mix decision:

- `10 Community`: ten creators at `$50`, `$500` Creator Reward Pool, `$75` fee, and `$575` Total Due.
- `8 Community + 2 Reach`: eight Community creators at `$50` plus two Level 2 Instagram creators at `$100` each (`$50 base + $50 bonus`), `$600` Creator Reward Pool, `$90` fee, and `$690` Total Due.

The selected card and funding breakdown update immediately. The screen calls Reach a fixed higher-paid add-on rather than a follower minimum, states that at least 80% of the campaign remains Community, and labels the selection as an unsaved local what-if preview. Funding remains `NOT FUNDED`, and the existing explicit Fund and Publish boundary is unchanged.

## Verification

- Mobile type checking, lint, Expo web export, and all 32 mobile tests passed. Two new tests lock the `$575` Community and `$690` mixed campaign calculations in integer minor units.
- The complete `pnpm verify` workspace gate passed, including formatting, prerequisite policy, lint, strict types, unit tests, contract drift, production-build marker scan, and all nine builds.
- The security scan passed 378 text files, and Gitleaks found no leak in approximately 12.36 MB.
- Controlled browser captures loaded both routes at `393 × 852` and `1024 × 900` with HTTP 200, no console errors, and no failed requests.
- Interactive browser snapshots confirmed TikTok selection, optional consent state/reversal, the mixed Business selection, `$400 + $200 = $600`, the `$90` fee, `$690` Total Due, stable accessibility labels, and no horizontal overflow.

## Evidence

- [Creator Reach setup — mobile](./screenshots/web/creator-reach-mobile.png)
- [Creator TikTok consent preview — mobile](./screenshots/web/creator-reach-consent-mobile.png)
- [Creator Reach setup — desktop](./screenshots/web/creator-reach-desktop.png)
- [Business campaign mix — mobile](./screenshots/web/business-reach-budget-mobile.png)
- [Business mixed Reach budget — mobile](./screenshots/web/business-reach-budget-mixed-mobile.png)
- [Business campaign mix — desktop](./screenshots/web/business-reach-budget-desktop.png)

The four default capture reports are stored beside the screenshots and retain final URL, HTTP status, console-error, failed-request, and performance inspection data.

## Boundary and next work

This is a local clickable preview. It does not connect a social account, save consent, activate a provider, alter a campaign, fund a mission, charge a payment method, call Stripe, deploy Azure, or require a physical phone. The next implementation step is to expose the completed Reach domain through authenticated `/v1` routes and replace local screen state with the generated client while keeping all provider capabilities disabled until the separate external review gate passes.
