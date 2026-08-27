# M2 Maestro iPhone Simulator runs

Status: Pass
Date: 2026-08-26
Device: iPhone 17 Pro Simulator, iOS 26.5
Simulator UDID: `7DB5E9FA-974D-40C6-BAF6-8F0F328FEC6B`
Runtime: Homebrew OpenJDK 17.0.20.1 and Maestro 2.9.0

## Result

| Journey                             | Scope                                                                                                                                            | Result | JUnit duration | Evidence                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------: | -------------------------------------------------------- |
| Creator funded mission prototype    | Discover, contract consent, application, accepted instructions, synthetic check-in, deliverables, bounded revision, and Paid                     | Pass   |       27.036 s | [`creator/results.xml`](./maestro/creator/results.xml)   |
| Business fund and publish prototype | Mission brief, rights, `$500` Creator Reward Pool, `$575` Total Due, synthetic approval, explicit Fund and Publish, and published terminal state | Pass   |       23.724 s | [`business/results.xml`](./maestro/business/results.xml) |

Both runs were pinned to the exact Simulator UDID while the other configured Simulators remained booted. Expo Go opened Metro at `exp://192.168.0.63:8081`. No identity provider, payment processor, location provider, message service, mission API, approval service, or Creator-facing publication was contacted.

## Retained artifacts

- [`Creator JUnit result`](./maestro/creator/results.xml), command manifest, Maestro logs, iOS driver logs, and XCUITest runner log.
- [`Business JUnit result`](./maestro/business/results.xml), command manifest, Maestro logs, iOS driver logs, and XCUITest runner log.
- [`Creator Paid terminal screenshot`](./maestro/screenshots/creator-paid.png).
- [`Business published terminal screenshot`](./maestro/screenshots/business-published.png).

Large Simulator system logs and unsuccessful development-attempt folders were moved to macOS Trash after the passing evidence was isolated. The retained artifacts contain the successful command timeline and device/test result without adding tens of megabytes of unrelated Simulator noise to the repository.

## Repairs proven by the real runs

- Terms selection is verified through the resulting enabled Apply action because iOS exposes the native checkbox as checked while Maestro 2.9.0 reports its generic `checked` selector inconsistently.
- Bottom-of-scroll revision and review actions require 100 percent visibility before tapping; this prevents taps from landing under the Simulator's lower boundary.
- Creator Paid, Business approved, and Business published terminal states now expose stable state-specific test IDs. Assertions no longer depend on matching one word inside a longer accessibility sentence.

## Reproduction pattern

```sh
JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home" \
  maestro test \
  --udid 7DB5E9FA-974D-40C6-BAF6-8F0F328FEC6B \
  -e EXPO_URL=exp://192.168.0.63:8081 \
  .maestro/creator-flow.yaml
```

Run the Business journey by replacing the final flow path with `.maestro/business-flow.yaml`. Use a current Metro URL and Simulator UDID when the local environment changes.
