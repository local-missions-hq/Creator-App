import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(
  readFileSync(join(root, 'config/azure-workload-provider-registration-gate.v1.json'), 'utf8'),
);
const naming = JSON.parse(readFileSync(join(root, 'config/azure-naming.v1.json'), 'utf8'));

const exactSix = Object.freeze([...contract.providerRegistration.exactMutationAllowlist]);
const executionEnableVariable = 'LOCAL_MISSIONS_EXACT_SIX_PROVIDER_REGISTRATION_ENABLED';
const normalizeNamespace = (namespace) => namespace.toLowerCase();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArguments(argv) {
  const result = { mode: 'preview', approvalSha256: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--mode') result.mode = argv[(index += 1)] ?? '';
    else if (argument === '--approval-sha256') {
      result.approvalSha256 = argv[(index += 1)] ?? '';
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  assert(
    ['preview', 'register', 'verify'].includes(result.mode),
    'Mode must be preview, register, or verify.',
  );
  return result;
}

function azJson(argumentsList) {
  try {
    return JSON.parse(
      execFileSync('az', [...argumentsList, '--output', 'json', '--only-show-errors'], {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
  } catch {
    throw new Error(
      'A sanitized Azure CLI operation failed; inspect locally without copying raw output.',
    );
  }
}

function azNoOutput(argumentsList) {
  try {
    execFileSync('az', [...argumentsList, '--output', 'none', '--only-show-errors'], {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch {
    throw new Error(
      'A sanitized Azure provider registration failed; inspect locally without copying raw output.',
    );
  }
}

export function resolveUniqueTarget(subscriptionInventories) {
  const exactGroupNames = [
    naming.retainedNames.controlResourceGroup,
    naming.retainedNames.stateResourceGroup,
    naming.retainedNames.workloadLandingZoneResourceGroup,
  ].sort();
  const candidates = subscriptionInventories.filter(({ state, groups }) => {
    if (state !== 'Enabled' || groups.length !== exactGroupNames.length) return false;
    const names = groups.map(({ name }) => name).sort();
    return (
      JSON.stringify(names) === JSON.stringify(exactGroupNames) &&
      groups.every(({ tags }) => tags?.application === 'local-missions')
    );
  });
  assert(candidates.length === 1, 'Exactly one isolated Local Missions subscription is required.');
  return candidates[0];
}

export function validateProviderStateTransition(before, after) {
  const beforeMap = new Map(
    before.map(({ namespace, registrationState }) => [
      normalizeNamespace(namespace),
      registrationState,
    ]),
  );
  const afterMap = new Map(
    after.map(({ namespace, registrationState }) => [
      normalizeNamespace(namespace),
      registrationState,
    ]),
  );
  assert(
    beforeMap.size === before.length && afterMap.size === after.length,
    'Duplicate provider namespace.',
  );
  assert(beforeMap.size === afterMap.size, 'Provider inventory size changed.');
  for (const [namespace, beforeState] of beforeMap) {
    assert(afterMap.has(namespace), `Provider disappeared: ${namespace}`);
    const afterState = afterMap.get(namespace);
    if (exactSix.map(normalizeNamespace).includes(namespace)) {
      assert(beforeState === 'NotRegistered', `${namespace} was not initially NotRegistered.`);
      assert(afterState === 'Registered', `${namespace} did not reach Registered.`);
    } else {
      assert(afterState === beforeState, `Non-target provider state changed: ${namespace}`);
    }
  }
  assert(
    exactSix.every((namespace) => beforeMap.has(normalizeNamespace(namespace))),
    'Exact-six baseline is incomplete.',
  );
  return true;
}

export function summarizeContainerAppsUsage(payload) {
  assert(Array.isArray(payload?.value), 'Container Apps usage response is missing value.');
  const managedEnvironments = payload.value.find(
    ({ name }) => name?.value === 'ManagedEnvironmentCount',
  );
  assert(managedEnvironments, 'ManagedEnvironmentCount usage was not returned.');
  const current = Number(managedEnvironments.currentValue);
  const limit = Number(managedEnvironments.limit);
  assert(Number.isFinite(current) && Number.isFinite(limit), 'Container Apps usage is invalid.');
  assert(
    limit - current >=
      contract.postRegistrationProof.containerApps.managedEnvironmentHeadroomRequired,
    'Container Apps has insufficient managed-environment quota headroom.',
  );
  return { current, limit, requiredHeadroom: 1, passed: true };
}

export function summarizePostgresqlCapability(payload) {
  const serialized = JSON.stringify(payload);
  const result = {
    serverVersion16Present: /(?:serverVersions|supportedVersions|version)[^}]*16/i.test(serialized),
    standardB1msPresent: /Standard_B1ms/i.test(serialized),
    storage32768MbPresent: /32768/.test(serialized),
  };
  assert(Object.values(result).every(Boolean), 'Required PostgreSQL capability is unavailable.');
  return { ...result, capacityGuaranteed: false };
}

export function validateRegionalProviderLocations(providerPayloads, region) {
  const requirements = [
    ['Microsoft.App', 'managedEnvironments'],
    ['Microsoft.App', 'containerApps'],
    ['Microsoft.ContainerRegistry', 'registries'],
    ['Microsoft.DBforPostgreSQL', 'flexibleServers'],
    ['Microsoft.KeyVault', 'vaults'],
    ['Microsoft.OperationalInsights', 'workspaces'],
    ['Microsoft.ServiceBus', 'namespaces'],
    ['Microsoft.Insights', 'components'],
    ['Microsoft.ManagedIdentity', 'userAssignedIdentities'],
    ['Microsoft.Storage', 'storageAccounts'],
  ];
  const normalizedRegion = region.toLowerCase().replaceAll(' ', '');
  for (const [namespace, resourceType] of requirements) {
    const provider = providerPayloads.find(
      (entry) => normalizeNamespace(entry.namespace) === normalizeNamespace(namespace),
    );
    assert(provider, `Provider location payload is missing: ${namespace}`);
    const type = provider.resourceTypes?.find((entry) => entry.resourceType === resourceType);
    assert(type, `Resource type is missing: ${namespace}/${resourceType}`);
    assert(
      type.locations?.some(
        (location) => location.toLowerCase().replaceAll(' ', '') === normalizedRegion,
      ),
      `East US 2 is unavailable for ${namespace}/${resourceType}`,
    );
  }
  return { reviewedResourceTypeCount: requirements.length, allAvailable: true };
}

function subscriptionInventories() {
  const subscriptions = azJson(['account', 'list']);
  assert(Array.isArray(subscriptions), 'Azure account inventory is invalid.');
  return subscriptions.map(({ id, state }) => ({
    id,
    state,
    groups: azJson(['group', 'list', '--subscription', id]),
  }));
}

function providerInventory(subscriptionId) {
  return azJson(['provider', 'list', '--subscription', subscriptionId]).map(
    ({ namespace, registrationState }) => ({ namespace, registrationState }),
  );
}

function validateEmptyWorkload(subscriptionId) {
  const resources = azJson([
    'resource',
    'list',
    '--resource-group',
    naming.retainedNames.workloadLandingZoneResourceGroup,
    '--subscription',
    subscriptionId,
  ]);
  assert(Array.isArray(resources) && resources.length === 0, 'Disposable workload is not empty.');
}

async function currentIpv4() {
  const endpoints = ['https://api.ipify.org', 'https://ipv4.icanhazip.com'];
  const values = await Promise.all(
    endpoints.map(async (endpoint) => {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
      assert(response.ok, 'A public IPv4 source failed.');
      const value = (await response.text()).trim();
      assert(
        /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value),
        'A public IPv4 source returned invalid data.',
      );
      return value;
    }),
  );
  assert(new Set(values).size === 1, 'Public IPv4 sources disagree.');
  return values[0];
}

async function validateStateStorageBoundary(subscriptionId) {
  const account = azJson([
    'storage',
    'account',
    'show',
    '--name',
    naming.retainedNames.stateStorageAccount,
    '--resource-group',
    naming.retainedNames.stateResourceGroup,
    '--subscription',
    subscriptionId,
  ]);
  const operatorIpv4 = await currentIpv4();
  const rules = account?.networkRuleSet?.ipRules ?? [];
  assert(
    account?.networkRuleSet?.defaultAction === 'Deny',
    'State Storage default action drifted.',
  );
  assert(account?.networkRuleSet?.bypass === 'None', 'State Storage bypass drifted.');
  assert(account?.allowSharedKeyAccess === false, 'State Storage Shared Key drifted.');
  assert(
    rules.length === 1 && rules[0]?.ipAddressOrRange === operatorIpv4,
    'State IP rule drifted.',
  );
}

function requiredProviderStates(inventory, expectedState) {
  const providerMap = new Map(
    inventory.map((entry) => [normalizeNamespace(entry.namespace), entry.registrationState]),
  );
  for (const namespace of exactSix) {
    assert(
      providerMap.get(normalizeNamespace(namespace)) === expectedState,
      `${namespace} state is not ${expectedState}.`,
    );
  }
  for (const namespace of contract.providerRegistration.alreadyRegisteredNoMutation) {
    assert(
      providerMap.get(normalizeNamespace(namespace)) === 'Registered',
      `${namespace} is no longer Registered.`,
    );
  }
}

function postRegistrationProof(subscriptionId) {
  const usage = azJson([
    'rest',
    '--method',
    'get',
    '--url',
    `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.App/locations/${contract.target.region}/usages?api-version=2024-03-01`,
  ]);
  const postgres = azJson([
    'postgres',
    'flexible-server',
    'list-skus',
    '--location',
    contract.target.region,
    '--subscription',
    subscriptionId,
  ]);
  const locationProviders = [
    'Microsoft.App',
    'Microsoft.ContainerRegistry',
    'Microsoft.DBforPostgreSQL',
    'Microsoft.KeyVault',
    'Microsoft.OperationalInsights',
    'Microsoft.ServiceBus',
    'Microsoft.Insights',
    'Microsoft.ManagedIdentity',
    'Microsoft.Storage',
  ].map((namespace) =>
    azJson([
      'provider',
      'show',
      '--namespace',
      namespace,
      '--subscription',
      subscriptionId,
      '--expand',
      'resourceTypes/locations',
    ]),
  );
  return {
    containerApps: summarizeContainerAppsUsage(usage),
    postgresql: summarizePostgresqlCapability(postgres),
    regionalResourceTypes: validateRegionalProviderLocations(
      locationProviders,
      contract.target.region,
    ),
    documentedLimitReview: true,
    workloadResourceCount: 0,
    capacityGuaranteed: false,
  };
}

function assertApproval(approvalSha256) {
  const registration = contract.providerRegistration;
  assert(registration.approvalReceived === true, 'Explicit registration approval is not recorded.');
  assert(registration.registrationExecuted === false, 'Provider registration is already recorded.');
  assert(
    /^[a-f0-9]{64}$/.test(registration.approvalSha256 ?? ''),
    'Recorded approval digest is missing.',
  );
  assert(approvalSha256 === registration.approvalSha256, 'Runtime approval digest does not match.');
  assert(
    process.env[executionEnableVariable] === 'true',
    'The exact execution enable variable is absent.',
  );
}

function preview() {
  return {
    checkpoint: contract.checkpoint,
    mode: 'preview',
    azureContacted: false,
    terraformCommandExecuted: false,
    registrationExecutableNow:
      contract.providerRegistration.approvalReceived === true &&
      contract.providerRegistration.registrationExecuted === false,
    providerCount: exactSix.length,
    providers: exactSix,
    target: 'uniquely-resolved-process-only-subscription',
    registration: 'sequential-explicit-subscription-wait',
    postRegistrationProof: 'read-only-usage-and-capability',
    capacityGuaranteed: false,
  };
}

async function register(approvalSha256) {
  assertApproval(approvalSha256);
  const target = resolveUniqueTarget(subscriptionInventories());
  validateEmptyWorkload(target.id);
  await validateStateStorageBoundary(target.id);
  const before = providerInventory(target.id);
  requiredProviderStates(before, 'NotRegistered');
  for (const namespace of exactSix) {
    azNoOutput([
      'provider',
      'register',
      '--namespace',
      namespace,
      '--subscription',
      target.id,
      '--wait',
    ]);
  }
  const after = providerInventory(target.id);
  validateProviderStateTransition(before, after);
  validateEmptyWorkload(target.id);
  await validateStateStorageBoundary(target.id);
  const proof = postRegistrationProof(target.id);
  return {
    checkpoint: contract.checkpoint,
    mode: 'register',
    registeredProviderCount: exactSix.length,
    allTargetsRegistered: true,
    nonTargetProviderStateChanged: false,
    workloadResourceCount: 0,
    storageBoundaryUnchanged: true,
    proof,
    terraformCommandExecuted: false,
    workloadPlanGenerated: false,
  };
}

async function verify() {
  const target = resolveUniqueTarget(subscriptionInventories());
  validateEmptyWorkload(target.id);
  await validateStateStorageBoundary(target.id);
  const providers = providerInventory(target.id);
  requiredProviderStates(providers, 'Registered');
  const proof = postRegistrationProof(target.id);
  return {
    checkpoint: contract.checkpoint,
    mode: 'verify',
    registeredProviderCount: exactSix.length,
    allTargetsRegistered: true,
    workloadResourceCount: 0,
    storageBoundaryUnchanged: true,
    proof,
    terraformCommandExecuted: false,
    workloadPlanGenerated: false,
  };
}

async function main() {
  const argumentsParsed = parseArguments(process.argv.slice(2));
  const result =
    argumentsParsed.mode === 'preview'
      ? preview()
      : argumentsParsed.mode === 'register'
        ? await register(argumentsParsed.approvalSha256)
        : await verify();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`REFUSED: ${error.message}\n`);
    process.exitCode = 1;
  });
}
