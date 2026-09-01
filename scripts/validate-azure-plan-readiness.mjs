import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readiness = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/azure-plan-readiness.v1.json'), 'utf8'),
);
const foundation = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/terraform-foundation.v1.json'), 'utf8'),
);
const providerEvidence = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/azure-provider-scope-plan.v1.json'), 'utf8'),
);
const savedPlanV1 = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/saved-plan-evidence.v1.json'), 'utf8'),
);
const runLedgerV1 = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/ephemeral-run-ledger.v1.json'), 'utf8'),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validate(candidate) {
  assert(candidate.schemaVersion === 1, 'Plan-readiness schema drifted.');
  assert(
    candidate.checkpoint === 'M05-control-plane-applied-verified-022',
    'Plan-readiness checkpoint drifted.',
  );
  assert(
    candidate.activationStatus === 'control_plane_applied_verified',
    'Readiness status drifted from the applied and verified control plane.',
  );
  assert(
    candidate.workload === 'local-missions' && candidate.region === 'eastus2',
    'Workload or region drifted.',
  );
  assert(
    candidate.subscriptionCreated &&
      candidate.azureResourceMutationExecuted &&
      candidate.providerRegistrationExecuted &&
      candidate.savedPlanCreated,
    'Subscription, mutation, provider-registration, or saved-plan status drifted.',
  );

  const evidence = candidate.bootstrapPlanEvidence;
  assert(
    evidence.logicalName === 'local-missions-bootstrap.tfplan' &&
      /^[0-9a-f]{64}$/.test(evidence.sha256) &&
      evidence.byteSize > 0 &&
      evidence.terraformVersion === '1.15.7' &&
      evidence.azurermProviderVersion === '5.0.1' &&
      /^[0-9a-f]{64}$/.test(evidence.providerLockSha256) &&
      /^[0-9a-f]{64}$/.test(evidence.bootstrapSourceSha256AtPlan) &&
      /^[0-9a-f]{64}$/.test(evidence.bootstrapSourceSha256AfterMigration) &&
      /^[0-9a-f]{40}$/.test(evidence.gitHead) &&
      evidence.gitWorktreeDirty &&
      !evidence.binaryStoredInRepository &&
      !evidence.rawJsonStoredInRepository &&
      evidence.binaryDeletedAfterApply &&
      evidence.localStateDeletedAfterMigration &&
      evidence.knownSecretValueCount === 0 &&
      evidence.trustedIpv4RuleCount === 1 &&
      !evidence.trustedIpv4ValueRetained &&
      evidence.azureResourceGroupsAfterPlan === 0 &&
      evidence.azureResourcesAfterPlan === 0 &&
      evidence.storageProviderRegistrationBeforeApply === 'Registered' &&
      evidence.resourcesToAdd === 3 &&
      evidence.resourcesToChange === 0 &&
      evidence.resourcesToDestroy === 0 &&
      evidence.independentReviewMode === 'streamed_terraform_json_inspection' &&
      evidence.terraformManagedResourcesAfterApply === 3 &&
      evidence.azureResourceGroupsAfterApply === 1 &&
      evidence.azureTopLevelResourcesAfterApply === 1 &&
      evidence.privateStateContainersAfterApply === 1 &&
      evidence.temporaryOperatorContainerRoleAssignments === 1 &&
      evidence.remoteBackendKey === 'local-missions/bootstrap.tfstate' &&
      evidence.remoteBackendUsesMicrosoftEntra &&
      evidence.remoteStateVersionHistoryVerified &&
      evidence.remoteStateLockVerified &&
      evidence.sensitiveOutputIncidentRecorded &&
      !evidence.credentialOrSecretExposed,
    'Bootstrap saved-plan evidence drifted.',
  );
  const generatedAt = new Date(evidence.generatedAtUtc);
  const expiresAt = new Date(evidence.expiresAtUtc);
  const warningAt = new Date(evidence.warningAtUtc);
  const appliedAt = new Date(evidence.appliedAtUtc);
  const migratedAt = new Date(evidence.migratedAtUtc);
  assert(
    Number.isFinite(generatedAt.getTime()) &&
      expiresAt > generatedAt &&
      expiresAt - generatedAt <= 8 * 60 * 60 * 1000 &&
      expiresAt - warningAt === 60 * 60 * 1000 &&
      appliedAt > generatedAt &&
      appliedAt < expiresAt &&
      migratedAt >= appliedAt,
    'Bootstrap plan expiry or warning window drifted.',
  );

  const controlEvidence = candidate.controlPlanePlanEvidence;
  assert(
    controlEvidence.logicalName === 'local-missions-control-plane.tfplan' &&
      /^[0-9a-f]{64}$/.test(controlEvidence.sha256) &&
      controlEvidence.byteSize > 0 &&
      controlEvidence.terraformVersion === '1.15.7' &&
      controlEvidence.azurermProviderVersion === '5.0.1' &&
      /^[0-9a-f]{64}$/.test(controlEvidence.providerLockSha256) &&
      /^[0-9a-f]{64}$/.test(controlEvidence.controlPlaneSourceSha256AtPlan) &&
      /^[0-9a-f]{64}$/.test(controlEvidence.controlPlaneSourceSha256AfterApply) &&
      /^[0-9a-f]{40}$/.test(controlEvidence.gitHead) &&
      controlEvidence.gitWorktreeDirty &&
      !controlEvidence.binaryStoredInRepository &&
      !controlEvidence.rawJsonStoredInRepository &&
      controlEvidence.resourcesToAdd === 20 &&
      controlEvidence.resourcesToChange === 0 &&
      controlEvidence.resourcesToDestroy === 0 &&
      controlEvidence.resourcesToReplace === 0 &&
      controlEvidence.reviewedResourceTypeCount === 7 &&
      controlEvidence.knownSecretValueCount === 0 &&
      controlEvidence.knownEmailValueCount === 1 &&
      !controlEvidence.alertDestinationRetainedInRepository &&
      controlEvidence.monthlyBudgetUsd === 100 &&
      controlEvidence.actualBudgetAlertCount === 3 &&
      controlEvidence.forecastBudgetAlertCount === 3 &&
      controlEvidence.workflowIdentityCount === 3 &&
      controlEvidence.immutableFederatedCredentialCount === 3 &&
      controlEvidence.workflowRoleAssignmentCount === 5 &&
      controlEvidence.stateBackendRoleAssignmentCount === 3 &&
      controlEvidence.customRoleDefinitionCount === 2 &&
      controlEvidence.paidWorkloadResourceCount === 0 &&
      controlEvidence.remoteBackendKey === 'local-missions/control-plane.tfstate' &&
      controlEvidence.emptyRemoteStateCreatedByPlan &&
      controlEvidence.remoteStateManagedResourceCount === 0 &&
      controlEvidence.independentReviewPassCount === 2 &&
      controlEvidence.failedSubjectConstructionIncidentRecorded &&
      !controlEvidence.credentialOrSecretExposed &&
      controlEvidence.azureResourceGroupsAfterPlan === 1 &&
      controlEvidence.azureTopLevelResourcesAfterPlan === 1 &&
      controlEvidence.azureRoleAssignmentsAfterPlan === 2 &&
      controlEvidence.binaryConsumedAfterApply &&
      controlEvidence.resourcesAddedByApply === 20 &&
      controlEvidence.resourcesChangedByApply === 0 &&
      controlEvidence.resourcesDestroyedByApply === 0 &&
      controlEvidence.terraformManagedResourcesAfterApply === 20 &&
      controlEvidence.terraformDataReferencesAfterApply === 1 &&
      controlEvidence.azureResourceGroupsAfterApply === 3 &&
      controlEvidence.emptyWorkloadLandingZoneVerified &&
      controlEvidence.workflowStateBackendRoleAssignmentsAfterApply === 3 &&
      controlEvidence.temporaryOperatorStateBackendRoleAssignmentsAfterApply === 1 &&
      controlEvidence.normalPlanAfterBudgetDateCorrectionIsZeroChange &&
      controlEvidence.budgetPeriodAzureNormalizationRecorded &&
      controlEvidence.budgetStartDateAfterNormalization === '2026-09-01T00:00:00Z' &&
      controlEvidence.budgetEndDateAfterNormalization === '2027-09-01T00:00:00Z' &&
      controlEvidence.postApplyKnownSecretValueCount === 0 &&
      controlEvidence.postApplyIdentifierRedactionIncidentRecorded,
    'Control-plane saved-plan evidence drifted.',
  );
  const controlGeneratedAt = new Date(controlEvidence.generatedAtUtc);
  const controlExpiresAt = new Date(controlEvidence.expiresAtUtc);
  const controlAppliedAt = new Date(controlEvidence.appliedAtUtc);
  assert(
    Number.isFinite(controlGeneratedAt.getTime()) &&
      controlExpiresAt > controlGeneratedAt &&
      controlExpiresAt - controlGeneratedAt <= 8 * 60 * 60 * 1000 &&
      controlAppliedAt > controlGeneratedAt &&
      controlAppliedAt < controlExpiresAt,
    'Control-plane plan expiry or apply time drifted.',
  );
  const federationEvidence = candidate.federationMigrationPlanEvidence;
  assert(
    federationEvidence.checkpoint === 'M05-free-org-federation-saved-plan-reviewed-027' &&
      /^[0-9a-f]{64}$/.test(federationEvidence.sha256) &&
      federationEvidence.byteSize === 26493 &&
      federationEvidence.generatedAtUtc === '2026-09-01T14:03:04Z' &&
      federationEvidence.providerLockSha256 === controlEvidence.providerLockSha256 &&
      /^[0-9a-f]{64}$/.test(federationEvidence.controlPlaneSourceSha256Current) &&
      /^[0-9a-f]{64}$/.test(federationEvidence.sourceSetSha256) &&
      federationEvidence.binaryStoredInRepository === false &&
      federationEvidence.rawJsonStoredInRepository === false &&
      federationEvidence.resourcesToAdd === 0 &&
      federationEvidence.resourcesToChange === 3 &&
      federationEvidence.resourcesToDestroy === 0 &&
      federationEvidence.resourcesToReplace === 0 &&
      federationEvidence.networkChanges === 0 &&
      federationEvidence.rbacChanges === 0 &&
      federationEvidence.budgetChanges === 0 &&
      federationEvidence.workloadChanges === 0 &&
      federationEvidence.federatedCredentialSubjectUpdates === 3 &&
      federationEvidence.terraformApplyExecuted === false &&
      federationEvidence.repositoryTransferred === false,
    'Federation migration saved-plan evidence drifted.',
  );
  const lockBytes = readFileSync(
    join(repositoryRoot, 'infra/terraform/bootstrap/.terraform.lock.hcl'),
  );
  assert(
    createHash('sha256').update(lockBytes).digest('hex') === evidence.providerLockSha256,
    'Bootstrap provider-lock digest drifted from saved-plan evidence.',
  );
  const controlLockBytes = readFileSync(
    join(repositoryRoot, 'infra/terraform/control-plane/.terraform.lock.hcl'),
  );
  assert(
    createHash('sha256').update(controlLockBytes).digest('hex') ===
      controlEvidence.providerLockSha256,
    'Control-plane provider-lock digest drifted from saved-plan evidence.',
  );
  const controlRoot = join(repositoryRoot, 'infra/terraform/control-plane');
  const controlSourceLines = readdirSync(controlRoot)
    .filter((name) => name.endsWith('.tf') || name === '.terraform.lock.hcl')
    .sort()
    .map((name) => {
      const relativePath = `infra/terraform/control-plane/${name}`;
      const digest = createHash('sha256')
        .update(readFileSync(join(controlRoot, name)))
        .digest('hex');
      return `${digest}  ${relativePath}\n`;
    })
    .join('');
  assert(
    createHash('sha256').update(controlSourceLines).digest('hex') ===
      federationEvidence.controlPlaneSourceSha256Current,
    'Control-plane source digest drifted from the reviewed federation plan.',
  );
  assert(
    controlEvidence.controlPlaneSourceSha256AfterApply ===
      'eee9a24837e0cd856e4370ec386ce08681ede230a4150278f8fcfdfcf4013f61',
    'Applied control-plane source evidence was overwritten by the pending migration.',
  );
  const bootstrapRoot = join(repositoryRoot, 'infra/terraform/bootstrap');
  const sourceLines = readdirSync(bootstrapRoot)
    .filter((name) => name.endsWith('.tf') || name === '.terraform.lock.hcl')
    .sort()
    .map((name) => {
      const relativePath = `infra/terraform/bootstrap/${name}`;
      const digest = createHash('sha256')
        .update(readFileSync(join(bootstrapRoot, name)))
        .digest('hex');
      return `${digest}  ${relativePath}\n`;
    })
    .join('');
  assert(
    createHash('sha256').update(sourceLines).digest('hex') ===
      evidence.bootstrapSourceSha256AfterMigration,
    'Bootstrap source digest drifted from post-migration evidence.',
  );

  const architecture = candidate.architecture;
  assert(architecture.terraformRoots === foundation.roots.length, 'Terraform root count drifted.');
  assert(
    architecture.bootstrapRetainedResources ===
      foundation.bootstrapContract.enabledPlanResourceChanges,
    'Bootstrap inventory drifted.',
  );
  assert(
    architecture.controlPlaneRetainedResources ===
      foundation.controlPlaneContract.enabledPlanResourceChanges,
    'Control-plane inventory drifted.',
  );
  assert(
    architecture.retainedWorkloadLandingZones === 1 &&
      architecture.workflowRoleAssignments ===
        foundation.controlPlaneContract.workflowRoleAssignmentCount &&
      architecture.stateBackendRoleAssignments ===
        foundation.controlPlaneContract.stateBackendRoleAssignmentCount &&
      architecture.customWorkloadRoleDefinitions ===
        foundation.controlPlaneContract.customWorkloadRoleDefinitionCount &&
      architecture.delegatedWorkloadRoleDefinitions ===
        foundation.controlPlaneContract.delegatedWorkloadRoleDefinitionCount,
    'Landing-zone or workflow RBAC inventory drifted.',
  );
  assert(
    architecture.workloadCoreResources === foundation.mockProviderContract.corePlanResourceChanges,
    'Core workload inventory drifted.',
  );
  assert(
    architecture.activatedWorkloadResources ===
      foundation.mockProviderContract.enabledPlanResourceChanges &&
      architecture.applicationActivationDeltaResources ===
        architecture.activatedWorkloadResources - architecture.workloadCoreResources,
    'Application activation delta drifted.',
  );
  assert(
    architecture.reviewedAzureResourceTypes ===
      foundation.mockProviderContract.allowedResourceTypes.length,
    'Reviewed resource-type inventory drifted.',
  );
  assert(architecture.defaultResourceChanges === 0, 'Default Terraform must remain zero-resource.');
  assert(
    architecture.separateWorkflowIdentities ===
      foundation.controlPlaneContract.separateIdentityCount &&
      architecture.budgetAlertRules === foundation.controlPlaneContract.budgetAlertCount,
    'Identity or budget-alert count drifted.',
  );
  assert(
    architecture.monthlyBudgetUsd === 100 && architecture.retainedStateMonthlyCeilingUsd === 1,
    'Cost boundary drifted.',
  );

  assert(candidate.sequence.length === 10, 'Execution sequence drifted.');
  candidate.sequence.forEach((step, index) => {
    assert(step.order === index + 1, `Sequence order drifted at ${step.id}.`);
    assert(step.approvalRequired, `${step.id} lost its explicit approval gate.`);
    assert(
      step.status === (index < 4 ? 'completed' : 'pending'),
      `${step.id} completion status drifted.`,
    );
  });
  assert(
    candidate.sequence.filter((step) => step.mutation).length === 6,
    'Mutation-stage count drifted.',
  );
  assert(
    candidate.sequence.findIndex((step) => step.id === 'image-publication') <
      candidate.sequence.findIndex((step) => step.id === 'application-plan-apply'),
    'Application planning must follow immutable image publication.',
  );

  const gates = candidate.readinessGates;
  assert(
    gates.length === 14 && new Set(gates.map((gate) => gate.id)).size === gates.length,
    'Readiness gate inventory drifted.',
  );
  const providerGate = gates.find((gate) => gate.id === 'provider-scope');
  assert(
    providerGate?.status === 'passed_for_bootstrap_apply' && !providerGate.blocking,
    'Provider scope is not recorded as passed for the bootstrap apply.',
  );
  assert(
    providerEvidence.planEvidence.providerScopePlanTestsPassed === 1 &&
      providerEvidence.planEvidence.resourcesToAdd === 0 &&
      !providerEvidence.planEvidence.azureMutationExecuted,
    'Provider-scope evidence no longer proves one zero-resource read-only plan.',
  );
  assert(
    savedPlanV1.activationUseAllowed === false &&
      savedPlanV1.supersededForActivationBy === candidate.checkpoint &&
      runLedgerV1.activationUseAllowed === false &&
      runLedgerV1.supersededForActivationBy === candidate.checkpoint,
    'Historical V1 saved-plan/run-ledger contracts must remain blocked for two-phase activation.',
  );
  assert(
    gates.filter((gate) => gate.blocking).length === 4 &&
      gates.filter((gate) => gate.blocking).every((gate) => !gate.status.startsWith('passed')) &&
      gates.filter((gate) => !gate.blocking).length === 10 &&
      gates
        .filter((gate) => !gate.blocking)
        .every(
          (gate) =>
            gate.status.startsWith('passed') ||
            gate.status.startsWith('dedicated_') ||
            gate.status.startsWith('approved_'),
        ),
    'Applied control-plane gates or unresolved workload gates drifted.',
  );

  const security = candidate.securityDecisions;
  assert(
    Object.values(security).every((value) => value === false),
    'A forbidden security or lifecycle path was enabled.',
  );
  const stateBackend = candidate.stateBackendAccess;
  assert(
    stateBackend.temporaryOperatorRole === 'Storage Blob Data Contributor' &&
      stateBackend.temporaryOperatorScope === 'state-container-only' &&
      stateBackend.temporaryOperatorAssignmentCount === 1 &&
      stateBackend.workflowRole === 'Storage Blob Data Contributor' &&
      stateBackend.workflowScope === 'state-container-only' &&
      stateBackend.plannedWorkflowAssignmentCount === 3 &&
      stateBackend.removeTemporaryOperatorAfterWorkflowProof,
    'State-backend least-privilege transition drifted.',
  );
  assert(candidate.sources.length === 10, 'Architecture source inventory drifted.');
  assert(
    candidate.sources.every(
      (source) =>
        source.startsWith('https://docs.github.com/') ||
        source.startsWith('https://learn.microsoft.com/') ||
        source.startsWith('https://developer.hashicorp.com/'),
    ),
    'Readiness sources must remain official GitHub, Microsoft, or HashiCorp documentation.',
  );

  const serialized = JSON.stringify(candidate);
  assert(
    !/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(serialized),
    'Readiness evidence contains a UUID.',
  );
  assert(
    !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized),
    'Readiness evidence contains an email address.',
  );
  assert(
    !/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(serialized),
    'Readiness evidence contains an IP address.',
  );

  const devVariables = readFileSync(
    join(repositoryRoot, 'infra/terraform/environments/dev/variables.tf'),
    'utf8',
  );
  const containerSource = readFileSync(
    join(repositoryRoot, 'infra/terraform/modules/workload-container-apps/main.tf'),
    'utf8',
  );
  assert(
    devVariables.includes('variable "application_activation_enabled"'),
    'Application activation gate is missing.',
  );
  assert(
    (containerSource.match(/count = var\.application_activation_enabled \? 1 : 0/g) ?? [])
      .length === 3,
    'Exactly three Container Apps must remain behind second-phase activation.',
  );
}

validate(readiness);

const refusalCases = [
  ['activation claimed', (value) => (value.activationStatus = 'active')],
  ['Azure resource mutation erased', (value) => (value.azureResourceMutationExecuted = false)],
  ['provider registration erased', (value) => (value.providerRegistrationExecuted = false)],
  ['saved plan erased', (value) => (value.savedPlanCreated = false)],
  ['plan digest drift', (value) => (value.bootstrapPlanEvidence.sha256 = 'invalid')],
  ['secret value claimed', (value) => (value.bootstrapPlanEvidence.knownSecretValueCount = 1)],
  ['trusted IP retained', (value) => (value.bootstrapPlanEvidence.trustedIpv4ValueRetained = true)],
  [
    'remote lock proof erased',
    (value) => (value.bootstrapPlanEvidence.remoteStateLockVerified = false),
  ],
  ['plan resource count drift', (value) => (value.bootstrapPlanEvidence.resourcesToAdd = 4)],
  ['control plan digest drift', (value) => (value.controlPlanePlanEvidence.sha256 = 'invalid')],
  [
    'federation plan digest drift',
    (value) => (value.federationMigrationPlanEvidence.sha256 = 'invalid'),
  ],
  [
    'federation plan apply claimed',
    (value) => (value.federationMigrationPlanEvidence.terraformApplyExecuted = true),
  ],
  [
    'federation plan network drift',
    (value) => (value.federationMigrationPlanEvidence.networkChanges = 1),
  ],
  [
    'control plan resource count drift',
    (value) => (value.controlPlanePlanEvidence.resourcesToAdd = 19),
  ],
  [
    'control paid workload claimed',
    (value) => (value.controlPlanePlanEvidence.paidWorkloadResourceCount = 1),
  ],
  ['bootstrap count drift', (value) => (value.architecture.bootstrapRetainedResources = 4)],
  ['control count drift', (value) => (value.architecture.controlPlaneRetainedResources = 8)],
  ['landing zone removed', (value) => (value.architecture.retainedWorkloadLandingZones = 0)],
  ['workflow RBAC drift', (value) => (value.architecture.workflowRoleAssignments = 4)],
  ['state backend RBAC drift', (value) => (value.architecture.stateBackendRoleAssignments = 2)],
  ['core count drift', (value) => (value.architecture.workloadCoreResources = 31)],
  [
    'activation delta drift',
    (value) => (value.architecture.applicationActivationDeltaResources = 4),
  ],
  ['identity sharing', (value) => (value.securityDecisions.sharedWorkflowIdentityAllowed = true)],
  [
    'name-based subject',
    (value) => (value.securityDecisions.nameBasedGithubSubjectsAllowed = true),
  ],
  [
    'other workload target',
    (value) => (value.securityDecisions.otherWorkloadTargetsAllowed = true),
  ],
  [
    'automatic registration',
    (value) => (value.securityDecisions.automaticProviderRegistrationAllowed = true),
  ],
  [
    'application before image',
    (value) => (value.securityDecisions.applicationPlanBeforeImagePublicationAllowed = true),
  ],
  [
    'retained state in daily destroy',
    (value) => (value.securityDecisions.dailyDestroyIncludesRetainedState = true),
  ],
  [
    'other workload in daily destroy',
    (value) => (value.securityDecisions.dailyDestroyIncludesOtherWorkloads = true),
  ],
  [
    'landing zone in daily destroy',
    (value) => (value.securityDecisions.dailyDestroyIncludesWorkloadLandingZone = true),
  ],
  [
    'subscription scope workload RBAC',
    (value) => (value.securityDecisions.subscriptionScopeWorkloadRbacAllowed = true),
  ],
  ['missing sequence step', (value) => value.sequence.pop()],
  ['sequence order drift', (value) => (value.sequence[1].order = 9)],
  ['mutation approval removed', (value) => (value.sequence[2].approvalRequired = false)],
  [
    'application before image publication',
    (value) => value.sequence.splice(6, 2, value.sequence[7], value.sequence[6]),
  ],
  [
    'blocking gate passed',
    (value) => {
      const gate = value.readinessGates.find((candidate) => candidate.blocking);
      gate.status = 'passed';
    },
  ],
  ['provider scope reblocked', (value) => (value.readinessGates[0].blocking = true)],
  ['UUID retained', (value) => (value.reviewedScope = '00000000-0000-4000-8000-000000000003')],
  ['email retained', (value) => (value.alert = 'person@example.com')],
  ['IP retained', (value) => (value.ip = '203.0.113.10')],
  ['unofficial source', (value) => value.sources.push('https://example.com')],
];

for (const [label, mutate] of refusalCases) {
  const candidate = clone(readiness);
  mutate(candidate);
  let refused = false;
  try {
    validate(candidate);
  } catch {
    refused = true;
  }
  assert(refused, `Expected readiness refusal did not fail: ${label}`);
}

console.log(
  `Azure plan readiness passed ${readiness.architecture.terraformRoots} roots, ${readiness.sequence.length} ordered stages, ${readiness.readinessGates.length} gates, and ${refusalCases.length} refusal scenarios; the control plane is applied and verified, and workload phases remain separately gated.`,
);
