# Bootstrap retained-state recovery plan reviewer

Status: local reviewer ready; no Azure recovery plan has been generated

This reviewer independently checks the future saved plan that restores the paid Terraform-state Storage account after the owner-directed cost pause. It is a local parser: it does not invoke Terraform, Azure CLI, Azure APIs, or an apply action.

## Exact allowed result

The approved recovery plan may contain only:

- One no-op retained state resource group.
- One `Standard_LRS` Storage account create.
- One private `tfstate` container create.
- Two drift-delete observations for the same Storage account and container, proving they were intentionally removed during the cost pause.

It must contain zero planned updates, deletes, replacements, Container Apps, or disposable workload resources. The two drift observations are not planned destroys and do not authorize deletion.

## Required private artifacts

After separate approval to generate the plan, keep the following outside Git, each a regular non-symlink file with mode `0600`:

1. The saved-plan binary.
2. The `terraform show -json` rendering generated from that binary.
3. A sanitized review-context JSON binding the plan binary/JSON, exact bootstrap-state backup, source commit/digest, provider-lock digest, variable digest, current-IP digest, subscription-resolution digest, creation/expiry, and approval state.

The context never contains an account identifier, IP address, email address, secret, or Terraform-state value. The raw plan JSON remains private because Terraform may include sensitive operational values.

## Review commands

Local fixture/refusal validation:

```sh
node scripts/review-azure-retained-state-recovery-plan.mjs
```

Future private-artifact review, only after the distinct plan-generation approval:

```sh
node scripts/review-azure-retained-state-recovery-plan.mjs \
  --plan-file /private/absolute/path/bootstrap-recovery.tfplan \
  --plan-json /private/absolute/path/bootstrap-recovery.json \
  --context /private/absolute/path/bootstrap-recovery-context.json
```

The reviewer checks every artifact's digest and mode, the New York same-day/eight-hour expiry, the current repository commit/source/lock, exact recovery actions, expected external drift, private Storage safeguards, and non-authorization of apply, RBAC, state upload, or workload work. A passing review does not authorize any subsequent action.
