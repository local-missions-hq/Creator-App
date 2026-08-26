# Local Maestro prototype flows

These flows target the iOS Simulator through Expo Go. They never call live identity, payment, location, messaging, or provider services; every terminal action is the app's local synthetic preview.

Prerequisites:

- Expo Go is installed on the selected Simulator.
- The mobile Metro server is running from `apps/mobile` on port `8081`.
- Maestro CLI is installed separately.

Run both flows from the repository root:

```sh
maestro test .maestro
```

The workspace defaults to `exp://127.0.0.1:8081`. Override it when Metro advertises another reachable address:

```sh
maestro test -e EXPO_URL=exp://192.168.0.63:8081 .maestro
```

The Creator flow covers discovery, terms, local application preview, accepted instructions, synthetic check-in, deliverables, bounded revision, and paid-state preview. The Business flow covers mission creation, deliverables/rights, the `$500` Creator Reward Pool, the `$575` Total Due, synthetic admin approval, and local-only Fund and Publish.

The flows select controls by React Native `testID`; visible text is used only for native alert buttons and terminal state assertions. The source-level mobile test requires every `Pressable` to keep both a stable `testID` and an accessibility label.
