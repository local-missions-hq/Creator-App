# Inactive Azure CI contract

This directory contains documentation-only CI shapes. Files here are not GitHub Actions workflows and must remain outside `.github/workflows` while Azure execution is disabled.

`azure-workload-identity.workflow.yml.example` demonstrates job-scoped OIDC permission and distinct plan/apply/destroy environments. Every job is hard-disabled and intentionally contains no Azure login or Terraform command. The executable policy lives in `config/azure-oidc-plan-gate.v1.json` and is checked by `pnpm azure-oidc:check`.

The separate saved-plan producer-consumer, digest, sanitization, cost, approval, expiry, and retention rules live in `config/saved-plan-evidence.v1.json` and are checked by `pnpm saved-plan:check` using synthetic fixtures only.

The later apply/test/rollback/destroy/reconcile lifecycle and truthful clean-versus-escalated report live in `config/ephemeral-run-ledger.v1.json` and are checked by `pnpm run-ledger:check` using synthetic ledgers only.

The API, dashboard, and worker image-packaging boundary lives in `config/container-image-contract.v1.json` and is checked by `pnpm container:check`. That local gate builds production bundles and smokes them directly with the pinned Node runtime, but deliberately does not run Docker, pull a base image, contact a registry, scan/sign/push an image, or activate deployment CI. The future workflow must supply a reviewed digest-pinned Node 24.19.0 base and bind resulting image digests to the reviewed saved plan.

The consolidated local readiness boundary lives in `config/m5-local-preflight.v1.json` and is checked by `pnpm m5:preflight`. It cross-checks all six machine contracts, verifies that active CI is still read-only and non-deploying, and keeps every external image/Azure gate deferred. Passing it is not the M5 cloud gate.

Do not activate the template until the external subject-preview, identity, scope, environment-protection, action-pin, plan/cost, and explicit approval gates in `docs/operations/github-azure-oidc-plan-gate.md` all have evidence.
