# Local Missions

Local Missions is an iPhone-first local creator marketplace. Approved Orlando businesses fund objective missions; qualified local adults complete them for guaranteed cash rewards and optional in-kind experiences. The shared app supports Creator, Business, and restricted Venue Staff modes, while sensitive platform operations remain in a protected web console.

This repository is in local foundation development. It contains no production deployment, live Stripe configuration, real payment flow, or App Store submission.

## Repository map

- `apps/mobile` — Expo Router iPhone app shell
- `apps/dashboard` — Next.js admin/support shell
- `apps/api` — NestJS/Fastify modular-monolith API
- `apps/worker` — background worker entry point
- `packages/contracts` — shared runtime contracts
- `packages/config` — environment validation
- `packages/db` — Drizzle schema foundation
- `packages/test-fixtures` — synthetic-only fixtures
- `infra/terraform` — intentionally non-deployed environment/module structure
- `docs` — product, architecture, decisions, evidence, design, and business-plan artifacts

## Local prerequisites

- Node.js 24.19.0 LTS (see `.nvmrc`)
- pnpm 11.24.0
- Docker Desktop for PostgreSQL and Azurite

## Start locally

```bash
pnpm install
pnpm local:up
pnpm dev
```

The initial endpoints are:

- Dashboard: `http://localhost:3000`
- API health: `http://localhost:3001/health`
- Expo: terminal-provided local URL

Stop and remove local containers and their synthetic data with:

```bash
pnpm local:destroy
```

## Quality gate

```bash
pnpm verify
```

The regular gate checks formatting, linting, types, unit/contract behavior, and production builds. Simulator, browser, integration, security-tool, and cloud evidence remain separate milestone checks.

Read [architecture.md](architecture.md), [plans.md](plans.md), and the [ADR index](docs/decisions/README.md) before changing product behavior. A material change to the frozen V1 baseline requires a superseding ADR.
