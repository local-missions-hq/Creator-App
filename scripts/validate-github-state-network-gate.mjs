import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/github-state-network-gate.v1.json'), 'utf8'),
);

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function validate(candidate) {
  assert(candidate.schemaVersion === 1, 'Schema version drifted.');
  assert(
    candidate.activationStatus === 'proposal_review_pending_no_external_change',
    'Activation status drifted.',
  );
  assert(
    candidate.checkpoint === 'M05-github-state-network-design-local-025',
    'Checkpoint drifted.',
  );

  const repository = candidate.currentRepository;
  assert(
    repository.owner === 'stratiosai' &&
      repository.ownerType === 'User' &&
      repository.organizationOwned === false &&
      repository.visibility === 'public' &&
      repository.defaultBranch === 'main' &&
      repository.source === 'github_api_read_only',
    'Current repository boundary drifted.',
  );

  const problem = candidate.problem;
  assert(
    problem.oidcProofPassed === true &&
      problem.oidcProofRunId === 33513053687 &&
      /^[0-9a-f]{40}$/.test(problem.oidcProofCommit) &&
      problem.stateDataActionsProven === true &&
      problem.workflowBlobReadBlockedByFirewall === true &&
      problem.defaultDenyFirewallPreserved === true &&
      problem.endToEndWorkflowStateAccessProven === false,
    'State-network problem statement drifted.',
  );

  const recommendation = candidate.recommendation;
  assert(
    recommendation.id === 'organization_team_larger_runner_azure_vnet_service_endpoint' &&
      recommendation.ownerApprovalRequired === true &&
      recommendation.securityOutcome === 'default_deny_exact_subnet_and_short_lived_oidc' &&
      recommendation.supersedesAcceptedAdr === false,
    'Recommended decision drifted.',
  );
  const github = recommendation.github;
  assert(
    github.organizationAccountRequired === true &&
      github.organizationCandidate === 'local-missions-hq' &&
      github.organizationCandidateStatus === 'no_visible_account_not_reserved' &&
      github.plan === 'Team' &&
      github.repositoryTransferRequired === true &&
      github.keepRepositoryPublic === true &&
      github.largerRunnerRequired === true &&
      github.runnerOperatingSystem === 'Linux' &&
      github.runnerArchitecture === 'x64' &&
      github.runnerCores === 2 &&
      github.maximumConcurrency === 1 &&
      github.runnerRepositoryAccess === 'Creator-App-only' &&
      github.staticPublicIp === false,
    'GitHub runner boundary drifted.',
  );
  const network = recommendation.azureNetwork;
  assert(
    network.region === 'eastus2' &&
      network.vnetRequired === true &&
      network.dedicatedRunnerSubnet === true &&
      network.networkSecurityGroupRequired === true &&
      network.githubNetworkSettingsRequired === true &&
      network.providerRegistrationRequired === 'GitHub.Network' &&
      network.serviceEndpoint === 'Microsoft.Storage' &&
      network.storageRuleScope === 'exact_runner_subnet_only' &&
      network.defaultAction === 'Deny' &&
      network.trustedServiceBypassAllowed === false &&
      network.inboundFromInternetAllowed === false &&
      network.privateEndpointDeferred === true,
    'Azure network boundary drifted.',
  );

  const cost = candidate.costReview;
  assert(
    cost.currency === 'USD' &&
      cost.githubTeamPerUserMonthly === 4 &&
      cost.linuxTwoCoreRunnerPerMinute === 0.006 &&
      cost.runnerCostForTwentyMinutes === 0.12 &&
      cost.runnerCostForSixtyMinutes === 0.36 &&
      cost.runnerIdleCost === 0 &&
      cost.vnetBaseMonthlyCost === 0 &&
      cost.reviewedAt === '2026-09-01' &&
      cost.warning.length >= 64,
    'Cost review drifted.',
  );
  assert(
    cost.runnerCostForTwentyMinutes === cost.linuxTwoCoreRunnerPerMinute * 20 &&
      cost.runnerCostForSixtyMinutes === cost.linuxTwoCoreRunnerPerMinute * 60,
    'Runner arithmetic drifted.',
  );

  const rejected = candidate.rejectedAlternatives;
  const rejectedIds = [
    'standard_runner_global_ip_allowlist',
    'single_dynamic_runner_ip_rule',
    'self_hosted_runner_on_current_public_repository',
    'storage_all_networks',
    'broad_trusted_services_bypass',
  ];
  assert(
    JSON.stringify(rejected.map((entry) => entry.id)) === JSON.stringify(rejectedIds) &&
      rejected.every((entry) => entry.reason.length >= 64),
    'Rejected-alternative register drifted.',
  );
  assert(candidate.requiredApprovalGates.length === 8, 'Approval gate count drifted.');
  assert(
    new Set(candidate.requiredApprovalGates).size === candidate.requiredApprovalGates.length,
    'Approval gate register contains a duplicate.',
  );
  assert(
    candidate.sourceReview.length === 6 &&
      candidate.sourceReview.every((url) =>
        /^https:\/\/(?:docs\.github\.com|learn\.microsoft\.com)\//.test(url),
      ),
    'Official source register drifted.',
  );
  assert(
    candidate.costReview.sources.every((url) => /^https:\/\//.test(url)),
    'Cost source register drifted.',
  );
  assert(
    Object.values(candidate.currentExecution).every((value) => value === false),
    'The local design must not claim an external change.',
  );
}

validate(manifest);

const mutations = [
  (value) => (value.activationStatus = 'approved'),
  (value) => (value.checkpoint = 'M05-live'),
  (value) => (value.currentRepository.organizationOwned = true),
  (value) => (value.problem.endToEndWorkflowStateAccessProven = true),
  (value) => (value.problem.defaultDenyFirewallPreserved = false),
  (value) => (value.recommendation.ownerApprovalRequired = false),
  (value) => (value.recommendation.github.plan = 'Free'),
  (value) => (value.recommendation.github.maximumConcurrency = 10),
  (value) => (value.recommendation.azureNetwork.defaultAction = 'Allow'),
  (value) => (value.recommendation.azureNetwork.trustedServiceBypassAllowed = true),
  (value) => (value.costReview.runnerCostForSixtyMinutes = 0.35),
  (value) => value.rejectedAlternatives.pop(),
  (value) => value.requiredApprovalGates.pop(),
  (value) => (value.currentExecution.githubPlanPurchased = true),
];
for (const mutate of mutations) {
  const candidate = structuredClone(manifest);
  mutate(candidate);
  let refused = false;
  try {
    validate(candidate);
  } catch {
    refused = true;
  }
  assert(refused, 'A state-network design mutation unexpectedly passed.');
}

console.log(
  `GitHub state-network gate passed one approval-pending private-runner design, ${manifest.rejectedAlternatives.length} rejected unsafe alternatives, ${manifest.requiredApprovalGates.length} external gates, ${mutations.length} refusal scenarios, and zero external changes.`,
);
