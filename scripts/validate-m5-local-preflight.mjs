import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repositoryRoot, 'config/m5-local-preflight.v1.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const expectedContractPaths = [
  'config/terraform-foundation.v1.json',
  'config/azure-oidc-plan-gate.v1.json',
  'config/saved-plan-evidence.v1.json',
  'config/ephemeral-run-ledger.v1.json',
  'config/recovery-drill.v1.json',
  'config/container-image-contract.v1.json',
];

const expectedCoverageIds = [
  'terraform-roots-modules-and-mock-plans',
  'secretless-identity-and-command-policy',
  'saved-plan-producer-consumer-evidence',
  'apply-test-destroy-reconcile-lifecycle',
  'recovery-and-rollback-evidence',
  'production-bundle-and-image-policy',
  'active-ci-remains-non-deploying',
  'sanitized-evidence-and-boundary',
  'operator-boundary-and-same-day-teardown',
];

const expectedExternalGateIds = [
  'azure-subscription-and-scope-review',
  'azure-service-sku-price-region-review',
  'budget-alert-owner-and-delivery',
  'base-image-provenance-review',
  'registry-target-and-authentication',
  'image-build-scan-sign-and-push',
  'oidc-identities-and-environment-protection',
  'remote-state-backend-and-locking',
  'provider-backed-saved-plan-review',
  'explicit-apply-approval',
  'ephemeral-apply-migrate-and-seed',
  'cloud-test-suite',
  'live-rollback-and-recovery',
  'scoped-destroy',
  'independent-teardown-reconciliation',
  'm5-milestone-gate-review',
];

const expectedCurrentExecutionKeys = [
  'azureAuthenticated',
  'azureResourcesCreated',
  'cloudCostIncurred',
  'containerBuildExecuted',
  'customerDataAllowed',
  'externalRegistryContacted',
  'livePriceRequested',
  'liveRecoveryExecuted',
  'providerBackedPlanExecuted',
  'remoteBackendInitialized',
  'terraformMutationExecuted',
];

function assertUniqueExact(actual, expected, label) {
  assert(actual.length === expected.length, `${label} count drifted.`);
  assert(new Set(actual).size === actual.length, `${label} contains a duplicate.`);
  assert(
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort()),
    `${label} membership drifted.`,
  );
}

function validateManifest(candidate) {
  assert(candidate.schemaVersion === 1, 'Preflight schema version drifted.');
  assert(candidate.activationStatus === 'local_preflight_only', 'Activation status drifted.');
  assert(candidate.checkpoint === 'M05-local-preflight-audit-010', 'Checkpoint drifted.');
  assert(candidate.milestoneComplete === false, 'M5 cannot be claimed complete locally.');
  assert(candidate.syntheticDataOnly === true, 'Only synthetic data is allowed.');
  assert(
    candidate.nextBoundary === 'external_review_and_explicit_approval_required',
    'Next boundary drifted.',
  );
  assert(candidate.verificationCommand === 'pnpm m5:preflight', 'Verification command drifted.');

  const executionKeys = Object.keys(candidate.currentExecution ?? {});
  assertUniqueExact(executionKeys, expectedCurrentExecutionKeys, 'Current execution fields');
  for (const key of expectedCurrentExecutionKeys) {
    assert(candidate.currentExecution[key] === false, `${key} must remain false.`);
  }

  const contractPaths = candidate.machineContracts.map((contract) => contract.path);
  assertUniqueExact(contractPaths, expectedContractPaths, 'Machine contracts');
  for (const contract of candidate.machineContracts) {
    assert(/^pnpm [a-z0-9-]+:check$/.test(contract.command), `${contract.path} command drifted.`);
    assert(
      /^M05-[a-z0-9-]+-\d{3}$/.test(contract.checkpoint),
      `${contract.path} checkpoint drifted.`,
    );
    assert(
      ['local_contract_only', 'static_contract_only', 'synthetic_contract_only'].includes(
        contract.activationStatus,
      ),
      `${contract.path} activation status is not local-only.`,
    );
  }

  assertUniqueExact(
    candidate.localCoverage.map((coverage) => coverage.id),
    expectedCoverageIds,
    'Local coverage',
  );
  for (const coverage of candidate.localCoverage) {
    assert(coverage.evidence.length > 0, `${coverage.id} evidence is missing.`);
    assert(
      !/(?:live|cloud|provider_backed|production)_proof/.test(coverage.proofClass),
      `${coverage.id} overclaims live proof.`,
    );
  }

  assert(
    candidate.requiredArtifacts.length === new Set(candidate.requiredArtifacts).size,
    'Required artifacts contain a duplicate.',
  );
  assert(candidate.requiredArtifacts.length === 15, 'Required artifact count drifted.');

  assertUniqueExact(
    candidate.externalGates.map((gate) => gate.id),
    expectedExternalGateIds,
    'External gates',
  );
  for (const gate of candidate.externalGates) {
    assert(gate.status === 'deferred', `${gate.id} must remain deferred.`);
    assert(gate.approvalRequired === true, `${gate.id} must require approval.`);
    assert(/^[a-z][a-z0-9_]+$/.test(gate.ownerRole), `${gate.id} owner role is missing.`);
    assert(gate.evidenceRequired.length >= 16, `${gate.id} evidence requirement is missing.`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(join(repositoryRoot, path), 'utf8'));
}

function assertRepositoryContracts(candidate) {
  const packageJson = readJson('package.json');
  for (const contract of candidate.machineContracts) {
    const commandName = contract.command.slice('pnpm '.length);
    assert(packageJson.scripts[commandName], `Missing package script ${commandName}.`);
    const source = readJson(contract.path);
    assert(source.checkpoint === contract.checkpoint, `${contract.path} checkpoint mismatch.`);
    assert(
      source.activationStatus === contract.activationStatus,
      `${contract.path} activation status mismatch.`,
    );
  }
  assert(packageJson.scripts['m5:preflight'], 'Missing m5:preflight package script.');
  assert(
    packageJson.scripts.verify.includes('pnpm m5:preflight'),
    'The repository verify gate must include the M5 preflight.',
  );

  for (const artifact of candidate.requiredArtifacts) {
    assert(existsSync(join(repositoryRoot, artifact)), `Required artifact missing: ${artifact}`);
  }
  for (const coverage of candidate.localCoverage) {
    assert(
      existsSync(join(repositoryRoot, coverage.evidence)),
      `Coverage evidence missing: ${coverage.id}`,
    );
  }
}

function loadContracts() {
  return {
    images: readJson('config/container-image-contract.v1.json'),
    ledger: readJson('config/ephemeral-run-ledger.v1.json'),
    oidc: readJson('config/azure-oidc-plan-gate.v1.json'),
    recovery: readJson('config/recovery-drill.v1.json'),
    savedPlan: readJson('config/saved-plan-evidence.v1.json'),
    terraform: readJson('config/terraform-foundation.v1.json'),
  };
}

function validateCrossContractCoherence(contracts) {
  const { images, ledger, oidc, recovery, savedPlan, terraform } = contracts;

  const resourceCount = terraform.workloadResourceInventory.total;
  assert(
    resourceCount === 31,
    'Terraform resource count drifted from the reviewed local contract.',
  );
  assert(
    savedPlan.targetContract.workloadResourceCount === resourceCount,
    'Saved-plan count drifted.',
  );
  assert(
    ledger.inventoryContract.expectedDisposableTotalBeforeDestroy === resourceCount,
    'Run-ledger count drifted.',
  );

  assert(
    terraform.expirationPolicy.maxHours === savedPlan.timeContract.maximumHours &&
      terraform.expirationPolicy.warningMinutes === savedPlan.timeContract.warningMinutes &&
      terraform.expirationPolicy.timeZone === savedPlan.timeContract.requiredTimeZone &&
      terraform.expirationPolicy.cutoffHourAmericaNewYork ===
        savedPlan.timeContract.cutoffHourAmericaNewYork,
    'Foundation and saved-plan expiration contracts drifted.',
  );

  const oidcEnvironments = new Set(oidc.identities.map((identity) => identity.environment));
  for (const operation of savedPlan.operations) {
    assert(
      oidcEnvironments.has(operation.producerEnvironment),
      'Saved-plan producer drifted from OIDC.',
    );
    assert(
      oidcEnvironments.has(operation.consumerEnvironment),
      'Saved-plan consumer drifted from OIDC.',
    );
  }

  assert(
    recovery.planningTargets.draftTargetsAreNotProviderSla === true,
    'Recovery targets overclaim.',
  );
  assert(recovery.liveRecoveryClaimed === false, 'Live recovery cannot be claimed.');
  assert(
    images.buildExecution.containerBuildExecuted === false,
    'Container build cannot be claimed.',
  );
  assert(
    images.buildExecution.externalRegistryContacted === false,
    'Registry contact cannot be claimed.',
  );
  assert(images.buildExecution.imagePublished === false, 'Published image cannot be claimed.');
  assert(oidc.azureExecutionEnabled === false, 'OIDC Azure execution must remain disabled.');
  assert(
    savedPlan.currentCiConsumerPresent === false,
    'A live saved-plan CI consumer was claimed.',
  );
  assert(ledger.activeWorkflowPresent === false, 'A live run-ledger workflow was claimed.');
}

function validateActiveWorkflow(source) {
  assert(
    /^permissions:\s*\n {2}contents:\s*read\s*$/m.test(source),
    'Active CI must retain read-only contents permission.',
  );
  assert(!/id-token:\s*write\b/.test(source), 'Active CI must not request an OIDC token.');
  assert(!/^\s+[a-z-]+:\s*write\s*$/m.test(source), 'Active CI must not grant write permission.');
  assert(!/azure\/login@/i.test(source), 'Active CI must not authenticate to Azure.');
  assert(!/^\s*-?\s*run:\s*az\s+/im.test(source), 'Active CI must not invoke Azure CLI.');
  assert(
    !/terraform\s+(?:apply|destroy|import|refresh|force-unlock|state|taint|untaint)\b/i.test(
      source,
    ),
    'Active CI must not mutate Terraform or Azure state.',
  );
  assert(!/docker\s+(?:build|buildx\s+build)\b/i.test(source), 'Active CI must not build images.');
  assert(!/docker\s+login\b/i.test(source), 'Active CI must not log into a registry.');
  assert(!/docker\s+push\b/i.test(source), 'Active CI must not push images.');
}

function walkFiles(root, visitor) {
  for (const entry of readdirSync(root)) {
    if (['.git', 'node_modules'].includes(entry)) continue;
    const absolute = join(root, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) walkFiles(absolute, visitor);
    else visitor(absolute);
  }
}

function isForbiddenTerraformArtifact(path) {
  const segments = path.split('/');
  const name = segments.at(-1);
  return (
    segments.includes('.terraform') ||
    name.endsWith('.tfplan') ||
    name.endsWith('.tfstate') ||
    name.includes('.tfstate.')
  );
}

function assertNoForbiddenTerraformArtifacts() {
  const violations = [];
  walkFiles(repositoryRoot, (absolute) => {
    const path = relative(repositoryRoot, absolute);
    if (isForbiddenTerraformArtifact(path)) violations.push(path);
  });
  assert(violations.length === 0, `Forbidden Terraform artifacts found: ${violations.join(', ')}`);
}

const manifestMutations = {
  'activation-status-drift': (value) => (value.activationStatus = 'active'),
  'checkpoint-drift': (value) => (value.checkpoint = 'M05-live'),
  'milestone-complete-claimed': (value) => (value.milestoneComplete = true),
  'next-boundary-drift': (value) => (value.nextBoundary = 'approved'),
  'azure-authentication-claimed': (value) => (value.currentExecution.azureAuthenticated = true),
  'azure-resource-creation-claimed': (value) =>
    (value.currentExecution.azureResourcesCreated = true),
  'cloud-cost-claimed': (value) => (value.currentExecution.cloudCostIncurred = true),
  'container-build-claimed': (value) => (value.currentExecution.containerBuildExecuted = true),
  'customer-data-allowed': (value) => (value.currentExecution.customerDataAllowed = true),
  'registry-contact-claimed': (value) => (value.currentExecution.externalRegistryContacted = true),
  'live-price-request-claimed': (value) => (value.currentExecution.livePriceRequested = true),
  'live-recovery-claimed': (value) => (value.currentExecution.liveRecoveryExecuted = true),
  'provider-plan-claimed': (value) => (value.currentExecution.providerBackedPlanExecuted = true),
  'remote-backend-claimed': (value) => (value.currentExecution.remoteBackendInitialized = true),
  'terraform-mutation-claimed': (value) =>
    (value.currentExecution.terraformMutationExecuted = true),
  'missing-machine-contract': (value) => value.machineContracts.pop(),
  'duplicate-machine-contract': (value) => value.machineContracts.push(value.machineContracts[0]),
  'machine-contract-command-drift': (value) =>
    (value.machineContracts[0].command = 'terraform apply'),
  'machine-contract-checkpoint-drift': (value) =>
    (value.machineContracts[0].checkpoint = 'M05-live'),
  'machine-contract-activation-drift': (value) =>
    (value.machineContracts[0].activationStatus = 'active'),
  'missing-required-artifact': (value) => value.requiredArtifacts.pop(),
  'duplicate-required-artifact': (value) =>
    value.requiredArtifacts.push(value.requiredArtifacts[0]),
  'missing-local-coverage': (value) => value.localCoverage.pop(),
  'duplicate-local-coverage': (value) => value.localCoverage.push(value.localCoverage[0]),
  'local-coverage-live-proof-claim': (value) => (value.localCoverage[0].proofClass = 'live_proof'),
  'missing-external-gate': (value) => value.externalGates.pop(),
  'duplicate-external-gate': (value) => value.externalGates.push(value.externalGates[0]),
  'external-gate-complete-claim': (value) => (value.externalGates[0].status = 'complete'),
  'external-gate-without-approval': (value) => (value.externalGates[0].approvalRequired = false),
  'external-gate-without-owner': (value) => (value.externalGates[0].ownerRole = ''),
  'external-gate-without-evidence': (value) => (value.externalGates[0].evidenceRequired = ''),
};

const workflowMutations = {
  'active-ci-oidc-permission': '  id-token: write\n',
  'active-ci-write-permission': '  contents: write\n',
  'active-ci-azure-login': '      - uses: azure/login@v2\n',
  'active-ci-azure-cli': '      - run: az account show\n',
  'active-ci-terraform-mutation': '      - run: terraform apply dev.tfplan\n',
  'active-ci-docker-build': '      - run: docker build .\n',
  'active-ci-registry-login': '      - run: docker login example.invalid\n',
  'active-ci-registry-push': '      - run: docker push example.invalid/app\n',
};

function runRefusalTests(activeWorkflow, contracts) {
  let passed = 0;
  for (const [name, mutate] of Object.entries(manifestMutations)) {
    const candidate = clone(manifest);
    mutate(candidate);
    let refused = false;
    try {
      validateManifest(candidate);
    } catch {
      refused = true;
    }
    assert(refused, `Mutation was not refused: ${name}`);
    passed += 1;
  }

  for (const [name, injection] of Object.entries(workflowMutations)) {
    let refused = false;
    try {
      validateActiveWorkflow(`${activeWorkflow}\n${injection}`);
    } catch {
      refused = true;
    }
    assert(refused, `Workflow mutation was not refused: ${name}`);
    passed += 1;
  }

  const coherenceMutations = {
    'cross-contract-resource-count-drift': (value) =>
      (value.savedPlan.targetContract.workloadResourceCount += 1),
    'cross-contract-expiry-drift': (value) => (value.savedPlan.timeContract.maximumHours += 1),
    'cross-contract-identity-drift': (value) =>
      (value.savedPlan.operations[0].producerEnvironment = 'invented-environment'),
  };
  for (const [name, mutate] of Object.entries(coherenceMutations)) {
    const candidate = clone(contracts);
    mutate(candidate);
    let refused = false;
    try {
      validateCrossContractCoherence(candidate);
    } catch {
      refused = true;
    }
    assert(refused, `Cross-contract mutation was not refused: ${name}`);
    passed += 1;
  }

  const artifactRefusals = {
    'forbidden-terraform-plan-artifact': 'evidence/dev-workload.tfplan',
    'forbidden-terraform-state-artifact': 'infra/terraform/dev.tfstate.backup',
    'forbidden-terraform-cache-artifact': 'infra/terraform/environments/dev/.terraform/cache',
  };
  for (const [name, path] of Object.entries(artifactRefusals)) {
    assert(isForbiddenTerraformArtifact(path), `Artifact mutation was not refused: ${name}`);
    passed += 1;
  }

  const expected = [
    ...Object.keys(manifestMutations),
    ...Object.keys(workflowMutations),
    ...Object.keys(coherenceMutations),
    ...Object.keys(artifactRefusals),
  ];
  assertUniqueExact(manifest.refusalScenarios, expected, 'Refusal scenarios');
  return passed;
}

validateManifest(manifest);
assertRepositoryContracts(manifest);
const contracts = loadContracts();
validateCrossContractCoherence(contracts);
const activeWorkflow = readFileSync(join(repositoryRoot, '.github/workflows/verify.yml'), 'utf8');
validateActiveWorkflow(activeWorkflow);
assertNoForbiddenTerraformArtifacts();
const refusalCount = runRefusalTests(activeWorkflow, contracts);

console.log(
  [
    'M5 local preflight passed:',
    `${manifest.machineContracts.length} machine contracts,`,
    `${manifest.localCoverage.length} local coverage areas,`,
    `${manifest.externalGates.length} deferred external gates,`,
    `${refusalCount} refusal scenarios,`,
    'zero Azure/registry/Terraform mutation claims.',
  ].join(' '),
);
