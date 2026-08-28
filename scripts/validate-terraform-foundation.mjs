import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repositoryRoot, 'config/terraform-foundation.v1.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'local-missions-terraform-'));

function fail(message) {
  throw new Error(message);
}

function safeEnvironment(dataDirectory) {
  const environment = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('ARM_') || key.startsWith('AZURE_') || key.startsWith('TF_VAR_')) {
      continue;
    }
    environment[key] = value;
  }
  return {
    ...environment,
    CHECKPOINT_DISABLE: '1',
    TF_DATA_DIR: dataDirectory,
    TF_IN_AUTOMATION: '1',
    TF_INPUT: '0',
  };
}

function runTerraform(root, args, options = {}) {
  const result = spawnSync('terraform', args, {
    cwd: root,
    encoding: 'utf8',
    env: options.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (!options.expectFailure && result.status !== 0) {
    fail(
      `terraform ${args.join(' ')} failed in ${relative(repositoryRoot, root)}:\n${result.stdout}${result.stderr}`,
    );
  }
  if (options.expectFailure && result.status === 0) {
    fail(`terraform ${args.join(' ')} unexpectedly passed in ${relative(repositoryRoot, root)}`);
  }
  return result;
}

function walkFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if (entry === '.terraform') continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walkFiles(path));
    else files.push(path);
  }
  return files;
}

function parseJsonLines(output) {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assertExpirationFixtures() {
  const { expirationPolicy } = manifest;
  if (
    expirationPolicy.timeZone !== 'America/New_York' ||
    expirationPolicy.maxHours !== 8 ||
    expirationPolicy.cutoffHourAmericaNewYork !== 23 ||
    expirationPolicy.warningMinutes !== 60 ||
    expirationPolicy.maxExtensions !== 1
  ) {
    fail('The frozen expiration policy drifted from ADR-049.');
  }
  for (const fixture of expirationPolicy.fixtures) {
    const created = Date.parse(fixture.createdAt);
    const cutoff = Date.parse(fixture.cutoffAt);
    const expected = Date.parse(fixture.expectedExpiresAt);
    if ([created, cutoff, expected].some(Number.isNaN)) {
      fail(`Expiration fixture ${fixture.name} contains an invalid RFC3339 timestamp.`);
    }
    const calculated = Math.min(created + expirationPolicy.maxHours * 60 * 60 * 1000, cutoff);
    if (calculated !== expected) {
      fail(`Expiration fixture ${fixture.name} does not equal the earlier policy deadline.`);
    }
  }
}

function assertSourceBoundary() {
  const terraformDirectory = join(repositoryRoot, 'infra/terraform');
  const source = walkFiles(terraformDirectory)
    .filter(
      (path) =>
        path.endsWith('.tf') || path.endsWith('.tftest.hcl') || path.endsWith('.tfvars.json'),
    )
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  const azureProviders = source.match(/\bprovider\s+"azurerm"/g) ?? [];
  const azureMockProviders = source.match(/\bmock_provider\s+"azurerm"/g) ?? [];
  const backendBlocks = source.match(/\bbackend\s+"azurerm"/g) ?? [];
  const allowedResources = manifest.mockProviderContract.allowedResourceTypes;
  const declaredResourceTypes = [...source.matchAll(/\bresource\s+"(azurerm_[^"]+)"/g)].map(
    (match) => match[1],
  );
  const uniqueDeclaredResourceTypes = [...new Set(declaredResourceTypes)].sort();
  const uniqueAllowedResourceTypes = [...allowedResources].sort();
  if (
    uniqueDeclaredResourceTypes.length !== uniqueAllowedResourceTypes.length ||
    uniqueDeclaredResourceTypes.some(
      (resourceType, index) => resourceType !== uniqueAllowedResourceTypes[index],
    )
  ) {
    fail(
      'Terraform source contains an Azure resource outside the reviewed mock-only module boundary.',
    );
  }
  if (azureProviders.length !== 0) {
    fail(
      'Provider configuration is deferred; local tests must supply only Terraform mock_provider.',
    );
  }
  if (azureMockProviders.length !== 1) {
    fail('The local enabled-shape test must declare exactly one AzureRM mock provider.');
  }
  if (backendBlocks.length !== manifest.roots.length) {
    fail('Each Terraform root must declare exactly one independent azurerm backend boundary.');
  }
  if (/\b(subscription_id|client_secret)\s*=/.test(source)) {
    fail('Terraform source must not contain Azure account identifiers or credentials.');
  }
  const uuidLiterals = [
    ...source.matchAll(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    ),
  ].map((match) => match[0].toLowerCase());
  const syntheticIdentityReferences = new Set(
    manifest.mockProviderContract.syntheticIdentityReferences.map((reference) =>
      reference.toLowerCase(),
    ),
  );
  if (uuidLiterals.some((reference) => !syntheticIdentityReferences.has(reference))) {
    fail(
      'Terraform source contains an identity reference outside the synthetic fixture allowlist.',
    );
  }
  if (
    /\n\s*secret\s*\{/.test(source) ||
    /\bpassword_secret_name\s*=/.test(source) ||
    /\badministrator_password(?:_wo)?\s*=/.test(source)
  ) {
    fail(
      'Terraform source must not contain inline, registry-password, or PostgreSQL password fields.',
    );
  }
  if (
    /\b(?:admin_enabled|anonymous_pull_enabled|shared_access_key_enabled|allow_nested_items_to_be_public|password_auth_enabled|local_auth_enabled)\s*=\s*true\b/.test(
      source,
    )
  ) {
    fail('Terraform source attempted to enable a prohibited local or anonymous access path.');
  }
  const containerAppsSource = readFileSync(
    join(terraformDirectory, 'modules/workload-container-apps/main.tf'),
    'utf8',
  );
  if ((containerAppsSource.match(/@sha256:\$\{var\.images\.[^}]+\}/g) ?? []).length !== 2) {
    fail('API and worker image references must both use immutable SHA-256 digests.');
  }

  const providerRoot = manifest.roots.find(
    (root) => root.rootId === manifest.mockProviderContract.rootId,
  );
  const versionsSource = readFileSync(
    join(repositoryRoot, providerRoot.path, 'versions.tf'),
    'utf8',
  );
  if (
    !versionsSource.includes(`source  = "${manifest.mockProviderContract.providerSource}"`) ||
    !versionsSource.includes(`version = "${manifest.mockProviderContract.providerVersion}"`)
  ) {
    fail('The reviewed AzureRM provider source/version is not pinned exactly.');
  }
  const lockSource = readFileSync(
    join(repositoryRoot, providerRoot.path, '.terraform.lock.hcl'),
    'utf8',
  );
  if (
    !lockSource.includes(
      `provider "registry.terraform.io/${manifest.mockProviderContract.providerSource}"`,
    ) ||
    !lockSource.includes(`version     = "${manifest.mockProviderContract.providerVersion}"`) ||
    !/hashes\s*=\s*\[\s*"h1:/.test(lockSource)
  ) {
    fail('The workload root lock file does not freeze the reviewed AzureRM package and checksum.');
  }

  const backendKeys = manifest.roots.map((root) => root.backendKey);
  if (new Set(backendKeys).size !== backendKeys.length) {
    fail('Control-plane and workload backend keys must be distinct.');
  }
  for (const root of manifest.roots) {
    const backendExample = readFileSync(
      join(repositoryRoot, root.path, 'backend.hcl.example'),
      'utf8',
    );
    if (!backendExample.includes(`key                  = "${root.backendKey}"`)) {
      fail(`Backend example for ${root.rootId} does not use its reviewed key.`);
    }
  }
}

function assertPlan(rootDefinition) {
  const root = join(repositoryRoot, rootDefinition.path);
  const dataDirectory = join(temporaryDirectory, rootDefinition.rootId);
  const environment = safeEnvironment(dataDirectory);
  runTerraform(root, ['init', '-backend=false', '-input=false', '-no-color'], { env: environment });
  runTerraform(root, ['validate', '-no-color'], { env: environment });
  const result = runTerraform(
    root,
    ['test', '-json', '-verbose', '-no-color', `-var-file=${rootDefinition.fixture}`],
    { env: environment },
  );
  const events = parseJsonLines(result.stdout);
  const summary = events.find((event) => event.type === 'test_summary')?.test_summary;
  const plans = events
    .filter((event) => event.type === 'test_plan')
    .map((event) => event.test_plan);
  if (
    !summary ||
    summary.status !== 'pass' ||
    summary.passed !== rootDefinition.planTests ||
    plans.length !== rootDefinition.planTests
  ) {
    fail(
      `${rootDefinition.rootId} did not produce ${rootDefinition.planTests} passing local plan tests.`,
    );
  }
  const localPlan = plans.find(
    (plan) => plan.output_changes?.activation_status?.after === 'local-contract-only',
  );
  if (!localPlan || (localPlan.resource_changes ?? []).length !== 0) {
    fail(`${rootDefinition.rootId} did not retain a zero-change default local plan.`);
  }
  const outputs = localPlan.output_changes ?? {};
  if (outputs.activation_status?.after !== 'local-contract-only') {
    fail(`${rootDefinition.rootId} did not retain the local-only activation state.`);
  }
  if (outputs.backend_contract?.after?.key !== rootDefinition.backendKey) {
    fail(`${rootDefinition.rootId} plan used an unexpected backend ownership key.`);
  }
  for (const plan of plans) {
    if (
      Object.values(plan.output_changes ?? {}).some((output) => output.after_sensitive !== false)
    ) {
      fail(`${rootDefinition.rootId} produced a sensitive local evidence output.`);
    }
  }
  return {
    localOutputs: outputs,
    mockPlan: plans.find(
      (plan) => plan.output_changes?.activation_status?.after === 'mock-enabled-contract',
    ),
    tests: summary.passed,
  };
}

function assertWorkloadPlan(plan) {
  const tags = plan.localOutputs.required_tags?.after ?? {};
  const missingTags = manifest.requiredTags.filter((tag) => !(tag in tags));
  if (missingTags.length > 0)
    fail(`Workload plan is missing required tags: ${missingTags.join(', ')}`);
  if (
    tags.lifecycle !== 'disposable' ||
    tags.terraform_root !== 'workload-dev' ||
    tags.workload_resource_group !== 'rg-local-missions-dev-example'
  ) {
    fail('Workload plan target/lifecycle tags do not identify the explicit disposable scope.');
  }

  const actual = plan.localOutputs.low_cost_defaults?.after ?? {};
  const expected = manifest.safeLowCostDefaults;
  const pairs = {
    apiMaxReplicas: 'api_max_replicas',
    apiMinReplicas: 'api_min_replicas',
    containerRegistrySku: 'container_registry_sku',
    logRetentionDays: 'log_retention_days',
    postgresBackupRetentionDays: 'postgres_backup_retention_days',
    postgresSkuName: 'postgres_sku_name',
    postgresStorageMb: 'postgres_storage_mb',
    serviceBusSku: 'service_bus_sku',
    workerMaxReplicas: 'worker_max_replicas',
    workerMinReplicas: 'worker_min_replicas',
  };
  for (const [manifestKey, outputKey] of Object.entries(pairs)) {
    if (actual[outputKey] !== expected[manifestKey]) {
      fail(`Low-cost default ${outputKey} drifted from the machine contract.`);
    }
  }
}

function assertMockWorkloadPlan(plan) {
  if (!plan.mockPlan) fail('The workload root did not produce its mock-enabled plan.');
  const changes = plan.mockPlan.resource_changes ?? [];
  if (
    changes.length !== manifest.mockProviderContract.enabledPlanResourceChanges ||
    changes.some(
      (change) =>
        !manifest.mockProviderContract.allowedResourceTypes.includes(change.type) ||
        change.change?.actions?.join(',') !== 'create',
    )
  ) {
    fail('The mock-enabled plan must create only the reviewed disposable workload shape.');
  }

  const actualTypeCounts = Object.fromEntries(
    manifest.mockProviderContract.allowedResourceTypes.map((resourceType) => [resourceType, 0]),
  );
  for (const change of changes) actualTypeCounts[change.type] += 1;
  for (const [resourceType, expectedCount] of Object.entries(
    manifest.mockProviderContract.plannedResourceTypeCounts,
  )) {
    if (actualTypeCounts[resourceType] !== expectedCount) {
      fail(
        `Mock plan ${resourceType} count drifted: expected ${expectedCount}, found ${actualTypeCounts[resourceType]}.`,
      );
    }
  }

  const expectedTags = plan.localOutputs.required_tags?.after ?? {};
  for (const change of changes.filter((candidate) =>
    manifest.mockProviderContract.taggableResourceTypes.includes(candidate.type),
  )) {
    const tags = change.change?.after?.tags ?? {};
    if (
      manifest.requiredTags.some((tag) => tags[tag] !== expectedTags[tag]) ||
      tags.lifecycle !== 'disposable' ||
      tags.terraform_root !== 'workload-dev' ||
      tags.workload_resource_group !== 'rg-local-missions-dev-example'
    ) {
      fail(`${change.address} does not retain the exact disposable workload tags.`);
    }
  }

  const outputs = plan.mockPlan.output_changes ?? {};
  const inventory = outputs.workload_resource_inventory?.after ?? {};
  const expectedInventory = manifest.workloadResourceInventory;
  const inventoryPairs = {
    containerApps: 'container_apps',
    keyVault: 'key_vault',
    postgresql: 'postgresql',
    registry: 'registry',
    resourceGroup: 'resource_group',
    serviceBus: 'service_bus',
    storage: 'storage',
    telemetry: 'telemetry',
  };
  if (inventory.total !== expectedInventory.total || inventory.enabled !== true) {
    fail('The mock-enabled workload inventory total drifted.');
  }
  for (const [manifestKey, outputKey] of Object.entries(inventoryPairs)) {
    if (inventory.by_module?.[outputKey] !== expectedInventory[manifestKey]) {
      fail(`The mock-enabled ${outputKey} inventory count drifted.`);
    }
  }

  const safeguards = outputs.workload_safeguards?.after ?? {};
  const expected = manifest.workloadSafeguards;
  const checks = [
    safeguards.environment === 'development',
    safeguards.retained_and_disposable_are_distinct === true,
    safeguards.scale?.api_min_replicas === expected.apiMinReplicas,
    safeguards.scale?.api_max_replicas === expected.apiMaxReplicas,
    safeguards.scale?.worker_min_replicas === expected.workerMinReplicas,
    safeguards.scale?.worker_max_replicas === expected.workerMaxReplicas,
    safeguards.network?.minimum_tls_version === expected.minimumTlsVersion,
    safeguards.network?.postgres_firewall_allow_all === expected.postgresAllowAll,
    safeguards.backup?.postgres_retention_days === expected.postgresBackupRetentionDays,
    safeguards.backup?.geo_redundant_backup_enabled === expected.geoRedundantBackup,
    safeguards.backup?.point_in_time_restore_required === expected.postgresPointInTimeRestore,
    safeguards.storage_access?.blob_public_access_enabled === expected.anonymousBlobAccess,
    safeguards.storage_access?.static_website_enabled === expected.staticWebsiteEnabled,
    safeguards.storage_access?.container_access_type === expected.containerAccessType,
  ];
  if (!checks.every(Boolean)) fail('The mock-enabled workload safeguards drifted.');

  const resourceSafeguards = outputs.workload_resource_safeguards?.after ?? {};
  const resourceChecks = [
    resourceSafeguards.storage?.anonymous_blob_access_enabled === false,
    resourceSafeguards.storage?.shared_key_enabled === false,
    resourceSafeguards.storage?.default_network_action === 'Deny',
    Object.values(resourceSafeguards.storage?.container_access_types ?? {}).every(
      (accessType) => accessType === 'private',
    ),
    resourceSafeguards.postgresql?.active_directory_auth_enabled === true,
    resourceSafeguards.postgresql?.password_auth_enabled === false,
    resourceSafeguards.postgresql?.administrator_password_fields === 0,
    resourceSafeguards.postgresql?.backup_retention_days === 7,
    resourceSafeguards.postgresql?.geo_redundant_backup_enabled === false,
    resourceSafeguards.registry?.admin_enabled === false,
    resourceSafeguards.registry?.anonymous_pull_enabled === false,
    resourceSafeguards.registry?.arm_audience_auth === true,
    resourceSafeguards.service_bus?.local_auth_enabled === false,
    resourceSafeguards.service_bus?.duplicate_detection === true,
    resourceSafeguards.service_bus?.default_network_action === 'Deny',
    resourceSafeguards.key_vault?.rbac_enabled === true,
    resourceSafeguards.key_vault?.purge_protection_enabled === true,
    resourceSafeguards.key_vault?.secret_resources === 0,
    resourceSafeguards.key_vault?.default_network_action === 'Deny',
    resourceSafeguards.telemetry?.workspace_local_auth === false,
    resourceSafeguards.telemetry?.application_insights_local_auth === false,
    resourceSafeguards.container_apps?.managed_identity_count === 2,
    resourceSafeguards.container_apps?.api_role_count === 4,
    resourceSafeguards.container_apps?.worker_role_count === 4,
    resourceSafeguards.container_apps?.image_references_use_digests === true,
    resourceSafeguards.container_apps?.inline_secret_blocks === 0,
    resourceSafeguards.container_apps?.registry_password_references === 0,
    resourceSafeguards.container_apps?.worker_has_ingress === false,
  ];
  if (!resourceChecks.every(Boolean)) {
    fail('Concrete workload resource safeguards drifted from the reviewed mock contract.');
  }
}

function assertRefusals() {
  const root = join(repositoryRoot, 'infra/terraform/environments/dev');
  const environment = safeEnvironment(join(temporaryDirectory, 'refusals'));
  runTerraform(root, ['init', '-backend=false', '-input=false', '-no-color'], { env: environment });
  const fixtures = manifest.refusalFixtures;
  for (const { fixture, marker } of fixtures) {
    const result = runTerraform(root, ['test', '-no-color', `-var-file=${fixture}`], {
      env: environment,
      expectFailure: true,
    });
    if (!`${result.stdout}${result.stderr}`.includes(marker)) {
      fail(`${fixture} failed without the expected bounded refusal marker.`);
    }
  }
  return fixtures.length;
}

try {
  const versionResult = runTerraform(repositoryRoot, ['version', '-json'], {
    env: safeEnvironment(join(temporaryDirectory, 'version')),
  });
  const terraformVersion = JSON.parse(versionResult.stdout).terraform_version;
  if (terraformVersion !== manifest.terraformVersion) {
    fail(`Terraform ${manifest.terraformVersion} is required; found ${terraformVersion}.`);
  }

  runTerraform(repositoryRoot, ['fmt', '-check', '-recursive', 'infra/terraform'], {
    env: safeEnvironment(join(temporaryDirectory, 'format')),
  });
  assertSourceBoundary();
  assertExpirationFixtures();
  const plans = new Map(manifest.roots.map((root) => [root.rootId, assertPlan(root)]));
  assertWorkloadPlan(plans.get('workload-dev'));
  assertMockWorkloadPlan(plans.get('workload-dev'));
  const refusalCount = assertRefusals();
  const planTestCount = [...plans.values()].reduce((sum, plan) => sum + plan.tests, 0);

  console.log(
    `Terraform foundation passed for ${manifest.roots.length} roots, ${planTestCount} plan tests, ${refusalCount} refusal tests, zero default resource changes, ${manifest.mockProviderContract.enabledPlanResourceChanges} mock-only resource changes across ${manifest.mockProviderContract.allowedResourceTypes.length} reviewed Azure resource types, ${manifest.requiredTags.length} workload tags, ${Object.keys(manifest.workloadSafeguards).length} workload safeguards, ${Object.keys(manifest.safeLowCostDefaults).length} low-cost defaults, and ${manifest.expirationPolicy.fixtures.length} expiration fixtures; Azure execution remains blocked behind ${manifest.externalGates.length} gates.`,
  );
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
