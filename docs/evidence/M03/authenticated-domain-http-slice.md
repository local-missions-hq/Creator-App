# M03 authenticated Creator and Business HTTP slice

Date: 2026-08-27  
Checkpoint: `M03-authenticated-domain-api-014`
Implementation commit: `1080db0`

## Outcome

The first authenticated domain vertical slice runs completely on the local Mac with loopback PostgreSQL. It does not require a physical phone, cloud infrastructure, a payment provider, or a live identity-provider account.

The production module exposes a small `BearerVerifier` interface and a fail-closed implementation. The synthetic HMAC signer/verifier exists only under the excluded local-only source tree and refuses non-local environments. A structurally valid bearer cannot enter a Creator or Business route unless its asserted user, selected role, active membership, and Business public ID resolve against current PostgreSQL state.

## Implemented HTTP surface

- `GET /v1/me` returns one current Creator or Business mode context.
- `GET /v1/creator/missions` lists published campaigns with available Community capacity using stable keyset pagination.
- `GET /v1/creator/missions/{campaignPublicId}` returns coarse venue data, the plain-language brief, checklist, objective requirements, reward, and capacity without a follower field or private locality data.
- `POST /v1/creator/missions/{campaignPublicId}/applications` requires a bounded idempotency key and current approved/verified/unexpired locality. The application, first available Community Slot reservation, histories, audit event, and replay response share one PostgreSQL transaction.
- `GET /v1/business/campaigns` and `GET /v1/business/campaigns/{campaignPublicId}` return only campaigns belonging to the active owner/manager workspace. Another tenant's public ID is concealed as not found.

## Mobile boundary

`apps/mobile/lib/mission-data.ts` has explicit `local-preview` and `api` modes. Local preview is the development default and never performs an API call. API mode refuses to start without an authenticated session token and never silently substitutes preview data after an authorization or network failure. The existing Creator Discover, Creator Mission Details, and Business Dashboard layouts consume this adapter while preserving their generated-image card structure, colors, wording hierarchy, and test IDs.

## Proof retained

Five dedicated integration tests prove:

- missing deployed authentication returns 401 and the unconfigured deployed verifier returns a safe 503;
- a locally signed Creator token resolves the current approved/locality state;
- a Business owner token resolves only its current active workspace;
- an invented tenant, cross-role request, and cross-tenant campaign read are denied;
- Creator feed/detail and two-page Business cursor reads return bounded contract data;
- expired locality cannot apply;
- the same key and body replay the exact 201 response while one application exists;
- the same key with changed input returns 409;
- allowlisted request logs do not retain the bearer token.

The complete repository evidence is 74 database tests plus 12 API integration tests, 30 mobile tests, a green nine-workspace `pnpm verify`, deterministic OpenAPI/client reconstruction, a clean production local-marker scan, 69-table seed check, 357-file security scan, and a leak-free approximately 10.59 MB Gitleaks run.

## Safety boundary

No Entra, Microsoft Graph, Stripe, Azure, external verifier, SMS/email, notification, payment, phone, customer identity, or real location call occurred. The only `entra-bearer` reference is the reviewed OpenAPI security-scheme name. Production identity verification remains intentionally unavailable and fail-closed until its separately gated milestone.
