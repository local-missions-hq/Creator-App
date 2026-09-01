import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(repositoryRoot, 'config/azure-provider-scope-plan.v1.json');
const manifest = JSON.parse(readFileSync(path, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(manifest.schemaVersion === 1, 'Provider-scope evidence schema drifted.');
assert(
  manifest.checkpoint === 'M05-azure-naming-provider-scope-plan-012',
  'Provider-scope checkpoint drifted.',
);
assert(
  manifest.activationStatus === 'provider_scope_plan_only',
  'Provider-scope evidence overclaims activation.',
);
assert(manifest.workload === 'local-missions', 'Workload drifted.');
assert(manifest.region === 'eastus2', 'Reviewed region drifted.');
assert(/^e2r[0-9]{8}$/.test(manifest.deploymentStamp), 'Deployment stamp is invalid.');

const isolation = manifest.subscriptionIsolation;
assert(isolation.visibleSubscriptionCount === 1, 'Subscription inventory count drifted.');
assert(isolation.localMissionsResourceGroupCount === 0, 'Local Missions resources were observed.');
assert(isolation.otherWorkloadPrefixObserved === 'rg-pp-', 'Other-workload boundary drifted.');
assert(isolation.localMissionsPrefix === 'rg-local-missions-', 'Local Missions prefix drifted.');
assert(isolation.crossWorkloadTargets === 0, 'Cross-workload targeting is forbidden.');
assert(
  isolation.sharedNonproductionCoTenancyApplyApprovalRequired &&
    isolation.dedicatedSubscriptionPreferredBeforeStaging,
  'Subscription isolation approval gates are incomplete.',
);

const availability = manifest.nameAvailability;
assert(
  availability.resourceGroupAbsent &&
    availability.workloadStorageAvailable &&
    availability.containerRegistryAvailable &&
    availability.keyVaultAvailable &&
    availability.retainedStateStorageCandidateAvailable &&
    availability.checkedReadOnly &&
    availability.availabilityIsNotReservation,
  'Read-only name-availability evidence is incomplete or overclaimed.',
);

const provider = manifest.providerContract;
assert(
  provider.source === 'hashicorp/azurerm' && provider.version === '5.0.1',
  'Provider drifted.',
);
assert(provider.authentication === 'azure_cli', 'Unexpected provider authentication mode.');
assert(
  !provider.automaticResourceProviderRegistration,
  'Automatic provider registration is forbidden.',
);
assert(
  provider.resourceProviderRegistrations === 'none',
  'Provider registrations must remain none.',
);
assert(provider.storageUsesMicrosoftEntra, 'Storage must use Microsoft Entra authentication.');
assert(
  !provider.inlineAccountIdentifiers && !provider.inlineCredentials,
  'Inline Azure scope or credentials are forbidden.',
);

const plan = manifest.planEvidence;
assert(plan.execution === 'terraform_test_command_plan', 'Plan execution mode drifted.');
assert(
  plan.backend === 'ephemeral_test_state',
  'Provider-scope plan must use ephemeral test state.',
);
assert(
  !plan.remoteBackendInitialized && !plan.otherWorkloadBackendUsed,
  'Remote or cross-workload backend use is forbidden.',
);
assert(
  plan.providerScopePlanTestsPassed === 1 && plan.providerScopePlanTestsFailed === 0,
  'Provider-scope plan did not pass exactly once.',
);
assert(
  plan.resourcesToAdd === 0 && plan.resourcesToChange === 0 && plan.resourcesToDestroy === 0,
  'Provider-scope plan must contain zero resource actions.',
);
assert(
  plan.costProfile === 'plan-only' && plan.runCeilingUsd === 0,
  'Provider-scope plan must remain zero-cost plan-only.',
);
assert(
  !plan.savedPlanCreated && !plan.applyExecuted && !plan.azureMutationExecuted,
  'Provider-scope evidence claims an unauthorized artifact or mutation.',
);
assert(!plan.accountIdentifiersRetained, 'Azure account identifiers must not be retained.');

assert(manifest.remainingGates.length === 8, 'Remaining external gates drifted.');
assert(manifest.sources.length === 3, 'Provider-scope source inventory drifted.');
assert(
  manifest.sources.every(
    (source) =>
      source.startsWith('https://learn.microsoft.com/') ||
      source.startsWith('https://registry.terraform.io/providers/hashicorp/azurerm/'),
  ),
  'Provider-scope sources must be official Microsoft or HashiCorp documentation.',
);

const serialized = JSON.stringify(manifest);
assert(
  !/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(serialized),
  'Retained evidence contains an Azure UUID.',
);
assert(
  !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized),
  'Retained evidence contains an email address.',
);
assert(
  !/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(serialized),
  'Retained evidence contains an IP address.',
);

console.log(
  `Azure provider-scope evidence passed one real-provider zero-resource plan, ${manifest.remainingGates.length} retained gates, and no retained account identifiers.`,
);
