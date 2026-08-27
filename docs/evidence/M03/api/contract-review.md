# M3 API contract review

Date: 2026-08-27

Checkpoints: `M03-api-foundation-011` and `M03-authenticated-domain-api-014`

## Reviewed production paths

- `GET /health` — deprecated compatibility response.
- `GET /health/live` — process-only liveness; deliberately independent of PostgreSQL.
- `GET /health/ready` — returns ready only after a bounded PostgreSQL query succeeds.
- `GET /build-info` — allowlisted service version, commit, and build time; no environment variables or secrets.
- `GET /openapi.json` — the contract generated from the running production module graph.
- `GET /v1` — discovery for currently implemented V1 resources.
- `GET /v1/mission-templates` — stable `(code, version)` keyset pagination with an opaque cursor and a 1–100 page-size bound.
- `GET /v1/me` — current database-backed role and Creator or Business workspace context.
- `GET /v1/creator/missions` and `GET /v1/creator/missions/{campaignPublicId}` — published Community capacity and objective mission contract details with no follower field.
- `POST /v1/creator/missions/{campaignPublicId}/applications` — current-locality-gated, idempotent Community Slot application.
- `GET /v1/business/campaigns` and `GET /v1/business/campaigns/{campaignPublicId}` — active-workspace-only campaign summaries and details.

The production contract intentionally does not claim that later check-in, submission, payment, Local Pass, notification, or provider HTTP resources are already implemented.

## Local-only path

`POST /v1/dev/token` exists only in `LocalAppModule`. It accepts visibly synthetic user and optional Business public IDs, creates a process-ephemeral 15-minute HMAC token, verifies its signature and bounded claims locally, calls no identity provider, and is documented only in `openapi.local.json`.

The deployed entrypoint imports `AppModule`, not `LocalAppModule`. `src/local-only/**` is excluded from `tsconfig.build.json`. Every production build starts from an empty `dist` directory and fails if compiled JavaScript, declarations, or source maps contain the local-only directory or any dev-token marker. The service also refuses construction unless `APP_ENV=local`.

## Shared conventions

- Request and correlation IDs accept only bounded safe characters; invalid caller values are replaced and both IDs are returned as headers and in errors.
- Errors use one bounded envelope with a stable code, safe message, request ID, correlation ID, and optional field paths/codes. Raw exceptions, SQL, hostnames, credentials, request bodies, and header values are not returned.
- Structured request logs contain only event, IDs, method, route template, status, duration, and optional stable error code. Query strings, bodies, tokens, user agents, destination addresses, and provider payloads are excluded.
- Cursor pagination is keyset-based rather than offset-based. Creator applications require the declared `idempotency-key`; the claim, slot reservation, application, history, audit, and retained response commit in one PostgreSQL transaction. OpenAPI also retains the optimistic `if-match-version` component for later contested edits.
- The generated `@local-missions/api-client` permits HTTPS plus loopback HTTP only. Both the iPhone app and dashboard import the same production-generated contract; local-token operations cannot appear in that client.

## Intentional review result

`openapi.json`, `openapi.local.json`, and `packages/api-client/src/generated/schema.ts` are deterministic artifacts regenerated from source. `contracts:check` reconstructs all three in memory and fails on any unreviewed drift. Production and local path sets differ only by `/v1/dev/token`.

## Deferred

This checkpoint does not activate Entra, Azure, Stripe, Blob Storage, Service Bus, external notifications, real user data, or live money. The production bearer implementation intentionally fails closed until Entra is configured in a later gate. Upload and webhook contracts, cloud tracing, and provider clients remain later milestones.
