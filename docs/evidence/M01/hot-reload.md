# M1 independent hot-reload evidence

Status: Passed  
Date: 2026-08-26

Each surface ran in its own development process. A temporary, unmistakable probe was applied to one source file per surface, observed without manually restarting that development process, and then removed. The restored values were observed again before verification continued.

## API

- Session: `pnpm --filter @local-missions/api dev`
- Watcher: `tsx watch src/main.ts`
- Probe: changed the synthetic health version from `0.1.0` to `0.1.0-hot-reload-probe`.
- Proof: the watcher logged `change in ./src/health.ts Restarting`, Nest started again, and `GET http://127.0.0.1:3001/health` returned the probe version.
- Restore proof: the same watcher restarted and the endpoint returned version `0.1.0`.

## Dashboard

- Session: `pnpm --filter @local-missions/dashboard dev`
- Runtime: Next.js development server on port 3000.
- Probe: changed the dashboard title to `M1 dashboard hot reload probe`.
- Proof: a fresh HTTP request returned that exact title while the original Next process remained running.
- Restore proof: the next request returned `Good morning, Avery.` from the same process.

## Mobile

- Session: `pnpm --filter @local-missions/mobile dev`
- Runtime: Expo/Metro on port 8081 with Expo Go on the iPhone SE iOS 26.5 Simulator.
- Probe: changed the visible Business dashboard title to `M1 mobile hot reload probe`.
- Proof: the Simulator accessibility tree exposed the exact probe text after Expo Fast Refresh. [`mobile-hot-reload-iphone-se.png`](./mobile-hot-reload-iphone-se.png) captures that native Simulator state.
- Restore proof: the same accessibility tree returned `Good morning, Demo Family Fun Center` after the source was restored.

No probe text remains in application source. The API proof process was stopped after the test; the pre-existing dashboard and Expo development sessions were left available for continued local visual work.
