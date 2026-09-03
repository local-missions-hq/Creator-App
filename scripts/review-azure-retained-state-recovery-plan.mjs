import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = readJson('config/azure-retained-state-recovery-plan-review.v1.json');
const fixtureRoot = 'config/fixtures/azure-retained-state-recovery-plan';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fileDigest(path) {
  return sha256(readFileSync(path));
}

function clone(value) {
  return structuredClone(value);
}

function canonicalContextDigest(context) {
  const copy = clone(context);
  delete copy.contextSha256;
  return sha256(JSON.stringify(copy));
}

function sorted(value) {
  return [...value].sort();
}

function exactKeys(value, expected, label) {
  assert(
    JSON.stringify(sorted(Object.keys(value))) === JSON.stringify(sorted(expected)),
    `${label} keys drifted.`,
  );
}

function exactChange(change, expected, label) {
  assert(
    change?.address === expected.address &&
      change?.type === expected.type &&
      JSON.stringify(change?.change?.actions) === JSON.stringify(expected.actions),
    `${label} drifted.`,
  );
}

function digestTrackedTerraformSource() {
  const tracked = execFileSync('git', ['ls-files', `${contract.sourceDigest.trackedRoot}/**`], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .sort();
  assert(tracked.length > 0, 'No tracked bootstrap source files found.');
  const payload = tracked
    .map((path) => `${path}\0${sha256(readFileSync(join(root, path)))}\n`)
    .join('');
  return sha256(payload);
}

function timezoneParts(value) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: contract.planArtifactContract.requiredTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
    })
      .formatToParts(value)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: partValue }) => [type, partValue]),
  );
}

function validateTimeWindow(context, requireCurrentTime) {
  const created = new Date(context.createdAt);
  const expires = new Date(context.expiresAt);
  assert(
    Number.isFinite(created.getTime()) && Number.isFinite(expires.getTime()),
    'Invalid plan times.',
  );
  assert(expires > created, 'Plan expiry must follow creation.');
  assert(
    expires.getTime() - created.getTime() <=
      contract.planArtifactContract.maximumAgeHours * 3_600_000,
    'Plan lifetime exceeds the maximum.',
  );
  const createdParts = timezoneParts(created);
  const expiresParts = timezoneParts(expires);
  assert(
    `${createdParts.year}-${createdParts.month}-${createdParts.day}` ===
      `${expiresParts.year}-${expiresParts.month}-${expiresParts.day}` &&
      Number(expiresParts.hour) <= contract.planArtifactContract.cutoffHour,
    'Plan crosses the New York date or cutoff.',
  );
  if (requireCurrentTime) {
    const now = Date.now();
    assert(created.getTime() <= now && expires.getTime() > now, 'Plan is not currently valid.');
  }
}

function validateContract(candidate) {
  assert(
    candidate.schemaVersion === 1 &&
      candidate.activationStatus === 'bootstrap_recovery_plan_reviewer_local_only' &&
      candidate.checkpoint === 'M05-bootstrap-recovery-plan-reviewer-local-038' &&
      candidate.status === 'reviewer_ready_no_plan_generated' &&
      candidate.operation === 'bootstrap-retained-state-recovery' &&
      candidate.terraformRoot === 'infra/terraform/bootstrap' &&
      candidate.terraformVersion === '1.15.7' &&
      candidate.providerLockPath === 'infra/terraform/bootstrap/.terraform.lock.hcl',
    'Plan reviewer identity drifted.',
  );
  const state = candidate.privateStateBinding;
  assert(
    state.logicalRoot === 'bootstrap' &&
      state.backendKey === 'local-missions/bootstrap.tfstate' &&
      state.sha256 === '47b089ac5fbe51dd156a06e2447b7caa51c7d9145a6fc221369bc2af35654125' &&
      state.bytes === 21838 &&
      state.requiredFileMode === '0600',
    'Private bootstrap state binding drifted.',
  );
  assert(
    candidate.sourceDigest.algorithm === 'sha256-of-sorted-path-null-file-sha256-newline-records' &&
      candidate.sourceDigest.trackedRoot === 'infra/terraform/bootstrap' &&
      candidate.sourceDigest.providerLockSeparatelyBound === true &&
      candidate.sourceDigest.fullCommitRequired === true,
    'Source binding contract drifted.',
  );
  const artifact = candidate.planArtifactContract;
  assert(
    artifact.planBinaryOutsideRepository === true &&
      artifact.planJsonOutsideRepository === true &&
      artifact.contextOutsideRepository === true &&
      artifact.regularFilesOnly === true &&
      artifact.symlinksAllowed === false &&
      artifact.requiredFileMode === '0600' &&
      artifact.maximumAgeHours === 8 &&
      artifact.requiredTimeZone === 'America/New_York' &&
      artifact.cutoffHour === 23 &&
      artifact.planMode === 'normal' &&
      artifact.artifactSha256Required === true &&
      artifact.planJsonSha256Required === true &&
      artifact.contextSha256Required === true,
    'Plan artifact boundary drifted.',
  );
  const plan = candidate.expectedPlan;
  assert(
    plan.plannedCreates === 2 &&
      plan.plannedUpdates === 0 &&
      plan.plannedDeletes === 0 &&
      plan.plannedReplacements === 0 &&
      plan.plannedNoOps === 1 &&
      plan.containerAppsAllowed === 0 &&
      plan.disposableWorkloadResourcesAllowed === 0,
    'Expected plan counts drifted.',
  );
  assert(
    JSON.stringify(plan.resourceChanges) ===
      JSON.stringify([
        {
          actions: ['no-op'],
          address: 'azurerm_resource_group.state[0]',
          type: 'azurerm_resource_group',
        },
        {
          actions: ['create'],
          address: 'azurerm_storage_account.state[0]',
          type: 'azurerm_storage_account',
        },
        {
          actions: ['create'],
          address: 'azurerm_storage_container.state[0]',
          type: 'azurerm_storage_container',
        },
      ]) &&
      JSON.stringify(plan.expectedExternalDrift) ===
        JSON.stringify([
          {
            actions: ['delete'],
            address: 'azurerm_storage_account.state[0]',
            type: 'azurerm_storage_account',
          },
          {
            actions: ['delete'],
            address: 'azurerm_storage_container.state[0]',
            type: 'azurerm_storage_container',
          },
        ]),
    'Exact recovery allowlist drifted.',
  );
  const safety = candidate.plannedValueSafeguards;
  assert(
    safety.resourceGroupName === 'rg-local-missions-state-eus2-001' &&
      safety.storageAccountName === 'stlmtfse2001' &&
      safety.containerName === 'tfstate' &&
      safety.location === 'eastus2' &&
      safety.storageAccountKind === 'StorageV2' &&
      safety.storageTier === 'Standard' &&
      safety.storageReplication === 'LRS' &&
      safety.accessTier === 'Hot' &&
      safety.defaultNetworkAction === 'Deny' &&
      JSON.stringify(safety.networkBypass) === JSON.stringify(['None']) &&
      safety.exactCurrentIpv4RuleCount === 1 &&
      safety.anonymousAccessAllowed === false &&
      safety.sharedKeyAllowed === false &&
      safety.localUsersAllowed === false &&
      safety.publicNetworkEndpointEnabled === true &&
      safety.httpsOnly === true &&
      safety.minimumTlsVersion === 'TLS1_2' &&
      safety.infrastructureEncryption === true &&
      safety.crossTenantReplication === false &&
      safety.versioning === true &&
      safety.changeFeed === true &&
      safety.blobDeleteRetentionDays === 30 &&
      safety.containerDeleteRetentionDays === 30 &&
      safety.containerAccessType === 'private' &&
      safety.monthlyCostCeilingUsd === 1 &&
      safety.preventDestroyRequiredInSource === true,
    'Planned-value safeguards drifted.',
  );
  assert(
    candidate.currentAuthorization.localFixtureValidationAllowed === true &&
      candidate.currentAuthorization.privateArtifactReviewAllowedAfterPlanGenerationApproval ===
        true &&
      Object.entries(candidate.currentAuthorization)
        .filter(
          ([key]) =>
            ![
              'localFixtureValidationAllowed',
              'privateArtifactReviewAllowedAfterPlanGenerationApproval',
            ].includes(key),
        )
        .every(([, value]) => value === false),
    'Recovery plan action was over-authorized.',
  );
  const serialized = JSON.stringify(candidate);
  assert(
    !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(serialized),
    'Identifier retained.',
  );
  assert(!/(?:\d{1,3}\.){3}\d{1,3}/.test(serialized), 'IPv4 retained.');
  assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized), 'Email retained.');
}

function validateContext(context, live) {
  exactKeys(
    context,
    [
      'schemaVersion',
      'syntheticFixture',
      'operation',
      'terraformRoot',
      'terraformVersion',
      'sourceCommitSha',
      'sourceDigestSha256',
      'providerLockSha256',
      'bootstrapStateSha256',
      'artifactSha256',
      'planJsonSha256',
      'planJsonDerivedFromArtifact',
      'contextSha256',
      'variableValuesSha256',
      'currentIpv4Sha256',
      'subscriptionResolutionProofSha256',
      'createdAt',
      'expiresAt',
      'fileMode',
      'planMode',
      'planCounts',
      'targetProof',
      'review',
      'authorization',
    ],
    'Context',
  );
  for (const field of contract.sanitizedContextRequiredFields)
    assert(field in context, `Context field missing: ${field}`);
  assert(
    context.schemaVersion === 1 && context.operation === contract.operation,
    'Context operation drifted.',
  );
  assert(
    context.terraformRoot === contract.terraformRoot &&
      context.terraformVersion === contract.terraformVersion,
    'Context Terraform binding drifted.',
  );
  assert(
    context.bootstrapStateSha256 === contract.privateStateBinding.sha256,
    'Context state binding drifted.',
  );
  assert(
    context.fileMode === '0600' &&
      context.planMode === 'normal' &&
      context.planJsonDerivedFromArtifact === true,
    'Context artifact controls drifted.',
  );
  for (const field of [
    'sourceDigestSha256',
    'providerLockSha256',
    'artifactSha256',
    'planJsonSha256',
    'contextSha256',
    'variableValuesSha256',
    'currentIpv4Sha256',
    'subscriptionResolutionProofSha256',
  ]) {
    assert(/^[a-f0-9]{64}$/.test(context[field]), `Invalid ${field}.`);
  }
  assert(/^[a-f0-9]{40}$/.test(context.sourceCommitSha), 'Invalid source commit.');
  assert(context.contextSha256 === canonicalContextDigest(context), 'Context digest drifted.');
  validateTimeWindow(context, live);
  exactKeys(
    context.planCounts,
    ['create', 'update', 'delete', 'replace', 'noOp', 'externalDriftDelete'],
    'Plan-count',
  );
  assert(
    context.planCounts.create === 2 &&
      context.planCounts.update === 0 &&
      context.planCounts.delete === 0 &&
      context.planCounts.replace === 0 &&
      context.planCounts.noOp === 1 &&
      context.planCounts.externalDriftDelete === 2,
    'Context plan counts drifted.',
  );
  exactKeys(
    context.targetProof,
    [
      'uniqueLocalMissionsSubscription',
      'retainedResourceGroupCount',
      'otherResourceGroupCount',
      'workloadResourceCount',
      'storageAccountCount',
      'otherProjectUntouched',
    ],
    'Target proof',
  );
  assert(
    context.targetProof.uniqueLocalMissionsSubscription === true &&
      context.targetProof.retainedResourceGroupCount === 3 &&
      context.targetProof.otherResourceGroupCount === 0 &&
      context.targetProof.workloadResourceCount === 0 &&
      context.targetProof.storageAccountCount === 0 &&
      context.targetProof.otherProjectUntouched === true,
    'Target proof drifted.',
  );
  assert(
    context.review.reviewCompleted === true && context.review.producer !== context.review.reviewer,
    'Independent review proof drifted.',
  );
  assert(
    context.authorization.planGenerationApprovalRecorded === true &&
      context.authorization.applyApproved === false &&
      context.authorization.roleMutationApproved === false &&
      context.authorization.stateUploadApproved === false &&
      context.authorization.workloadPlanApproved === false,
    'Context over-authorizes recovery.',
  );
  const sanitized = JSON.stringify(context);
  assert(!/(?:\d{1,3}\.){3}\d{1,3}/.test(sanitized), 'Context retained IPv4.');
  assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(sanitized), 'Context retained email.');
  if (live) {
    assert(context.syntheticFixture === false, 'Live review cannot use a synthetic context.');
    assert(
      context.sourceCommitSha ===
        execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      'Source commit drifted.',
    );
    assert(context.sourceDigestSha256 === digestTrackedTerraformSource(), 'Source digest drifted.');
    assert(
      context.providerLockSha256 === fileDigest(join(root, contract.providerLockPath)),
      'Provider lock drifted.',
    );
  } else {
    assert(context.syntheticFixture === true, 'Fixture must remain synthetic.');
  }
}

function validatePlan(plan) {
  assert(
    plan.format_version === '1.2' && plan.terraform_version === contract.terraformVersion,
    'Plan version drifted.',
  );
  assert(
    Array.isArray(plan.resource_changes) && plan.resource_changes.length === 3,
    'Unexpected plan resource count.',
  );
  for (const expected of contract.expectedPlan.resourceChanges) {
    const change = plan.resource_changes.find(({ address }) => address === expected.address);
    exactChange(change, expected, `Plan change ${expected.address}`);
  }
  assert(
    Array.isArray(plan.resource_drift) && plan.resource_drift.length === 2,
    'Unexpected external drift count.',
  );
  for (const expected of contract.expectedPlan.expectedExternalDrift) {
    const drift = plan.resource_drift.find(({ address }) => address === expected.address);
    exactChange(drift, expected, `External drift ${expected.address}`);
  }
  const resources = plan.planned_values?.root_module?.resources;
  assert(
    Array.isArray(resources) && resources.length === 3,
    'Planned resource values are incomplete.',
  );
  const byAddress = new Map(resources.map((resource) => [resource.address, resource.values]));
  const safety = contract.plannedValueSafeguards;
  const group = byAddress.get('azurerm_resource_group.state[0]');
  const storage = byAddress.get('azurerm_storage_account.state[0]');
  const container = byAddress.get('azurerm_storage_container.state[0]');
  assert(
    group?.name === safety.resourceGroupName && group?.location === safety.location,
    'Resource group safeguard drifted.',
  );
  assert(
    storage?.name === safety.storageAccountName &&
      storage?.resource_group_name === safety.resourceGroupName &&
      storage?.location === safety.location &&
      storage?.account_kind === safety.storageAccountKind &&
      storage?.account_tier === safety.storageTier &&
      storage?.account_replication_type === safety.storageReplication &&
      storage?.access_tier === safety.accessTier &&
      storage?.allow_nested_items_to_be_public === safety.anonymousAccessAllowed &&
      storage?.shared_access_key_enabled === safety.sharedKeyAllowed &&
      storage?.local_user_enabled === safety.localUsersAllowed &&
      storage?.public_network_access_enabled === safety.publicNetworkEndpointEnabled &&
      storage?.https_traffic_only_enabled === safety.httpsOnly &&
      storage?.min_tls_version === safety.minimumTlsVersion &&
      storage?.infrastructure_encryption_enabled === safety.infrastructureEncryption &&
      storage?.cross_tenant_replication_enabled === safety.crossTenantReplication,
    'Storage account safeguard drifted.',
  );
  const network = storage.network_rules?.[0];
  assert(
    network?.default_action === safety.defaultNetworkAction &&
      JSON.stringify(network?.bypass) === JSON.stringify(safety.networkBypass) &&
      Array.isArray(network?.ip_rules) &&
      network.ip_rules.length === safety.exactCurrentIpv4RuleCount &&
      network.ip_rules.every(
        (rule) => /^(?:\d{1,3}\.){3}\d{1,3}(?:\/32)?$/.test(rule) && !rule.startsWith('0.0.0.0'),
      ),
    'Storage network safeguard drifted.',
  );
  const blob = storage.blob_properties?.[0];
  assert(
    blob?.versioning_enabled === safety.versioning &&
      blob?.change_feed_enabled === safety.changeFeed &&
      blob?.delete_retention_policy?.[0]?.days === safety.blobDeleteRetentionDays &&
      blob?.delete_retention_policy?.[0]?.permanent_delete_enabled === false &&
      blob?.container_delete_retention_policy?.[0]?.days === safety.containerDeleteRetentionDays,
    'Storage blob safeguard drifted.',
  );
  assert(
    container?.name === safety.containerName &&
      container?.container_access_type === safety.containerAccessType,
    'Container safeguard drifted.',
  );
  const source = readFileSync(join(root, 'infra/terraform/bootstrap/main.tf'), 'utf8');
  assert(
    (source.match(/prevent_destroy\s*=\s*true/g) ?? []).length === 3,
    'Source prevent_destroy safeguard drifted.',
  );
}

function assertPrivateFile(path, label) {
  assert(isAbsolute(path), `${label} must be an absolute path.`);
  assert(
    !lstatSync(path).isSymbolicLink() && lstatSync(path).isFile(),
    `${label} must be a regular file.`,
  );
  const resolved = realpathSync(path);
  const relativeToRoot = relative(root, resolved);
  assert(
    relativeToRoot.startsWith('..') && !isAbsolute(relativeToRoot),
    `${label} must resolve outside the repository.`,
  );
  assert((statSync(resolved).mode & 0o777) === 0o600, `${label} mode must be 0600.`);
  return resolved;
}

function review({ planFile, planJsonFile, contextFile, live }) {
  const artifactPath = live ? assertPrivateFile(planFile, 'Plan binary') : join(root, planFile);
  const jsonPath = live ? assertPrivateFile(planJsonFile, 'Plan JSON') : join(root, planJsonFile);
  const evidencePath = live
    ? assertPrivateFile(contextFile, 'Review context')
    : join(root, contextFile);
  const context = JSON.parse(readFileSync(evidencePath, 'utf8'));
  const plan = JSON.parse(readFileSync(jsonPath, 'utf8'));
  validateContext(context, live);
  assert(context.artifactSha256 === fileDigest(artifactPath), 'Plan binary digest drifted.');
  assert(context.planJsonSha256 === fileDigest(jsonPath), 'Plan JSON digest drifted.');
  validatePlan(plan);
  return context;
}

function parseArguments(args) {
  if (args.length === 0) return { fixture: true };
  assert(args.length === 6, 'Use --plan-file <path> --plan-json <path> --context <path>.');
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) values.set(args[index], args[index + 1]);
  assert(
    values.size === 3 &&
      [...values.keys()].every((key) => ['--plan-file', '--plan-json', '--context'].includes(key)),
    'Unsupported reviewer argument.',
  );
  return {
    fixture: false,
    planFile: values.get('--plan-file'),
    planJsonFile: values.get('--plan-json'),
    contextFile: values.get('--context'),
  };
}

function expectRefusal(name, mutate) {
  const fixturePlan = readJson(`${fixtureRoot}/bootstrap-recovery-plan.valid.json`);
  const fixtureContext = readJson(`${fixtureRoot}/bootstrap-recovery-context.valid.json`);
  let refused = false;
  try {
    mutate(fixturePlan, fixtureContext);
    validateContext(fixtureContext, false);
    validatePlan(fixturePlan);
  } catch {
    refused = true;
  }
  assert(refused, `Expected refusal did not occur: ${name}`);
}

validateContract(contract);
const parsed = parseArguments(process.argv.slice(2));
if (parsed.fixture) {
  const fixtureContext = review({
    planFile: `${fixtureRoot}/bootstrap-recovery-plan.synthetic.fixture`,
    planJsonFile: `${fixtureRoot}/bootstrap-recovery-plan.valid.json`,
    contextFile: `${fixtureRoot}/bootstrap-recovery-context.valid.json`,
    live: false,
  });
  const refusals = {
    'context-digest-drift': (_, context) => (context.contextSha256 = '0'.repeat(64)),
    'context-ip-retained': (_, context) => (context.currentIpv4Sha256 = '198.51.100.10'),
    'plan-expired': (_, context) => (context.expiresAt = context.createdAt),
    'plan-delete': (plan) => (plan.resource_changes[1].change.actions = ['delete']),
    'plan-update': (plan) => (plan.resource_changes[1].change.actions = ['update']),
    'plan-replacement': (plan) => (plan.resource_changes[1].change.actions = ['delete', 'create']),
    'extra-resource': (plan) => plan.resource_changes.push(clone(plan.resource_changes[0])),
    'container-app': (plan) => (plan.resource_changes[1].type = 'azurerm_container_app'),
    'unexpected-drift': (plan) => plan.resource_drift.push(clone(plan.resource_drift[0])),
    'storage-public': (plan) =>
      (plan.planned_values.root_module.resources[1].values.allow_nested_items_to_be_public = true),
    'shared-key-enabled': (plan) =>
      (plan.planned_values.root_module.resources[1].values.shared_access_key_enabled = true),
    'broad-network': (plan) =>
      (plan.planned_values.root_module.resources[1].values.network_rules[0].ip_rules = [
        '0.0.0.0/0',
      ]),
    'network-bypass': (plan) =>
      (plan.planned_values.root_module.resources[1].values.network_rules[0].bypass = [
        'AzureServices',
      ]),
    'container-public': (plan) =>
      (plan.planned_values.root_module.resources[2].values.container_access_type = 'blob'),
    'wrong-state-hash': (_, context) => (context.bootstrapStateSha256 = '0'.repeat(64)),
    'apply-approved': (_, context) => (context.authorization.applyApproved = true),
    'workload-plan-approved': (_, context) => (context.authorization.workloadPlanApproved = true),
    'reviewer-not-independent': (_, context) => (context.review.reviewer = context.review.producer),
  };
  for (const [name, mutate] of Object.entries(refusals)) expectRefusal(name, mutate);
  console.log(
    `Bootstrap recovery plan reviewer passed for 2 creates, 1 no-op, 2 expected drift records, ${Object.keys(refusals).length} refusal scenarios, and no Terraform/Azure execution.`,
  );
  void fixtureContext;
} else {
  review({ ...parsed, live: true });
  console.log(
    'Bootstrap recovery plan review passed: 2 creates, 1 no-op, 2 expected drift records, zero planned delete/update/replacement, and no apply authorization.',
  );
}
