import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = readJson('config/ephemeral-run-ledger.v1.json');
const foundation = readJson('config/terraform-foundation.v1.json');
const savedPlanContract = readJson('config/saved-plan-evidence.v1.json');
const readiness = readJson('config/azure-plan-readiness.v1.json');
const applyPlan = readJson('config/fixtures/saved-plan-evidence/apply.valid.json');
const destroyPlan = readJson('config/fixtures/saved-plan-evidence/destroy.valid.json');
const fixtureRoot = join(repositoryRoot, contract.fixtureRoot);

function readJson(path) {
  return JSON.parse(readFileSync(join(repositoryRoot, path), 'utf8'));
}

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

function ledgerPayload(ledger) {
  const copy = structuredClone(ledger);
  delete copy.ledgerDigestSha256;
  return copy;
}

function ledgerDigest(ledger) {
  return canonicalDigest(ledgerPayload(ledger));
}

function rebindLedger(ledger) {
  ledger.ledgerDigestSha256 = ledgerDigest(ledger);
  return ledger;
}

function clone(value) {
  return structuredClone(value);
}

function assertSyntheticReference(value, label) {
  assert(
    typeof value === 'string' && /^synthetic:[a-z0-9:-]+$/.test(value),
    `${label} must be an explicit synthetic reference.`,
  );
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
    timeZone: foundation.expirationPolicy.timeZone,
    year: 'numeric',
  })
    .formatToParts(parsed)
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  const representedLocal = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  assert(
    representedLocal === value.slice(0, 19),
    `${label} offset does not represent America/New_York local time.`,
  );
  return parsed;
}

function assertDurationWithin(start, finish, minutes, label) {
  const duration = finish.getTime() - start.getTime();
  assert(duration >= 0 && duration <= minutes * 60 * 1000, `${label} exceeded its timeout.`);
}

function assertStrictSchema(ledger) {
  assertExactKeys(
    ledger,
    [
      'events',
      'evidence',
      'finalReport',
      'fixtureStatus',
      'incident',
      'inventories',
      'ledgerDigestSha256',
      'planBindings',
      'run',
      'scenario',
      'schemaVersion',
    ],
    'Run ledger',
  );
  assertExactKeys(
    ledger.run,
    [
      'cleanupController',
      'commitSha',
      'endedAt',
      'expiresAt',
      'extensionCount',
      'lockStatus',
      'operator',
      'runId',
      'startedAt',
      'targetResourceGroup',
      'terraformRoot',
      'warningAt',
    ],
    'Run metadata',
  );
  assertExactKeys(
    ledger.planBindings,
    [
      'applyArtifactSha256',
      'applyReviewPayloadSha256',
      'destroyArtifactSha256',
      'destroyReviewPayloadSha256',
    ],
    'Plan bindings',
  );
  assertExactKeys(
    ledger.evidence,
    ['apply', 'decision', 'destroy', 'reconciliation', 'rollback', 'tests'],
    'Run evidence',
  );
  for (const section of ['apply', 'destroy']) {
    assertExactKeys(
      ledger.evidence[section],
      ['actor', 'evidenceRef', 'finishedAt', 'startedAt', 'status'],
      `${section} evidence`,
    );
  }
  assertExactKeys(
    ledger.evidence.tests,
    ['evidenceRef', 'finishedAt', 'gates', 'startedAt', 'status'],
    'Test evidence',
  );
  assertExactKeys(
    ledger.evidence.decision,
    ['actor', 'decidedAt', 'kind', 'reasonCode'],
    'Decision evidence',
  );
  assertExactKeys(
    ledger.evidence.rollback,
    ['actor', 'evidenceRef', 'finishedAt', 'startedAt', 'status'],
    'Rollback evidence',
  );
  assertExactKeys(
    ledger.evidence.reconciliation,
    ['actor', 'finishedAt', 'liveQueryRef', 'startedAt', 'stateQueryRef', 'status'],
    'Reconciliation evidence',
  );
  assertExactKeys(
    ledger.inventories,
    ['disposableAfter', 'disposableBefore', 'retained'],
    'Inventories',
  );
  assertExactKeys(
    ledger.inventories.disposableBefore,
    ['total', 'typeCounts'],
    'Disposable-before inventory',
  );
  assertExactKeys(
    ledger.inventories.disposableAfter,
    ['liveResourceCount', 'orphanRefs', 'terraformStateCount'],
    'Disposable-after inventory',
  );
  assertExactKeys(
    ledger.inventories.retained,
    ['expectedClasses', 'observedClasses', 'unexpectedRefs'],
    'Retained inventory',
  );
  if (ledger.incident !== null) {
    assertExactKeys(
      ledger.incident,
      ['evidenceRefs', 'nextReviewAt', 'openedAt', 'owner', 'reasonCode', 'status'],
      'Incident',
    );
  }
  assert(Array.isArray(ledger.events) && ledger.events.length > 0, 'Event ledger is empty.');
  for (const event of ledger.events) {
    assertExactKeys(
      event,
      ['actor', 'at', 'evidenceRef', 'from', 'reasonCode', 'sequence', 'to'],
      'Ledger event',
    );
  }
  assertExactKeys(
    ledger.finalReport,
    ['claim', 'completedAt', 'disposableWorkloadStatus', 'outcome', 'retainedControlPlaneStatus'],
    'Final report',
  );
}

function scanForSensitiveData(ledger) {
  const forbiddenFields = new Set(
    savedPlanContract.sanitizationContract.forbiddenFieldNames.map((field) => field.toLowerCase()),
  );
  const forbiddenPatterns = [
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
        assert(!forbiddenFields.has(key.toLowerCase()), `Ledger contains forbidden field ${key}.`);
        scan(child);
      }
      return;
    }
    if (typeof value === 'string') {
      for (const pattern of forbiddenPatterns) {
        assert(!pattern.test(value), 'Ledger contains a credential-shaped value.');
      }
    }
  }
  scan(ledger);
}

function assertContractCoherence() {
  assert(
    contract.activationStatus === 'synthetic_contract_only' &&
      contract.activeWorkflowPresent === false &&
      contract.cloudEvidenceClaimed === false,
    'Run-ledger contract must remain synthetic and inactive.',
  );
  assert(
    contract.checkpoint === 'M05-ephemeral-run-ledger-contract-local-006',
    'Run-ledger checkpoint identifier drifted.',
  );
  assert(
    contract.activationUseAllowed === false &&
      contract.supersededForActivationBy === readiness.checkpoint,
    'The V1 run ledger must remain historical and superseded for two-phase activation.',
  );
  assert(contract.digestAlgorithm === 'sha256', 'Run ledger must use SHA-256.');
  assert(contract.fixtures.length === 3, 'Exactly three terminal fixtures are required.');
  assert(
    JSON.stringify(contract.terminalStates) === JSON.stringify(['complete', 'escalated']),
    'Terminal state inventory drifted.',
  );
  assert(
    new Set(contract.states).size === contract.states.length &&
      contract.states.includes(contract.initialState) &&
      contract.terminalStates.every((state) => contract.states.includes(state)),
    'State inventory is incomplete or duplicated.',
  );
  assert(
    JSON.stringify(Object.keys(contract.allowedTransitions).sort()) ===
      JSON.stringify([...contract.states].sort()),
    'Every state must have an explicit transition list.',
  );
  for (const [from, targets] of Object.entries(contract.allowedTransitions)) {
    assert(
      Array.isArray(targets) && targets.every((target) => contract.states.includes(target)),
      `${from} has an unknown target state.`,
    );
  }
  assert(
    JSON.stringify(contract.requiredTestGates) ===
      JSON.stringify([
        'smoke',
        'integration',
        'e2e',
        'authorization',
        'upload',
        'queue',
        'webhook',
        'backup_restore',
        'reconciliation',
        'dashboard',
        'environment_isolation',
      ]),
    'Required test-gate inventory drifted.',
  );
  assert(
    contract.inventoryContract.disposableTypeCountsSource ===
      'historical-v1-workload-resource-inventory' &&
      contract.inventoryContract.expectedDisposableTotalBeforeDestroy === 31 &&
      foundation.workloadResourceInventory.total === 30 &&
      contract.inventoryContract.expectedDisposableTotalBeforeDestroy !==
        foundation.workloadResourceInventory.total &&
      contract.inventoryContract.expectedDisposableTotalAfterCleanDestroy === 0 &&
      contract.inventoryContract.unexpectedRetainedAllowed === false &&
      contract.inventoryContract.independentLiveAndStateQueriesRequired === true,
    'Run-ledger inventory contract drifted from the Terraform foundation.',
  );
  assert(
    contract.completionContract.completeRequiresDestroySucceeded === true &&
      contract.completionContract.completeRequiresDisposableStateCountZero === true &&
      contract.completionContract.completeRequiresDisposableLiveCountZero === true &&
      contract.completionContract.completeRequiresNoOrphans === true &&
      contract.completionContract.completeRequiresRetainedInventoryExact === true &&
      contract.completionContract.failedRunMayBeReportedComplete === false &&
      contract.completionContract.openIncidentRequiredForFailureOrTimeout === true &&
      contract.completionContract.orphanMustRemainAttachedUntilReconciled === true,
    'Run-ledger completion boundary drifted.',
  );
}

function assertPlanBindings(ledger) {
  assert(
    ledger.planBindings.applyArtifactSha256 === applyPlan.artifact.sha256,
    'Apply artifact binding drifted.',
  );
  assert(
    ledger.planBindings.applyReviewPayloadSha256 === applyPlan.review.reviewPayloadSha256,
    'Apply review binding drifted.',
  );
  assert(
    ledger.planBindings.destroyArtifactSha256 === destroyPlan.artifact.sha256,
    'Destroy artifact binding drifted.',
  );
  assert(
    ledger.planBindings.destroyReviewPayloadSha256 === destroyPlan.review.reviewPayloadSha256,
    'Destroy review binding drifted.',
  );
}

function assertRunBoundary(ledger) {
  const run = ledger.run;
  assertSyntheticReference(run.runId, 'Run id');
  assertSyntheticReference(run.operator, 'Run operator');
  assert(
    run.cleanupController === 'synthetic:identity:cleanup-controller',
    'Cleanup-controller reference drifted.',
  );
  assert(/^[0-9a-f]{40}$/.test(run.commitSha), 'Run commit must be a full SHA.');
  assert(
    run.terraformRoot === savedPlanContract.targetContract.exactTerraformRoot,
    'Run targeted another Terraform root.',
  );
  assert(
    new RegExp(savedPlanContract.targetContract.resourceGroupPattern).test(run.targetResourceGroup),
    'Run resource-group target is broad or malformed.',
  );
  assert(run.lockStatus === 'acquired', 'Run lock must be acquired.');
  assert(
    Number.isInteger(run.extensionCount) && run.extensionCount >= 0 && run.extensionCount <= 1,
    'Run extension count exceeded the one-extension ceiling.',
  );
  const startedAt = assertTimestamp(run.startedAt, 'run.startedAt');
  const warningAt = assertTimestamp(run.warningAt, 'run.warningAt');
  const expiresAt = assertTimestamp(run.expiresAt, 'run.expiresAt');
  const endedAt = assertTimestamp(run.endedAt, 'run.endedAt');
  const calendarDates = new Set(
    [run.startedAt, run.warningAt, run.expiresAt, run.endedAt].map((value) => value.slice(0, 10)),
  );
  assert(calendarDates.size === 1, 'Run crossed the New York calendar date.');
  assert(startedAt <= endedAt && endedAt <= expiresAt, 'Run end is outside its window.');
  assert(
    expiresAt.getTime() - startedAt.getTime() <=
      foundation.expirationPolicy.maxHours * 60 * 60 * 1000,
    'Run window exceeds eight hours.',
  );
  assert(
    expiresAt.getTime() - warningAt.getTime() ===
      foundation.expirationPolicy.warningMinutes * 60 * 1000,
    'Run warning is not exactly one hour before expiry.',
  );
  const [hour, minute, second] = run.expiresAt.slice(11, 19).split(':').map(Number);
  assert(
    hour < foundation.expirationPolicy.cutoffHourAmericaNewYork ||
      (hour === foundation.expirationPolicy.cutoffHourAmericaNewYork &&
        minute === 0 &&
        second === 0),
    'Run expiry exceeds the 11:00 PM New York cutoff.',
  );
}

function assertTestAndDecisionEvidence(ledger) {
  const tests = ledger.evidence.tests;
  const gateNames = Object.keys(tests.gates);
  assert(
    JSON.stringify(gateNames) === JSON.stringify(contract.requiredTestGates),
    'Test-gate evidence is missing, reordered, or unknown.',
  );
  assert(
    Object.values(tests.gates).every((status) => ['passed', 'failed', 'skipped'].includes(status)),
    'Test-gate status is invalid.',
  );
  const failedCount = Object.values(tests.gates).filter((status) => status === 'failed').length;
  if (tests.status === 'passed') {
    assert(
      Object.values(tests.gates).every((status) => status === 'passed'),
      'Passed test evidence contains a failed or skipped gate.',
    );
    assert(
      ledger.evidence.decision.kind === 'continue' &&
        ledger.evidence.rollback.status === 'not_required',
      'Passed tests must take the continue path without rollback.',
    );
  } else {
    assert(tests.status === 'failed' && failedCount > 0, 'Failed test evidence has no failure.');
    assert(
      ledger.evidence.decision.kind === 'rollback' &&
        ['succeeded', 'failed'].includes(ledger.evidence.rollback.status),
      'A failed critical test must take the rollback path.',
    );
  }
}

function assertEvidenceTimings(ledger) {
  const { apply, tests, rollback, destroy, reconciliation } = ledger.evidence;
  assertSyntheticReference(apply.actor, 'Apply actor');
  assertSyntheticReference(apply.evidenceRef, 'Apply evidence');
  const applyStart = assertTimestamp(apply.startedAt, 'apply.startedAt');
  const applyFinish = assertTimestamp(apply.finishedAt, 'apply.finishedAt');
  if (apply.status === 'succeeded') {
    assertDurationWithin(applyStart, applyFinish, contract.timeoutMinutes.apply, 'Apply');
  } else {
    assert(['failed', 'timed_out'].includes(apply.status), 'Apply status is invalid.');
  }

  assertSyntheticReference(tests.evidenceRef, 'Test evidence');
  const testsStart = assertTimestamp(tests.startedAt, 'tests.startedAt');
  const testsFinish = assertTimestamp(tests.finishedAt, 'tests.finishedAt');
  assertDurationWithin(testsStart, testsFinish, contract.timeoutMinutes.tests, 'Tests');

  assertSyntheticReference(ledger.evidence.decision.actor, 'Decision actor');
  assertTimestamp(ledger.evidence.decision.decidedAt, 'decision.decidedAt');
  assert(typeof ledger.evidence.decision.reasonCode === 'string', 'Decision reason is missing.');

  if (rollback.status === 'not_required') {
    assert(
      rollback.startedAt === null &&
        rollback.finishedAt === null &&
        rollback.actor === null &&
        rollback.evidenceRef === null,
      'Unused rollback evidence must be empty.',
    );
  } else {
    assert(['succeeded', 'failed'].includes(rollback.status), 'Rollback status is invalid.');
    assertSyntheticReference(rollback.actor, 'Rollback actor');
    assertSyntheticReference(rollback.evidenceRef, 'Rollback evidence');
    const rollbackStart = assertTimestamp(rollback.startedAt, 'rollback.startedAt');
    const rollbackFinish = assertTimestamp(rollback.finishedAt, 'rollback.finishedAt');
    if (rollback.status === 'succeeded') {
      assertDurationWithin(
        rollbackStart,
        rollbackFinish,
        contract.timeoutMinutes.rollback,
        'Rollback',
      );
    }
  }

  assert(
    ['succeeded', 'failed', 'timed_out'].includes(destroy.status),
    'Destroy status is invalid.',
  );
  assertSyntheticReference(destroy.actor, 'Destroy actor');
  assertSyntheticReference(destroy.evidenceRef, 'Destroy evidence');
  const destroyStart = assertTimestamp(destroy.startedAt, 'destroy.startedAt');
  const destroyFinish = assertTimestamp(destroy.finishedAt, 'destroy.finishedAt');
  const destroyDuration = destroyFinish.getTime() - destroyStart.getTime();
  if (destroy.status === 'succeeded') {
    assertDurationWithin(destroyStart, destroyFinish, contract.timeoutMinutes.destroy, 'Destroy');
  }
  if (destroy.status === 'timed_out') {
    assert(
      destroyDuration > contract.timeoutMinutes.destroy * 60 * 1000,
      'Destroy timeout was reported before the timeout boundary.',
    );
  }

  assert(
    ['clean', 'orphan_detected', 'inventory_mismatch'].includes(reconciliation.status),
    'Reconciliation status is invalid.',
  );
  assertSyntheticReference(reconciliation.actor, 'Reconciliation actor');
  assertSyntheticReference(reconciliation.stateQueryRef, 'State-query evidence');
  assertSyntheticReference(reconciliation.liveQueryRef, 'Live-query evidence');
  assert(
    reconciliation.actor !== destroy.actor,
    'Reconciliation must be independent from destroy execution.',
  );
  const reconcileStart = assertTimestamp(reconciliation.startedAt, 'reconciliation.startedAt');
  const reconcileFinish = assertTimestamp(reconciliation.finishedAt, 'reconciliation.finishedAt');
  assertDurationWithin(
    reconcileStart,
    reconcileFinish,
    contract.timeoutMinutes.reconciliation,
    'Reconciliation',
  );
}

function assertInventories(ledger) {
  const before = ledger.inventories.disposableBefore;
  const after = ledger.inventories.disposableAfter;
  const retained = ledger.inventories.retained;
  assert(
    before.total === contract.inventoryContract.expectedDisposableTotalBeforeDestroy,
    'Disposable-before total drifted.',
  );
  assert(
    JSON.stringify(before.typeCounts) ===
      JSON.stringify(contract.inventoryContract.historicalDisposableTypeCounts),
    'Disposable resource-type inventory drifted.',
  );
  assert(
    Number.isInteger(after.terraformStateCount) &&
      after.terraformStateCount >= 0 &&
      Number.isInteger(after.liveResourceCount) &&
      after.liveResourceCount >= 0 &&
      Array.isArray(after.orphanRefs),
    'Disposable-after inventory is invalid.',
  );
  after.orphanRefs.forEach((reference) => assertSyntheticReference(reference, 'Orphan'));
  assert(
    JSON.stringify(retained.expectedClasses) ===
      JSON.stringify(contract.inventoryContract.retainedClasses),
    'Retained expected inventory drifted.',
  );
  assert(
    JSON.stringify(retained.observedClasses) === JSON.stringify(retained.expectedClasses) &&
      retained.unexpectedRefs.length === 0,
    'Retained control-plane inventory is missing or unexpected.',
  );

  if (ledger.evidence.reconciliation.status === 'clean') {
    assert(
      after.terraformStateCount === 0 &&
        after.liveResourceCount === 0 &&
        after.orphanRefs.length === 0,
      'Clean reconciliation retained a disposable resource.',
    );
  }
  if (ledger.evidence.reconciliation.status === 'orphan_detected') {
    assert(
      after.orphanRefs.length > 0 &&
        after.orphanRefs.length === after.terraformStateCount + after.liveResourceCount,
      'Orphan inventory count does not match state/live evidence.',
    );
  }
}

function assertEventLedger(ledger) {
  let expectedFrom = contract.initialState;
  let previousTime = new Date(ledger.run.startedAt);
  const runEnd = new Date(ledger.run.endedAt);
  for (const [index, event] of ledger.events.entries()) {
    assert(event.sequence === index + 1, 'Event sequence is not contiguous.');
    assert(
      contract.states.includes(event.from) && contract.states.includes(event.to),
      'Event references an unknown state.',
    );
    assert(event.from === expectedFrom, 'Event chain is broken.');
    assert(
      contract.allowedTransitions[event.from].includes(event.to),
      `Illegal state transition ${event.from} -> ${event.to}.`,
    );
    const eventTime = assertTimestamp(event.at, `events[${index}].at`);
    assert(eventTime >= previousTime, 'Event timestamps are not monotonic.');
    assert(eventTime <= runEnd, 'Event occurred after the run ended.');
    assertSyntheticReference(event.actor, 'Event actor');
    assertSyntheticReference(event.evidenceRef, 'Event evidence');
    assert(
      typeof event.reasonCode === 'string' && event.reasonCode.length > 0,
      'Event reason is missing.',
    );
    if (contract.terminalStates.includes(event.to)) {
      assert(index === ledger.events.length - 1, 'Terminal event must be last.');
    }
    expectedFrom = event.to;
    previousTime = eventTime;
  }
  assert(
    contract.terminalStates.includes(expectedFrom),
    'Event ledger did not reach a terminal state.',
  );
  assert(
    expectedFrom === ledger.finalReport.outcome,
    'Final report disagrees with terminal state.',
  );

  const eventTo = (state) => ledger.events.find((event) => event.to === state);
  assert(
    eventTo('apply_started')?.at === ledger.evidence.apply.startedAt,
    'Apply-start evidence drifted.',
  );
  if (ledger.evidence.apply.status === 'succeeded') {
    assert(
      eventTo('apply_succeeded')?.at === ledger.evidence.apply.finishedAt,
      'Apply-finish evidence drifted.',
    );
  }
  assert(
    eventTo('tests_started')?.at === ledger.evidence.tests.startedAt,
    'Test-start evidence drifted.',
  );
  const testTerminal = ledger.evidence.tests.status === 'passed' ? 'tests_passed' : 'tests_failed';
  assert(
    eventTo(testTerminal)?.at === ledger.evidence.tests.finishedAt,
    'Test-finish evidence drifted.',
  );
  if (ledger.evidence.rollback.status !== 'not_required') {
    assert(
      eventTo('rollback_started')?.at === ledger.evidence.rollback.startedAt,
      'Rollback-start evidence drifted.',
    );
    const rollbackTerminal =
      ledger.evidence.rollback.status === 'succeeded' ? 'rollback_succeeded' : 'rollback_failed';
    assert(
      eventTo(rollbackTerminal)?.at === ledger.evidence.rollback.finishedAt,
      'Rollback-finish evidence drifted.',
    );
  }
  assert(
    eventTo('destroy_started')?.at === ledger.evidence.destroy.startedAt,
    'Destroy-start evidence drifted.',
  );
  const destroyTerminal = `destroy_${ledger.evidence.destroy.status}`;
  assert(
    eventTo(destroyTerminal)?.at === ledger.evidence.destroy.finishedAt,
    'Destroy-finish evidence drifted.',
  );
  assert(
    eventTo('reconciliation_started')?.at === ledger.evidence.reconciliation.startedAt,
    'Reconciliation-start evidence drifted.',
  );
  const reconciliationTerminal =
    ledger.evidence.reconciliation.status === 'clean'
      ? 'reconciled_clean'
      : ledger.evidence.reconciliation.status;
  assert(
    eventTo(reconciliationTerminal)?.at === ledger.evidence.reconciliation.finishedAt,
    'Reconciliation-finish evidence drifted.',
  );
}

function assertIncidentAndCompletion(ledger) {
  const eventStates = new Set(ledger.events.flatMap((event) => [event.from, event.to]));
  const failureRequiresIncident = [
    'apply_failed',
    'rollback_failed',
    'destroy_failed',
    'destroy_timed_out',
    'orphan_detected',
    'inventory_mismatch',
  ].some((state) => eventStates.has(state));

  if (failureRequiresIncident || ledger.finalReport.outcome === 'escalated') {
    assert(ledger.incident !== null, 'Failure or escalation requires an attached incident.');
    assert(ledger.incident.status === 'open_attached', 'Incident must remain open and attached.');
    assertSyntheticReference(ledger.incident.owner, 'Incident owner');
    ledger.incident.evidenceRefs.forEach((reference) =>
      assertSyntheticReference(reference, 'Incident evidence'),
    );
    assert(ledger.incident.evidenceRefs.length > 0, 'Incident evidence is missing.');
    const openedAt = assertTimestamp(ledger.incident.openedAt, 'incident.openedAt');
    const nextReviewAt = assertTimestamp(ledger.incident.nextReviewAt, 'incident.nextReviewAt');
    assert(openedAt <= nextReviewAt, 'Incident review precedes opening.');
    assert(nextReviewAt <= new Date(ledger.run.expiresAt), 'Incident review exceeds run expiry.');
    assert(eventStates.has('incident_opened'), 'Failure did not open an incident state.');
  } else {
    assert(ledger.incident === null, 'Clean complete run must not contain an incident.');
  }

  const final = ledger.finalReport;
  assert(final.claim === 'synthetic_only', 'Final report must remain synthetic.');
  assert(final.completedAt === ledger.run.endedAt, 'Final report completion time drifted.');
  if (final.outcome === 'complete') {
    assert(
      ledger.evidence.destroy.status === 'succeeded',
      'Complete run requires successful destroy.',
    );
    assert(
      ledger.evidence.reconciliation.status === 'clean',
      'Complete run requires clean reconciliation.',
    );
    assert(
      final.disposableWorkloadStatus === 'empty' && final.retainedControlPlaneStatus === 'expected',
      'Complete inventory labels are false.',
    );
    assert(
      ledger.evidence.tests.status === 'passed' || ledger.evidence.rollback.status === 'succeeded',
      'Complete run requires passing tests or successful rollback.',
    );
  } else {
    assert(final.outcome === 'escalated', 'Unknown final outcome.');
    assert(
      final.disposableWorkloadStatus === 'not_empty' ||
        ledger.evidence.destroy.status !== 'succeeded' ||
        ledger.evidence.reconciliation.status !== 'clean',
      'Clean run was escalated without a failure.',
    );
  }
}

function validateLedger(ledger) {
  assertStrictSchema(ledger);
  scanForSensitiveData(ledger);
  assert(ledger.schemaVersion === 1, 'Unsupported ledger schema.');
  assert(ledger.fixtureStatus === 'synthetic_only', 'Ledger fixture must remain synthetic.');
  assert(
    ['continue_complete', 'rollback_complete', 'orphan_escalated'].includes(ledger.scenario),
    'Unknown ledger scenario.',
  );
  assert(/^[0-9a-f]{64}$/.test(ledger.ledgerDigestSha256), 'Ledger digest is malformed.');
  assert(ledger.ledgerDigestSha256 === ledgerDigest(ledger), 'Ledger digest does not match.');
  assertPlanBindings(ledger);
  assertRunBoundary(ledger);
  assertTestAndDecisionEvidence(ledger);
  assertEvidenceTimings(ledger);
  assertInventories(ledger);
  assertEventLedger(ledger);
  assertIncidentAndCompletion(ledger);
  return ledger.scenario;
}

function refusalCase(base, mutate, { rebind = true } = {}) {
  const candidate = clone(base);
  mutate(candidate);
  if (rebind) rebindLedger(candidate);
  return candidate;
}

function assertRefusals(validLedgers) {
  const continued = validLedgers.get('continue_complete');
  const rolledBack = validLedgers.get('rollback_complete');
  const orphaned = validLedgers.get('orphan_escalated');
  const badDigest = 'f'.repeat(64);
  const refusals = new Map([
    ['schema-version-drift', refusalCase(continued, (value) => (value.schemaVersion = 2))],
    ['non-synthetic-fixture', refusalCase(continued, (value) => (value.fixtureStatus = 'live'))],
    ['unknown-scenario', refusalCase(continued, (value) => (value.scenario = 'unknown'))],
    [
      'ledger-digest-mismatch',
      refusalCase(continued, (value) => (value.ledgerDigestSha256 = badDigest), { rebind: false }),
    ],
    [
      'wrong-initial-state',
      refusalCase(continued, (value) => (value.events[0].from = 'apply_started')),
    ],
    [
      'unknown-event-state',
      refusalCase(continued, (value) => (value.events[2].to = 'unknown_state')),
    ],
    [
      'illegal-transition',
      refusalCase(continued, (value) => (value.events[2].to = 'destroy_started')),
    ],
    ['non-contiguous-sequence', refusalCase(continued, (value) => (value.events[4].sequence = 9))],
    [
      'broken-event-chain',
      refusalCase(continued, (value) => (value.events[5].from = 'tests_passed')),
    ],
    [
      'non-monotonic-event-time',
      refusalCase(continued, (value) => (value.events[5].at = '2026-08-28T15:00:00-04:00')),
    ],
    [
      'event-after-run-end',
      refusalCase(continued, (value) => (value.events[10].at = '2026-08-28T18:11:00-04:00')),
    ],
    [
      'terminal-event-not-last',
      refusalCase(continued, (value) => value.events.push(clone(value.events[10]))),
    ],
    [
      'wrong-terminal-state',
      refusalCase(continued, (value) => (value.finalReport.outcome = 'escalated')),
    ],
    ['malformed-run-id', refusalCase(continued, (value) => (value.run.runId = 'real-run'))],
    ['malformed-commit', refusalCase(continued, (value) => (value.run.commitSha = 'short'))],
    [
      'wrong-terraform-root',
      refusalCase(
        continued,
        (value) => (value.run.terraformRoot = 'infra/terraform/control-plane'),
      ),
    ],
    [
      'broad-resource-group',
      refusalCase(continued, (value) => (value.run.targetResourceGroup = '*')),
    ],
    [
      'wrong-cleanup-controller',
      refusalCase(continued, (value) => (value.run.cleanupController = 'synthetic:identity:other')),
    ],
    ['lock-not-acquired', refusalCase(continued, (value) => (value.run.lockStatus = 'missing'))],
    [
      'over-eight-hour-run',
      refusalCase(continued, (value) => {
        value.run.expiresAt = '2026-08-28T23:00:00-04:00';
        value.run.warningAt = '2026-08-28T22:00:00-04:00';
      }),
    ],
    [
      'after-eleven-pm-expiry',
      refusalCase(orphaned, (value) => {
        value.run.expiresAt = '2026-08-28T23:30:00-04:00';
        value.run.warningAt = '2026-08-28T22:30:00-04:00';
      }),
    ],
    [
      'wrong-warning-time',
      refusalCase(continued, (value) => (value.run.warningAt = '2026-08-28T20:30:00-04:00')),
    ],
    ['second-extension', refusalCase(continued, (value) => (value.run.extensionCount = 2))],
    [
      'apply-plan-artifact-mismatch',
      refusalCase(continued, (value) => (value.planBindings.applyArtifactSha256 = badDigest)),
    ],
    [
      'apply-plan-review-mismatch',
      refusalCase(continued, (value) => (value.planBindings.applyReviewPayloadSha256 = badDigest)),
    ],
    [
      'destroy-plan-artifact-mismatch',
      refusalCase(continued, (value) => (value.planBindings.destroyArtifactSha256 = badDigest)),
    ],
    [
      'destroy-plan-review-mismatch',
      refusalCase(
        continued,
        (value) => (value.planBindings.destroyReviewPayloadSha256 = badDigest),
      ),
    ],
    [
      'apply-timeout-unreported',
      refusalCase(
        continued,
        (value) => (value.evidence.apply.finishedAt = '2026-08-28T15:06:00-04:00'),
      ),
    ],
    [
      'tests-timeout-unreported',
      refusalCase(
        continued,
        (value) => (value.evidence.tests.finishedAt = '2026-08-28T17:00:00-04:00'),
      ),
    ],
    [
      'rollback-timeout-unreported',
      refusalCase(
        rolledBack,
        (value) => (value.evidence.rollback.finishedAt = '2026-08-28T16:06:00-04:00'),
      ),
    ],
    [
      'destroy-timeout-unreported',
      refusalCase(
        continued,
        (value) => (value.evidence.destroy.finishedAt = '2026-08-28T17:41:00-04:00'),
      ),
    ],
    [
      'reconciliation-timeout-unreported',
      refusalCase(
        continued,
        (value) => (value.evidence.reconciliation.finishedAt = '2026-08-28T17:51:00-04:00'),
      ),
    ],
    [
      'missing-test-gate',
      refusalCase(continued, (value) => delete value.evidence.tests.gates.webhook),
    ],
    [
      'unknown-test-gate',
      refusalCase(continued, (value) => (value.evidence.tests.gates.unknown = 'passed')),
    ],
    [
      'continue-with-failed-test',
      refusalCase(continued, (value) => {
        value.evidence.tests.status = 'failed';
        value.evidence.tests.gates.integration = 'failed';
      }),
    ],
    [
      'rollback-without-failed-test',
      refusalCase(rolledBack, (value) => {
        value.evidence.tests.status = 'passed';
        Object.keys(value.evidence.tests.gates).forEach(
          (key) => (value.evidence.tests.gates[key] = 'passed'),
        );
      }),
    ],
    [
      'failed-test-without-rollback',
      refusalCase(rolledBack, (value) => {
        value.evidence.decision.kind = 'continue';
        value.evidence.rollback.status = 'not_required';
      }),
    ],
    [
      'rollback-failure-without-incident',
      refusalCase(rolledBack, (value) => (value.evidence.rollback.status = 'failed')),
    ],
    [
      'wrong-disposable-before-count',
      refusalCase(continued, (value) => (value.inventories.disposableBefore.total = 27)),
    ],
    [
      'wrong-disposable-type-inventory',
      refusalCase(
        continued,
        (value) => (value.inventories.disposableBefore.typeCounts.storage = 3),
      ),
    ],
    [
      'clean-state-count-nonzero',
      refusalCase(
        continued,
        (value) => (value.inventories.disposableAfter.terraformStateCount = 1),
      ),
    ],
    [
      'clean-live-count-nonzero',
      refusalCase(continued, (value) => (value.inventories.disposableAfter.liveResourceCount = 1)),
    ],
    [
      'orphan-count-mismatch',
      refusalCase(orphaned, (value) => (value.inventories.disposableAfter.liveResourceCount = 2)),
    ],
    [
      'retained-inventory-missing',
      refusalCase(continued, (value) => value.inventories.retained.observedClasses.pop()),
    ],
    [
      'unexpected-retained-inventory',
      refusalCase(continued, (value) =>
        value.inventories.retained.unexpectedRefs.push('synthetic:resource:unexpected:001'),
      ),
    ],
    [
      'reconciliation-not-independent',
      refusalCase(
        continued,
        (value) => (value.evidence.reconciliation.actor = value.evidence.destroy.actor),
      ),
    ],
    [
      'missing-state-query-evidence',
      refusalCase(continued, (value) => (value.evidence.reconciliation.stateQueryRef = null)),
    ],
    [
      'missing-live-query-evidence',
      refusalCase(continued, (value) => (value.evidence.reconciliation.liveQueryRef = null)),
    ],
    [
      'destroy-failure-without-incident',
      refusalCase(continued, (value) => (value.evidence.destroy.status = 'failed')),
    ],
    ['destroy-timeout-without-incident', refusalCase(orphaned, (value) => (value.incident = null))],
    [
      'orphan-without-open-incident',
      refusalCase(orphaned, (value) => (value.incident.status = 'closed')),
    ],
    [
      'orphan-reported-complete',
      refusalCase(orphaned, (value) => (value.finalReport.outcome = 'complete')),
    ],
    [
      'failed-run-reported-complete',
      refusalCase(orphaned, (value) => {
        value.finalReport.outcome = 'complete';
        value.finalReport.disposableWorkloadStatus = 'empty';
      }),
    ],
    [
      'clean-run-reported-escalated-without-incident',
      refusalCase(continued, (value) => {
        value.events[10].to = 'escalated';
        value.finalReport.outcome = 'escalated';
      }),
    ],
    [
      'incident-not-attached',
      refusalCase(orphaned, (value) => (value.incident.status = 'open_detached')),
    ],
    ['incident-owner-missing', refusalCase(orphaned, (value) => (value.incident.owner = null))],
    [
      'incident-review-after-expiry',
      refusalCase(orphaned, (value) => (value.incident.nextReviewAt = '2026-08-28T22:01:00-04:00')),
    ],
    [
      'secret-shaped-evidence-field',
      refusalCase(continued, (value) => (value.evidence.tests.secret = 'forbidden')),
    ],
    [
      'unexpected-ledger-field',
      refusalCase(continued, (value) => (value.unreviewedMetadata = 'synthetic:unbound')),
    ],
  ]);

  assert(
    JSON.stringify([...refusals.keys()]) === JSON.stringify(contract.refusalScenarios),
    'Run-ledger refusal register drifted from executable cases.',
  );
  for (const [name, ledger] of refusals) {
    let refused = false;
    try {
      validateLedger(ledger);
    } catch {
      refused = true;
    }
    assert(refused, `${name} unexpectedly passed.`);
  }
  return refusals.size;
}

assertContractCoherence();
const validLedgers = new Map();
for (const fixture of contract.fixtures) {
  const ledger = JSON.parse(readFileSync(join(fixtureRoot, fixture), 'utf8'));
  const scenario = validateLedger(ledger);
  validLedgers.set(scenario, ledger);
}
const refusalCount = assertRefusals(validLedgers);

console.log(
  `Historical V1 run-ledger gate passed for ${validLedgers.size} terminal synthetic ledgers, ${contract.states.length} states, ${Object.values(contract.allowedTransitions).flat().length} allowed transitions, ${contract.requiredTestGates.length} required test gates, ${refusalCount} refusal scenarios, and separate disposable/retained inventories; it is not valid for two-phase Azure activation.`,
);
