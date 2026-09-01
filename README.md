# Local Missions

Local Missions is an iPhone-first local creator marketplace. Approved Orlando businesses fund objective missions; qualified local adults complete them for guaranteed cash rewards and optional in-kind experiences. The shared app supports Creator, Business, and restricted Venue Staff modes, while sensitive platform operations remain in a protected web console.

This repository is in development. Azure has no application workload and no standing metered compute, database, registry, queue, telemetry, Key Vault, or Storage resources. The retained Terraform-state Storage account was intentionally removed for the current cost pause after the latest bootstrap and control-plane states were validated and backed up privately outside the repository. The remaining free control boundary must be reconciled through the separately gated [retained-state recovery runbook](docs/operations/azure-retained-state-recovery.md) before any further Terraform plan or apply. The project has no live Stripe configuration, real payment flow, or App Store submission.

## Repository map

- `apps/mobile` — Expo Router iPhone app shell
- `apps/dashboard` — Next.js admin/support shell
- `apps/api` — NestJS/Fastify modular-monolith API
- `apps/worker` — background worker entry point
- `packages/contracts` — shared runtime contracts
- `packages/config` — environment validation
- `packages/db` — Drizzle schema foundation
- `packages/test-fixtures` — synthetic-only fixtures
- `infra/terraform` — retained-state bootstrap plus separately gated control-plane and disposable-workload roots
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
- API liveness: `http://localhost:4000/health/live`
- API readiness: `http://localhost:4000/health/ready`
- API contract: `http://localhost:4000/openapi.json`
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
