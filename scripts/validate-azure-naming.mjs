import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repositoryRoot, 'config/azure-naming.v1.json');
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

function calculateTier(candidate, tier) {
  if (!tier.azureResources) return 0;
  const rates = candidate.costRates;
  const hours = tier.maximumHours;
  const postgres =
    hours * rates.postgresComputePerHourUsd +
    ((rates.postgresStorageGb * rates.postgresStorageGbMonthUsd) / rates.monthHours) * hours;
  const containerApps =
    rates.containerAppCount *
      (rates.containerAppVcpuEach * rates.containerAppActiveVcpuSecondUsd +
        rates.containerAppMemoryGibEach * rates.containerAppActiveMemoryGibSecondUsd) *
      hours *
      3600 +
    (tier.requests / 1_000_000) * rates.containerAppMillionRequestsUsd;
  const serviceBus = hours * rates.serviceBusStandardPerHourUsd;
  const registry = rates.containerRegistryBasicPerDayUsd;
  const storage =
    (rates.blobStorageGb * rates.blobStorageGbMonthUsd * hours) / rates.monthHours +
    rates.blobOperationBlocksPerRunUsd;
  const keyVault = rates.keyVaultOperationBlockPerRunUsd;
  const telemetry = tier.billableLogIngestionGb * rates.logIngestionGbUsd;
  return postgres + containerApps + serviceBus + registry + storage + keyVault + telemetry;
}

function validate(candidate) {
  assert(candidate.schemaVersion === 1, 'Naming schema version drifted.');
  assert(candidate.workload.name === 'local-missions', 'Workload name drifted.');
  assert(candidate.workload.code === 'lm', 'Local Missions workload code must remain lm.');
  assert(candidate.workload.environmentCode === 'dev', 'Environment code drifted.');
  assert(candidate.workload.region === 'eastus2', 'Region drifted from the reviewed candidate.');
  assert(candidate.workload.regionCode === 'e2', 'East US 2 region code drifted.');

  const placement = candidate.subscriptionPlacement;
  assert(
    placement.mode === 'dedicated-local-missions' &&
      placement.observedCandidateEligible === false &&
      placement.observedCandidate === 'shared-nonproduction-subscription',
    'Subscription placement must retain the dedicated owner decision and reject the observed shared candidate.',
  );
  assert(placement.dedicatedSubscriptionPreferredBeforeStaging, 'Staging isolation gate missing.');
  assert(
    placement.exclusiveResourceGroupsRequired &&
      placement.exclusiveStateRequired &&
      placement.exclusiveIdentitiesRequired &&
      placement.exclusiveBudgetRequired,
    'Shared-subscription isolation controls are incomplete.',
  );
  assert(!placement.crossWorkloadTargetsAllowed, 'Cross-workload targets must remain forbidden.');
  assert(
    placement.coTenancyApplyApprovalRequired,
    'Shared-subscription apply approval is missing.',
  );
  assert(
    placement.localMissionsResourceGroupPrefix === 'rg-local-missions-' &&
      placement.observedOtherWorkloadResourceGroupPrefix === 'rg-pp-',
    'Workload prefixes drifted.',
  );

  const stamp = candidate.deploymentStamp;
  assert(new RegExp(stamp.pattern).test(stamp.example), 'Deployment-stamp example is invalid.');
  assert(
    stamp.example.length === stamp.minimumLength && stamp.example.length === stamp.maximumLength,
    'Deployment-stamp length drifted.',
  );
  assert(!stamp.reuseAllowed, 'Ephemeral deployment stamps must never be reused.');

  const ids = candidate.disposableNameTemplates.map((entry) => entry.id);
  assert(ids.length === 14 && new Set(ids).size === ids.length, 'Name-template inventory drifted.');
  const examples = new Set();
  for (const entry of candidate.disposableNameTemplates) {
    const expected = entry.template.replace('<stamp>', stamp.example);
    assert(entry.example === expected, `${entry.id} example drifted from its template.`);
    assert(new RegExp(entry.pattern).test(entry.example), `${entry.id} violates its pattern.`);
    assert(entry.example.length <= entry.maximumLength, `${entry.id} exceeds its length limit.`);
    assert(!examples.has(entry.example), `${entry.id} duplicates another resource name.`);
    assert(!entry.example.includes('post-proof'), `${entry.id} crossed into another workload.`);
    examples.add(entry.example);
  }

  const retained = candidate.retainedNames;
  assert(
    retained.controlResourceGroup.startsWith('rg-local-missions-control-') &&
      retained.stateResourceGroup.startsWith('rg-local-missions-state-') &&
      retained.workloadLandingZoneResourceGroup === 'rg-local-missions-dev-eus2-001',
    'Retained resource groups drifted from Local Missions ownership.',
  );
  assert(
    retained.controlResourceGroup !== retained.stateResourceGroup,
    'Control and state resource groups must be distinct.',
  );
  assert(
    ![
      retained.controlResourceGroup,
      retained.stateResourceGroup,
      retained.workloadLandingZoneResourceGroup,
    ].some((name, index, names) => names.indexOf(name) !== index),
    'Control, state, and workload landing-zone groups must be distinct.',
  );
  assert(retained.stateStorageAccount.length <= 24, 'State storage name is too long.');
  assert(/^[a-z0-9]+$/.test(retained.stateStorageAccount), 'State storage name is invalid.');
  assert(retained.stateContainer === 'tfstate', 'State container drifted.');
  assert(
    retained.controlStateKey !== retained.workloadStateKey,
    'Control and workload state keys must be distinct.',
  );

  const requiredTags = candidate.requiredTags;
  for (const key of [
    'application',
    'application_code',
    'environment',
    'region',
    'lifecycle',
    'managed_by',
    'terraform_root',
  ]) {
    assert(key in requiredTags, `Required tag ${key} is missing.`);
  }
  assert(requiredTags.application === 'local-missions', 'Application tag drifted.');
  assert(requiredTags.application_code === 'lm', 'Application-code tag drifted.');
  assert(requiredTags.lifecycle === 'disposable', 'Lifecycle tag drifted.');

  const tiers = candidate.costTiers;
  assert(
    JSON.stringify(tiers.map((tier) => tier.id)) ===
      JSON.stringify(['plan-only', 'smoke-2h', 'integration-4h', 'full-8h']),
    'Cost-tier order or membership drifted.',
  );
  for (const tier of tiers) {
    const calculated = Number(calculateTier(candidate, tier).toFixed(2));
    assert(calculated === tier.rawEstimateUsd, `${tier.id} estimate drifted.`);
    assert(tier.runCeilingUsd >= tier.rawEstimateUsd, `${tier.id} ceiling is below estimate.`);
    assert(tier.monthlyBudgetProposalUsd === 25, `${tier.id} monthly proposal drifted.`);
    if (tier.azureResources) {
      assert(tier.maximumHours > 0 && tier.maximumHours <= 8, `${tier.id} hours are unsafe.`);
      assert(tier.runCeilingUsd <= 5, `${tier.id} exceeds the per-run safety ceiling.`);
    } else {
      assert(
        tier.id === 'plan-only' && tier.maximumHours === 0 && tier.runCeilingUsd === 0,
        'The zero-cost tier overclaims Azure execution.',
      );
    }
  }

  assert(candidate.forbidden.persistentDevelopmentWorkload, 'Persistent development was enabled.');
  assert(candidate.forbidden.crossWorkloadPrefixReuse, 'Cross-workload prefix reuse was enabled.');
  assert(candidate.forbidden.personalDataInNamesOrTags, 'Personal data was allowed in names.');
  assert(candidate.forbidden.globalNameReuseAcrossRuns, 'Global name reuse was enabled.');
  assert(
    candidate.forbidden.productionEnvironmentInDevelopmentRoot,
    'Production was allowed in the development root.',
  );
  assert(
    candidate.sources.every((source) => source.startsWith('https://learn.microsoft.com/')),
    'Naming sources must remain official Microsoft documentation.',
  );
}

validate(manifest);

const refusalCases = [
  ['wrong workload code', (value) => (value.workload.code = 'pp')],
  ['wrong region code', (value) => (value.workload.regionCode = 'eu2')],
  [
    'cross-workload targets',
    (value) => (value.subscriptionPlacement.crossWorkloadTargetsAllowed = true),
  ],
  ['shared state', (value) => (value.subscriptionPlacement.exclusiveStateRequired = false)],
  [
    'missing co-tenancy approval gate',
    (value) => (value.subscriptionPlacement.coTenancyApplyApprovalRequired = false),
  ],
  ['invalid stamp', (value) => (value.deploymentStamp.example = 'today')],
  ['reused stamp', (value) => (value.deploymentStamp.reuseAllowed = true)],
  ['name-template drift', (value) => (value.disposableNameTemplates[0].example = 'rg-pp-dev-001')],
  ['global name too long', (value) => (value.disposableNameTemplates[1].maximumLength = 10)],
  [
    'duplicate name',
    (value) =>
      (value.disposableNameTemplates[1].example = value.disposableNameTemplates[0].example),
  ],
  [
    'shared retained groups',
    (value) => (value.retainedNames.stateResourceGroup = value.retainedNames.controlResourceGroup),
  ],
  [
    'shared state keys',
    (value) => (value.retainedNames.workloadStateKey = value.retainedNames.controlStateKey),
  ],
  ['missing application tag', (value) => delete value.requiredTags.application],
  ['cost estimate drift', (value) => (value.costTiers[1].rawEstimateUsd = 0.01)],
  ['ceiling below estimate', (value) => (value.costTiers[2].runCeilingUsd = 1)],
  ['overlong run', (value) => (value.costTiers[3].maximumHours = 24)],
  [
    'persistent development allowed',
    (value) => (value.forbidden.persistentDevelopmentWorkload = false),
  ],
  ['unofficial source', (value) => value.sources.push('https://example.com/naming')],
];

for (const [label, mutate] of refusalCases) {
  const candidate = clone(manifest);
  mutate(candidate);
  let refused = false;
  try {
    validate(candidate);
  } catch {
    refused = true;
  }
  assert(refused, `Expected refusal did not fail: ${label}`);
}

console.log(
  `Azure naming contract passed ${manifest.disposableNameTemplates.length} resource templates, ${manifest.costTiers.length} cost tiers, and ${refusalCases.length} refusal scenarios.`,
);
