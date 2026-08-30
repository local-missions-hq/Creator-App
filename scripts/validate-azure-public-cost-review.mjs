import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repositoryRoot, 'config/azure-public-cost-review.v1.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const terraform = JSON.parse(
  readFileSync(join(repositoryRoot, 'config/terraform-foundation.v1.json'), 'utf8'),
);

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertClose(actual, expected, label, tolerance = 0.000001) {
  assert(Math.abs(actual - expected) <= tolerance, `${label} drifted.`);
}

const expectedServices = [
  'container-apps',
  'container-registry',
  'key-vault',
  'postgresql',
  'service-bus',
  'storage',
  'telemetry',
];

const expectedMeterSignatures = [
  'container-apps|Standard|Standard Memory Active Usage|0.000003|1 GiB Second|0',
  'container-apps|Standard|Standard Requests|0.4|1M|0',
  'container-apps|Standard|Standard vCPU Active Usage|0.000024|1 Second|0',
  'container-registry|Basic|Basic Registry Unit|0.1666|1/Day|0',
  'key-vault|Standard|Operations|0.03|10K|0',
  'postgresql|B1MS|B1MS|0.017|1 Hour|0',
  'postgresql|Backup Storage LRS|Backup Storage LRS Data Stored|0.095|1 GB/Month|0',
  'postgresql|Storage|Storage Data Stored|0.115|1 GB/Month|0',
  'service-bus|Standard|Standard Base Unit|0.013441|1/Hour|0',
  'storage|Hot LRS|All Other Operations|0.004|10K|0',
  'storage|Hot LRS|Hot LRS Data Stored|0.0184|1 GB/Month|0',
  'storage|Hot LRS|Hot LRS Write Operations|0.05|10K|0',
  'storage|Hot LRS|Hot Read Operations|0.004|10K|0',
  'storage|Hot LRS|LRS List and Create Container Operations|0.05|10K|0',
  'telemetry|Analytics Logs|Analytics Logs Data Ingestion|0|1 GB|0',
  'telemetry|Analytics Logs|Analytics Logs Data Ingestion|2.76|1 GB|5',
  'telemetry|Analytics Logs|Analytics Logs Data Retention|0.12|1 GB/Month|0',
];

const expectedExecutionKeys = [
  'publicRetailPriceApiQueried',
  'azureAuthenticated',
  'subscriptionInspected',
  'subscriptionOfferPriceRequested',
  'remoteBackendInitialized',
  'providerBackedPlanExecuted',
  'terraformMutationExecuted',
  'azureResourcesCreated',
  'cloudCostIncurred',
  'registryContacted',
  'customerDataUsed',
];

function validateManifest(candidate) {
  assert(candidate.schemaVersion === 1, 'Cost-review schema version drifted.');
  assert(
    candidate.checkpoint === 'M05-public-azure-service-cost-review-011',
    'Cost-review checkpoint drifted.',
  );
  assert(
    candidate.reviewStatus === 'public_catalog_review_complete_approval_pending',
    'Review status overclaims approval.',
  );
  assert(candidate.currency === 'USD', 'Cost-review currency must remain USD.');

  const reviewedAt = Date.parse(candidate.reviewedAt);
  const validThrough = Date.parse(candidate.validThrough);
  assert(Number.isFinite(reviewedAt) && Number.isFinite(validThrough), 'Review dates are invalid.');
  assert(validThrough > reviewedAt, 'Review validity must end after retrieval.');
  assert(
    validThrough - reviewedAt <= 7 * 24 * 60 * 60 * 1000,
    'The public price review cannot be valid for more than seven days.',
  );

  const region = candidate.candidateRegion;
  assert(region.armName === 'eastus2', 'Candidate region drifted.');
  assert(region.displayName === 'East US 2', 'Candidate region display name drifted.');
  assert(region.selectedForFirstEphemeralPlan === true, 'Candidate region was not selected.');
  assert(region.publicCatalogMetersPresent === true, 'Public regional meter proof is missing.');
  assert(
    region.postgresRegionDocumentationPresent === true,
    'PostgreSQL regional documentation proof is missing.',
  );
  assert(region.subscriptionAvailabilityVerified === false, 'Subscription availability overclaim.');
  assert(region.quotaVerified === false, 'Subscription quota overclaim.');
  assert(region.policyVerified === false, 'Subscription policy overclaim.');
  assert(
    region.requiresSubscriptionScopedRevalidationBeforePlan === true,
    'Subscription-scoped revalidation must remain required.',
  );

  const owners = Object.values(candidate.ownerAssignments);
  assert(owners.length === 6, 'Owner-assignment count drifted.');
  for (const owner of owners) {
    assert(
      owner.accountableHuman === 'Blake Tindol',
      'Every pre-plan responsibility must retain an accountable human.',
    );
  }
  assert(
    candidate.ownerAssignments.planProducer.actor === 'Codex' &&
      candidate.ownerAssignments.planProducer.actorType === 'automated_agent',
    'Plan-producer assignment drifted.',
  );
  assert(
    candidate.ownerAssignments.independentPlanReviewer.independentFromProducer === true,
    'The plan reviewer must remain independent from the automated producer.',
  );
  assert(
    candidate.ownerAssignments.independentPlanReviewer.status === 'assigned_approval_pending',
    'Plan approval was overclaimed.',
  );

  const budget = candidate.budgetProposal;
  assert(budget.currency === 'USD', 'Budget currency drifted.');
  assert(budget.perEightHourRunCeilingUsd === 5, 'Per-run ceiling drifted.');
  assert(budget.monthlyBudgetUsd === 25, 'Monthly budget proposal drifted.');
  assert(budget.monthlyBudgetUsd <= 100, 'Budget exceeds the Terraform safety ceiling.');
  assert(
    JSON.stringify(budget.actualAlertPercentages) === JSON.stringify([50, 80, 100]) &&
      JSON.stringify(budget.forecastAlertPercentages) === JSON.stringify([50, 80, 100]),
    'Budget alert thresholds drifted.',
  );
  assert(budget.alertDeliveryVerified === false, 'Alert delivery was overclaimed.');
  assert(budget.approved === false, 'Budget approval was overclaimed.');
  assert(budget.approvalReference === '', 'An unapproved budget cannot carry approval evidence.');

  const services = candidate.serviceDecisions.map((service) => service.id);
  assert(
    JSON.stringify([...services].sort()) === JSON.stringify(expectedServices),
    'Reviewed service membership drifted.',
  );
  assert(new Set(services).size === services.length, 'Reviewed services contain a duplicate.');
  for (const service of candidate.serviceDecisions) {
    assert(service.decision === 'retain', `${service.id} decision drifted.`);
    assert(service.terraformChoice.length >= 24, `${service.id} Terraform choice is missing.`);
    assert(service.reason.length >= 24, `${service.id} decision reason is missing.`);
    assert(service.meters.length >= 1, `${service.id} retail meter evidence is missing.`);
    for (const meter of service.meters) {
      assert(meter.retailPrice >= 0, `${service.id} has an invalid retail price.`);
      assert(meter.unitOfMeasure.length > 0, `${service.id} meter unit is missing.`);
      assert(meter.tierMinimumUnits >= 0, `${service.id} meter tier is invalid.`);
    }
  }
  const meterSignatures = candidate.serviceDecisions
    .flatMap((service) =>
      service.meters.map((meter) =>
        [
          service.id,
          meter.skuName,
          meter.meterName,
          meter.retailPrice,
          meter.unitOfMeasure,
          meter.tierMinimumUnits,
        ].join('|'),
      ),
    )
    .sort();
  assert(
    JSON.stringify(meterSignatures) === JSON.stringify(expectedMeterSignatures),
    'Captured public retail meter evidence drifted.',
  );

  const estimate = candidate.estimate;
  assert(estimate.workloadHours === 8, 'Workload-hour assumption drifted.');
  assert(estimate.monthHoursForProration === 730, 'Monthly proration assumption drifted.');
  const raw = estimate.lineItems.reduce((sum, item) => sum + item.estimatedUsd, 0);
  assertClose(raw, estimate.rawEightHourEstimateUsd, 'Raw estimate');
  assertClose(Number(raw.toFixed(2)), estimate.roundedEightHourEstimateUsd, 'Rounded estimate');
  assertClose(
    estimate.roundedEightHourEstimateUsd + estimate.uncertaintyBufferUsd,
    estimate.perEightHourRunCeilingUsd,
    'Buffered run ceiling',
  );
  assert(
    estimate.perEightHourRunCeilingUsd === budget.perEightHourRunCeilingUsd,
    'Estimate and budget per-run ceilings drifted.',
  );
  assert(estimate.excludedUntilProviderPlan.length >= 6, 'Cost exclusions are incomplete.');

  const endpoint = candidate.sources.retailPriceApi.endpoint;
  assert(endpoint === 'https://prices.azure.com/api/retail/prices', 'Retail API drifted.');
  assert(
    candidate.sources.retailPriceApi.apiVersion === '2023-01-01-preview',
    'Retail API version drifted.',
  );
  assert(candidate.sources.retailPriceApi.filters.length === 8, 'Retail filters drifted.');
  for (const source of candidate.sources.officialDocumentation) {
    assert(
      source.startsWith('https://learn.microsoft.com/'),
      'Only official Microsoft documentation may support this review.',
    );
  }

  const executionKeys = Object.keys(candidate.currentExecution);
  assert(
    JSON.stringify(executionKeys) === JSON.stringify(expectedExecutionKeys),
    'Execution evidence fields drifted.',
  );
  assert(
    candidate.currentExecution.publicRetailPriceApiQueried === true,
    'Public price query missing.',
  );
  for (const key of expectedExecutionKeys.slice(1)) {
    assert(candidate.currentExecution[key] === false, `${key} must remain false.`);
  }

  const gate = candidate.approvalGate;
  assert(gate.status === 'pending_user_approval', 'Approval status drifted.');
  assert(gate.requiresAzureAuthentication === true, 'Next step must require Azure auth.');
  assert(gate.requiresSubscriptionRead === true, 'Next step must require subscription read.');
  assert(gate.applyAuthorized === false, 'Apply authorization was overclaimed.');
  assert(gate.destroyAuthorized === false, 'Destroy authorization was overclaimed.');
}

function validateTerraformCoherence(candidate, terraformContract) {
  assert(
    candidate.candidateRegion.armName === 'eastus2',
    'Reviewed region drifted from the Terraform default.',
  );
  const safe = terraformContract.safeLowCostDefaults;
  const postgres = candidate.serviceDecisions.find((service) => service.id === 'postgresql');
  const serviceBus = candidate.serviceDecisions.find((service) => service.id === 'service-bus');
  const registry = candidate.serviceDecisions.find(
    (service) => service.id === 'container-registry',
  );
  assert(
    postgres.terraformChoice.includes(safe.postgresSkuName) &&
      postgres.terraformChoice.includes(String(safe.postgresStorageMb / 1024)),
    'PostgreSQL cost review drifted from Terraform.',
  );
  assert(
    serviceBus.terraformChoice.includes(safe.serviceBusSku),
    'Service Bus review drifted from Terraform.',
  );
  assert(
    registry.terraformChoice.includes(safe.containerRegistrySku),
    'Registry review drifted from Terraform.',
  );
  assert(
    terraformContract.azureCompletionClaimed === false,
    'Terraform overclaims Azure completion.',
  );
}

const mutations = {
  'region-drift': (value) => (value.candidateRegion.armName = 'westus2'),
  'review-window-too-long': (value) => (value.validThrough = '2026-09-30T14:19:59Z'),
  'subscription-availability-claimed': (value) =>
    (value.candidateRegion.subscriptionAvailabilityVerified = true),
  'owner-missing': (value) => (value.ownerAssignments.costOwner.accountableHuman = ''),
  'producer-reviewer-not-independent': (value) =>
    (value.ownerAssignments.independentPlanReviewer.independentFromProducer = false),
  'budget-over-ceiling': (value) => (value.budgetProposal.monthlyBudgetUsd = 101),
  'budget-approved-without-reference': (value) => (value.budgetProposal.approved = true),
  'alert-delivery-claimed': (value) => (value.budgetProposal.alertDeliveryVerified = true),
  'service-missing': (value) => value.serviceDecisions.pop(),
  'service-choice-drift': (value) =>
    (value.serviceDecisions.find((service) => service.id === 'service-bus').decision = 'replace'),
  'meter-evidence-drift': (value) => (value.serviceDecisions[0].meters[0].retailPrice += 1),
  'price-total-drift': (value) => (value.estimate.rawEightHourEstimateUsd += 1),
  'run-ceiling-too-low': (value) => (value.estimate.perEightHourRunCeilingUsd = 3),
  'unauthorized-azure-authentication': (value) =>
    (value.currentExecution.azureAuthenticated = true),
  'subscription-inspection-claimed': (value) =>
    (value.currentExecution.subscriptionInspected = true),
  'subscription-price-request-claimed': (value) =>
    (value.currentExecution.subscriptionOfferPriceRequested = true),
  'remote-backend-claimed': (value) => (value.currentExecution.remoteBackendInitialized = true),
  'provider-plan-claimed': (value) => (value.currentExecution.providerBackedPlanExecuted = true),
  'terraform-mutation-claimed': (value) =>
    (value.currentExecution.terraformMutationExecuted = true),
  'azure-resource-creation-claimed': (value) =>
    (value.currentExecution.azureResourcesCreated = true),
  'cloud-cost-claimed': (value) => (value.currentExecution.cloudCostIncurred = true),
  'registry-contact-claimed': (value) => (value.currentExecution.registryContacted = true),
  'customer-data-claimed': (value) => (value.currentExecution.customerDataUsed = true),
  'apply-authorization-claimed': (value) => (value.approvalGate.applyAuthorized = true),
  'destroy-authorization-claimed': (value) => (value.approvalGate.destroyAuthorized = true),
  'non-microsoft-documentation-source': (value) =>
    value.sources.officialDocumentation.push('https://example.com/unreviewed'),
};

validateManifest(manifest);
validateTerraformCoherence(manifest, terraform);

let refusals = 0;
for (const [name, mutate] of Object.entries(mutations)) {
  const candidate = clone(manifest);
  mutate(candidate);
  let refused = false;
  try {
    validateManifest(candidate);
    validateTerraformCoherence(candidate, terraform);
  } catch {
    refused = true;
  }
  assert(refused, `Mutation was not refused: ${name}`);
  refusals += 1;
}

assert(
  JSON.stringify(manifest.refusalScenarios) === JSON.stringify(Object.keys(mutations)),
  'Refusal-scenario manifest drifted.',
);

console.log(
  [
    'Azure public service/cost review passed:',
    `${manifest.serviceDecisions.length} reviewed service groups,`,
    `$${manifest.estimate.roundedEightHourEstimateUsd.toFixed(2)} estimated,`,
    `$${manifest.estimate.perEightHourRunCeilingUsd.toFixed(2)} buffered run ceiling,`,
    `${refusals} refusal scenarios,`,
    'Azure approval still pending.',
  ].join(' '),
);
