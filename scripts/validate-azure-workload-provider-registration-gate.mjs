import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = join(root, 'config/azure-workload-provider-registration-gate.v1.json');
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return structuredClone(value);
}

function sorted(values) {
  return [...values].sort();
}

function terraformResourceTypes(candidate) {
  const files = execFileSync(
    'git',
    ['ls-files', ...candidate.terraformInventory.roots.map((path) => `${path}/*.tf`)],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean);
  const types = new Set();
  for (const file of files) {
    const source = readFileSync(join(root, file), 'utf8');
    for (const match of source.matchAll(/resource\s+"(azurerm_[^"]+)"/g)) types.add(match[1]);
  }
  return sorted(types);
}

function validate(candidate) {
  assert(candidate.schemaVersion === 1, 'Provider-registration gate schema drifted.');
  assert(
    candidate.checkpoint === 'M05-provider-registration-gate-local-034',
    'Provider-registration checkpoint drifted.',
  );
  assert(
    candidate.status === 'locally_ready_awaiting_explicit_provider_registration_approval',
    'Provider registration must remain pending explicit approval.',
  );
}

function validateComplete(candidate) {
  assert(
    candidate.target.region === 'eastus2' &&
      candidate.target.trustAzureCliDefault === false &&
      candidate.target.persistSubscriptionIdentifier === false &&
      candidate.target.persistSubscriptionName === false &&
      candidate.target.persistTenantIdentifier === false &&
      candidate.target.expectedLocalMissionsResourceGroupCount === 3 &&
      candidate.target.expectedOtherResourceGroupCount === 0 &&
      candidate.target.expectedDisposableWorkloadResourceCount === 0,
    'Target isolation boundary drifted.',
  );

  const actualTypes = terraformResourceTypes(candidate);
  const mappedTypes = sorted(Object.keys(candidate.terraformInventory.resourceTypes));
  assert(
    JSON.stringify(actualTypes) === JSON.stringify(mappedTypes),
    `Terraform workload resource inventory drifted: actual=${actualTypes.join(',')}`,
  );

  const requiredProviders = new Set(Object.values(candidate.terraformInventory.resourceTypes));
  const registration = candidate.providerRegistration;
  const exactSix = [
    'Microsoft.App',
    'Microsoft.ContainerRegistry',
    'Microsoft.DBforPostgreSQL',
    'Microsoft.KeyVault',
    'Microsoft.OperationalInsights',
    'Microsoft.ServiceBus',
  ];
  assert(
    JSON.stringify(registration.exactMutationAllowlist) === JSON.stringify(exactSix),
    'The exact-six registration allowlist drifted.',
  );
  assert(
    new Set([...registration.exactMutationAllowlist, ...registration.alreadyRegisteredNoMutation])
      .size === requiredProviders.size &&
      [...requiredProviders].every(
        (provider) =>
          registration.exactMutationAllowlist.includes(provider) ||
          registration.alreadyRegisteredNoMutation.includes(provider),
      ),
    'Provider inventory is incomplete or contains an unneeded namespace.',
  );
  assert(
    registration.approvalRequired === true &&
      registration.approvalReceived === false &&
      registration.registrationExecuted === false &&
      registration.unregistrationAllowed === false &&
      registration.automaticTerraformRegistrationAllowed === false &&
      registration.acceptThirdPartyTermsAllowed === false &&
      registration.parallelRegistrationAllowed === false &&
      registration.waitForRegisteredState === true,
    'Provider mutation boundary drifted or execution was overclaimed.',
  );
  assert(
    JSON.stringify(registration.registrationOrder) === undefined,
    'Registration order belongs only in the execution procedure.',
  );
  assert(
    JSON.stringify(candidate.executionProcedure.registrationOrder) === JSON.stringify(exactSix),
    'Registration order must exactly match the allowlist.',
  );
  const command = candidate.executionProcedure.registrationCommandShape;
  assert(
    JSON.stringify(command) ===
      JSON.stringify([
        'az',
        'provider',
        'register',
        '--namespace',
        '<exact-allowlisted-namespace>',
        '--subscription',
        '<process-only-subscription-id>',
        '--wait',
        '--only-show-errors',
      ]),
    'Registration command broadened or stopped using an explicit subscription.',
  );

  assert(
    candidate.postRegistrationProof.containerApps.subscriptionRegionalUsageEndpointRequired ===
      true &&
      candidate.postRegistrationProof.containerApps.managedEnvironmentHeadroomRequired === 1 &&
      candidate.postRegistrationProof.postgresql.serverVersion16Required === true &&
      candidate.postRegistrationProof.postgresql.standardB1msRequired === true &&
      candidate.postRegistrationProof.postgresql.storage32768MbRequired === true &&
      candidate.postRegistrationProof.postgresql.capacityReservationClaimAllowed === false &&
      candidate.postRegistrationProof.otherServices.currentWorkloadResourceCountRequired === 0 &&
      candidate.postRegistrationProof.subscriptionQuotaVerified === false &&
      candidate.postRegistrationProof.capacityGuaranteed === false &&
      candidate.postRegistrationProof.proofExecuted === false,
    'Post-registration proof was weakened or falsely claimed.',
  );
  assert(
    Object.values(candidate.forbiddenActions).every((forbidden) => forbidden === true) &&
      candidate.nextGate.providerRegistrationApprovalRequired === true &&
      candidate.nextGate.workloadPlanAllowed === false &&
      candidate.nextGate.workloadApplyAllowed === false,
    'A forbidden follow-on action was enabled.',
  );

  const serialized = JSON.stringify(candidate);
  assert(
    !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(serialized),
    'Account identifier retained.',
  );
  assert(!/(?:\d{1,3}\.){3}\d{1,3}/.test(serialized), 'Public IPv4 retained.');
}

validate(contract);
validateComplete(contract);

const mutations = {
  'approval-overclaim': (value) => (value.providerRegistration.approvalReceived = true),
  'registration-overclaim': (value) => (value.providerRegistration.registrationExecuted = true),
  'trust-default-subscription': (value) => (value.target.trustAzureCliDefault = true),
  'retain-subscription-id': (value) => (value.target.subscriptionIdentifier = crypto.randomUUID()),
  'retain-public-ipv4': (value) => (value.target.publicIpv4 = '198.51.100.1'),
  'add-provider': (value) =>
    value.providerRegistration.exactMutationAllowlist.push('Microsoft.Web'),
  'drop-provider': (value) => value.providerRegistration.exactMutationAllowlist.pop(),
  'reorder-provider': (value) => value.providerRegistration.exactMutationAllowlist.reverse(),
  'allow-unregister': (value) => (value.providerRegistration.unregistrationAllowed = true),
  'allow-terraform-registration': (value) =>
    (value.providerRegistration.automaticTerraformRegistrationAllowed = true),
  'allow-terms': (value) => (value.providerRegistration.acceptThirdPartyTermsAllowed = true),
  'parallel-registration': (value) =>
    (value.providerRegistration.parallelRegistrationAllowed = true),
  'omit-wait': (value) => value.executionProcedure.registrationCommandShape.splice(-2, 1),
  'omit-subscription': (value) => value.executionProcedure.registrationCommandShape.splice(5, 2),
  'wrong-target-count': (value) => (value.target.expectedOtherResourceGroupCount = 1),
  'missing-resource-type': (value) =>
    delete value.terraformInventory.resourceTypes.azurerm_key_vault,
  'unknown-resource-type': (value) =>
    (value.terraformInventory.resourceTypes.azurerm_linux_virtual_machine = 'Microsoft.Compute'),
  'quota-overclaim': (value) => (value.postRegistrationProof.subscriptionQuotaVerified = true),
  'capacity-overclaim': (value) => (value.postRegistrationProof.capacityGuaranteed = true),
  'proof-overclaim': (value) => (value.postRegistrationProof.proofExecuted = true),
  'terraform-plan-enabled': (value) => (value.forbiddenActions.terraformPlan = false),
  'resource-create-enabled': (value) => (value.forbiddenActions.resourceCreation = false),
  'image-push-enabled': (value) => (value.forbiddenActions.imagePullBuildScanSignOrPush = false),
  'workload-plan-allowed': (value) => (value.nextGate.workloadPlanAllowed = true),
};

for (const [name, mutate] of Object.entries(mutations)) {
  const candidate = clone(contract);
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
  `Azure workload provider-registration gate passed ${Object.keys(mutations).length} refusal scenarios; exact-six registration remains unexecuted and blocked on explicit approval.`,
);
