# M01 local foundation evidence

Status: M1 gate passed locally  
Date: 2026-08-26  
Verified source commit: `6b45356319c81d1ca3e39f35751f887845afa57a`

## Implemented foundation

- pnpm workspace and Turborepo with eight projects: Expo mobile, Next dashboard, Nest/Fastify API, worker, contracts, config, database, and synthetic fixtures.
- Node 24.19.0 and pnpm 11.24.0 pins, shared TypeScript/ESLint/Prettier policy, pre-commit checks, Dependabot, pull-request checklist, and CI verification workflow.
- Local PostgreSQL 17 and Azurite Docker services with loopback-only ports and a same-day `local:destroy` path.
- Environment-name-only examples, restricted-file ignores, a local high-confidence secret scanner, and a repeatable Gitleaks command.
- Initial Drizzle audit-event schema, Zod environment/health contracts, synthetic `$575` campaign fixture, API health endpoint, and clean worker shutdown hooks.
- Generated-image-aligned Creator, Business, and restricted Venue Staff native prototype plus the restricted-workforce dashboard routes.
- Empty Terraform environment/module structure only; no state backend, subscription identifiers, Azure resources, or provider credentials.

## Verification performed

- External prerequisite inventory: `pnpm prerequisites:check` passed for 15 required records and four safety boundaries. Provisioning remains a later external gate.
- Full workspace: `pnpm verify` passed formatting, prerequisite validation, linting, strict type checks, all package tests, contract checks, Expo web export, Next production build, and API/worker/package builds.
- Unit/contract result: all eight workspaces passed; mobile passed 25 tests.
- Secret controls: `pnpm test:security` passed across 217 text files, and Gitleaks 8.30.1 scanned approximately 4.52 MB with no leaks found.
- Independent reload: API `tsx watch`, Next development HMR, and Expo Fast Refresh each served a temporary probe without a manual process restart, then returned to normal copy.
- Fresh checkout: an independent clone of commit `6b45356` began without `node_modules`, installed 761 packages from the frozen lockfile under Node 24.19.0/pnpm 11.24.0, and passed `verify`, both secret scans, and static Maestro source validation with zero Turbo cache hits on the complete workspace gate.
- Local services: PostgreSQL reached `healthy`; Azurite ran on loopback; both containers, volumes, and the Compose network were removed with `pnpm local:destroy` after the exercise.
- API runtime: `GET http://127.0.0.1:3001/health` returned `status: ok`, service/version, and the `local` environment. The temporary watch process was stopped and port 3001 closed.
- Dashboard runtime: development and production shells returned HTTP 200 with the expected no-live-systems markers; desktop and mobile screenshots were inspected.
- Mobile runtime: Expo Go rendered the live React Native prototype on installed iOS 26.5 Simulators. Creator and Business journeys, compact/large-text states, and native accessibility trees were exercised through Computer Use.
- Native shell screenshots: [`role-choice-iphone17pro.png`](./role-choice-iphone17pro.png), [`creator-profile-iphone17pro.png`](./creator-profile-iphone17pro.png), and [`business-setup-iphone17pro.png`](./business-setup-iphone17pro.png) are direct Simulator captures, not full-screen mockup images.

## Retained failures and fixes

- The first Gitleaks scan reported 10 generated Next `.next` findings. Every finding was inspected, the allowlist was restricted to ignored generated directories, and the clean rerun passed. See [`gitleaks.md`](./gitleaks.md).
- The first fresh-checkout attempt exposed a PNG declaration failure hidden by a warm Turbo cache. The ambient declaration was restored, the lint exception was narrowed to `.d.ts`, forced local lint/type checks passed, and the second independent clone passed from zero local Turbo cache hits. See [`clean-checkout.md`](./clean-checkout.md).

## M1 gate conclusion

The clean checkout reaches green `pnpm verify`, and both the native iPhone shell and responsive dashboard shell render. M1 is therefore complete. This is a local foundation gate only: it does not approve Azure provisioning, Stripe connectivity, identity-provider configuration, App Store/TestFlight distribution, live payments, real missions, or external messages.
