import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/azure-subscription-placement.v1.json'), 'utf8'),
);
const foundation = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/terraform-foundation.v1.json'), 'utf8'),
);
const readiness = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/azure-plan-readiness.v1.json'), 'utf8'),
);
const controlSource = readFileSync(
  join(repositoryRoot, 'infra/terraform/control-plane/main.tf'),
  'utf8',
);
const controlVariables = readFileSync(
  join(repositoryRoot, 'infra/terraform/control-plane/variables.tf'),
  'utf8',
);
const workloadSource = readFileSync(
  join(repositoryRoot, 'infra/terraform/environments/dev/main.tf'),
  'utf8',
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validate(candidate) {
  assert(candidate.schemaVersion === 1, 'Placement schema drifted.');
  assert(
    candidate.checkpoint === 'M05-control-plane-applied-verified-022' &&
      candidate.checkpoint === foundation.checkpoint &&
      candidate.checkpoint === readiness.checkpoint,
    'Placement checkpoint drifted from the Terraform/readiness contracts.',
  );
  assert(
    candidate.activationStatus === 'local_contract_only' &&
      candidate.ownerDecision === 'dedicated-local-missions' &&
      !candidate.azureMutationExecuted,
    'Placement contract drifted from the dedicated owner decision or overclaims Azure execution.',
  );
  assert(
    candidate.preferredPlacement === 'dedicated-local-missions' &&
      candidate.placementOptions.length === 2 &&
      candidate.placementOptions.some((option) => option.id === 'dedicated-local-missions') &&
      candidate.placementOptions.some((option) => option.id === 'shared-nonproduction') &&
      candidate.placementOptions.every(
        (option) =>
          option.ownerApprovalRequired &&
          option.workflowAssignmentScope === 'local-missions-landing-zone-resource-group',
      ),
    'Dedicated/shared placement choices or approvals drifted.',
  );

  const boundary = candidate.implementedBoundary;
  assert(
    boundary.pattern === 'retained-workload-landing-zone' &&
      boundary.resourceGroupName ===
        foundation.controlPlaneContract.workloadLandingZoneResourceGroupName &&
      boundary.ownedByTerraformRoot === 'control-plane' &&
      !boundary.workloadRootCreatesResourceGroup &&
      !boundary.workloadRootDeletesResourceGroup &&
      !boundary.subscriptionScopeWorkloadRbac &&
      boundary.expectedMeteredResourcesAfterDailyDestroy === 0,
    'The Local Missions landing-zone isolation boundary drifted.',
  );

  const rbac = candidate.workflowRbac;
  const roleIds = rbac.delegatedRoleDefinitions.map((role) => role.id).sort();
  assert(
    JSON.stringify(roleIds) ===
      JSON.stringify(
        [...foundation.controlPlaneContract.delegatedWorkloadRoleDefinitionIds].sort(),
      ) &&
      rbac.delegatedRoleDefinitions.length ===
        foundation.controlPlaneContract.delegatedWorkloadRoleDefinitionCount &&
      rbac.assignmentCount === foundation.controlPlaneContract.workflowRoleAssignmentCount &&
      JSON.stringify(rbac.plan) === JSON.stringify(['Reader']) &&
      JSON.stringify(rbac.apply) ===
        JSON.stringify([
          'Local Missions Dev Workload Deployer',
          'Role Based Access Control Administrator',
        ]) &&
      JSON.stringify(rbac.destroy) ===
        JSON.stringify([
          'Local Missions Dev Workload Destroyer',
          'Role Based Access Control Administrator',
        ]) &&
      rbac.customRoleDefinitionCount ===
        foundation.controlPlaneContract.customWorkloadRoleDefinitionCount &&
      !rbac.applyCanDeleteResources &&
      !rbac.destroyCanDeleteLandingZone &&
      rbac.rbacAdministratorConditionVersion === '2.0' &&
      JSON.stringify(rbac.delegatedPrincipalTypes) === JSON.stringify(['ServicePrincipal']) &&
      !rbac.canAssignOwner &&
      !rbac.canAssignContributor &&
      !rbac.canAssignRbacAdministrator &&
      !rbac.canAssignUserAccessAdministrator,
    'Workflow role or constrained-delegation contract drifted.',
  );

  assert(
    candidate.dailyTeardown.destroyExactDeploymentStampOnly &&
      candidate.dailyTeardown.retainsLandingZone &&
      candidate.dailyTeardown.retainsControlPlane &&
      candidate.dailyTeardown.retainsRemoteState &&
      !candidate.dailyTeardown.otherProjectTargetsAllowed &&
      candidate.dailyTeardown.terraformStateMustBeEmpty &&
      candidate.dailyTeardown.independentLiveInventoryMustBeEmpty,
    'Daily teardown isolation drifted.',
  );
  assert(
    candidate.rejectedPatterns.length === 7 &&
      candidate.rejectedPatterns.includes('subscription-owner-workflow') &&
      candidate.rejectedPatterns.includes('subscription-contributor-workflow') &&
      candidate.rejectedPatterns.includes('built-in-contributor-workflow') &&
      candidate.rejectedPatterns.includes('unconstrained-role-assignment-administrator') &&
      candidate.rejectedPatterns.includes(
        'shared-subscription-stamped-resource-group-create-delete',
      ),
    'Rejected high-blast-radius patterns drifted.',
  );
  assert(
    candidate.sources.length === 6 &&
      candidate.sources.every((source) => source.startsWith('https://learn.microsoft.com/')),
    'Placement evidence must use only reviewed Microsoft sources.',
  );

  assert(
    controlSource.includes('resource "azurerm_resource_group" "workload_landing_zone"') &&
      controlSource.includes(
        'scope                            = azurerm_resource_group.workload_landing_zone[0].id',
      ) &&
      controlSource.includes('builtin_role = "Reader"') &&
      controlSource.includes('resource "azurerm_role_definition" "workload"') &&
      controlSource.includes('Local Missions Dev Workload Deployer') &&
      controlSource.includes('Local Missions Dev Workload Destroyer') &&
      controlSource.includes('"*/delete"') &&
      controlSource.includes('"Microsoft.Resources/subscriptions/resourceGroups/delete"') &&
      (controlSource.match(/builtin_role = "Role Based Access Control Administrator"/g) ?? [])
        .length === 2 &&
      controlSource.includes(
        "PrincipalType] ForAnyOfAnyValues:StringEqualsIgnoreCase {'ServicePrincipal'}",
      ) &&
      controlSource.includes(
        'condition_version                = each.value.condition == null ? null : "2.0"',
      ),
    'Control-plane Terraform no longer implements landing-zone-scoped constrained delegation.',
  );
  assert(
    controlVariables.includes('default     = "undecided"') &&
      controlVariables.includes('"dedicated-local-missions"') &&
      controlVariables.includes('"shared-nonproduction"'),
    'Terraform no longer refuses an undecided subscription placement.',
  );
  assert(
    !workloadSource.includes('module "workload_resource_group"') &&
      workloadSource.includes('data "azurerm_resource_group" "workload_landing_zone"') &&
      workloadSource.includes(
        'var.workload_resource_group_name == "rg-local-missions-dev-eus2-001"',
      ),
    'The disposable workload root must consume, not own, the retained landing-zone group.',
  );

  const serialized = JSON.stringify(candidate);
  assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized), 'Email retained.');
  assert(!/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(serialized), 'IP address retained.');
}

validate(contract);

const refusals = [
  ['owner decision drift', (value) => (value.ownerDecision = 'shared-nonproduction')],
  ['Azure mutation claimed', (value) => (value.azureMutationExecuted = true)],
  ['dedicated preference removed', (value) => (value.preferredPlacement = 'shared-nonproduction')],
  ['approval removed', (value) => (value.placementOptions[0].ownerApprovalRequired = false)],
  [
    'subscription role scope',
    (value) => (value.implementedBoundary.subscriptionScopeWorkloadRbac = true),
  ],
  [
    'workload owns group',
    (value) => (value.implementedBoundary.workloadRootCreatesResourceGroup = true),
  ],
  [
    'workload deletes group',
    (value) => (value.implementedBoundary.workloadRootDeletesResourceGroup = true),
  ],
  [
    'metered residue accepted',
    (value) => (value.implementedBoundary.expectedMeteredResourcesAfterDailyDestroy = 1),
  ],
  ['plan contributor', (value) => (value.workflowRbac.plan = ['Contributor'])],
  ['apply owner', (value) => value.workflowRbac.apply.push('Owner')],
  ['apply delete allowed', (value) => (value.workflowRbac.applyCanDeleteResources = true)],
  [
    'landing zone delete allowed',
    (value) => (value.workflowRbac.destroyCanDeleteLandingZone = true),
  ],
  ['unconstrained principal', (value) => value.workflowRbac.delegatedPrincipalTypes.push('User')],
  ['delegated contributor', (value) => (value.workflowRbac.canAssignContributor = true)],
  ['condition removed', (value) => (value.workflowRbac.rbacAdministratorConditionVersion = '')],
  ['role removed', (value) => value.workflowRbac.delegatedRoleDefinitions.pop()],
  ['landing zone teardown', (value) => (value.dailyTeardown.retainsLandingZone = false)],
  ['other target allowed', (value) => (value.dailyTeardown.otherProjectTargetsAllowed = true)],
  ['state proof removed', (value) => (value.dailyTeardown.terraformStateMustBeEmpty = false)],
  ['unofficial source', (value) => value.sources.push('https://example.com')],
  ['email retained', (value) => (value.alert = 'person@example.com')],
  ['IP retained', (value) => (value.operator = '203.0.113.10')],
];

for (const [label, mutate] of refusals) {
  const candidate = clone(contract);
  mutate(candidate);
  let refused = false;
  try {
    validate(candidate);
  } catch {
    refused = true;
  }
  assert(refused, `Expected placement refusal did not fail: ${label}`);
}

console.log(
  `Azure subscription placement passed the dedicated owner decision, ${contract.workflowRbac.assignmentCount} landing-zone-scoped workflow role assignments, ${contract.workflowRbac.delegatedRoleDefinitions.length} delegated data roles, and ${refusals.length} refusal scenarios; no Azure mutation is claimed.`,
);
