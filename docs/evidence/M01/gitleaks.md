# M1 Gitleaks evidence

Status: Passed after generated-output allowlist correction  
Date: 2026-08-26  
Gitleaks version: 8.30.1

## Initial run and retained failure

Command:

```sh
gitleaks dir . --redact --no-banner --report-format json --report-path /tmp/local-missions-gitleaks-report.json
```

The first scan reported 10 `generic-api-key` findings. Inspection of every finding showed that all 10 were generated Next.js files below `apps/dashboard/.next/`; none were repository source, fixture, environment example, documentation, or configuration files.

## Resolution

`.gitleaks.toml` extends the default rule set and ignores only generated directories that are also excluded by `.gitignore`: `node_modules`, `.pnpm-store`, `.turbo`, `.next`, `.expo`, `dist`, and `coverage`. It does not suppress a detector or allowlist source paths.

The root `test:gitleaks` script provides a repeatable redacted scan:

```sh
pnpm test:gitleaks
```

## Clean rerun

The corrected scan inspected approximately 4.52 MB in 373 ms and returned `no leaks found`. A second JSON report contained an empty array. Report files remained in `/tmp` and were not added to the repository because a failed secret report can itself contain sensitive context.

This evidence proves the current working tree passed Gitleaks. It does not authorize adding provider credentials to the repository.
