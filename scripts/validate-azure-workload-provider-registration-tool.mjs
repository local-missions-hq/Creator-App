import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveUniqueTarget,
  summarizeContainerAppsUsage,
  summarizePostgresqlCapability,
  validateProviderStateTransition,
  validateRegionalProviderLocations,
} from './azure-workload-provider-registration.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(
  readFileSync(join(root, 'config/azure-workload-provider-registration-gate.v1.json'), 'utf8'),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function refusal(name, operation) {
  let refused = false;
  try {
    operation();
  } catch {
    refused = true;
  }
  assert(refused, `Tool mutation was not refused: ${name}`);
}

const groupNames = [
  'rg-local-missions-control-eus2-001',
  'rg-local-missions-dev-eus2-001',
  'rg-local-missions-state-eus2-001',
];
const target = {
  id: 'process-only-target',
  state: 'Enabled',
  groups: groupNames.map((name) => ({ name, tags: { application: 'local-missions' } })),
};
assert(resolveUniqueTarget([target]).id === target.id, 'Unique target fixture failed.');
refusal('two-candidates', () => resolveUniqueTarget([target, structuredClone(target)]));
refusal('other-group', () =>
  resolveUniqueTarget([{ ...target, groups: [...target.groups, { name: 'rg-other', tags: {} }] }]),
);
refusal('wrong-tag', () =>
  resolveUniqueTarget([
    {
      ...target,
      groups: target.groups.map((group, index) =>
        index === 0 ? { ...group, tags: { application: 'other' } } : group,
      ),
    },
  ]),
);

const exactSix = contract.providerRegistration.exactMutationAllowlist;
const nonTarget = { namespace: 'Microsoft.Storage', registrationState: 'Registered' };
const before = [
  ...exactSix.map((namespace) => ({ namespace, registrationState: 'NotRegistered' })),
  nonTarget,
];
const after = [
  ...exactSix.map((namespace) => ({ namespace, registrationState: 'Registered' })),
  { namespace: 'microsoft.storage', registrationState: 'Registered' },
];
assert(validateProviderStateTransition(before, after), 'Valid provider transition failed.');
refusal('target-still-unregistered', () =>
  validateProviderStateTransition(before, [before[0], ...after.slice(1)]),
);
refusal('target-already-registered', () =>
  validateProviderStateTransition([after[0], ...before.slice(1)], after),
);
refusal('non-target-changed', () =>
  validateProviderStateTransition(before, [
    ...after.slice(0, -1),
    { ...nonTarget, registrationState: 'Unregistering' },
  ]),
);
refusal('provider-disappeared', () => validateProviderStateTransition(before, after.slice(1)));

const usage = summarizeContainerAppsUsage({
  value: [
    {
      currentValue: 0,
      limit: 1,
      name: { value: 'ManagedEnvironmentCount' },
      unit: 'Count',
    },
  ],
});
assert(usage.passed && usage.limit - usage.current === 1, 'Container Apps headroom failed.');
refusal('no-managed-environment-usage', () => summarizeContainerAppsUsage({ value: [] }));
refusal('no-managed-environment-headroom', () =>
  summarizeContainerAppsUsage({
    value: [{ currentValue: 1, limit: 1, name: { value: 'ManagedEnvironmentCount' } }],
  }),
);

const postgres = summarizePostgresqlCapability({
  supportedVersions: ['16'],
  skus: [{ name: 'Standard_B1ms', supportedStorageMB: [32768] }],
});
assert(
  postgres.serverVersion16Present &&
    postgres.standardB1msPresent &&
    postgres.storage32768MbPresent &&
    postgres.capacityGuaranteed === false,
  'PostgreSQL capability fixture failed.',
);
refusal('postgres-version-missing', () =>
  summarizePostgresqlCapability({
    supportedVersions: ['15'],
    skus: [{ name: 'Standard_B1ms', supportedStorageMB: [32768] }],
  }),
);

const locationRequirements = [
  ['Microsoft.App', ['managedEnvironments', 'containerApps']],
  ['Microsoft.ContainerRegistry', ['registries']],
  ['Microsoft.DBforPostgreSQL', ['flexibleServers']],
  ['Microsoft.KeyVault', ['vaults']],
  ['Microsoft.OperationalInsights', ['workspaces']],
  ['Microsoft.ServiceBus', ['namespaces']],
  ['Microsoft.Insights', ['components']],
  ['Microsoft.ManagedIdentity', ['userAssignedIdentities']],
  ['Microsoft.Storage', ['storageAccounts']],
];
const locationProviders = locationRequirements.map(([namespace, resourceTypes]) => ({
  namespace: namespace === 'Microsoft.Insights' ? 'microsoft.insights' : namespace,
  resourceTypes: resourceTypes.map((resourceType) => ({
    resourceType,
    locations: ['East US 2'],
  })),
}));
assert(
  validateRegionalProviderLocations(locationProviders, 'eastus2').reviewedResourceTypeCount === 10,
  'Regional provider location fixture failed.',
);
refusal('regional-resource-type-unavailable', () =>
  validateRegionalProviderLocations(
    locationProviders.map((provider, index) =>
      index === 0
        ? {
            ...provider,
            resourceTypes: provider.resourceTypes.map((resourceType, typeIndex) =>
              typeIndex === 0 ? { ...resourceType, locations: ['West US'] } : resourceType,
            ),
          }
        : provider,
    ),
    'eastus2',
  ),
);

const preview = JSON.parse(
  execFileSync(process.execPath, [join(root, 'scripts/azure-workload-provider-registration.mjs')], {
    encoding: 'utf8',
  }),
);
assert(
  preview.mode === 'preview' &&
    preview.azureContacted === false &&
    preview.terraformCommandExecuted === false &&
    preview.registrationExecutableNow ===
      (contract.providerRegistration.approvalReceived &&
        !contract.providerRegistration.registrationExecuted) &&
    preview.providerCount === 6,
  'Default preview became active or drifted.',
);

let registrationRefused = false;
try {
  execFileSync(
    process.execPath,
    [
      join(root, 'scripts/azure-workload-provider-registration.mjs'),
      '--mode',
      'register',
      '--approval-sha256',
      contract.providerRegistration.approvalSha256,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
} catch (error) {
  const expectedRefusal = contract.providerRegistration.registrationExecuted
    ? 'Provider registration is already recorded.'
    : 'The exact execution enable variable is absent.';
  registrationRefused = error.status === 1 && error.stderr.includes(expectedRefusal);
}
assert(registrationRefused, 'Mutation mode did not fail before Azure contact.');

console.log(
  'Azure provider-registration operator tool passed its target, provider-state, quota, SKU, region, preview, and runtime-enable refusal fixture suite; default preview and disabled register mode executed zero Azure and Terraform commands.',
);
