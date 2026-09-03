import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = join(root, 'config/azure-retained-state-recovery-gate.v1.json');
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return structuredClone(value);
}

function validate(candidate) {
  assert(candidate.schemaVersion === 1, 'Recovery-gate schema drifted.');
  assert(
    candidate.activationStatus === 'cost_pause_active_local_recovery_contract_only' &&
      candidate.checkpoint === 'M05-retained-state-recovery-gate-local-037' &&
      candidate.status === 'local_recovery_gate_ready_cost_pause_active',
    'Recovery-gate checkpoint or status drifted.',
  );

  const pause = candidate.costPause;
  assert(
    pause.active === true &&
      pause.remoteBackendAvailable === false &&
      pause.standingMeteredResourceCount === 0 &&
      pause.disposableWorkloadResourceCount === 0 &&
      pause.retainedResourceGroupCount === 3 &&
      pause.retainedManagedIdentityCount === 3 &&
      pause.retainedEmailOnlyActionGroupCount === 1 &&
      pause.terraformCommandAllowed === false &&
      pause.azureMutationAllowed === false,
    'Cost-pause boundary drifted.',
  );

  const backup = candidate.privateBackupContract;
  assert(
    backup.directoryEnvironmentVariable === 'LOCAL_MISSIONS_PRIVATE_STATE_BACKUP_DIRECTORY' &&
      backup.mustResolveOutsideRepository === true &&
      backup.mustNotBeSymlink === true &&
      backup.requiredFileMode === '0600' &&
      backup.terraformStateFormatVersion === 4 &&
      backup.files.length === 2,
    'Private-backup contract drifted.',
  );
  const [bootstrap, control] = backup.files;
  assert(
    bootstrap.logicalRoot === 'bootstrap' &&
      bootstrap.fileName === 'bootstrap.tfstate' &&
      bootstrap.backendKey === 'local-missions/bootstrap.tfstate' &&
      bootstrap.bytes === 21838 &&
      bootstrap.managedResourceInstanceCount === 3 &&
      bootstrap.sha256 === '47b089ac5fbe51dd156a06e2447b7caa51c7d9145a6fc221369bc2af35654125',
    'Bootstrap backup binding drifted.',
  );
  assert(
    control.logicalRoot === 'control-plane' &&
      control.fileName === 'control-plane.tfstate' &&
      control.backendKey === 'local-missions/control-plane.tfstate' &&
      control.bytes === 54068 &&
      control.managedResourceInstanceCount === 20 &&
      control.sha256 === 'f4bfb41835edcc3263587d14c1113d2d83ea2850266f62750ff037fb7e7ad369',
    'Control-plane backup binding drifted.',
  );
  assert(
    JSON.stringify(bootstrap.managedResources) ===
      JSON.stringify([
        'azurerm_resource_group.state:1',
        'azurerm_storage_account.state:1',
        'azurerm_storage_container.state:1',
      ]),
    'Bootstrap state inventory drifted.',
  );
  assert(
    JSON.stringify(control.managedResources) ===
      JSON.stringify([
        'azurerm_consumption_budget_subscription.development:1',
        'azurerm_federated_identity_credential.github:3',
        'azurerm_monitor_action_group.cost:1',
        'azurerm_resource_group.control:1',
        'azurerm_resource_group.workload_landing_zone:1',
        'azurerm_role_assignment.state_backend:3',
        'azurerm_role_assignment.workflow:5',
        'azurerm_role_definition.workload:2',
        'azurerm_user_assigned_identity.terraform:3',
      ]),
    'Control-plane state inventory drifted.',
  );

  assert(candidate.recoverySequence.length === 8, 'Recovery sequence must contain eight gates.');
  assert(
    candidate.recoverySequence.every(
      (step, index) =>
        step.order === index + 1 &&
        typeof step.action === 'string' &&
        step.action.length > 0 &&
        typeof step.approvalKind === 'string' &&
        step.approvalKind.length > 0 &&
        step.mutationAllowed === [false, false, true, true, true, false, true, false][index],
    ),
    'Recovery order, approval, or mutation boundary drifted.',
  );

  const allowlist = candidate.restorePlanAllowlist;
  assert(
    JSON.stringify(allowlist.bootstrapCreatesOnly) ===
      JSON.stringify(['azurerm_storage_account.state[0]', 'azurerm_storage_container.state[0]']) &&
      JSON.stringify(allowlist.controlPlaneCreatesOnly) ===
        JSON.stringify(['azurerm_role_assignment.state_backend[0..2]']) &&
      allowlist.maximumStandingMeteredResourceCountAfterRestore === 1 &&
      allowlist.maximumRetainedMonthlyCeilingUsd === 1 &&
      allowlist.deletesAllowed === 0 &&
      allowlist.replacementsAllowed === 0 &&
      allowlist.updatesAllowed === 0 &&
      allowlist.disposableWorkloadResourcesAllowed === 0 &&
      allowlist.containerAppsAllowed === 0,
    'Restore plan allowlist or cost ceiling drifted.',
  );

  assert(
    Object.values(candidate.mandatorySafety).every((value) => value === true),
    'A mandatory recovery safety control was disabled.',
  );
  assert(
    candidate.currentAuthorization.localContractValidationAllowed === true &&
      candidate.currentAuthorization.privateBackupReadOnlyValidationAllowed === true &&
      Object.entries(candidate.currentAuthorization)
        .filter(
          ([key]) =>
            !['localContractValidationAllowed', 'privateBackupReadOnlyValidationAllowed'].includes(
              key,
            ),
        )
        .every(([, value]) => value === false),
    'An external recovery action was over-authorized.',
  );

  const serialized = JSON.stringify(candidate);
  assert(
    !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(serialized),
    'Account identifier retained in the recovery contract.',
  );
  assert(!/(?:\d{1,3}\.){3}\d{1,3}/.test(serialized), 'Public IPv4 retained.');
  assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized), 'Email address retained.');
}

function stateInventory(state) {
  const resources = state.resources
    .filter(({ mode }) => mode === 'managed')
    .map(({ type, name, instances }) => `${type}.${name}:${instances.length}`)
    .sort();
  const instanceCount = state.resources
    .filter(({ mode }) => mode === 'managed')
    .reduce((sum, { instances }) => sum + instances.length, 0);
  return { resources, instanceCount };
}

function verifyPrivateBackups(candidate) {
  const variable = candidate.privateBackupContract.directoryEnvironmentVariable;
  const supplied = process.env[variable];
  assert(supplied, `${variable} is required for private backup verification.`);
  assert(isAbsolute(supplied), 'Private backup directory must be absolute.');
  assert(!lstatSync(supplied).isSymbolicLink(), 'Private backup directory must not be a symlink.');
  const directory = realpathSync(supplied);
  const relativeToRoot = relative(root, directory);
  assert(
    relativeToRoot.startsWith('..') && !isAbsolute(relativeToRoot),
    'Private backups must resolve outside the repository.',
  );

  for (const expected of candidate.privateBackupContract.files) {
    const path = join(directory, expected.fileName);
    const metadata = lstatSync(path);
    assert(metadata.isFile() && !metadata.isSymbolicLink(), 'Backup must be a regular file.');
    assert((metadata.mode & 0o777) === 0o600, 'Backup file mode must be 0600.');
    assert(statSync(path).size === expected.bytes, 'Backup byte size drifted.');
    const content = readFileSync(path);
    assert(
      createHash('sha256').update(content).digest('hex') === expected.sha256,
      'Backup SHA-256 drifted.',
    );
    const state = JSON.parse(content.toString('utf8'));
    assert(
      state.version === candidate.privateBackupContract.terraformStateFormatVersion &&
        Number.isInteger(state.serial) &&
        state.serial >= 0 &&
        typeof state.lineage === 'string' &&
        state.lineage.length > 0 &&
        Array.isArray(state.resources),
      'Backup Terraform-state structure drifted.',
    );
    const inventory = stateInventory(state);
    assert(
      inventory.instanceCount === expected.managedResourceInstanceCount &&
        JSON.stringify(inventory.resources) ===
          JSON.stringify([...expected.managedResources].sort()),
      'Private backup managed-resource inventory drifted.',
    );
  }
}

validate(contract);

const trackedStateArtifacts = execFileSync(
  'git',
  ['ls-files', '*.tfstate', '*.tfstate.*', '*.tfplan'],
  { cwd: root, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);
assert(trackedStateArtifacts.length === 0, 'A Terraform state or plan artifact is tracked.');

const argumentsList = process.argv.slice(2);
assert(
  argumentsList.length === 0 ||
    (argumentsList.length === 1 && argumentsList[0] === '--verify-private-backups'),
  'Only --verify-private-backups is supported.',
);
if (argumentsList[0] === '--verify-private-backups') verifyPrivateBackups(contract);

const mutations = {
  'cost-pause-disabled': (value) => (value.costPause.active = false),
  'remote-backend-overclaimed': (value) => (value.costPause.remoteBackendAvailable = true),
  'metered-resource-overclaimed': (value) => (value.costPause.standingMeteredResourceCount = 1),
  'workload-overclaimed': (value) => (value.costPause.disposableWorkloadResourceCount = 1),
  'terraform-enabled': (value) => (value.costPause.terraformCommandAllowed = true),
  'azure-mutation-enabled': (value) => (value.costPause.azureMutationAllowed = true),
  'backup-mode-weakened': (value) => (value.privateBackupContract.requiredFileMode = '0644'),
  'backup-location-weakened': (value) =>
    (value.privateBackupContract.mustResolveOutsideRepository = false),
  'backup-symlink-enabled': (value) => (value.privateBackupContract.mustNotBeSymlink = false),
  'backup-digest-drift': (value) => (value.privateBackupContract.files[0].sha256 = '0'.repeat(64)),
  'bootstrap-resource-added': (value) =>
    value.privateBackupContract.files[0].managedResources.push('azurerm_resource_group.extra:1'),
  'control-resource-removed': (value) =>
    value.privateBackupContract.files[1].managedResources.pop(),
  'sequence-shortened': (value) => value.recoverySequence.pop(),
  'sequence-reordered': (value) => value.recoverySequence.reverse(),
  'apply-made-read-only': (value) => (value.recoverySequence[2].mutationAllowed = false),
  'plan-made-mutating': (value) => (value.recoverySequence[1].mutationAllowed = true),
  'bootstrap-delete-enabled': (value) => (value.restorePlanAllowlist.deletesAllowed = 1),
  'bootstrap-update-enabled': (value) => (value.restorePlanAllowlist.updatesAllowed = 1),
  'replacement-enabled': (value) => (value.restorePlanAllowlist.replacementsAllowed = 1),
  'container-app-enabled': (value) => (value.restorePlanAllowlist.containerAppsAllowed = 1),
  'workload-enabled': (value) =>
    (value.restorePlanAllowlist.disposableWorkloadResourcesAllowed = 1),
  'cost-ceiling-raised': (value) =>
    (value.restorePlanAllowlist.maximumRetainedMonthlyCeilingUsd = 5),
  'other-project-safety-disabled': (value) =>
    (value.mandatorySafety.otherProjectMutationForbidden = false),
  'current-ip-binding-disabled': (value) =>
    (value.mandatorySafety.bindPlanToSourceProviderLockStateAndCurrentIp = false),
  'shared-key-enabled': (value) => (value.mandatorySafety.storageSharedKeyDisabled = false),
  'workload-plan-unblocked': (value) =>
    (value.mandatorySafety.workloadPlanBeforeRecoveryForbidden = false),
  'plan-preapproved': (value) => (value.currentAuthorization.terraformPlanApproved = true),
  'apply-preapproved': (value) => (value.currentAuthorization.terraformApplyApproved = true),
  'role-mutation-preapproved': (value) =>
    (value.currentAuthorization.azureRoleMutationApproved = true),
  'state-upload-preapproved': (value) => (value.currentAuthorization.stateUploadApproved = true),
};

let refusalCount = 0;
for (const [name, mutate] of Object.entries(mutations)) {
  const candidate = clone(contract);
  mutate(candidate);
  let refused = false;
  try {
    validate(candidate);
  } catch {
    refused = true;
  }
  assert(refused, `Expected refusal did not occur: ${name}`);
  refusalCount += 1;
}

console.log(
  `Azure retained-state recovery gate passed for ${contract.privateBackupContract.files.length} private state bindings, ${contract.recoverySequence.length} ordered approval stages, ${refusalCount} refusal scenarios, zero authorized Azure/Terraform actions, and ${argumentsList.length === 1 ? 'verified private backup bytes' : 'static contract mode'}.`,
);
