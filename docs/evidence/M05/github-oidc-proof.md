# GitHub OIDC no-apply proof evidence

Status: passed; three protected environment jobs completed without mutation
Date: 2026-09-01
Checkpoint: `M05-github-oidc-arm-proof-passed-024`

## Approved boundary

- Manual `workflow_dispatch` from `main` only.
- GitHub-hosted runner only.
- Three matrix jobs bound to the plan, apply, and destroy environments.
- Job-scoped `contents: read` and `id-token: write`; no other write permission.
- `azure/login` v3.0.2 pinned to full commit `7ddb5af1ef8758cf1353cf3b42f940aee27ba21c` from the official Azure action repository.
- Exactly three non-secret Azure identifier variables in each protected environment. No client secret, credentials JSON, repository secret, or identifier in source/evidence.
- Zero Terraform commands and zero Azure resource, identity, RBAC, network, state, or workload mutation commands.

## Proof assertions

Each environment-approved job must:

1. exchange its immutable GitHub environment subject for an Azure token;
2. confirm the expected enabled subscription without printing identifiers;
3. acquire management and Storage audience tokens;
4. read the exact retained workload landing zone and required tags;
5. fail to read the retained control-plane resource group;
6. inspect effective landing-zone ARM permissions and exact state-container Blob data actions;
7. prove the plan identity has read-only ARM permissions, the apply identity excludes delete, and the destroy identity excludes landing-zone group deletion; and
8. confirm an actual state Blob read remains blocked by the default-deny firewall.

The last assertion is a security result, not proof of end-to-end remote-state access. A real Blob read from a GitHub-hosted runner requires separately approved temporary network access followed by removal and reconciliation.

## Result

The owner approved all three protected environments in GitHub with the comment: “Approved only for the no-apply OIDC/ARM identity and permission proof on commit 73ef5bd. No Terraform, deployment, provider registration, or Azure resource mutation.” GitHub run [33513053687](https://github.com/stratiosai/Creator-App/actions/runs/33513053687) completed successfully on full commit `73ef5bd5e3251a95347aeb7449d4365745e4c5c4`:

- plan identity proof: success in 16 seconds;
- apply identity proof: success in 18 seconds; and
- destroy identity proof: success in 21 seconds.

Every job passed token exchange, exact-scope/effective-permission assertions, and explicit Azure CLI logout. The proof therefore establishes live immutable-subject federation, the expected enabled subscription, management and Storage audience token acquisition, exact retained landing-zone visibility, retained-control-group denial, the intended operation-specific ARM limits, and container-scoped Blob data actions.

The expected state Blob read failed from each GitHub-hosted runner because the Storage firewall remains default-deny. This proves the network control remained closed; it does not prove end-to-end remote-state connectivity. A sanitized post-run inventory still showed exactly the three retained Local Missions resource groups, an empty workload landing zone, four tagged control/state resources, and four container-scoped `Storage Blob Data Contributor` assignments: the three workflow identities plus the temporary operator recovery assignment.

## Next gate

The local state-network review is recorded at checkpoint `M05-github-state-network-design-local-025`. The next owner gate is approval or rejection of the `local-missions-hq` GitHub Team organization, public repository transfer, recurring seat cost, and first-run larger-runner ceiling. Do not alter GitHub billing/ownership, the Storage firewall, federation, networking, RBAC, or workload state under the completed proof approval.
