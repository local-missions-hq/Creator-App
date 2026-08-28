import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readText(path) {
  return readFileSync(join(repositoryRoot, path), 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

const contract = readJson('config/recovery-drill.v1.json');
const foundation = readJson('config/terraform-foundation.v1.json');
const migrationManifest = readJson(contract.migrationContract.manifestPath);
const postgresqlModule = readText(contract.serviceContracts.postgresql.modulePath);
const blobModule = readText(contract.serviceContracts.blob.modulePath);
const containerAppsModule = readText(contract.serviceContracts.container_apps.modulePath);
const migrationRunbook = readText(contract.migrationContract.sourceRunbook);

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function clone(value) {
  return structuredClone(value);
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

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalDigest(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function drillPayload(drill) {
  const copy = clone(drill);
  delete copy.drillDigestSha256;
  return copy;
}

function drillDigest(drill) {
  return canonicalDigest(drillPayload(drill));
}

function rebindDrill(drill) {
  drill.drillDigestSha256 = drillDigest(drill);
  return drill;
}

function assertHexDigest(value, label) {
  assert(typeof value === 'string' && /^[0-9a-f]{64}$/.test(value), `${label} is not SHA-256.`);
}

function assertSyntheticReference(value, label) {
  assert(
    typeof value === 'string' && /^synthetic:[a-z0-9:-]+$/.test(value),
    `${label} must be an explicit synthetic reference.`,
  );
}

function assertTimestamp(value, label) {
  assert(
    typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:-04:00|-05:00)$/.test(value),
    `${label} must use an explicit New York offset.`,
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
    timeZone: foundation.expirationPolicy.timeZone,
    year: 'numeric',
  })
    .formatToParts(parsed)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const local = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  assert(local === value.slice(0, 19), `${label} offset is not America/New_York.`);
  return parsed;
}

function scanForSensitiveData(value) {
  const forbiddenFieldNames = new Set([
    'password',
    'clientsecret',
    'accesstoken',
    'refreshtoken',
    'accountkey',
    'connectionstring',
    'signature',
  ]);
  const forbiddenPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /AccountKey=/i,
    /SharedAccessSignature/i,
    /client_secret=/i,
    /password=/i,
    /(?:^|[?&])sig=/i,
  ];

  function scan(child) {
    if (Array.isArray(child)) {
      child.forEach(scan);
      return;
    }
    if (child && typeof child === 'object') {
      for (const [key, nested] of Object.entries(child)) {
        const normalized = key.toLowerCase().replaceAll(/[_-]/g, '');
        assert(
          !forbiddenFieldNames.has(normalized),
          `Recovery evidence contains forbidden field ${key}.`,
        );
        scan(nested);
      }
      return;
    }
    if (typeof child === 'string') {
      for (const pattern of forbiddenPatterns) {
        assert(!pattern.test(child), 'Recovery evidence contains a credential-shaped value.');
      }
    }
  }

  scan(value);
}

function assertContractCoherence(candidate = contract) {
  assertExactKeys(
    candidate,
    [
      'activationStatus',
      'activeWorkflowPresent',
      'checkpoint',
      'cloudEvidenceClaimed',
      'failureContract',
      'fixtureRoot',
      'fixtures',
      'liveRecoveryClaimed',
      'migrationContract',
      'planningTargets',
      'privacyContract',
      'refusalScenarios',
      'requiredReconciliationChecks',
      'serviceContracts',
    ],
    'Recovery contract',
  );
  assert(
    candidate.activationStatus === 'synthetic_contract_only',
    'Recovery activation must remain synthetic-only.',
  );
  assert(candidate.activeWorkflowPresent === false, 'An active recovery workflow is forbidden.');
  assert(candidate.cloudEvidenceClaimed === false, 'Cloud recovery evidence may not be claimed.');
  assert(candidate.liveRecoveryClaimed === false, 'Live recovery may not be claimed.');
  assert(
    candidate.checkpoint === 'M05-recovery-drill-contract-local-007',
    'Recovery checkpoint drifted.',
  );
  assert(candidate.fixtureRoot === 'config/fixtures/recovery-drill', 'Fixture root drifted.');
  assert(
    JSON.stringify(candidate.fixtures) ===
      JSON.stringify([
        'postgresql-pitr-complete.valid.json',
        'blob-retention-complete.valid.json',
        'container-revision-complete.valid.json',
        'postgresql-timeout-escalated.valid.json',
      ]),
    'Fixture inventory drifted.',
  );
  assert(
    candidate.refusalScenarios.length === 62 &&
      new Set(candidate.refusalScenarios).size === candidate.refusalScenarios.length,
    'Refusal inventory must contain 62 unique cases.',
  );
  assert(
    candidate.planningTargets.draftTargetsAreNotProviderSla === true,
    'Draft recovery targets must not be represented as a provider SLA.',
  );
  assertExactKeys(
    candidate.serviceContracts,
    ['blob', 'container_apps', 'postgresql'],
    'Service contracts',
  );
  assertExactKeys(
    candidate.serviceContracts.postgresql,
    [
      'backupRetentionDays',
      'isolatedTargetRequired',
      'mechanism',
      'modulePath',
      'pointInTimeRestoreRequired',
    ],
    'PostgreSQL service contract',
  );
  assertExactKeys(
    candidate.serviceContracts.blob,
    [
      'mechanism',
      'modulePath',
      'privateContainersRequired',
      'softDeleteMaximumDays',
      'softDeleteMinimumDays',
      'versioningRequired',
    ],
    'Blob service contract',
  );
  assertExactKeys(
    candidate.serviceContracts.container_apps,
    [
      'immutableImageDigestRequired',
      'mechanism',
      'minimumInactiveRevisions',
      'modulePath',
      'revisionMode',
    ],
    'Container Apps service contract',
  );
  assertExactKeys(
    candidate.planningTargets,
    ['blob', 'container_apps', 'draftTargetsAreNotProviderSla', 'postgresql'],
    'Planning targets',
  );
  for (const service of ['postgresql', 'blob', 'container_apps']) {
    assertExactKeys(
      candidate.planningTargets[service],
      ['rpoMinutes', 'rtoMinutes', 'timeoutMinutes'],
      `${service} planning target`,
    );
  }
  assertExactKeys(
    candidate.migrationContract,
    [
      'expectedMigrationCount',
      'forwardOnly',
      'hashAlgorithm',
      'manifestPath',
      'manifestSha256',
      'sourceRunbook',
    ],
    'Migration contract',
  );
  assertExactKeys(
    candidate.privacyContract,
    [
      'expiredOrDeletedDataMayNotReturnToActiveUse',
      'ordinarySupportRestoreForbidden',
      'privacyExclusionsMustReconcile',
      'syntheticDataOnly',
    ],
    'Recovery privacy contract',
  );
  assert(
    Object.values(candidate.privacyContract).every((value) => value === true),
    'Recovery privacy contract may not be weakened.',
  );
  assertExactKeys(
    candidate.failureContract,
    [
      'completeRequiresAllChecksMatch',
      'completeRequiresRpoAndRtoWithinTarget',
      'escalationMayNotClaimRecoveryComplete',
      'sourceMutationForbidden',
      'timeoutOrFailureRequiresAttachedIncident',
      'trafficMustRemainDrainedUntilVerified',
    ],
    'Recovery failure contract',
  );
  assert(
    Object.values(candidate.failureContract).every((value) => value === true),
    'Recovery failure contract may not be weakened.',
  );
  assert(
    candidate.serviceContracts.postgresql.modulePath ===
      'infra/terraform/modules/workload-postgresql/main.tf' &&
      candidate.serviceContracts.blob.modulePath ===
        'infra/terraform/modules/workload-storage/main.tf' &&
      candidate.serviceContracts.container_apps.modulePath ===
        'infra/terraform/modules/workload-container-apps/main.tf',
    'Recovery module paths drifted.',
  );
  assert(
    foundation.workloadSafeguards.postgresPointInTimeRestore === true &&
      foundation.workloadSafeguards.postgresBackupRetentionDays ===
        candidate.serviceContracts.postgresql.backupRetentionDays &&
      foundation.safeLowCostDefaults.postgresBackupRetentionDays ===
        candidate.serviceContracts.postgresql.backupRetentionDays,
    'PostgreSQL recovery assumptions drifted from the local foundation.',
  );
  assert(
    postgresqlModule.includes('backup_retention_days') &&
      postgresqlModule.includes('geo_redundant_backup_enabled  = false'),
    'PostgreSQL module no longer exposes the reviewed recovery safeguards.',
  );
  assert(
    blobModule.includes('versioning_enabled = true') &&
      blobModule.includes('container_delete_retention_policy') &&
      blobModule.includes('delete_retention_policy') &&
      blobModule.includes('permanent_delete_enabled = false'),
    'Blob module no longer exposes the reviewed recovery safeguards.',
  );
  assert(
    containerAppsModule.includes('revision_mode                = "Single"') &&
      containerAppsModule.match(/max_inactive_revisions\s+= 1/g)?.length === 2 &&
      containerAppsModule.includes('@sha256:'),
    'Container Apps module no longer retains the reviewed rollback boundary.',
  );
  assert(
    sha256(readText(candidate.migrationContract.manifestPath)) ===
      candidate.migrationContract.manifestSha256,
    'Migration manifest file hash drifted.',
  );
  assert(
    migrationManifest.entries.length === candidate.migrationContract.expectedMigrationCount,
    'Migration count drifted.',
  );
  migrationManifest.entries.forEach((entry, index) => {
    assert(entry.index === index, 'Migration entries are not contiguous.');
    assertHexDigest(entry.sqlSha256, 'Migration SQL digest');
    assertHexDigest(entry.snapshotSha256, 'Migration snapshot digest');
  });
  assert(
    candidate.migrationContract.forwardOnly === true &&
      migrationRunbook.includes('forward-only') &&
      migrationRunbook.includes('isolated temporary databases') &&
      migrationRunbook.includes('point-in-time recovery'),
    'Migration recovery runbook boundary drifted.',
  );
  assert(
    JSON.stringify(candidate.requiredReconciliationChecks) ===
      JSON.stringify([
        'migration_manifest',
        'row_counts',
        'public_ids',
        'status_histories',
        'audit_records',
        'privacy_exclusions',
        'application_readiness',
      ]),
    'Required reconciliation checks drifted.',
  );
  for (const [service, target] of Object.entries(candidate.planningTargets)) {
    if (service === 'draftTargetsAreNotProviderSla') continue;
    assert(
      Number.isInteger(target.rpoMinutes) &&
        target.rpoMinutes >= 0 &&
        Number.isInteger(target.rtoMinutes) &&
        target.rtoMinutes > 0 &&
        Number.isInteger(target.timeoutMinutes) &&
        target.timeoutMinutes > target.rtoMinutes,
      `${service} planning window is invalid.`,
    );
  }
}

function assertStrictSchema(drill) {
  assertExactKeys(
    drill,
    [
      'completedAt',
      'drillDigestSha256',
      'drillId',
      'environment',
      'evidence',
      'fixtureStatus',
      'incident',
      'operator',
      'outcome',
      'planning',
      'privacyDataClasses',
      'reconciliation',
      'recovery',
      'scenario',
      'schemaVersion',
      'service',
      'source',
      'startedAt',
      'target',
    ],
    'Recovery drill',
  );
  assertExactKeys(
    drill.source,
    [
      'appRevisionDigest',
      'environment',
      'migrationCount',
      'migrationManifestSha256',
      'objectVersionRef',
      'protectionRef',
      'resourceRef',
    ],
    'Recovery source',
  );
  assertExactKeys(
    drill.target,
    ['environment', 'isolation', 'resourceRef', 'sourceMutationAllowed', 'trafficState'],
    'Recovery target',
  );
  assertExactKeys(
    drill.planning,
    [
      'observedRecoveryDurationMinutes',
      'observedRecoveryPointAgeMinutes',
      'rpoMinutes',
      'rtoMinutes',
      'timeoutMinutes',
    ],
    'Recovery planning evidence',
  );
  assertExactKeys(
    drill.recovery,
    [
      'backupRetentionDays',
      'currentArtifactDigest',
      'finishedAt',
      'inactiveRevisionCount',
      'mechanism',
      'pointInTimeRestoreEnabled',
      'priorArtifactDigest',
      'privateContainer',
      'restoredArtifactDigest',
      'revisionMode',
      'selectedRecoveryRef',
      'softDeleteRetentionDays',
      'startedAt',
      'status',
      'versioningEnabled',
    ],
    'Recovery execution',
  );
  assert(
    Array.isArray(drill.privacyDataClasses) && drill.privacyDataClasses.length > 0,
    'Privacy data-class evidence is empty.',
  );
  for (const dataClass of drill.privacyDataClasses) {
    assertExactKeys(
      dataClass,
      ['activeUseAllowed', 'name', 'recovered', 'retentionStatus', 'syntheticOnly'],
      'Privacy data class',
    );
  }
  assertExactKeys(drill.reconciliation, ['checks', 'status'], 'Reconciliation evidence');
  assert(Array.isArray(drill.reconciliation.checks), 'Reconciliation checks must be an array.');
  for (const check of drill.reconciliation.checks) {
    assertExactKeys(
      check,
      ['afterDigest', 'beforeDigest', 'name', 'status'],
      'Reconciliation check',
    );
  }
  assertExactKeys(
    drill.evidence,
    [
      'contractRef',
      'logRef',
      'reconciliationRef',
      'recoveryExecutionRef',
      'sourceProtectionRef',
      'targetVerificationRef',
    ],
    'Recovery evidence references',
  );
  if (drill.incident !== null) {
    assertExactKeys(
      drill.incident,
      ['evidenceRefs', 'nextReviewAt', 'openedAt', 'owner', 'reasonCode', 'status'],
      'Recovery incident',
    );
  }
  assertExactKeys(drill.outcome, ['claim', 'recoveryComplete', 'status'], 'Recovery outcome');
}

const scenarioContract = {
  blob_retention_complete: { outcome: 'complete', service: 'blob', status: 'succeeded' },
  container_revision_complete: {
    outcome: 'complete',
    service: 'container_apps',
    status: 'succeeded',
  },
  postgresql_pitr_complete: { outcome: 'complete', service: 'postgresql', status: 'succeeded' },
  postgresql_timeout_escalated: {
    outcome: 'escalated',
    service: 'postgresql',
    status: 'timed_out',
  },
};

function assertBoundaryAndTiming(drill) {
  assert(drill.environment === 'synthetic-development', 'Recovery environment is not synthetic.');
  assertSyntheticReference(drill.operator, 'Recovery operator');
  const startedAt = assertTimestamp(drill.startedAt, 'startedAt');
  const completedAt = assertTimestamp(drill.completedAt, 'completedAt');
  assert(completedAt >= startedAt, 'Recovery drill completed before it started.');
  assert(
    drill.source.environment === 'synthetic-development-source',
    'Recovery source environment drifted.',
  );
  assertSyntheticReference(drill.source.resourceRef, 'Source resource');
  assertSyntheticReference(drill.source.protectionRef, 'Source protection');
  assertHexDigest(drill.source.appRevisionDigest, 'Source app revision');
  if (drill.source.objectVersionRef !== null) {
    assertSyntheticReference(drill.source.objectVersionRef, 'Source object version');
  }
  assert(
    drill.target.environment === 'synthetic-development-recovery' &&
      drill.target.isolation === 'isolated',
    'Recovery target must remain isolated.',
  );
  assertSyntheticReference(drill.target.resourceRef, 'Target resource');
  assert(drill.target.resourceRef !== drill.source.resourceRef, 'Source and target must differ.');
  assert(drill.target.sourceMutationAllowed === false, 'Recovery may not mutate the source.');
  assert(drill.target.trafficState === 'drained', 'Traffic must remain drained during recovery.');

  const recoveryStartedAt = assertTimestamp(drill.recovery.startedAt, 'recovery.startedAt');
  const recoveryFinishedAt = assertTimestamp(drill.recovery.finishedAt, 'recovery.finishedAt');
  assert(recoveryStartedAt >= startedAt, 'Recovery execution began before the drill.');
  assert(recoveryFinishedAt >= recoveryStartedAt, 'Recovery execution finished before it began.');
  assert(recoveryFinishedAt <= completedAt, 'Recovery execution finished after the drill.');
  const observedMinutes = (recoveryFinishedAt - recoveryStartedAt) / 60_000;
  assert(
    observedMinutes === drill.planning.observedRecoveryDurationMinutes,
    'Observed recovery duration does not match timestamps.',
  );
}

function assertPlanning(drill) {
  const targets = contract.planningTargets[drill.service];
  assert(targets, 'Unknown recovery planning service.');
  assert(
    drill.planning.rpoMinutes === targets.rpoMinutes &&
      drill.planning.rtoMinutes === targets.rtoMinutes &&
      drill.planning.timeoutMinutes === targets.timeoutMinutes,
    'Recovery planning window drifted.',
  );
  assert(
    Number.isInteger(drill.planning.observedRecoveryPointAgeMinutes) &&
      drill.planning.observedRecoveryPointAgeMinutes >= 0,
    'Observed recovery-point age is invalid.',
  );
  assert(
    Number.isInteger(drill.planning.observedRecoveryDurationMinutes) &&
      drill.planning.observedRecoveryDurationMinutes >= 0,
    'Observed recovery duration is invalid.',
  );
  if (drill.outcome.status === 'complete') {
    assert(
      drill.planning.observedRecoveryPointAgeMinutes <= drill.planning.rpoMinutes,
      'Complete recovery exceeded the RPO planning target.',
    );
    assert(
      drill.planning.observedRecoveryDurationMinutes <= drill.planning.rtoMinutes,
      'Complete recovery exceeded the RTO planning target.',
    );
  }
  if (drill.recovery.status === 'succeeded') {
    assert(
      drill.planning.observedRecoveryDurationMinutes <= drill.planning.timeoutMinutes,
      'Successful recovery exceeded the timeout.',
    );
  }
  if (drill.recovery.status === 'timed_out') {
    assert(
      drill.planning.observedRecoveryDurationMinutes > drill.planning.timeoutMinutes,
      'Timed-out recovery did not exceed its timeout.',
    );
  }
}

function assertServiceRecovery(drill) {
  const serviceContract = contract.serviceContracts[drill.service];
  assert(serviceContract, 'Unknown recovery service.');
  assert(drill.recovery.mechanism === serviceContract.mechanism, 'Recovery mechanism drifted.');
  assertSyntheticReference(drill.recovery.selectedRecoveryRef, 'Selected recovery point');

  if (drill.service === 'postgresql') {
    assert(
      drill.recovery.backupRetentionDays === serviceContract.backupRetentionDays,
      'PostgreSQL retention drifted.',
    );
    assert(
      drill.recovery.pointInTimeRestoreEnabled === true,
      'PostgreSQL PITR must remain enabled.',
    );
    assert(
      drill.recovery.versioningEnabled === null &&
        drill.recovery.softDeleteRetentionDays === null &&
        drill.recovery.privateContainer === null &&
        drill.recovery.revisionMode === null &&
        drill.recovery.inactiveRevisionCount === null,
      "PostgreSQL recovery contains another service's settings.",
    );
  }
  if (drill.service === 'blob') {
    assert(drill.recovery.versioningEnabled === true, 'Blob versioning must remain enabled.');
    assert(
      drill.recovery.softDeleteRetentionDays >= serviceContract.softDeleteMinimumDays &&
        drill.recovery.softDeleteRetentionDays <= serviceContract.softDeleteMaximumDays,
      'Blob soft-delete retention is outside the reviewed range.',
    );
    assert(drill.recovery.privateContainer === true, 'Blob recovery must remain private.');
    assertHexDigest(drill.recovery.priorArtifactDigest, 'Prior Blob artifact');
    assertHexDigest(drill.recovery.currentArtifactDigest, 'Current Blob artifact');
    assertHexDigest(drill.recovery.restoredArtifactDigest, 'Restored Blob artifact');
    assert(
      drill.recovery.currentArtifactDigest !== drill.recovery.priorArtifactDigest &&
        drill.recovery.restoredArtifactDigest === drill.recovery.priorArtifactDigest,
      'Blob recovery did not restore the selected prior artifact.',
    );
  }
  if (drill.service === 'container_apps') {
    assert(
      drill.recovery.revisionMode === serviceContract.revisionMode,
      'Container Apps revision mode drifted.',
    );
    assert(
      drill.recovery.inactiveRevisionCount >= serviceContract.minimumInactiveRevisions,
      'Container Apps previous revision is unavailable.',
    );
    assertHexDigest(drill.recovery.priorArtifactDigest, 'Prior image digest');
    assertHexDigest(drill.recovery.currentArtifactDigest, 'Current image digest');
    assertHexDigest(drill.recovery.restoredArtifactDigest, 'Restored image digest');
    assert(
      drill.recovery.currentArtifactDigest !== drill.recovery.priorArtifactDigest &&
        drill.recovery.restoredArtifactDigest === drill.recovery.priorArtifactDigest,
      'Container Apps did not restore the previous immutable revision.',
    );
  }
}

function assertMigrationAndReconciliation(drill) {
  assert(
    drill.source.migrationManifestSha256 === contract.migrationContract.manifestSha256,
    'Drill migration manifest hash drifted.',
  );
  assert(
    drill.source.migrationCount === contract.migrationContract.expectedMigrationCount,
    'Drill migration count drifted.',
  );
  const names = drill.reconciliation.checks.map((check) => check.name);
  assert(new Set(names).size === names.length, 'Reconciliation checks contain a duplicate.');
  assert(
    JSON.stringify([...names].sort()) ===
      JSON.stringify([...contract.requiredReconciliationChecks].sort()),
    'Reconciliation check inventory drifted.',
  );
  let mismatchCount = 0;
  for (const check of drill.reconciliation.checks) {
    assertHexDigest(check.beforeDigest, `${check.name} before digest`);
    assertHexDigest(check.afterDigest, `${check.name} after digest`);
    assert(['match', 'mismatch'].includes(check.status), 'Unknown reconciliation status.');
    if (check.status === 'match') {
      assert(check.beforeDigest === check.afterDigest, `${check.name} falsely reported a match.`);
    } else {
      mismatchCount += 1;
      assert(
        check.beforeDigest !== check.afterDigest,
        `${check.name} falsely reported a mismatch.`,
      );
    }
  }
  assert(
    (drill.reconciliation.status === 'matched' && mismatchCount === 0) ||
      (drill.reconciliation.status === 'mismatch' && mismatchCount > 0),
    'Reconciliation summary disagrees with its checks.',
  );
}

function assertPrivacyAndEvidence(drill) {
  for (const dataClass of drill.privacyDataClasses) {
    assert(/^synthetic_[a-z0-9_]+$/.test(dataClass.name), 'Data-class name is not synthetic.');
    assert(dataClass.syntheticOnly === true, 'Recovery data class must remain synthetic.');
    assert(
      ['active', 'expired', 'deleted'].includes(dataClass.retentionStatus),
      'Unknown data-class retention status.',
    );
    if (dataClass.retentionStatus !== 'active') {
      assert(dataClass.recovered === false, 'Expired or deleted data was restored.');
      assert(
        dataClass.activeUseAllowed === false,
        'Expired or deleted data returned to active use.',
      );
    }
    if (dataClass.recovered) {
      assert(dataClass.activeUseAllowed === true, 'Recovered active data is unusable.');
    }
  }
  const privacyCheck = drill.reconciliation.checks.find(
    (check) => check.name === 'privacy_exclusions',
  );
  assert(privacyCheck?.status === 'match', 'Privacy exclusions did not reconcile.');
  for (const [name, reference] of Object.entries(drill.evidence)) {
    assertSyntheticReference(reference, `Evidence ${name}`);
  }
}

function assertIncidentAndOutcome(drill) {
  const complete = drill.outcome.status === 'complete';
  assert(drill.outcome.claim === 'synthetic_only', 'Recovery outcome claim is not synthetic.');
  if (complete) {
    assert(drill.recovery.status === 'succeeded', 'Incomplete recovery was reported complete.');
    assert(drill.reconciliation.status === 'matched', 'Mismatch was reported complete.');
    assert(drill.incident === null, 'Clean complete recovery contains an incident.');
    assert(drill.outcome.recoveryComplete === true, 'Complete outcome denies recovery completion.');
  } else {
    assert(drill.outcome.status === 'escalated', 'Unknown recovery outcome.');
    assert(drill.outcome.recoveryComplete === false, 'Escalation claims recovery completion.');
    assert(drill.incident !== null, 'Failure or timeout requires an attached incident.');
    assert(
      drill.incident.status === 'open_attached',
      'Recovery incident is not open and attached.',
    );
    assert(
      typeof drill.incident.reasonCode === 'string' && drill.incident.reasonCode.length > 0,
      'Recovery incident reason is missing.',
    );
    assertSyntheticReference(drill.incident.owner, 'Incident owner');
    assert(
      Array.isArray(drill.incident.evidenceRefs) && drill.incident.evidenceRefs.length > 0,
      'Incident evidence is missing.',
    );
    drill.incident.evidenceRefs.forEach((reference) =>
      assertSyntheticReference(reference, 'Incident evidence'),
    );
    const openedAt = assertTimestamp(drill.incident.openedAt, 'incident.openedAt');
    const nextReviewAt = assertTimestamp(drill.incident.nextReviewAt, 'incident.nextReviewAt');
    assert(nextReviewAt >= openedAt, 'Incident review precedes incident opening.');
  }
}

function validateDrill(drill) {
  scanForSensitiveData(drill);
  assertStrictSchema(drill);
  assert(drill.schemaVersion === 1, 'Unsupported recovery schema.');
  assert(drill.fixtureStatus === 'synthetic_only', 'Recovery fixture is not synthetic.');
  const expected = scenarioContract[drill.scenario];
  assert(expected, 'Unknown recovery scenario.');
  assert(drill.service === expected.service, 'Recovery scenario uses the wrong service.');
  assert(drill.recovery.status === expected.status, 'Recovery scenario status drifted.');
  assert(drill.outcome.status === expected.outcome, 'Recovery scenario outcome drifted.');
  assertSyntheticReference(drill.drillId, 'Recovery drill ID');
  assertHexDigest(drill.drillDigestSha256, 'Recovery drill digest');
  assert(drill.drillDigestSha256 === drillDigest(drill), 'Recovery drill digest does not match.');
  assertBoundaryAndTiming(drill);
  assertPlanning(drill);
  assertServiceRecovery(drill);
  assertMigrationAndReconciliation(drill);
  assertPrivacyAndEvidence(drill);
  assertIncidentAndOutcome(drill);
  return drill.scenario;
}

function fixtureCase(base, mutate, { rebind = true } = {}) {
  const candidate = clone(base);
  mutate(candidate);
  if (rebind) rebindDrill(candidate);
  return () => validateDrill(candidate);
}

function contractCase(mutate) {
  const candidate = clone(contract);
  mutate(candidate);
  return () => assertContractCoherence(candidate);
}

function assertRefusals(validDrills) {
  const postgres = validDrills.get('postgresql_pitr_complete');
  const blob = validDrills.get('blob_retention_complete');
  const container = validDrills.get('container_revision_complete');
  const timeout = validDrills.get('postgresql_timeout_escalated');
  const badDigest = 'f'.repeat(64);
  const refusals = new Map([
    ['schema-version-drift', fixtureCase(postgres, (value) => (value.schemaVersion = 2))],
    ['non-synthetic-fixture', fixtureCase(postgres, (value) => (value.fixtureStatus = 'live'))],
    ['unknown-scenario', fixtureCase(postgres, (value) => (value.scenario = 'unknown'))],
    ['unknown-service', fixtureCase(postgres, (value) => (value.service = 'redis'))],
    ['malformed-drill-id', fixtureCase(postgres, (value) => (value.drillId = 'real-drill'))],
    [
      'drill-digest-mismatch',
      fixtureCase(postgres, (value) => (value.drillDigestSha256 = badDigest), { rebind: false }),
    ],
    ['active-workflow-claimed', contractCase((value) => (value.activeWorkflowPresent = true))],
    ['cloud-evidence-claimed', contractCase((value) => (value.cloudEvidenceClaimed = true))],
    ['live-recovery-claimed', contractCase((value) => (value.liveRecoveryClaimed = true))],
    ['wrong-environment', fixtureCase(postgres, (value) => (value.environment = 'production'))],
    ['non-synthetic-operator', fixtureCase(postgres, (value) => (value.operator = 'operator'))],
    ['invalid-start-time', fixtureCase(postgres, (value) => (value.startedAt = 'not-a-time'))],
    [
      'completion-before-start',
      fixtureCase(postgres, (value) => (value.completedAt = '2026-08-28T13:59:00-04:00')),
    ],
    ['unexpected-root-field', fixtureCase(postgres, (value) => (value.unexpected = true))],
    [
      'wrong-source-environment',
      fixtureCase(postgres, (value) => (value.source.environment = 'synthetic-staging-source')),
    ],
    [
      'non-synthetic-source-reference',
      fixtureCase(postgres, (value) => (value.source.resourceRef = 'postgresql-source')),
    ],
    [
      'source-mutation-allowed',
      fixtureCase(postgres, (value) => (value.target.sourceMutationAllowed = true)),
    ],
    ['target-not-isolated', fixtureCase(postgres, (value) => (value.target.isolation = 'shared'))],
    ['target-traffic-open', fixtureCase(postgres, (value) => (value.target.trafficState = 'open'))],
    [
      'same-source-and-target',
      fixtureCase(postgres, (value) => (value.target.resourceRef = value.source.resourceRef)),
    ],
    ['planning-rpo-drift', fixtureCase(postgres, (value) => (value.planning.rpoMinutes = 30))],
    ['planning-rto-drift', fixtureCase(postgres, (value) => (value.planning.rtoMinutes = 90))],
    [
      'planning-timeout-drift',
      fixtureCase(postgres, (value) => (value.planning.timeoutMinutes = 90)),
    ],
    [
      'recovery-point-too-old-complete',
      fixtureCase(postgres, (value) => (value.planning.observedRecoveryPointAgeMinutes = 16)),
    ],
    [
      'rto-exceeded-complete',
      fixtureCase(postgres, (value) => {
        value.recovery.finishedAt = '2026-08-28T15:10:00-04:00';
        value.completedAt = '2026-08-28T15:10:00-04:00';
        value.planning.observedRecoveryDurationMinutes = 65;
      }),
    ],
    [
      'timeout-reported-complete',
      fixtureCase(postgres, (value) => {
        value.recovery.status = 'timed_out';
        value.recovery.finishedAt = '2026-08-28T15:25:00-04:00';
        value.completedAt = '2026-08-28T15:25:00-04:00';
        value.planning.observedRecoveryDurationMinutes = 80;
      }),
    ],
    [
      'failure-reported-complete',
      fixtureCase(postgres, (value) => (value.recovery.status = 'failed')),
    ],
    [
      'wrong-recovery-mechanism',
      fixtureCase(postgres, (value) => (value.recovery.mechanism = 'snapshot_copy')),
    ],
    [
      'recovery-time-before-drill',
      fixtureCase(postgres, (value) => (value.recovery.startedAt = '2026-08-28T13:59:00-04:00')),
    ],
    [
      'recovery-finish-after-drill',
      fixtureCase(postgres, (value) => (value.recovery.finishedAt = '2026-08-28T14:51:00-04:00')),
    ],
    [
      'recovery-duration-drift',
      fixtureCase(postgres, (value) => (value.planning.observedRecoveryDurationMinutes = 41)),
    ],
    [
      'postgres-retention-drift',
      fixtureCase(postgres, (value) => (value.recovery.backupRetentionDays = 8)),
    ],
    [
      'postgres-pitr-disabled',
      fixtureCase(postgres, (value) => (value.recovery.pointInTimeRestoreEnabled = false)),
    ],
    [
      'blob-versioning-disabled',
      fixtureCase(blob, (value) => (value.recovery.versioningEnabled = false)),
    ],
    [
      'blob-soft-delete-too-short',
      fixtureCase(blob, (value) => (value.recovery.softDeleteRetentionDays = 6)),
    ],
    [
      'blob-soft-delete-too-long',
      fixtureCase(blob, (value) => (value.recovery.softDeleteRetentionDays = 15)),
    ],
    [
      'blob-container-public',
      fixtureCase(blob, (value) => (value.recovery.privateContainer = false)),
    ],
    [
      'container-revision-mode-drift',
      fixtureCase(container, (value) => (value.recovery.revisionMode = 'Multiple')),
    ],
    [
      'container-inactive-revision-missing',
      fixtureCase(container, (value) => (value.recovery.inactiveRevisionCount = 0)),
    ],
    [
      'container-image-not-digest',
      fixtureCase(container, (value) => (value.recovery.priorArtifactDigest = 'latest')),
    ],
    ['migration-count-drift', fixtureCase(postgres, (value) => (value.source.migrationCount = 19))],
    [
      'migration-manifest-hash-drift',
      fixtureCase(postgres, (value) => (value.source.migrationManifestSha256 = badDigest)),
    ],
    [
      'missing-reconciliation-check',
      fixtureCase(postgres, (value) => value.reconciliation.checks.pop()),
    ],
    [
      'duplicate-reconciliation-check',
      fixtureCase(postgres, (value) => {
        value.reconciliation.checks[6].name = value.reconciliation.checks[5].name;
      }),
    ],
    [
      'unknown-reconciliation-check',
      fixtureCase(postgres, (value) => (value.reconciliation.checks[6].name = 'queue_depth')),
    ],
    [
      'mismatched-digest-reported-match',
      fixtureCase(postgres, (value) => {
        value.reconciliation.checks[1].afterDigest = badDigest;
      }),
    ],
    [
      'reconciliation-mismatch-reported-complete',
      fixtureCase(postgres, (value) => {
        value.reconciliation.checks[1].afterDigest = badDigest;
        value.reconciliation.checks[1].status = 'mismatch';
        value.reconciliation.status = 'mismatch';
      }),
    ],
    [
      'expired-data-restored',
      fixtureCase(blob, (value) => (value.privacyDataClasses[1].recovered = true)),
    ],
    [
      'expired-data-active-use',
      fixtureCase(blob, (value) => (value.privacyDataClasses[1].activeUseAllowed = true)),
    ],
    [
      'non-synthetic-data-class',
      fixtureCase(blob, (value) => (value.privacyDataClasses[0].syntheticOnly = false)),
    ],
    [
      'privacy-exclusion-missing',
      fixtureCase(blob, (value) => {
        value.reconciliation.checks = value.reconciliation.checks.filter(
          (check) => check.name !== 'privacy_exclusions',
        );
      }),
    ],
    ['missing-evidence-reference', fixtureCase(postgres, (value) => (value.evidence.logRef = ''))],
    [
      'non-synthetic-evidence-reference',
      fixtureCase(postgres, (value) => (value.evidence.logRef = 'logs/recovery.txt')),
    ],
    [
      'incident-on-clean-complete',
      fixtureCase(postgres, (value) => (value.incident = clone(timeout.incident))),
    ],
    ['timeout-without-incident', fixtureCase(timeout, (value) => (value.incident = null))],
    [
      'failure-without-incident',
      fixtureCase(timeout, (value) => {
        value.recovery.status = 'failed';
        value.incident = null;
      }),
    ],
    ['incident-not-attached', fixtureCase(timeout, (value) => (value.incident.status = 'closed'))],
    ['incident-owner-missing', fixtureCase(timeout, (value) => (value.incident.owner = ''))],
    [
      'incident-review-before-open',
      fixtureCase(timeout, (value) => (value.incident.nextReviewAt = '2026-08-28T18:24:00-04:00')),
    ],
    [
      'escalation-claims-complete',
      fixtureCase(timeout, (value) => (value.outcome.recoveryComplete = true)),
    ],
    [
      'credential-shaped-field',
      fixtureCase(postgres, (value) => (value.clientSecret = 'synthetic')),
    ],
    [
      'credential-shaped-value',
      fixtureCase(postgres, (value) => (value.evidence.logRef = 'client_secret=forbidden')),
    ],
  ]);

  assert(
    JSON.stringify([...refusals.keys()]) === JSON.stringify(contract.refusalScenarios),
    'Implemented refusal cases drifted from the contract.',
  );
  for (const [name, validate] of refusals) {
    let refused = false;
    try {
      validate();
    } catch {
      refused = true;
    }
    assert(refused, `Expected refusal ${name} was accepted.`);
  }
  return refusals.size;
}

assertContractCoherence();

const validDrills = new Map();
for (const fixture of contract.fixtures) {
  const drill = readJson(join(contract.fixtureRoot, fixture));
  const scenario = validateDrill(drill);
  assert(!validDrills.has(scenario), `Duplicate recovery scenario ${scenario}.`);
  validDrills.set(scenario, drill);
}

assert(
  JSON.stringify([...validDrills.keys()].sort()) ===
    JSON.stringify(Object.keys(scenarioContract).sort()),
  'Recovery scenario coverage drifted.',
);

const refusalCount = assertRefusals(validDrills);
const completeCount = [...validDrills.values()].filter(
  (drill) => drill.outcome.status === 'complete',
).length;
const escalatedCount = validDrills.size - completeCount;

console.log(
  `Recovery drill contract passed: ${validDrills.size} synthetic drills ` +
    `(${completeCount} complete, ${escalatedCount} escalated), ` +
    `${contract.requiredReconciliationChecks.length} reconciliation checks, ` +
    `${refusalCount} expected refusals, and 0 cloud operations.`,
);
