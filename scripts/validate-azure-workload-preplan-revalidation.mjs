import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const manifest = readJson('config/azure-workload-preplan-revalidation.v1.json');
const naming = readJson('config/azure-naming.v1.json');
const images = readJson('config/container-image-contract.v1.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return structuredClone(value);
}

function sha256(path) {
  return createHash('sha256')
    .update(readFileSync(join(root, path)))
    .digest('hex');
}

function imageInputEvidence(id) {
  const common = [
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.npmrc',
    'turbo.json',
    'tsconfig.base.json',
    'scripts/validate-container-build-inputs.mjs',
  ];
  const prefixes = {
    api: ['apps/api', 'packages/config', 'packages/contracts', 'packages/db'],
    dashboard: ['apps/dashboard', 'packages/api-client'],
    worker: ['apps/worker'],
  }[id];
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const files = [
    ...new Set([
      ...common,
      ...tracked.filter((path) =>
        prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
      ),
    ]),
  ].sort();
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(path);
    hash.update('\0');
    hash.update(readFileSync(join(root, path)));
    hash.update('\0');
  }
  return { inputFileCount: files.length, inputSetSha256: hash.digest('hex') };
}

function validate(candidate) {
  assert(candidate.schemaVersion === 1, 'Pre-plan revalidation schema drifted.');
  assert(
    candidate.checkpoint === 'M05-workload-preplan-readonly-revalidation-033',
    'Checkpoint drifted.',
  );
  assert(
    candidate.status === 'read_only_revalidation_blocked_on_provider_registration_and_quota',
    'The read-only review must remain blocked before workload planning.',
  );
}

function validateComplete(candidate) {
  assert(candidate.target.region === naming.workload.region, 'Region drifted.');
  assert(
    candidate.target.resolvedByRetainedBoundaryTags === true &&
      candidate.target.uniqueSubscriptionCandidate === true &&
      candidate.target.defaultCliSubscriptionWasTarget === false &&
      candidate.target.subscriptionIdentifierRetained === false &&
      candidate.target.subscriptionNameRetained === false &&
      candidate.target.localMissionsResourceGroupCount === 3 &&
      candidate.target.otherResourceGroupCount === 0 &&
      candidate.target.disposableWorkloadResourceCount === 0 &&
      candidate.target.subscriptionPolicyAssignmentCount === 0,
    'Target resolution or inventory drifted.',
  );
  assert(
    candidate.network.publicIpv4Sources === 2 &&
      candidate.network.publicIpv4SourcesAgree === true &&
      candidate.network.publicIpv4ValueRetained === false &&
      candidate.network.currentIpv4MatchesStateRule === true &&
      candidate.network.stateIpRuleCount === 1 &&
      candidate.network.defaultAction === 'Deny' &&
      candidate.network.bypass === 'None' &&
      candidate.network.sharedKeyEnabled === false &&
      candidate.network.networkMutationExecuted === false,
    'Current-IP or Storage network boundary drifted.',
  );
  const registrations = candidate.providerRegistration;
  assert(registrations.requiredNamespaces.length === 11, 'Required provider inventory drifted.');
  assert(registrations.registeredNamespaces.length === 5, 'Registered provider count drifted.');
  assert(registrations.unregisteredNamespaces.length === 6, 'Unregistered provider count drifted.');
  assert(
    registrations.registrationExecuted === false && registrations.separateApprovalRequired === true,
    'Provider registration was overclaimed or ungated.',
  );
  assert(
    Object.values(candidate.availability.eastUs2ResourceTypeRecords).every((count) => count === 1),
    'An East US 2 resource type is unavailable.',
  );
  assert(
    candidate.availability.postgresql.serverVersion16Present === true &&
      candidate.availability.postgresql.standardB1msPresent === true &&
      candidate.availability.postgresql.standardB1msVcores === 1 &&
      candidate.availability.postgresql.standardB1msMemoryPerVcoreMb === 2048 &&
      candidate.availability.postgresql.storage32768MbPresent === true &&
      candidate.availability.subscriptionQuotaVerified === false &&
      candidate.availability.capacityGuaranteed === false,
    'PostgreSQL capability or quota boundary drifted.',
  );
  const smokeTier = naming.costTiers.find(({ id }) => id === 'smoke-2h');
  assert(
    candidate.pricing.source === 'https://prices.azure.com/api/retail/prices' &&
      candidate.pricing.reviewedMeterCount === 17 &&
      candidate.pricing.priceDriftCount === 0 &&
      candidate.pricing.smokeHours === smokeTier.maximumHours &&
      candidate.pricing.rawSmokeEstimateUsd === smokeTier.rawEstimateUsd &&
      candidate.pricing.approvedRunCeilingUsd === smokeTier.runCeilingUsd &&
      candidate.pricing.fallbackEightHourCeilingUsd === 5 &&
      candidate.pricing.monthlyBudgetAlertUsd === 100 &&
      candidate.pricing.retailPriceApiQueried === true &&
      candidate.pricing.subscriptionOfferPriceRequested === false,
    'Price or cost-ceiling evidence drifted.',
  );
  assert(
    candidate.baseImage.repository === 'docker.io/library/node' &&
      candidate.baseImage.tagReviewed === '24.19.0-bookworm-slim' &&
      /^sha256:[a-f0-9]{64}$/.test(candidate.baseImage.indexDigest) &&
      /^sha256:[a-f0-9]{64}$/.test(candidate.baseImage.linuxAmd64ManifestDigest) &&
      candidate.baseImage.nodeVersionInOfficialDockerfile === images.baseImagePolicy.nodeVersion &&
      candidate.baseImage.platform === 'linux/amd64' &&
      candidate.baseImage.registryContacted === true &&
      candidate.baseImage.imagePulled === false &&
      candidate.baseImage.imageBuilt === false &&
      candidate.baseImage.imagePublished === false,
    'Base-image review drifted or overclaimed execution.',
  );
  assert(/^[a-f0-9]{40}$/.test(candidate.buildInputs.reviewedCommitSha), 'Build commit drifted.');
  assert(candidate.buildInputs.packageManager === images.packageManager, 'pnpm binding drifted.');
  for (const [path, digest] of Object.entries(candidate.buildInputs.rootFileSha256)) {
    assert(sha256(path) === digest, `${path} digest drifted after review.`);
  }
  assert(
    JSON.stringify(candidate.buildInputs.images.map(({ id }) => id)) ===
      JSON.stringify(images.images.map(({ id }) => id)) &&
      candidate.buildInputs.images.every(
        ({ inputFileCount, inputSetSha256 }) =>
          Number.isInteger(inputFileCount) &&
          inputFileCount > 0 &&
          /^[a-f0-9]{64}$/.test(inputSetSha256),
      ) &&
      candidate.buildInputs.frozenLockfileVerified === true &&
      candidate.buildInputs.dockerInputsVerified === true,
    'Build-input inventory drifted.',
  );
  for (const image of candidate.buildInputs.images) {
    const current = imageInputEvidence(image.id);
    assert(
      image.inputFileCount === current.inputFileCount &&
        image.inputSetSha256 === current.inputSetSha256,
      `${image.id} build-input evidence drifted.`,
    );
  }
  assert(
    candidate.executionBoundary.azureReadOnlyQueriesExecuted === true &&
      candidate.executionBoundary.publicCatalogQueried === true &&
      candidate.executionBoundary.publicRegistryManifestQueried === true &&
      candidate.executionBoundary.providerRegistrationExecuted === false &&
      candidate.executionBoundary.terraformCommandExecuted === false &&
      candidate.executionBoundary.terraformPlanGenerated === false &&
      candidate.executionBoundary.azureResourceMutationExecuted === false &&
      candidate.executionBoundary.cloudCostIncurredByThisReview === false &&
      candidate.executionBoundary.customerDataUsed === false &&
      candidate.nextGate.providerRegistrationApprovalRequired === true &&
      candidate.nextGate.workloadPlanAllowed === false &&
      candidate.nextGate.workloadApplyAllowed === false,
    'Execution boundary drifted.',
  );
  const serialized = JSON.stringify(candidate);
  assert(
    !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(serialized),
    'Account identifier retained.',
  );
  assert(!/(?:\d{1,3}\.){3}\d{1,3}/.test(serialized), 'Public IPv4 retained.');
}

validate(manifest);
validateComplete(manifest);

const mutations = {
  'false-target-resolution': (value) => (value.target.uniqueSubscriptionCandidate = false),
  'identifier-retained': (value) => (value.target.subscriptionIdentifierRetained = true),
  'ipv4-retained': (value) => (value.network.publicIpv4 = '198.51.100.1'),
  'broad-storage-network': (value) => (value.network.defaultAction = 'Allow'),
  'shared-key-enabled': (value) => (value.network.sharedKeyEnabled = true),
  'provider-registration-claimed': (value) =>
    (value.providerRegistration.registrationExecuted = true),
  'provider-count-drift': (value) => value.providerRegistration.unregisteredNamespaces.pop(),
  'resource-type-unavailable': (value) =>
    (value.availability.eastUs2ResourceTypeRecords.serviceBusNamespaces = 0),
  'quota-overclaim': (value) => (value.availability.subscriptionQuotaVerified = true),
  'price-drift': (value) => (value.pricing.priceDriftCount = 1),
  'ceiling-drift': (value) => (value.pricing.approvedRunCeilingUsd = 5),
  'subscription-offer-claim': (value) => (value.pricing.subscriptionOfferPriceRequested = true),
  'mutable-base-image': (value) => (value.baseImage.linuxAmd64ManifestDigest = 'latest'),
  'base-version-drift': (value) => (value.baseImage.nodeVersionInOfficialDockerfile = '24.20.0'),
  'image-pull-claim': (value) => (value.baseImage.imagePulled = true),
  'build-claim': (value) => (value.baseImage.imageBuilt = true),
  'lock-digest-drift': (value) =>
    (value.buildInputs.rootFileSha256['pnpm-lock.yaml'] = '0'.repeat(64)),
  'missing-image-input': (value) => value.buildInputs.images.pop(),
  'terraform-plan-claim': (value) => (value.executionBoundary.terraformPlanGenerated = true),
  'azure-mutation-claim': (value) => (value.executionBoundary.azureResourceMutationExecuted = true),
  'workload-plan-allowed': (value) => (value.nextGate.workloadPlanAllowed = true),
};

for (const [name, mutate] of Object.entries(mutations)) {
  const candidate = clone(manifest);
  mutate(candidate);
  let refused = false;
  try {
    validate(candidate);
    validateComplete(candidate);
  } catch {
    refused = true;
  }
  assert(refused, `Mutation was not refused: ${name}`);
}

console.log(
  `Historical checkpoint 033 workload pre-plan record passed ${Object.keys(mutations).length} refusal scenarios and correctly preserves its then-unregistered six-provider boundary; current registration status is tracked by the checkpoint 035 provider proof.`,
);
