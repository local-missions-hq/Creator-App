# Local Maestro prototype flows

These flows target the iOS Simulator through Expo Go. They never call live identity, payment, location, messaging, or provider services; every terminal action is the app's local synthetic preview.

Prerequisites:

- Expo Go is installed on the selected Simulator.
- The mobile Metro server is running from `apps/mobile` on port `8081`.
- Java 17 or newer and Maestro CLI are installed. The verified local run used Homebrew `openjdk@17` and Maestro `2.9.0`.

Run both flows from the repository root:

```sh
JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home" \
  maestro test .maestro
```

The workspace defaults to `exp://127.0.0.1:8081`. Override it when Metro advertises another reachable address:

```sh
JAVA_HOME="$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home" \
  maestro test -e EXPO_URL=exp://192.168.0.63:8081 .maestro
```

Pin a particular booted Simulator with `--udid <simulator-udid>` when more than one device is running. Use `--test-output-dir`, `--debug-output`, and JUnit output options to retain evidence; the verified commands and results are recorded in [`docs/evidence/M02/maestro-runs.md`](../docs/evidence/M02/maestro-runs.md).

The Creator flow covers discovery, terms, local application preview, accepted instructions, synthetic check-in, deliverables, bounded revision, and paid-state preview. The Business flow covers mission creation, deliverables/rights, the `$500` Creator Reward Pool, the `$575` Total Due, synthetic admin approval, and local-only Fund and Publish.

The flows select controls and terminal states by React Native `testID`; visible text is used only for the native alert button. The source-level mobile test requires every `Pressable` to keep both a stable `testID` and an accessibility label.
