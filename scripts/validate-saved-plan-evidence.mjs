import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = join(repositoryRoot, 'config/saved-plan-evidence.v1.json');
const oidcContractPath = join(repositoryRoot, 'config/azure-oidc-plan-gate.v1.json');
const foundationPath = join(repositoryRoot, 'config/terraform-foundation.v1.json');
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
const oidcContract = JSON.parse(readFileSync(oidcContractPath, 'utf8'));
const foundation = JSON.parse(readFileSync(foundationPath, 'utf8'));
const readiness = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/azure-plan-readiness.v1.json'), 'utf8'),
);
const fixtureRoot = join(repositoryRoot, contract.fixtureRoot);
const providerLockPath = join(
  repositoryRoot,
  'infra/terraform/environments/dev/.terraform.lock.hcl',
);

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertExactKeys(value, expectedKeys, label) {
  assert(
    value && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object.`,
  );
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} fields drifted.`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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

function canonicalDigest(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function clone(value) {
  return structuredClone(value);
}

function operationContract(kind) {
  return contract.operations.find((operation) => operation.kind === kind);
}

function expectedReviewPayload(manifest) {
  return {
    artifact: {
      logicalName: manifest.artifact.logicalName,
      sha256: manifest.artifact.sha256,
    },
    costEvidence: manifest.costEvidence,
    fixtureStatus: manifest.fixtureStatus,
    lifecycle: manifest.lifecycle,
    operation: manifest.operation,
    planSummary: manifest.planSummary,
    producer: manifest.producer,
    schemaVersion: manifest.schemaVersion,
    source: manifest.source,
  };
}

function reviewPayloadDigest(manifest) {
  return canonicalDigest(expectedReviewPayload(manifest));
}

function rebindReviewPayload(manifest) {
  const digest = reviewPayloadDigest(manifest);
  manifest.review.reviewPayloadSha256 = digest;
  manifest.approval.reviewPayloadSha256 = digest;
  manifest.consumer.expectedReviewPayloadSha256 = digest;
  return manifest;
}

function inspectRepositoryForForbiddenArtifacts() {
  const ignoredDirectories = new Set([
    '.git',
    '.next',
    '.turbo',
    'coverage',
    'dist',
    'node_modules',
  ]);
  const forbidden = [];

  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.terraform') forbidden.push(relative(repositoryRoot, path));
        else walk(path);
        continue;
      }
      if (/\.tfplan$|\.tfstate(?:\.|$)/i.test(entry.name)) {
        forbidden.push(relative(repositoryRoot, path));
      }
    }
  }

  walk(repositoryRoot);
  assert(
    forbidden.length === 0,
    `Terraform plan/state artifacts are forbidden in source: ${forbidden.join(', ')}`,
  );
}

function assertStaticContract() {
  assert(
    contract.activationStatus === 'synthetic_contract_only' &&
      contract.allFixturesSynthetic === true &&
      contract.cloudEvidenceClaimed === false &&
      contract.currentCiConsumerPresent === false,
    'Saved-plan evidence must remain synthetic and inactive.',
  );
  assert(
    contract.activationUseAllowed === false &&
      contract.historicalFixtureModel === 'single_apply_synthetic_only' &&
      contract.supersededForActivationBy === readiness.checkpoint,
    'The V1 saved-plan fixture must remain historical and superseded for Azure activation.',
  );
  assert(
    contract.checkpoint === 'M05-saved-plan-evidence-contract-local-005',
    'Saved-plan checkpoint identifier drifted.',
  );
  assert(contract.digestAlgorithm === 'sha256', 'Only SHA-256 evidence binding is supported.');
  assert(contract.operations.length === 2, 'Exactly apply and destroy evidence are required.');
  assert(
    JSON.stringify(contract.operations.map(({ kind }) => kind).sort()) ===
      JSON.stringify(['apply', 'destroy']),
    'Saved-plan operation inventory drifted.',
  );
  assert(
    JSON.stringify(contract.requiredEvidenceFieldsFromOidcContract) ===
      JSON.stringify(oidcContract.invocationContract.requiredPlanEvidence),
    'Saved-plan fields drifted from the OIDC invocation contract.',
  );

  const workloadRoot = foundation.roots.find(({ rootId }) => rootId === 'workload-dev');
  assert(
    workloadRoot?.path === contract.targetContract.exactTerraformRoot &&
      workloadRoot.backendKey === contract.targetContract.backendKey,
    'Saved-plan root/state binding drifted from the Terraform foundation.',
  );
  assert(
    contract.targetContract.workloadResourceCount === 31 &&
      foundation.workloadResourceInventory.total === 30 &&
      contract.targetContract.workloadResourceCount !== foundation.workloadResourceInventory.total,
    'Historical V1 must remain visibly incompatible with the current retained-landing-zone workload inventory.',
  );
  assert(
    contract.targetContract.retainedTargetCount === 0 &&
      contract.retentionContract.binaryPlanInRepositoryAllowed === false &&
      contract.retentionContract.binaryPlanInRetainedEvidenceAllowed === false &&
      contract.retentionContract.consumerMustDeleteTransientCopy === true &&
      contract.retentionContract.manifestMayContainSecrets === false &&
      contract.retentionContract.maximumTransientArtifactHours === 8,
    'Saved-plan retention or retained-target boundary drifted.',
  );
  assert(
    contract.timeContract.maximumHours === foundation.expirationPolicy.maxHours &&
      contract.timeContract.warningMinutes === foundation.expirationPolicy.warningMinutes &&
      contract.timeContract.cutoffHourAmericaNewYork ===
        foundation.expirationPolicy.cutoffHourAmericaNewYork &&
      contract.timeContract.requiredTimeZone === foundation.expirationPolicy.timeZone,
    'Saved-plan time contract drifted from the Terraform foundation.',
  );

  for (const operation of contract.operations) {
    const producer = oidcContract.identities.find(
      ({ identityReferenceVariable }) =>
        identityReferenceVariable === operation.producerIdentityReference,
    );
    const consumer = oidcContract.identities.find(
      ({ identityReferenceVariable }) =>
        identityReferenceVariable === operation.consumerIdentityReference,
    );
    assert(
      producer?.environment === operation.producerEnvironment &&
        consumer?.environment === operation.consumerEnvironment,
      `${operation.kind} identity/environment binding drifted from the OIDC contract.`,
    );
    const expectedCommand =
      operation.kind === 'apply'
        ? oidcContract.invocationContract.applyCommand
        : oidcContract.invocationContract.destroyApplyCommand;
    assert(
      operation.exactCommand === expectedCommand,
      `${operation.kind} consumer command drifted from the OIDC contract.`,
    );
  }

  inspectRepositoryForForbiddenArtifacts();
}

function assertTimestamp(value, label) {
  assert(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:-04:00|-05:00)$/.test(value),
    `${label} must be an explicit New York-offset timestamp.`,
  );
  const parsed = new Date(value);
  assert(Number.isFinite(parsed.getTime()), `${label} is not a valid timestamp.`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: contract.timeContract.requiredTimeZone,
    year: 'numeric',
  })
    .formatToParts(parsed)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const representedLocalTime = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  assert(
    representedLocalTime === value.slice(0, 19),
    `${label} offset does not represent America/New_York local time.`,
  );
  return parsed;
}

function assertSyntheticReference(value, label) {
  assert(
    typeof value === 'string' && /^synthetic:[a-z0-9:-]+$/.test(value),
    `${label} must be an explicit synthetic reference.`,
  );
}

function scanSanitizedManifest(manifest) {
  const forbiddenFields = new Set(
    contract.sanitizationContract.forbiddenFieldNames.map((field) => field.toLowerCase()),
  );
  const expectedMarkerClasses = [
    'private-key-pem-header',
    'azure-account-key-assignment',
    'shared-access-signature',
    'client-secret-assignment',
    'password-assignment',
    'signature-query-parameter',
  ];
  assert(
    JSON.stringify(contract.sanitizationContract.forbiddenValueMarkerClasses) ===
      JSON.stringify(expectedMarkerClasses),
    'Forbidden value-marker classes drifted.',
  );
  const forbiddenMarkers = [
    new RegExp(['-----BEGIN ', '(?:RSA |EC |OPENSSH )?', 'PRIVATE KEY-----'].join(''), 'i'),
    /AccountKey=/i,
    /SharedAccessSignature/i,
    /client_secret=/i,
    /password=/i,
    /(?:^|[?&])sig=/i,
  ];

  function scan(value) {
    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        assert(!forbiddenFields.has(key.toLowerCase()), `Sanitized summary contains ${key}.`);
        scan(child);
      }
      return;
    }
    if (typeof value === 'string') {
      for (const marker of forbiddenMarkers) {
        assert(!marker.test(value), 'Sanitized summary contains a forbidden value marker.');
      }
    }
  }

  const serialized = JSON.stringify(manifest.planSummary);
  assert(
    Buffer.byteLength(serialized) <= contract.sanitizationContract.maximumSummaryBytes,
    'Sanitized summary exceeds the byte ceiling.',
  );
  scan(manifest);
}

function validateManifest(manifest) {
  assertExactKeys(
    manifest,
    [
      'approval',
      'artifact',
      'consumer',
      'costEvidence',
      'fixtureStatus',
      'lifecycle',
      'operation',
      'planSummary',
      'producer',
      'review',
      'schemaVersion',
      'source',
    ],
    'Saved-plan manifest',
  );
  assertExactKeys(
    manifest.artifact,
    ['logicalName', 'sha256', 'syntheticFixturePath'],
    'Artifact evidence',
  );
  assertExactKeys(
    manifest.source,
    [
      'backendKey',
      'commitSha',
      'providerLockSha256',
      'ref',
      'repository',
      'retainedTargetCount',
      'targetInventorySha256',
      'targetResourceGroup',
      'terraformRoot',
      'workloadResourceCount',
    ],
    'Source evidence',
  );
  assertExactKeys(
    manifest.producer,
    ['environment', 'identityReference', 'initiatedBy', 'producedAt', 'workflowRunReference'],
    'Producer evidence',
  );
  assertExactKeys(
    manifest.planSummary,
    [
      'create',
      'delete',
      'destructiveChanges',
      'replace',
      'sanitizedJson',
      'sanitizedText',
      'update',
    ],
    'Plan summary',
  );
  assertExactKeys(
    manifest.planSummary.sanitizedJson,
    ['create', 'delete', 'replace', 'update'],
    'Sanitized JSON summary',
  );
  assertExactKeys(
    manifest.costEvidence,
    [
      'approvedCeilingMinor',
      'boundArtifactSha256',
      'currency',
      'estimatedAt',
      'estimatedMonthlyCostMinor',
      'estimatedRunCostMinor',
      'livePriceApproved',
      'reviewedBy',
      'source',
      'status',
    ],
    'Cost evidence',
  );
  assertExactKeys(
    manifest.lifecycle,
    ['createdAt', 'expiresAt', 'warningAt'],
    'Lifecycle evidence',
  );
  assertExactKeys(
    manifest.review,
    ['reference', 'reviewedAt', 'reviewedBy', 'reviewPayloadSha256'],
    'Review evidence',
  );
  assertExactKeys(
    manifest.approval,
    ['approvedAt', 'approvedBy', 'kind', 'reference', 'reviewPayloadSha256', 'status'],
    'Approval evidence',
  );
  assertExactKeys(
    manifest.consumer,
    [
      'command',
      'consumedAt',
      'environment',
      'expectedArtifactSha256',
      'expectedReviewPayloadSha256',
      'identityReference',
      'transientArtifactDeleted',
    ],
    'Consumer evidence',
  );
  scanSanitizedManifest(manifest);
  assert(manifest.schemaVersion === 1, 'Unsupported saved-plan evidence schema.');
  assert(manifest.fixtureStatus === 'synthetic_only', 'Fixture must be explicitly synthetic.');
  const operation = operationContract(manifest.operation);
  assert(operation, 'Unknown saved-plan operation.');
  assert(
    manifest.artifact.logicalName === operation.artifactLogicalName,
    'Saved-plan logical artifact name drifted.',
  );

  const normalizedFixturePath = normalize(manifest.artifact.syntheticFixturePath);
  assert(
    normalizedFixturePath === manifest.artifact.syntheticFixturePath &&
      !normalizedFixturePath.startsWith(`..${sep}`) &&
      !normalizedFixturePath.includes(`${sep}..${sep}`) &&
      normalizedFixturePath.endsWith('.synthetic.fixture'),
    'Synthetic artifact path is unsafe.',
  );
  const artifactPath = resolve(fixtureRoot, normalizedFixturePath);
  assert(
    artifactPath.startsWith(`${fixtureRoot}${sep}`),
    'Synthetic artifact escaped its fixture directory.',
  );
  assert(existsSync(artifactPath), 'Synthetic artifact fixture is missing.');
  const artifactBytes = readFileSync(artifactPath);
  const artifactDigest = sha256(artifactBytes);
  assert(/^[0-9a-f]{64}$/.test(manifest.artifact.sha256), 'Artifact digest is malformed.');
  assert(
    manifest.artifact.sha256 === artifactDigest,
    'Artifact digest does not match fixture bytes.',
  );
  const artifactText = artifactBytes.toString('utf8').toLowerCase();
  assert(
    artifactText.includes('synthetic') && artifactText.includes('not a terraform plan binary'),
    'Fixture payload must be visibly harmless and synthetic.',
  );

  const source = manifest.source;
  assert(source.repository === 'stratiosai/Creator-App', 'Repository binding drifted.');
  assert(source.ref === 'refs/heads/main', 'Source ref must be main.');
  assert(/^[0-9a-f]{40}$/.test(source.commitSha), 'Source commit must be a full SHA.');
  assert(
    source.terraformRoot === contract.targetContract.exactTerraformRoot,
    'Terraform root binding drifted.',
  );
  assert(source.backendKey === contract.targetContract.backendKey, 'Backend-key binding drifted.');
  assert(
    new RegExp(contract.targetContract.resourceGroupPattern).test(source.targetResourceGroup),
    'Resource-group target is broad or malformed.',
  );
  assert(
    source.providerLockSha256 === sha256(readFileSync(providerLockPath)),
    'Provider lock digest does not match the reviewed lock file.',
  );
  assert(
    source.targetInventorySha256 === contract.targetContract.historicalTargetInventorySha256 &&
      source.targetInventorySha256 !==
        canonicalDigest(foundation.mockProviderContract.plannedResourceTypeCounts),
    'Historical target inventory must remain bound to V1 and visibly differ from the current landing-zone workload.',
  );
  assert(
    source.workloadResourceCount === contract.targetContract.workloadResourceCount,
    'Workload target count drifted.',
  );
  assert(
    source.retainedTargetCount === contract.targetContract.retainedTargetCount,
    'Retained resources entered the disposable target.',
  );

  assert(
    manifest.producer.identityReference === operation.producerIdentityReference &&
      manifest.producer.environment === operation.producerEnvironment,
    'Producer identity or environment drifted.',
  );
  assertSyntheticReference(manifest.producer.workflowRunReference, 'Producer run');
  assertSyntheticReference(manifest.producer.initiatedBy, 'Initiator');
  assert(
    manifest.consumer.identityReference === operation.consumerIdentityReference &&
      manifest.consumer.environment === operation.consumerEnvironment,
    'Consumer identity or environment drifted.',
  );
  assert(manifest.consumer.command === operation.exactCommand, 'Consumer command drifted.');
  if (manifest.operation === 'apply') {
    assert(
      manifest.producer.identityReference !== manifest.consumer.identityReference,
      'Apply producer and consumer identities must be distinct.',
    );
  }

  const summary = manifest.planSummary;
  for (const key of ['create', 'update', 'delete', 'replace']) {
    assert(Number.isInteger(summary[key]) && summary[key] >= 0, `${key} count is invalid.`);
    assert(summary.sanitizedJson[key] === summary[key], `${key} summary projection drifted.`);
  }
  const destructiveChanges = summary.delete + summary.replace > 0;
  assert(
    summary.destructiveChanges === destructiveChanges,
    'Destructive changes were not declared accurately.',
  );
  if (manifest.operation === 'destroy') {
    assert(
      summary.create === 0 &&
        summary.update === 0 &&
        summary.replace === 0 &&
        summary.delete === source.workloadResourceCount,
      'Destroy summary does not match the exact disposable inventory.',
    );
  }
  const cost = manifest.costEvidence;
  assert(
    cost.status === 'synthetic_fixture_only' &&
      cost.source === 'synthetic_fixture_only' &&
      cost.livePriceApproved === false,
    'Synthetic fixture must not claim live pricing or cost approval.',
  );
  assert(cost.currency === 'USD', 'Cost evidence currency drifted.');
  for (const key of [
    'estimatedRunCostMinor',
    'approvedCeilingMinor',
    'estimatedMonthlyCostMinor',
  ]) {
    assert(
      Number.isInteger(cost[key]) && cost[key] >= 0,
      `${key} must be non-negative minor units.`,
    );
  }
  assert(
    cost.estimatedRunCostMinor <= cost.approvedCeilingMinor,
    'Synthetic run estimate exceeds its reviewed ceiling.',
  );
  assert(
    cost.boundArtifactSha256 === artifactDigest,
    'Cost evidence is bound to another artifact.',
  );
  assertSyntheticReference(cost.reviewedBy, 'Cost reviewer');
  assert(
    cost.reviewedBy !== manifest.producer.initiatedBy,
    'Cost review must be independent from the initiator.',
  );

  const producedAt = assertTimestamp(manifest.producer.producedAt, 'producedAt');
  const estimatedAt = assertTimestamp(cost.estimatedAt, 'estimatedAt');
  const createdAt = assertTimestamp(manifest.lifecycle.createdAt, 'createdAt');
  const warningAt = assertTimestamp(manifest.lifecycle.warningAt, 'warningAt');
  const expiresAt = assertTimestamp(manifest.lifecycle.expiresAt, 'expiresAt');
  const reviewedAt = assertTimestamp(manifest.review.reviewedAt, 'reviewedAt');
  const approvedAt = assertTimestamp(manifest.approval.approvedAt, 'approvedAt');
  const consumedAt = assertTimestamp(manifest.consumer.consumedAt, 'consumedAt');
  const calendarDates = new Set(
    [
      manifest.producer.producedAt,
      cost.estimatedAt,
      manifest.lifecycle.createdAt,
      manifest.lifecycle.warningAt,
      manifest.lifecycle.expiresAt,
      manifest.review.reviewedAt,
      manifest.approval.approvedAt,
      manifest.consumer.consumedAt,
    ].map((value) => value.slice(0, 10)),
  );
  assert(calendarDates.size === 1, 'Saved-plan evidence crossed the New York calendar date.');
  assert(
    createdAt.getTime() === producedAt.getTime() &&
      producedAt <= estimatedAt &&
      estimatedAt <= reviewedAt &&
      reviewedAt <= approvedAt &&
      approvedAt <= consumedAt &&
      consumedAt <= expiresAt,
    'Saved-plan producer/review/approval/consumer ordering is invalid.',
  );
  assert(
    expiresAt.getTime() - createdAt.getTime() <=
      contract.timeContract.maximumHours * 60 * 60 * 1000,
    'Saved-plan lifetime exceeds eight hours.',
  );
  assert(
    expiresAt.getTime() - warningAt.getTime() === contract.timeContract.warningMinutes * 60 * 1000,
    'Warning timestamp is not exactly one hour before expiry.',
  );
  const [expiryHour, expiryMinute] = manifest.lifecycle.expiresAt
    .slice(11, 16)
    .split(':')
    .map(Number);
  assert(
    expiryHour < contract.timeContract.cutoffHourAmericaNewYork ||
      (expiryHour === contract.timeContract.cutoffHourAmericaNewYork && expiryMinute === 0),
    'Saved-plan expiry exceeds the 11:00 PM New York cutoff.',
  );

  const expectedDigest = reviewPayloadDigest(manifest);
  assert(
    manifest.review.reviewPayloadSha256 === expectedDigest,
    'Plan review payload digest does not match the manifest.',
  );
  assertSyntheticReference(manifest.review.reference, 'Plan review');
  assertSyntheticReference(manifest.review.reviewedBy, 'Plan reviewer');
  assert(
    manifest.review.reviewedBy !== manifest.producer.initiatedBy,
    'Plan review must be independent from the initiator.',
  );
  assert(
    manifest.approval.kind === manifest.operation &&
      manifest.approval.status === 'synthetic_fixture_only',
    'Approval kind or synthetic status drifted.',
  );
  assertSyntheticReference(manifest.approval.reference, 'Approval');
  assertSyntheticReference(manifest.approval.approvedBy, 'Approver');
  assert(
    manifest.approval.approvedBy !== manifest.producer.initiatedBy &&
      manifest.approval.approvedBy !== manifest.review.reviewedBy &&
      manifest.approval.approvedBy !== cost.reviewedBy,
    'Approval must be independent from initiation and review.',
  );
  assert(
    manifest.approval.reviewPayloadSha256 === expectedDigest,
    'Approval is bound to another review payload.',
  );
  assert(
    manifest.consumer.expectedArtifactSha256 === artifactDigest &&
      manifest.consumer.expectedReviewPayloadSha256 === expectedDigest,
    'Consumer is bound to another artifact or review payload.',
  );
  assert(
    manifest.consumer.transientArtifactDeleted === true,
    'Consumer must delete its transient artifact copy.',
  );

  return {
    artifactDigest,
    operation: manifest.operation,
    reviewPayloadDigest: expectedDigest,
  };
}

function refusalCase(base, mutate, { rebind = true } = {}) {
  const candidate = clone(base);
  mutate(candidate);
  if (rebind) rebindReviewPayload(candidate);
  return candidate;
}

function assertRefusalScenarios(validManifests) {
  const apply = validManifests.get('apply');
  const destroy = validManifests.get('destroy');
  const longSummary = 'x'.repeat(contract.sanitizationContract.maximumSummaryBytes + 1);
  const badDigest = 'f'.repeat(64);
  const refusals = new Map([
    ['schema-version-drift', refusalCase(apply, (value) => (value.schemaVersion = 2))],
    [
      'non-synthetic-fixture',
      refusalCase(apply, (value) => (value.fixtureStatus = 'live_approved')),
    ],
    ['wrong-operation', refusalCase(apply, (value) => (value.operation = 'replace'))],
    [
      'wrong-artifact-name',
      refusalCase(apply, (value) => (value.artifact.logicalName = 'other.tfplan')),
    ],
    [
      'missing-artifact-fixture',
      refusalCase(
        apply,
        (value) => (value.artifact.syntheticFixturePath = 'missing.synthetic.fixture'),
      ),
    ],
    [
      'artifact-digest-mismatch',
      refusalCase(apply, (value) => (value.artifact.sha256 = badDigest)),
    ],
    [
      'unsafe-artifact-path',
      refusalCase(
        apply,
        (value) => (value.artifact.syntheticFixturePath = '../escape.synthetic.fixture'),
      ),
    ],
    ['wrong-repository', refusalCase(apply, (value) => (value.source.repository = 'other/repo'))],
    ['wrong-ref', refusalCase(apply, (value) => (value.source.ref = 'refs/heads/feature'))],
    ['malformed-commit', refusalCase(apply, (value) => (value.source.commitSha = 'short'))],
    [
      'wrong-terraform-root',
      refusalCase(apply, (value) => (value.source.terraformRoot = 'infra/terraform/control-plane')),
    ],
    [
      'wrong-backend-key',
      refusalCase(
        apply,
        (value) => (value.source.backendKey = 'local-missions/control-plane.tfstate'),
      ),
    ],
    [
      'broad-resource-group',
      refusalCase(apply, (value) => (value.source.targetResourceGroup = '*')),
    ],
    [
      'provider-lock-digest-mismatch',
      refusalCase(apply, (value) => (value.source.providerLockSha256 = badDigest)),
    ],
    [
      'target-inventory-digest-mismatch',
      refusalCase(apply, (value) => (value.source.targetInventorySha256 = badDigest)),
    ],
    [
      'unexpected-retained-target',
      refusalCase(destroy, (value) => (value.source.retainedTargetCount = 1)),
    ],
    [
      'wrong-resource-count',
      refusalCase(destroy, (value) => (value.source.workloadResourceCount = 27)),
    ],
    [
      'wrong-producer-identity',
      refusalCase(apply, (value) => (value.producer.identityReference = 'AZURE_APPLY_CLIENT_ID')),
    ],
    [
      'wrong-producer-environment',
      refusalCase(apply, (value) => (value.producer.environment = 'azure-development-apply')),
    ],
    [
      'wrong-consumer-identity',
      refusalCase(apply, (value) => (value.consumer.identityReference = 'AZURE_PLAN_CLIENT_ID')),
    ],
    [
      'wrong-consumer-environment',
      refusalCase(apply, (value) => (value.consumer.environment = 'azure-development-plan')),
    ],
    [
      'wrong-consumer-command',
      refusalCase(apply, (value) => (value.consumer.command = 'terraform apply -input=false')),
    ],
    [
      'consumer-artifact-digest-mismatch',
      refusalCase(apply, (value) => (value.consumer.expectedArtifactSha256 = badDigest), {
        rebind: false,
      }),
    ],
    [
      'consumer-review-digest-mismatch',
      refusalCase(apply, (value) => (value.consumer.expectedReviewPayloadSha256 = badDigest), {
        rebind: false,
      }),
    ],
    [
      'undeclared-destructive-change',
      refusalCase(apply, (value) => {
        value.planSummary.delete = 1;
        value.planSummary.sanitizedJson.delete = 1;
      }),
    ],
    [
      'unsanitized-secret-field',
      refusalCase(apply, (value) => (value.planSummary.secret = 'synthetic-but-forbidden')),
    ],
    [
      'unexpected-manifest-field',
      refusalCase(apply, (value) => (value.unreviewedMetadata = 'synthetic:unbound')),
    ],
    [
      'oversized-summary',
      refusalCase(apply, (value) => (value.planSummary.sanitizedText = longSummary)),
    ],
    [
      'live-price-claim-in-synthetic-fixture',
      refusalCase(apply, (value) => (value.costEvidence.livePriceApproved = true)),
    ],
    [
      'cost-artifact-digest-mismatch',
      refusalCase(apply, (value) => (value.costEvidence.boundArtifactSha256 = badDigest)),
    ],
    [
      'cost-over-approved-ceiling',
      refusalCase(apply, (value) => (value.costEvidence.estimatedRunCostMinor = 1501)),
    ],
    [
      'missing-independent-cost-reviewer',
      refusalCase(apply, (value) => (value.costEvidence.reviewedBy = value.producer.initiatedBy)),
    ],
    [
      'review-payload-digest-mismatch',
      refusalCase(
        apply,
        (value) => {
          value.review.reviewPayloadSha256 = badDigest;
          value.approval.reviewPayloadSha256 = badDigest;
          value.consumer.expectedReviewPayloadSha256 = badDigest;
        },
        { rebind: false },
      ),
    ],
    [
      'self-plan-review',
      refusalCase(apply, (value) => (value.review.reviewedBy = value.producer.initiatedBy)),
    ],
    [
      'self-approval',
      refusalCase(apply, (value) => (value.approval.approvedBy = value.review.reviewedBy)),
    ],
    [
      'approval-before-review',
      refusalCase(apply, (value) => (value.approval.approvedAt = '2026-08-28T14:15:00-04:00')),
    ],
    ['wrong-approval-kind', refusalCase(apply, (value) => (value.approval.kind = 'destroy'))],
    [
      'expired-consumption',
      refusalCase(apply, (value) => (value.consumer.consumedAt = '2026-08-28T22:01:00-04:00')),
    ],
    [
      'over-eight-hour-window',
      refusalCase(apply, (value) => {
        value.lifecycle.expiresAt = '2026-08-28T23:00:00-04:00';
        value.lifecycle.warningAt = '2026-08-28T22:00:00-04:00';
      }),
    ],
    [
      'after-eleven-pm-cutoff',
      refusalCase(destroy, (value) => {
        value.lifecycle.expiresAt = '2026-08-28T23:30:00-04:00';
        value.lifecycle.warningAt = '2026-08-28T22:30:00-04:00';
      }),
    ],
    [
      'wrong-warning-time',
      refusalCase(apply, (value) => (value.lifecycle.warningAt = '2026-08-28T20:30:00-04:00')),
    ],
    [
      'consumer-before-approval',
      refusalCase(apply, (value) => (value.consumer.consumedAt = '2026-08-28T14:25:00-04:00')),
    ],
    [
      'apply-identity-not-separated',
      refusalCase(
        apply,
        (value) => (value.consumer.identityReference = value.producer.identityReference),
      ),
    ],
  ]);

  assert(
    JSON.stringify([...refusals.keys()]) === JSON.stringify(contract.refusalScenarios),
    'Saved-plan refusal register drifted from executable cases.',
  );
  for (const [name, manifest] of refusals) {
    let refused = false;
    try {
      validateManifest(manifest);
    } catch {
      refused = true;
    }
    assert(refused, `${name} unexpectedly passed.`);
  }
  return refusals.size;
}

assertStaticContract();
const validManifests = new Map();
for (const operation of contract.operations) {
  const manifestPath = join(fixtureRoot, operation.fixtureManifest);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const result = validateManifest(manifest);
  validManifests.set(result.operation, manifest);
}
const refusalCount = assertRefusalScenarios(validManifests);

console.log(
  `Historical V1 saved-plan evidence passed for ${validManifests.size} synthetic producer-consumer manifests, ${refusalCount} refusal scenarios, ${contract.requiredEvidenceFieldsFromOidcContract.length} OIDC evidence fields, and zero checked-in Terraform plan/state artifacts; it is not valid for two-phase Azure activation.`,
);
