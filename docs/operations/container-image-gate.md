# Container image gate

This gate prepares the API, dashboard, and worker for future immutable Linux images without contacting a registry or building, publishing, signing, or deploying an image. It validates production bundles and runs them directly with the pinned local Node runtime. Passing it is not container, vulnerability-scan, registry, CI-publish, or Azure evidence.

## Local command

```sh
pnpm container:check
```

The command builds all workspaces, creates temporary production-only API and worker bundles with offline pnpm deployment, assembles the Next.js standalone dashboard bundle, and verifies:

- the API starts in development mode, answers `/health/live`, and reports the synthetic build provenance;
- the dashboard standalone server renders `/` locally;
- the worker stays alive until `SIGTERM` and then exits cleanly;
- application bundles exclude source, tests, local-only auth code, environment files, and development dependencies;
- every Dockerfile requires an externally supplied Node 24.19.0 image pinned by digest, validates full commit/time/version provenance, uses the frozen pnpm 11.24.0 lock, copies only the required workspace source, and runs as numeric user/group `10001:10001`; and
- Docker context exclusions cover Git metadata, dependencies, generated output, environment files, signing material, Terraform artifacts, documentation, and infrastructure.

Temporary bundles are removed after verification. The command may use only the already installed workspace dependencies and pnpm content-addressable store; deployment uses `--offline` and does not pull a base image or contact a package or container registry.

## Future external gate

Before any image build or push, separately review an official Node 24.19.0 Linux base digest and provenance, registry target/authentication, immutable commit tag, resulting image digest, vulnerability findings, keyless signature/provenance, and saved-plan binding. The future workflow must consume the exact reviewed digests. It may not pass secrets as build arguments or publish from the active non-deploying verification workflow.
