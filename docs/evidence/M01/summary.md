# M01 local foundation evidence

Status: Local scaffold verified; M1 release gate remains open  
Date: 2026-08-26  
Repository state: Local uncommitted working tree

## Implemented foundation

- pnpm workspace and Turborepo with eight projects: Expo mobile, Next dashboard, Nest/Fastify API, worker, contracts, config, database, and synthetic fixtures.
- Node 24.19.0 and pnpm 11.24.0 pins, shared TypeScript/ESLint/Prettier policy, pre-commit checks, Dependabot, pull-request checklist, and CI verification workflow.
- Local PostgreSQL 17 and Azurite Docker services with loopback-only ports and a same-day `local:destroy` path.
- Environment-name-only examples, restricted-file ignores, and a local high-confidence secret scanner.
- Initial Drizzle audit-event schema, Zod environment/health contracts, synthetic `$575` campaign fixture, API health endpoint, and clean worker shutdown hooks.
- Generated-image-aligned role choice, Creator/Business sign-in, Creator profile setup, and mobile Business setup screens in the shared Expo app, plus a restricted-workforce dashboard shell.
- Empty Terraform environment/module structure only; no state backend, subscription identifiers, Azure resources, or provider credentials.

## Verification performed

- Pinned toolchain: Node `24.19.0`, pnpm `11.24.0`.
- `pnpm peers check`: no peer dependency issues.
- `pnpm verify`: passed formatting, linting, strict type checks, all package tests, contract checks, Expo web export, Next production build, and API/worker/package builds.
- Unit/contract result: 12 tests passed across eight workspaces.
- `pnpm test:security`: passed the local high-confidence scan across 160 text files. This does not replace Gitleaks in release CI.
- ADR generator `--check`: verified 58 decision records plus the generated index with no architecture-register drift.
- Docker runtime: PostgreSQL reached `healthy`; Azurite ran on loopback; both containers, volumes, and the Compose network were removed with `pnpm local:destroy` after the exercise.
- API runtime: `GET http://127.0.0.1:3001/health` returned `status: ok`, service/version, and the `local` environment.
- Dashboard runtime: production server returned HTTP 200 and the expected no-live-systems markers.
- Mobile web runtime: Expo returned HTTP 200 and the live React Native UI was visually inspected through Computer Use in Safari Responsive Design Mode at the iPhone Pro preset (`402 × 874`, `3x`).
- Native iOS runtime: Xcode `26.6` (`17F113`) and the verified iOS `26.5` (`23F77`) simulator runtime were installed. Expo Go launched the live app on a booted iPhone 17 Pro, and role choice, both sign-in routes, Creator profile setup, and Business setup were navigated and visually inspected through Computer Use.
- Native screenshot evidence: [`role-choice-iphone17pro.png`](./role-choice-iphone17pro.png), [`creator-profile-iphone17pro.png`](./creator-profile-iphone17pro.png), and [`business-setup-iphone17pro.png`](./business-setup-iphone17pro.png) were captured directly from the simulator at `1206 × 2622` pixels. These use real React Native components, not full-screen mockup images.

## Visual comparison result

The native shell now carries the generated concept's core language: warm sand canvas, Midnight Navy headings, Orlando Lagoon Creator actions, Sunset Tangerine Business actions, centered two-color brand, large role cards, role-specific icons, Orlando hero photography, shared SSO treatment, progress indicators, verification cards, and visible local/test-money labeling. The role-choice and first setup screen for each role are implemented; the remaining mission workflow screens are not yet built.

## Why M1 is not marked passed

- Hot-reload behavior has not yet been demonstrated for mobile, dashboard, and API as three independent developer sessions.
- Gitleaks is not installed locally; only the repository's high-confidence fallback scan ran.
- The repository has no initial commit, so a separate fresh-clean-checkout install has not yet been proven.
- Apple, App Store Connect, Expo organization, Azure region/cost owner, Stripe test account, Entra External ID tenant plan, and domain/email placeholders remain external prerequisite records—not credentials to invent.

No Azure, Stripe, App Store Connect, Apple Developer account, external identity, notification, analytics, or real-payment action occurred. Apple actions were limited to installing Xcode, accepting its SDK license, and installing the local iOS Simulator runtime.
