import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(path) {
  return JSON.parse(readFileSync(join(repositoryRoot, path), 'utf8'));
}

const savedPlan = readJson('config/saved-plan-evidence.v2.json');
const ledgerContract = readJson('config/ephemeral-run-ledger.v2.json');
const planFixture = readJson(savedPlan.fixture);
const ledgerFixture = readJson(ledgerContract.fixture);
const foundation = readJson('config/terraform-foundation.v1.json');
const oidc = readJson('config/azure-oidc-plan-gate.v1.json');
const imageContract = readJson('config/container-image-contract.v1.json');

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function clone(value) {
  return structuredClone(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function digest(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function ledgerDigest(ledger) {
  const payload = clone(ledger);
  delete payload.ledgerDigestSha256;
  return digest(payload);
}

function reviewPayloadDigest(plan, sourceCommitSha) {
  return digest({
    artifactSha256: plan.artifactSha256,
    evidence: plan.evidence,
    expiresAt: plan.expiresAt,
    operationId: plan.operationId,
    sourceCommitSha,
    summary: plan.summary,
  });
}

function timestamp(value, label) {
  assert(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:-04:00|-05:00)$/.test(value),
    `${label} must include a New York UTC offset.`,
  );
  const parsed = new Date(value);
  assert(Number.isFinite(parsed.getTime()), `${label} is invalid.`);
  return parsed;
}

function assertDigest(value, label) {
  assert(/^[a-f0-9]{64}$/.test(value), `${label} must be a lowercase SHA-256 digest.`);
}

function assertNoSecretShape(value, label = 'evidence') {
  const forbiddenKey =
    /(?:access.?token|account.?key|client.?secret|connection.?string|password|private.?key|refresh.?token|sas.?token|secret)/i;
  const forbiddenValue =
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:client_secret|password|sig)=/i;
  function inspect(candidate, path) {
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => inspect(item, `${path}[${index}]`));
      return;
    }
    if (candidate && typeof candidate === 'object') {
      for (const [key, item] of Object.entries(candidate)) {
        assert(!forbiddenKey.test(key), `${path}.${key} is a forbidden secret-shaped field.`);
        inspect(item, `${path}.${key}`);
      }
      return;
    }
    if (typeof candidate === 'string') {
      assert(!forbiddenValue.test(candidate), `${path} contains secret-shaped evidence.`);
    }
  }
  inspect(value, label);
}

const operationIds = [
  'retained-state-bootstrap',
  'retained-control-plane',
  'workload-core',
  'application-activation',
  'workload-destroy',
];

function validateStaticContracts(planContract = savedPlan, runContract = ledgerContract) {
  assert(planContract.schemaVersion === 2, 'Saved-plan V2 schema drifted.');
  assert(runContract.schemaVersion === 2, 'Run-ledger V2 schema drifted.');
  assert(
    planContract.checkpoint === 'M05-activation-lifecycle-contract-local-032' &&
      runContract.checkpoint === planContract.checkpoint,
    'V2 checkpoint binding drifted.',
  );
  for (const contract of [planContract, runContract]) {
    assert(
      contract.activationStatus === 'activation_valid_contract_local_only' &&
        contract.activationUseAllowed === true &&
        contract.cloudExecutionClaimed === false &&
        contract.fixtureStatus === 'synthetic_contract_test_only',
      'V2 must be activation-capable without claiming cloud execution.',
    );
  }
  assert(runContract.activeWorkflowPresent === false, 'No V2 deployment workflow may be active.');
  assert(
    JSON.stringify(planContract.operations.map(({ id }) => id)) === JSON.stringify(operationIds),
    'Saved-plan operation order drifted.',
  );
  assert(
    JSON.stringify(runContract.orderedSuccessStates) ===
      JSON.stringify([
        'retained_state_verified',
        'retained_control_verified',
        'core_plan_approved',
        'core_apply_verified',
        'images_verified',
        'activation_plan_approved',
        'activation_apply_verified',
        'tests_passed',
        'destroy_plan_approved',
        'destroy_apply_verified',
        'reconciled_clean',
        'complete',
      ]),
    'Run-ledger success sequence drifted.',
  );

  const roots = new Map(foundation.roots.map((root) => [root.rootId, root]));
  const expectedRoots = {
    'retained-state-bootstrap': roots.get('bootstrap'),
    'retained-control-plane': roots.get('control-plane'),
    'workload-core': roots.get('workload-dev'),
    'application-activation': roots.get('workload-dev'),
    'workload-destroy': roots.get('workload-dev'),
  };
  for (const operation of planContract.operations) {
    const root = expectedRoots[operation.id];
    assert(
      operation.terraformRoot === root?.path && operation.backendKey === root?.backendKey,
      `${operation.id} root/backend drifted from Terraform foundation.`,
    );
  }
  const expectedPlans = {
    'retained-state-bootstrap': {
      create: foundation.bootstrapContract.enabledPlanResourceChanges,
      update: 0,
      delete: 0,
      resultingCount: 3,
    },
    'retained-control-plane': {
      create: foundation.controlPlaneContract.enabledPlanResourceChanges,
      update: 0,
      delete: 0,
      resultingCount: 20,
    },
    'workload-core': {
      create: foundation.mockProviderContract.corePlanResourceChanges,
      update: 0,
      delete: 0,
      resultingCount: foundation.workloadCoreResourceInventory.total,
    },
    'application-activation': {
      create: 3,
      update: 0,
      delete: 0,
      resultingCount: foundation.workloadResourceInventory.total,
    },
    'workload-destroy': {
      create: 0,
      update: 0,
      delete: foundation.workloadResourceInventory.total,
      resultingCount: 0,
    },
  };
  for (const operation of planContract.operations) {
    assert(
      JSON.stringify(operation.expectedPlan) === JSON.stringify(expectedPlans[operation.id]),
      `${operation.id} resource contract drifted.`,
    );
  }
  assert(
    JSON.stringify(planContract.operations[3].prerequisites) ===
      JSON.stringify(['workload-core', 'immutable-image-publication']),
    'Application activation must follow core and image publication.',
  );
  assert(
    JSON.stringify(planContract.operations[4].prerequisites) ===
      JSON.stringify(['cloud-test-suite']),
    'Destroy must follow the cloud test suite.',
  );

  const oidcRefs = new Set(
    oidc.identities.map(({ identityReferenceVariable }) => identityReferenceVariable),
  );
  for (const operation of planContract.operations.slice(2)) {
    assert(oidcRefs.has(operation.producerIdentity), `${operation.id} producer identity drifted.`);
    assert(oidcRefs.has(operation.consumerIdentity), `${operation.id} consumer identity drifted.`);
  }
  assert(
    JSON.stringify(planContract.nonTerraformGates[0].requiredImageIds) ===
      JSON.stringify(imageContract.images.map(({ id }) => id)),
    'V2 image inventory drifted from the container contract.',
  );
  assert(
    planContract.retention.binaryPlanInRepositoryAllowed === false &&
      planContract.retention.binaryPlanInRetainedEvidenceAllowed === false &&
      planContract.retention.manifestMayContainSecrets === false &&
      planContract.retention.consumerMustDeleteTransientCopy === true &&
      planContract.retention.maximumTransientArtifactHours ===
        foundation.expirationPolicy.maxHours &&
      planContract.retention.requiredTimeZone === foundation.expirationPolicy.timeZone &&
      planContract.retention.cutoffHourAmericaNewYork ===
        foundation.expirationPolicy.cutoffHourAmericaNewYork &&
      planContract.retention.warningMinutes === foundation.expirationPolicy.warningMinutes,
    'V2 transient artifact policy drifted.',
  );
}

function validatePlanFixture(candidate, contract = savedPlan) {
  assert(candidate.schemaVersion === 2, 'Plan fixture schema drifted.');
  assert(
    candidate.fixtureStatus === 'synthetic_contract_test_only',
    'Fixture must remain synthetic.',
  );
  assert(/^[a-f0-9]{40}$/.test(candidate.sourceCommitSha), 'Source commit must be exact.');
  assert(
    /^rg-local-missions-dev-eus2-[0-9]{3}$/.test(candidate.targetResourceGroup),
    'Target group drifted.',
  );
  assert(
    JSON.stringify(candidate.plans.map(({ operationId }) => operationId)) ===
      JSON.stringify(operationIds),
    'Fixture plan order drifted.',
  );

  for (const [index, evidence] of candidate.plans.entries()) {
    const operation = contract.operations[index];
    assert(evidence.operationId === operation.id, `${operation.id} binding drifted.`);
    assertDigest(evidence.artifactSha256, `${operation.id} artifact`);
    assertDigest(evidence.reviewPayloadSha256, `${operation.id} review payload`);
    assert(
      evidence.reviewPayloadSha256 === reviewPayloadDigest(evidence, candidate.sourceCommitSha),
      `${operation.id} review payload is not bound to its evidence.`,
    );
    assert(
      JSON.stringify(evidence.summary) === JSON.stringify(operation.expectedPlan),
      `${operation.id} summary drifted.`,
    );
    const expectedProducer =
      operation.producerIdentity === 'local-operator'
        ? 'synthetic:actor:local-operator'
        : operation.producerIdentity;
    const expectedConsumer =
      operation.consumerIdentity === 'local-operator'
        ? 'synthetic:actor:local-operator'
        : operation.consumerIdentity;
    assert(evidence.producedBy === expectedProducer, `${operation.id} producer drifted.`);
    assert(evidence.consumedBy === expectedConsumer, `${operation.id} consumer drifted.`);
    assert(
      evidence.approvedBy !== evidence.producedBy,
      `${operation.id} self-review is forbidden.`,
    );
    const approvedAt = timestamp(evidence.approvedAt, `${operation.id} approvedAt`);
    const consumedAt = timestamp(evidence.consumedAt, `${operation.id} consumedAt`);
    const expiresAt = timestamp(evidence.expiresAt, `${operation.id} expiresAt`);
    assert(
      approvedAt <= consumedAt && consumedAt < expiresAt,
      `${operation.id} approval/consumption order drifted.`,
    );
    assert(expiresAt - approvedAt <= 8 * 60 * 60 * 1000, `${operation.id} exceeds eight hours.`);
    assert(
      evidence.approvedAt.slice(0, 10) === evidence.expiresAt.slice(0, 10) &&
        Number(evidence.expiresAt.slice(11, 13)) <= contract.retention.cutoffHourAmericaNewYork,
      `${operation.id} crosses the New York same-day cutoff.`,
    );
    assert(
      evidence.transientArtifactDeleted === true,
      `${operation.id} transient plan was retained.`,
    );
    assert(evidence.retainedTargetsDestroyed === 0, `${operation.id} targets retained resources.`);
    if (operation.id !== 'workload-destroy') {
      assert(evidence.summary.delete === 0, `${operation.id} contains a destructive change.`);
    }
    assert(
      evidence.evidence.sourceCommitSha === candidate.sourceCommitSha,
      `${operation.id} source commit evidence drifted.`,
    );
    assertDigest(evidence.evidence.providerLockSha256, `${operation.id} provider lock`);
    assertDigest(evidence.evidence.sourceSetSha256, `${operation.id} source set`);
    assert(
      evidence.evidence.exactTargetRoot === operation.terraformRoot,
      `${operation.id} target root drifted.`,
    );
    assert(
      /^rg-local-missions-[a-z0-9-]+-eus2-001$/.test(evidence.evidence.exactTargetResourceGroup),
      `${operation.id} target group drifted.`,
    );
    assert(
      evidence.evidence.sanitizedTextPlan.length <= 256,
      `${operation.id} text summary is oversized.`,
    );
    assert(
      JSON.stringify(evidence.evidence.sanitizedJsonSummary) === JSON.stringify(evidence.summary),
      `${operation.id} JSON summary drifted.`,
    );
    assert(
      evidence.evidence.approvedCostSummary.currency === 'USD' &&
        Number.isInteger(evidence.evidence.approvedCostSummary.ceilingMinor) &&
        evidence.evidence.approvedCostSummary.ceilingMinor > 0 &&
        /^synthetic:actor:[a-z0-9:-]+$/.test(evidence.evidence.approvedCostSummary.reviewedBy),
      `${operation.id} cost evidence drifted.`,
    );
  }
  assert(candidate.plans[2].containerAppChanges === 0, 'Core plan contains Container Apps.');
  assert(
    candidate.plans[3].containerAppChanges === 3,
    'Activation must add exactly three Container Apps.',
  );

  const requiredImages = contract.nonTerraformGates[0].requiredImageIds;
  assert(
    JSON.stringify(candidate.images.map(({ id }) => id)) === JSON.stringify(requiredImages),
    'Image evidence inventory drifted.',
  );
  let latestPublication = 0;
  for (const image of candidate.images) {
    assert(image.sourceCommitSha === candidate.sourceCommitSha, `${image.id} commit drifted.`);
    assert(/^sha256:[a-f0-9]{64}$/.test(image.digest), `${image.id} digest is mutable or invalid.`);
    assert(image.scanStatus === 'passed', `${image.id} scan did not pass.`);
    assert(image.signatureStatus === 'verified', `${image.id} signature is not verified.`);
    assert(image.provenanceStatus === 'verified', `${image.id} provenance is not verified.`);
    latestPublication = Math.max(
      latestPublication,
      timestamp(image.publishedAt, `${image.id} publishedAt`).getTime(),
    );
  }
  assert(
    latestPublication < timestamp(candidate.plans[3].approvedAt, 'activation approvedAt').getTime(),
    'Application activation was approved before all images were verified.',
  );

  const requiredTests = contract.nonTerraformGates[1].requiredTests;
  assert(
    JSON.stringify(Object.keys(candidate.tests)) === JSON.stringify(requiredTests),
    'Critical test inventory drifted.',
  );
  assert(
    Object.values(candidate.tests).every((status) => status === 'passed'),
    'A critical test did not pass.',
  );
  assert(candidate.reconciliation.terraformStateCount === 0, 'Terraform state is not empty.');
  assert(
    candidate.reconciliation.liveAzureResourceCount === 0,
    'Live disposable inventory is not empty.',
  );
  assert(
    candidate.reconciliation.stateQueryRef !== candidate.reconciliation.liveQueryRef,
    'State/live reconciliation evidence must be independent.',
  );
  assert(
    candidate.reconciliation.retainedLandingZonePresent === true,
    'Retained landing zone is missing.',
  );
  assert(candidate.reconciliation.orphanRefs.length === 0, 'Orphans remain after reconciliation.');
  assertNoSecretShape(candidate, 'planFixture');
}

function validateLedger(candidate, contract = ledgerContract, plan = planFixture) {
  assert(candidate.schemaVersion === 2, 'Ledger fixture schema drifted.');
  assert(
    candidate.fixtureStatus === 'synthetic_contract_test_only',
    'Ledger fixture must remain synthetic.',
  );
  assert(candidate.ledgerDigestSha256 === ledgerDigest(candidate), 'Ledger digest mismatch.');
  assert(candidate.sourceCommitSha === plan.sourceCommitSha, 'Ledger source commit drifted.');
  const start = timestamp(candidate.startedAt, 'run startedAt');
  const expiry = timestamp(candidate.expiresAt, 'run expiresAt');
  const warning = timestamp(candidate.warningAt, 'run warningAt');
  const end = timestamp(candidate.endedAt, 'run endedAt');
  assert(start < end && end <= expiry, 'Run exceeded its approved lifecycle.');
  assert(expiry - start <= 8 * 60 * 60 * 1000, 'Run exceeds eight hours.');
  assert(
    expiry - warning === savedPlan.retention.warningMinutes * 60 * 1000,
    'Run warning must be exactly one hour before expiry.',
  );

  assert(
    JSON.stringify(candidate.events.map(({ state }) => state)) ===
      JSON.stringify(contract.orderedSuccessStates),
    'Ledger success order drifted.',
  );
  let previous = start.getTime();
  candidate.events.forEach((event, index) => {
    assert(event.sequence === index + 1, 'Ledger sequence is not contiguous.');
    const at = timestamp(event.at, `event ${event.sequence}`);
    assert(at.getTime() >= previous && at <= end, 'Ledger event time drifted.');
    previous = at.getTime();
    assert(
      /^synthetic:evidence:[a-z0-9:-]+$/.test(event.evidenceRef),
      'Ledger evidence reference is unsafe.',
    );
  });

  assert(
    JSON.stringify(Object.keys(candidate.operationBindings)) === JSON.stringify(operationIds),
    'Ledger operation bindings drifted.',
  );
  for (const evidence of plan.plans) {
    assert(
      candidate.operationBindings[evidence.operationId] === evidence.artifactSha256,
      `${evidence.operationId} ledger binding drifted.`,
    );
  }
  assert(candidate.observedCounts.coreAfterApply === 27, 'Core observed count drifted.');
  assert(candidate.observedCounts.activatedAfterApply === 30, 'Activation observed count drifted.');
  assert(candidate.observedCounts.destroyedDisposable === 30, 'Destroy observed count drifted.');
  assert(candidate.observedCounts.retainedDestroyed === 0, 'Destroy touched retained resources.');
  assert(candidate.observedCounts.stateAfterDestroy === 0, 'State reconciliation is nonzero.');
  assert(candidate.observedCounts.liveAfterDestroy === 0, 'Live reconciliation is nonzero.');
  assert(
    JSON.stringify(candidate.imageIds) === JSON.stringify(['api', 'dashboard', 'worker']),
    'Ledger image inventory drifted.',
  );
  assert(candidate.testStatus === 'passed', 'Ledger tests did not pass.');
  assert(
    candidate.reconciliationActors.terraformState !== candidate.reconciliationActors.liveAzure,
    'State/live reconciliation actors must be distinct.',
  );
  assert(candidate.orphanRefs.length === 0, 'Ledger contains orphans.');
  assert(candidate.incident === null, 'Complete run cannot have an open incident.');
  assert(candidate.terminalState === 'complete', 'Ledger terminal report drifted.');
  assertNoSecretShape(candidate, 'ledgerFixture');
}

function inspectRepositoryForForbiddenTerraformArtifacts() {
  const violations = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (['.git', '.next', '.turbo', 'coverage', 'dist', 'node_modules'].includes(entry.name))
        continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.terraform') violations.push(relative(repositoryRoot, path));
        else walk(path);
      } else if (/\.tfplan$|\.tfstate(?:\.|$)/i.test(entry.name) && statSync(path).isFile()) {
        violations.push(relative(repositoryRoot, path));
      }
    }
  }
  walk(repositoryRoot);
  assert(
    violations.length === 0,
    `Terraform plan/state artifacts are forbidden: ${violations.join(', ')}`,
  );
}

function mustRefuse(name, candidate, validator) {
  let refused = false;
  try {
    validator(candidate);
  } catch {
    refused = true;
  }
  assert(refused, `V2 mutation was not refused: ${name}`);
}

function runRefusalTests() {
  const planMutations = {
    'activation-claim': (value) => (value.cloudExecutionClaimed = true),
    'live-fixture-claim': (value) => (value.fixtureStatus = 'live'),
    'operation-order-drift': (value) => value.operations.reverse(),
    'root-or-backend-drift': (value) => (value.operations[2].backendKey = 'other.tfstate'),
    'resource-count-drift': (value) => (value.operations[2].expectedPlan.create = 28),
  };
  for (const [name, mutate] of Object.entries(planMutations)) {
    const candidate = clone(savedPlan);
    mutate(candidate);
    mustRefuse(name, candidate, (value) => validateStaticContracts(value, ledgerContract));
  }

  const fixtureMutations = {
    'core-contains-container-app': (value) => (value.plans[2].containerAppChanges = 1),
    'activation-before-images': (value) =>
      (value.images[2].publishedAt = '2026-09-01T11:20:00-04:00'),
    'missing-image': (value) => value.images.pop(),
    'mutable-image-reference': (value) => (value.images[0].digest = 'latest'),
    'unscanned-image': (value) => (value.images[0].scanStatus = 'failed'),
    'unsigned-image': (value) => (value.images[0].signatureStatus = 'missing'),
    'image-commit-mismatch': (value) => (value.images[0].sourceCommitSha = 'b'.repeat(40)),
    'plan-artifact-digest-mismatch': (value) => (value.plans[0].artifactSha256 = 'invalid'),
    'review-payload-digest-mismatch': (value) =>
      (value.plans[0].evidence.approvedCostSummary.ceilingMinor = 101),
    'self-approval': (value) => (value.plans[2].approvedBy = 'AZURE_PLAN_CLIENT_ID'),
    'consumer-identity-drift': (value) => (value.plans[2].consumedBy = 'AZURE_DESTROY_CLIENT_ID'),
    'consumer-before-approval': (value) =>
      (value.plans[2].consumedAt = '2026-09-01T09:00:00-04:00'),
    'expired-consumption': (value) => (value.plans[2].consumedAt = '2026-09-01T17:01:00-04:00'),
    'destructive-nondestroy-plan': (value) => (value.plans[2].summary.delete = 1),
    'destroy-retained-target': (value) => (value.plans[4].retainedTargetsDestroyed = 1),
    'missing-test-gate': (value) => delete value.tests.smoke,
    'missing-state-reconciliation': (value) => (value.reconciliation.terraformStateCount = 1),
    'missing-live-reconciliation': (value) => (value.reconciliation.liveAzureResourceCount = 1),
    'nonzero-disposable-reconciliation': (value) =>
      value.reconciliation.orphanRefs.push('synthetic:orphan:001'),
    'secret-shaped-evidence': (value) => (value.clientSecret = 'not-a-real-value'),
  };
  for (const [name, mutate] of Object.entries(fixtureMutations)) {
    const candidate = clone(planFixture);
    mutate(candidate);
    mustRefuse(name, candidate, validatePlanFixture);
  }

  const ledgerMutations = {
    'ledger-digest-mismatch': (value) => (value.ledgerDigestSha256 = '0'.repeat(64)),
    'wrong-initial-state': (value) => (value.events[0].state = 'core_plan_approved'),
    'illegal-success-order': (value) => value.events.reverse(),
    'noncontiguous-sequence': (value) => (value.events[1].sequence = 7),
    'nonmonotonic-time': (value) => (value.events[2].at = '2026-09-01T08:01:00-04:00'),
    'expired-run': (value) => (value.endedAt = '2026-09-01T16:01:00-04:00'),
    'missing-operation-binding': (value) => delete value.operationBindings['workload-core'],
    'plan-binding-mismatch': (value) => (value.operationBindings['workload-core'] = '0'.repeat(64)),
    'core-count-not-27': (value) => (value.observedCounts.coreAfterApply = 28),
    'activation-count-not-30': (value) => (value.observedCounts.activatedAfterApply = 29),
    'destroy-count-not-30': (value) => (value.observedCounts.destroyedDisposable = 29),
    'retained-resource-destroyed': (value) => (value.observedCounts.retainedDestroyed = 1),
    'reconciliation-not-independent': (value) =>
      (value.reconciliationActors.liveAzure = value.reconciliationActors.terraformState),
    'nonzero-state-count': (value) => (value.observedCounts.stateAfterDestroy = 1),
    'nonzero-live-count': (value) => (value.observedCounts.liveAfterDestroy = 1),
    'orphan-reported-complete': (value) => value.orphanRefs.push('synthetic:orphan:001'),
    'failure-without-incident': (value) => (value.testStatus = 'failed'),
    'secret-shaped-evidence': (value) => (value.privateKey = 'not-a-real-value'),
  };
  for (const [name, mutate] of Object.entries(ledgerMutations)) {
    const candidate = clone(ledgerFixture);
    mutate(candidate);
    if (name !== 'ledger-digest-mismatch') candidate.ledgerDigestSha256 = ledgerDigest(candidate);
    mustRefuse(name, candidate, validateLedger);
  }

  return (
    Object.keys(planMutations).length +
    Object.keys(fixtureMutations).length +
    Object.keys(ledgerMutations).length
  );
}

validateStaticContracts();
validatePlanFixture(planFixture);
validateLedger(ledgerFixture);
inspectRepositoryForForbiddenTerraformArtifacts();
const refusalCount = runRefusalTests();

console.log(
  `Activation-valid V2 lifecycle contract passed for ${savedPlan.operations.length} saved-plan operations, ${savedPlan.nonTerraformGates.length} non-Terraform gates, ${ledgerContract.orderedSuccessStates.length} ordered success states, and ${refusalCount} refusal mutations; fixtures remain synthetic and no Azure/Terraform execution occurred.`,
);
