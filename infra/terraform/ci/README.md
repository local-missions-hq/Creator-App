# Inactive Azure CI contract

This directory contains documentation-only CI shapes. Files here are not GitHub Actions workflows and must remain outside `.github/workflows` while Azure execution is disabled.

`azure-workload-identity.workflow.yml.example` demonstrates job-scoped OIDC permission and distinct plan/apply/destroy environments. Every job is hard-disabled and intentionally contains no Azure login or Terraform command. The executable policy lives in `config/azure-oidc-plan-gate.v1.json` and is checked by `pnpm azure-oidc:check`.

Do not activate the template until the external subject-preview, identity, scope, environment-protection, action-pin, plan/cost, and explicit approval gates in `docs/operations/github-azure-oidc-plan-gate.md` all have evidence.
