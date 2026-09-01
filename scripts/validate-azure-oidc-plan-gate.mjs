import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repositoryRoot, 'config/azure-oidc-plan-gate.v1.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertProofBoundary() {
  assert(
    manifest.activationStatus === 'github_oidc_arm_proof_passed_network_access_pending',
    'OIDC activation status drifted.',
  );
  assert(manifest.activeWorkflowPresent === true, 'The approved OIDC proof workflow is missing.');
  assert(manifest.azureExecutionEnabled === true, 'OIDC proof execution is not recorded.');
  assert(
    manifest.checkpoint === 'M05-github-oidc-arm-proof-passed-024',
    'OIDC checkpoint identifier drifted.',
  );

  const activeWorkflowDirectory = join(
    repositoryRoot,
    manifest.githubContract.activeWorkflowDirectory,
  );
  const workflowFiles = readdirSync(activeWorkflowDirectory)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort();
  assert(workflowFiles.length > 0, 'At least one local verification workflow is required.');
  assert(workflowFiles.includes('azure-oidc-proof.yml'), 'The OIDC proof workflow is missing.');
  assert(
    !workflowFiles.includes('azure-ephemeral.yml'),
    'The deployment workflow must stay absent.',
  );

  for (const workflowFile of workflowFiles) {
    const source = readFileSync(join(activeWorkflowDirectory, workflowFile), 'utf8');
    const label = relative(repositoryRoot, join(activeWorkflowDirectory, workflowFile));
    assert(
      /^permissions:\s*\n {2}contents:\s*read\s*$/m.test(source),
      `${label} must have a read-only top-level permission boundary.`,
    );
    if (workflowFile === 'azure-oidc-proof.yml') {
      assert(
        (source.match(/id-token:\s*write\b/g) ?? []).length === 1,
        'The proof must grant OIDC only at its single matrix job.',
      );
      assert(
        source.includes('azure/login@7ddb5af1ef8758cf1353cf3b42f940aee27ba21c'),
        'The proof must pin the reviewed Azure login commit.',
      );
      assert(
        source.includes('operation: [plan, apply, destroy]') &&
          source.includes('environment: azure-development-${{ matrix.operation }}'),
        'The proof must cover three separately protected identities.',
      );
      assert(
        source.includes("github.event_name == 'workflow_dispatch'") &&
          source.includes("github.ref == 'refs/heads/main'") &&
          source.includes('runs-on: ubuntu-latest'),
        'The proof must remain manual, main-only, and GitHub-hosted.',
      );
      assert(
        (source.match(/az account get-access-token/g) ?? []).length === 2 &&
          source.includes('Microsoft.Authorization/permissions') &&
          source.includes('az storage blob show') &&
          source.includes('test "$blob_status" -ne 0'),
        'The proof must verify token exchange, ARM/RBAC, and the expected state firewall block.',
      );
      assert(
        !/\baz\s+(?:group|resource|identity|role|storage\s+account)\s+(?:create|delete|update|set)\b/i.test(
          source,
        ),
        'The proof must not mutate Azure resources, RBAC, identities, or networking.',
      );
    } else {
      assert(!/id-token:\s*write\b/.test(source), `${label} must not request an OIDC token.`);
      assert(
        !/^\s+[a-z-]+:\s*write\s*$/m.test(source),
        `${label} must not grant any write permission.`,
      );
      assert(!/azure\/login@/i.test(source), `${label} must not authenticate to Azure.`);
      assert(!/\baz\s+login\b/i.test(source), `${label} must not invoke Azure login.`);
    }
    assert(
      !/terraform\s+(?:apply|destroy|import|refresh|force-unlock|state|taint|untaint)\b/i.test(
        source,
      ),
      `${label} contains a prohibited Terraform mutation command.`,
    );
  }

  const templatePath = join(repositoryRoot, manifest.githubContract.inactiveTemplate);
  assert(
    !templatePath.startsWith(`${activeWorkflowDirectory}/`),
    'The inactive OIDC template must remain outside the active workflow directory.',
  );
  const template = readFileSync(templatePath, 'utf8');
  assert(
    (template.match(/if:\s*\$\{\{\s*false\s*\}\}/g) ?? []).length === 3,
    'Every inactive identity job must be hard-disabled.',
  );
  assert(
    (template.match(/id-token:\s*write\b/g) ?? []).length === 3,
    'The inactive template must document job-scoped OIDC permission for three identities.',
  );
  for (const identity of manifest.identities) {
    assert(
      template.includes(`environment: ${identity.environment}`),
      `Inactive template is missing ${identity.environment}.`,
    );
  }
  assert(!/azure\/login@/i.test(template), 'Inactive template must not contain Azure login.');
  assert(!/terraform\s+/i.test(template), 'Inactive template must not execute Terraform.');

  return workflowFiles.length;
}

function assertIdentityContracts() {
  const expectedKinds = ['apply', 'destroy', 'plan'];
  const kinds = manifest.identities.map((identity) => identity.kind).sort();
  assert(JSON.stringify(kinds) === JSON.stringify(expectedKinds), 'Identity kinds drifted.');

  const identityReferences = manifest.identities.map(
    (identity) => identity.identityReferenceVariable,
  );
  const environments = manifest.identities.map((identity) => identity.environment);
  const subjects = manifest.identities.map((identity) => identity.subjectTemplate);
  assert(new Set(identityReferences).size === 3, 'Plan/apply/destroy identities must be distinct.');
  assert(new Set(environments).size === 3, 'Plan/apply/destroy environments must be distinct.');
  assert(new Set(subjects).size === 3, 'Plan/apply/destroy subjects must be distinct.');

  const protection = manifest.protectionContract;
  assert(
    protection.adminBypassAllowed === false &&
      JSON.stringify(protection.allowedBranches) === JSON.stringify(['main']) &&
      protection.allowedTags.length === 0 &&
      protection.environmentRequired === true &&
      protection.independentApprovalRequired === true &&
      protection.preventSelfReview === false &&
      protection.pullRequestRunsAllowed === false &&
      protection.repositoryOrEnvironmentSecretsAllowed === false &&
      protection.reviewerIndependentFromPlanProducer === true &&
      protection.singleHumanReviewerException === true,
    'Protected GitHub environment contract drifted.',
  );
  assert(
    JSON.stringify(manifest.invocationContract.requiredJobPermissions) ===
      JSON.stringify({ contents: 'read', 'id-token': 'write' }) &&
      manifest.invocationContract.requiredPlanEvidence.length === 8,
    'Job permission or saved-plan evidence contract drifted.',
  );

  assert(
    manifest.githubContract.repository === 'stratiosai/Creator-App' &&
      manifest.githubContract.issuer === 'https://token.actions.githubusercontent.com' &&
      manifest.githubContract.audience === 'api://AzureADTokenExchange' &&
      JSON.stringify(manifest.githubContract.allowedEvents) ===
        JSON.stringify(['workflow_dispatch']) &&
      manifest.githubContract.githubHostedRunnerRequired === true &&
      manifest.githubContract.environmentsConfigured === true &&
      manifest.githubContract.immutableSubjectEnabled === true &&
      manifest.githubContract.immutableSubjectRequired === true &&
      manifest.githubContract.reviewer === 'stratiosai' &&
      manifest.githubContract.subjectPreviewRequired === true &&
      manifest.githubContract.oidcPermissionScope === 'job_only',
    'GitHub issuer/repository/immutable-subject contract drifted.',
  );
  for (const identity of manifest.identities) {
    const expectedSubject = `repo:stratiosai@{repository_owner_id}/Creator-App@{repository_id}:environment:${identity.environment}`;
    assert(
      identity.subjectTemplate === expectedSubject,
      `${identity.kind} subject template drifted.`,
    );
    assert(
      identity.allowedEvents.includes('workflow_dispatch'),
      `${identity.kind} must be manual.`,
    );
    assert(
      identity.forbiddenCapabilities.includes('subscription-owner') &&
        identity.forbiddenCapabilities.includes('manage-control-plane') &&
        identity.forbiddenCapabilities.includes('manage-federated-credentials'),
      `${identity.kind} is missing a retained-scope refusal.`,
    );
  }

  const plan = manifest.identities.find((identity) => identity.kind === 'plan');
  const apply = manifest.identities.find((identity) => identity.kind === 'apply');
  const destroy = manifest.identities.find((identity) => identity.kind === 'destroy');
  assert(
    plan.forbiddenCapabilities.includes('apply-resource-mutations') &&
      plan.forbiddenCapabilities.includes('delete-resources') &&
      plan.forbiddenCapabilities.includes('assign-azure-roles'),
    'Plan identity must be read/plan-only outside the exact state lock.',
  );
  assert(
    apply.allowedTerraformOperations.length === 1 &&
      apply.allowedTerraformOperations[0] === 'apply-reviewed-plan-file',
    'Apply identity must consume only a reviewed plan file.',
  );
  assert(
    destroy.allowedEvents.includes('schedule') &&
      destroy.forbiddenCapabilities.includes('unscoped-direct-destroy'),
    'Destroy identity must retain the scheduled backstop and scoped-plan boundary.',
  );

  const serialized = JSON.stringify(manifest);
  assert(
    manifest.actionPolicy.azureLoginAction === 'azure/login' &&
      manifest.actionPolicy.azureLoginActionPresent === true &&
      /^[0-9a-f]{40}$/.test(manifest.actionPolicy.reviewedCommitSha) &&
      manifest.actionPolicy.reviewedRelease === 'v3.0.2' &&
      manifest.actionPolicy.pinRequirement === 'reviewed_full_commit_sha' &&
      manifest.actionPolicy.unpinnedActionsAllowed === false &&
      manifest.credentialContract.longLivedSecretsAllowed === false &&
      manifest.credentialContract.environmentIdentifierVariablesConfigured === true &&
      manifest.credentialContract.repositoryValuesArePlaceholdersOnly === false,
    'Action pinning or long-lived credential boundary drifted.',
  );
  for (const forbiddenInput of manifest.credentialContract.forbiddenInputs) {
    const assignments = new RegExp(`"${forbiddenInput}"\\s*:\\s*"[^"{]`, 'i');
    assert(!assignments.test(serialized), `${forbiddenInput} must not have a repository value.`);
  }

  const proof = manifest.proofContract;
  assert(
    proof.allowedAzureMutations === 0 &&
      proof.actualBlobReadExpected === false &&
      proof.actualBlobReadPendingTemporaryNetworkApproval === true &&
      proof.armPermissionInspectionRequired === true &&
      proof.controlGroupAccessMustFail === true &&
      proof.environmentApprovalRequired === true &&
      proof.githubHostedRunner === true &&
      proof.identityCount === 3 &&
      proof.oidcTokenExchangeRequired === true &&
      proof.stateDataActionInspectionRequired === true &&
      proof.stateFirewallExpectedToBlockRunner === true &&
      proof.terraformCommandsAllowed.length === 0 &&
      proof.workflowDispatchOnly === true,
    'The no-apply OIDC proof boundary drifted.',
  );
  const result = manifest.proofResult;
  assert(
    result.allIdentityJobsPassed === true &&
      result.approvalCompleted === true &&
      result.azureMutationCommandsExecuted === 0 &&
      result.conclusion === 'success' &&
      /^[0-9a-f]{40}$/.test(result.headCommitSha) &&
      result.runId === 33513053687 &&
      result.stateBlobReadBlockedByFirewall === true &&
      result.terraformCommandsExecuted === 0,
    'The live no-apply proof result drifted.',
  );
}

function evaluateInvocation(invocation) {
  const identity = manifest.identities.find((candidate) => candidate.kind === invocation.operation);
  if (!identity) return false;
  const requiredPermissions = manifest.invocationContract.requiredJobPermissions;
  const allowedCommands = {
    plan: [manifest.invocationContract.planCommand],
    apply: [manifest.invocationContract.applyCommand],
    destroy: [
      manifest.invocationContract.destroyPlanCommand,
      manifest.invocationContract.destroyApplyCommand,
    ],
  };
  const permissionKeys = Object.keys(invocation.permissions).sort();
  const requiredPermissionKeys = Object.keys(requiredPermissions).sort();
  const permissionsMatch =
    JSON.stringify(permissionKeys) === JSON.stringify(requiredPermissionKeys) &&
    permissionKeys.every((key) => invocation.permissions[key] === requiredPermissions[key]);
  const commitPattern = /^[0-9a-f]{40}$/;
  const resourceGroupPattern = /^rg-local-missions-dev-[a-z0-9]{6,12}$/;
  const forbiddenCommand =
    /(?:-auto-approve|\s-target(?:=|\s)|terraform\s+(?:destroy|import|refresh|force-unlock|state|taint|untaint)\b)/i;
  const forbiddenInputs = new Set(
    manifest.credentialContract.forbiddenInputs.map((name) => name.toLowerCase()),
  );
  const forbiddenCredential = invocation.credentialInputNames.some((name) =>
    forbiddenInputs.has(name.toLowerCase()),
  );

  return (
    identity.allowedEvents.includes(invocation.event) &&
    invocation.ref === manifest.invocationContract.allowedRef &&
    invocation.environment === identity.environment &&
    invocation.identityReferenceVariable === identity.identityReferenceVariable &&
    invocation.runner === manifest.invocationContract.allowedRunner &&
    permissionsMatch &&
    invocation.independentlyApproved === true &&
    invocation.approvedByInitiator === false &&
    commitPattern.test(invocation.sourceCommitSha) &&
    invocation.sourceCommitSha === invocation.artifactCommitSha &&
    invocation.planDigestVerified === true &&
    invocation.sameDayWindowValid === true &&
    invocation.terraformRoot === manifest.invocationContract.exactTerraformRoot &&
    resourceGroupPattern.test(invocation.resourceGroup) &&
    invocation.identityReferencesDistinct === true &&
    !forbiddenCredential &&
    !forbiddenCommand.test(invocation.command) &&
    allowedCommands[invocation.operation].includes(invocation.command)
  );
}

function validInvocation(operation, command) {
  const identity = manifest.identities.find((candidate) => candidate.kind === operation);
  return {
    approvedByInitiator: false,
    artifactCommitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    command,
    credentialInputNames: manifest.credentialContract.externalIdentifierVariables,
    environment: identity.environment,
    event: 'workflow_dispatch',
    identityReferenceVariable: identity.identityReferenceVariable,
    identityReferencesDistinct: true,
    independentlyApproved: true,
    operation,
    permissions: structuredClone(manifest.invocationContract.requiredJobPermissions),
    planDigestVerified: true,
    ref: manifest.invocationContract.allowedRef,
    resourceGroup: 'rg-local-missions-dev-example',
    runner: manifest.invocationContract.allowedRunner,
    sameDayWindowValid: true,
    sourceCommitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    terraformRoot: manifest.invocationContract.exactTerraformRoot,
  };
}

function assertInvocationPolicy() {
  const accepted = [
    validInvocation('plan', manifest.invocationContract.planCommand),
    validInvocation('apply', manifest.invocationContract.applyCommand),
    validInvocation('destroy', manifest.invocationContract.destroyPlanCommand),
    validInvocation('destroy', manifest.invocationContract.destroyApplyCommand),
  ];
  assert(accepted.every(evaluateInvocation), 'A reviewed invocation was unexpectedly refused.');

  const basePlan = validInvocation('plan', manifest.invocationContract.planCommand);
  const baseApply = validInvocation('apply', manifest.invocationContract.applyCommand);
  const baseDestroy = validInvocation('destroy', manifest.invocationContract.destroyApplyCommand);
  const refusals = new Map([
    ['pull-request-event', { ...basePlan, event: 'pull_request' }],
    ['wrong-branch', { ...basePlan, ref: 'refs/heads/feature' }],
    ['wrong-environment', { ...basePlan, environment: 'azure-development-apply' }],
    ['wrong-identity', { ...basePlan, identityReferenceVariable: 'AZURE_APPLY_CLIENT_ID' }],
    ['self-hosted-runner', { ...basePlan, runner: 'self-hosted' }],
    ['missing-id-token-permission', { ...basePlan, permissions: { contents: 'read' } }],
    [
      'writable-contents-permission',
      { ...basePlan, permissions: { contents: 'write', 'id-token': 'write' } },
    ],
    ['missing-independent-approval', { ...baseApply, independentlyApproved: false }],
    ['self-approval', { ...baseApply, approvedByInitiator: true }],
    [
      'commit-mismatch',
      { ...baseApply, artifactCommitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    ],
    ['plan-digest-mismatch', { ...baseApply, planDigestVerified: false }],
    ['expired-or-overnight-window', { ...baseApply, sameDayWindowValid: false }],
    ['wrong-terraform-root', { ...basePlan, terraformRoot: 'infra/terraform/control-plane' }],
    ['broad-resource-group', { ...basePlan, resourceGroup: '*' }],
    ['direct-unreviewed-apply', { ...baseApply, command: 'terraform apply -input=false' }],
    ['direct-terraform-destroy', { ...baseDestroy, command: 'terraform destroy' }],
    [
      'auto-approve',
      { ...baseApply, command: 'terraform apply -auto-approve dev-workload.tfplan' },
    ],
    ['state-mutation-subcommand', { ...basePlan, command: 'terraform state rm example' }],
    ['long-lived-client-secret', { ...basePlan, credentialInputNames: ['AZURE_CLIENT_SECRET'] }],
    ['shared-plan-and-mutation-identity', { ...basePlan, identityReferencesDistinct: false }],
  ]);
  assert(
    JSON.stringify([...refusals.keys()]) === JSON.stringify(manifest.refusalScenarios),
    'Refusal scenario register drifted from executable tests.',
  );
  for (const [name, invocation] of refusals) {
    assert(!evaluateInvocation(invocation), `${name} unexpectedly passed.`);
  }
  return { accepted: accepted.length, refused: refusals.size };
}

const activeWorkflowCount = assertProofBoundary();
assertIdentityContracts();
const invocationCounts = assertInvocationPolicy();

console.log(
  `Azure OIDC proof gate passed for ${manifest.identities.length} distinct identities, ${invocationCounts.accepted} accepted command invocations, ${invocationCounts.refused} refusal scenarios, one inactive deployment template, and ${activeWorkflowCount} active workflows; live run ${manifest.proofResult.runId} passed without Terraform or Azure mutation and state-network access remains pending.`,
);
