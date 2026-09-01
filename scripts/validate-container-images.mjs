import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const repositoryRoot = process.cwd();
const contractPath = join(repositoryRoot, 'config/container-image-contract.v1.json');
const fixturePath = join(
  repositoryRoot,
  'config/fixtures/container-images/build-inputs.valid.json',
);
const buildInputValidatorPath = join(repositoryRoot, 'scripts/validate-container-build-inputs.mjs');

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function equalValues(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function assertBuildInputs(candidate, contract) {
  const basePattern = new RegExp(contract.baseImagePolicy.referencePattern);
  const commitPattern = new RegExp(contract.provenancePolicy.buildCommitPattern);
  const timePattern = new RegExp(contract.provenancePolicy.buildTimePattern);
  const versionPattern = new RegExp(contract.provenancePolicy.buildVersionPattern);
  const tagPattern = new RegExp(contract.provenancePolicy.immutableTagPattern);

  assert(candidate.fixtureStatus === 'synthetic_only', 'Build fixture must remain synthetic-only.');
  assert(
    basePattern.test(candidate.baseImageReference),
    'Base image must use an immutable digest.',
  );
  assert(commitPattern.test(candidate.buildCommit), 'Build commit must be a full lowercase SHA.');
  assert(
    timePattern.test(candidate.buildTime) && !Number.isNaN(Date.parse(candidate.buildTime)),
    'Build time must be a valid whole-second UTC timestamp.',
  );
  assert(versionPattern.test(candidate.buildVersion), 'Build version must be numeric semver.');

  const expectedIds = sorted(contract.images.map((image) => image.id));
  equalValues(
    sorted(Object.keys(candidate.imageTags ?? {})),
    expectedIds,
    'Image tag set drifted.',
  );
  for (const image of contract.images) {
    const [repository, tag, extra] = candidate.imageTags[image.id].split(':');
    assert(extra === undefined, `${image.id} image tag must contain exactly one tag separator.`);
    assert(repository === image.repository, `${image.id} image repository drifted.`);
    assert(tagPattern.test(tag), `${image.id} image tag must be bound to a full commit.`);
    assert(tag === `sha-${candidate.buildCommit}`, `${image.id} image tag commit does not match.`);
  }
}

function assertManifest(candidate) {
  assert(candidate.schemaVersion === 1, 'Container contract schema version drifted.');
  assert(
    candidate.checkpoint === 'M05-container-image-contract-local-009',
    'Container checkpoint identifier drifted.',
  );
  assert(
    candidate.activationStatus === 'local_contract_only',
    'Container activation must stay local.',
  );
  assert(candidate.packageManager === 'pnpm@11.24.0', 'Container pnpm version drifted.');
  assert(candidate.baseImagePolicy.nodeVersion === '24.19.0', 'Container Node version drifted.');
  assert(candidate.baseImagePolicy.argument === 'NODE_IMAGE', 'Base-image argument drifted.');
  assert(
    candidate.baseImagePolicy.defaultReferenceForbidden === true,
    'Base image must not have a mutable default.',
  );
  assert(
    candidate.buildExecution.localBundleAndRuntimeSmokeOnly === true &&
      candidate.buildExecution.containerBuildExecuted === false &&
      candidate.buildExecution.externalRegistryContacted === false &&
      candidate.buildExecution.imagePublished === false &&
      candidate.buildExecution.imageSigned === false,
    'Local checkpoint must not claim a container build, registry, publish, or signature.',
  );
  assert(candidate.externalGates.length === 7, 'All seven external image gates must remain open.');

  const runtime = candidate.runtimePolicy;
  assert(
    runtime.runtimeUser === 10001 &&
      runtime.runtimeGroup === 10001 &&
      runtime.copyUsesNumericOwnership === true &&
      runtime.frozenLockfile === true &&
      runtime.productionDependenciesOnly === true &&
      runtime.sourceAndTestFilesExcluded === true &&
      runtime.secretBuildArgumentsForbidden === true &&
      runtime.remoteBuildForbidden === true &&
      runtime.dockerfileContext === '.',
    'Container runtime safeguards drifted.',
  );

  equalValues(
    sorted(candidate.provenancePolicy.requiredOciLabels),
    sorted([
      'org.opencontainers.image.created',
      'org.opencontainers.image.revision',
      'org.opencontainers.image.title',
      'org.opencontainers.image.version',
    ]),
    'OCI label contract drifted.',
  );
  equalValues(
    candidate.images.map((image) => image.id),
    ['api', 'dashboard', 'worker'],
    'Image inventory must contain API, dashboard, and worker exactly once.',
  );

  const expected = {
    api: {
      bundleKind: 'pnpm_deploy',
      command: ['node', 'dist/main.js'],
      dockerfile: 'apps/api/Dockerfile',
      healthPath: '/health/live',
      package: '@local-missions/api',
      port: 4000,
      repository: 'local-missions/api',
    },
    dashboard: {
      bundleKind: 'next_standalone',
      command: ['node', 'server.js'],
      dockerfile: 'apps/dashboard/Dockerfile',
      healthPath: '/',
      package: '@local-missions/dashboard',
      port: 3000,
      repository: 'local-missions/dashboard',
    },
    worker: {
      bundleKind: 'pnpm_deploy',
      command: ['node', 'dist/main.js'],
      dockerfile: 'apps/worker/Dockerfile',
      healthPath: null,
      package: '@local-missions/worker',
      port: null,
      repository: 'local-missions/worker',
    },
  };
  for (const image of candidate.images) {
    assert(image.runtimeUser === '10001:10001', `${image.id} runtime user drifted.`);
    for (const [field, value] of Object.entries(expected[image.id])) {
      equalValues(image[field], value, `${image.id} ${field} drifted.`);
    }
  }
}

function assertDockerfile(image, source, contract) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  assert(lines[0] === 'ARG NODE_IMAGE', `${image.id} must require NODE_IMAGE without a default.`);
  assert(
    (source.match(/^ARG NODE_IMAGE$/gm) ?? []).length === 2,
    `${image.id} must expose NODE_IMAGE globally and in the build stage.`,
  );
  equalValues(
    source.match(/^FROM .+$/gm),
    ['FROM ${NODE_IMAGE} AS build', 'FROM ${NODE_IMAGE} AS runtime'],
    `${image.id} stages must consume only the supplied digest-pinned base image.`,
  );
  assert(!/:latest\b/i.test(source), `${image.id} must not contain a latest image tag.`);
  assert(
    !/^(?:ARG|ENV)\s+[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|CLIENT_KEY)/m.test(source),
    `${image.id} must not accept secret build arguments or environment values.`,
  );
  assert(!/^COPY\s+\.\s+\.$/m.test(source), `${image.id} must not copy the entire context.`);
  assert(
    source.includes('RUN node scripts/validate-container-build-inputs.mjs') &&
      source.indexOf('validate-container-build-inputs.mjs') < source.indexOf('pnpm install'),
    `${image.id} must fail closed on base image and provenance before installation.`,
  );
  assert(
    source.includes('corepack prepare pnpm@11.24.0 --activate'),
    `${image.id} pnpm runtime drifted.`,
  );
  assert(source.includes('pnpm install --frozen-lockfile'), `${image.id} lockfile is not frozen.`);
  assert(
    source.includes('COPY --from=build --chown=10001:10001'),
    `${image.id} runtime copy must use numeric ownership.`,
  );
  assert(source.includes('USER 10001:10001'), `${image.id} runtime must be non-root.`);
  const expectedCommand = `CMD [${image.command.map((part) => JSON.stringify(part)).join(', ')}]`;
  assert(source.includes(expectedCommand), `${image.id} runtime command drifted.`);
  for (const label of contract.provenancePolicy.requiredOciLabels) {
    assert(source.includes(label), `${image.id} is missing OCI label ${label}.`);
  }
  if (image.port !== null) {
    assert(source.includes(`EXPOSE ${image.port}`), `${image.id} exposed port drifted.`);
  } else {
    assert(!/^EXPOSE\s/m.test(source), `${image.id} worker must not expose a port.`);
  }
  if (image.healthPath !== null) {
    assert(
      source.includes('HEALTHCHECK') && source.includes(image.healthPath),
      `${image.id} health check drifted.`,
    );
  } else {
    assert(
      !source.includes('HEALTHCHECK'),
      `${image.id} worker must not claim an HTTP health path.`,
    );
    assert(source.includes('STOPSIGNAL SIGTERM'), `${image.id} worker stop signal drifted.`);
  }
  if (image.bundleKind === 'pnpm_deploy') {
    assert(
      source.includes('deploy --legacy --prod --offline /output'),
      `${image.id} deploy must be production-only and offline.`,
    );
  } else {
    assert(source.includes('.next/standalone'), `${image.id} must copy Next standalone output.`);
    assert(source.includes('.next/static'), `${image.id} must copy Next static output.`);
    assert(source.includes('ENV APP_ENV=development'), `${image.id} runtime environment drifted.`);
  }
}

function assertSourceContracts(contract) {
  const dockerIgnore = readText(join(repositoryRoot, '.dockerignore'));
  for (const required of [
    '.git',
    'node_modules',
    '**/node_modules',
    '.env.*',
    '**/.env.*',
    '*.pem',
    '*.p8',
    '.terraform',
    '*.tfstate',
    '*.tfplan',
    'docs',
    'infra',
  ]) {
    assert(dockerIgnore.split(/\r?\n/).includes(required), `.dockerignore is missing ${required}.`);
  }

  for (const image of contract.images) {
    const source = readText(join(repositoryRoot, image.dockerfile));
    assertDockerfile(image, source, contract);
  }

  const packageFiles = {
    'apps/api/package.json': ['dist'],
    'apps/worker/package.json': ['dist'],
    'packages/api-client/package.json': ['dist'],
    'packages/config/package.json': ['dist'],
    'packages/contracts/package.json': ['dist'],
    'packages/db/package.json': ['dist', 'migrations'],
  };
  for (const [path, expectedFiles] of Object.entries(packageFiles)) {
    equalValues(
      readJson(join(repositoryRoot, path)).files,
      expectedFiles,
      `${path} files drifted.`,
    );
  }

  const dashboardConfig = readText(join(repositoryRoot, 'apps/dashboard/next.config.ts'));
  assert(
    dashboardConfig.includes("output: 'standalone'") &&
      dashboardConfig.includes('outputFileTracingRoot: workspaceRoot'),
    'Dashboard must retain monorepo-aware standalone output.',
  );
  const dashboardApiClient = readText(join(repositoryRoot, 'apps/dashboard/lib/api-client.ts'));
  const dashboardEnvironment = readText(join(repositoryRoot, 'apps/dashboard/lib/environment.ts'));
  assert(
    dashboardApiClient.includes('process.env.API_BASE_URL') &&
      dashboardEnvironment.includes('process.env.APP_ENV') &&
      !dashboardApiClient.includes('NEXT_PUBLIC_') &&
      !dashboardEnvironment.includes('NEXT_PUBLIC_'),
    'Dashboard configuration must remain server-runtime and promotion-safe.',
  );
  const workerMain = readText(join(repositoryRoot, 'apps/worker/src/main.ts'));
  assert(
    workerMain.includes('setInterval') &&
      workerMain.includes('clearInterval') &&
      workerMain.includes("process.once('SIGTERM'") &&
      workerMain.includes("process.once('SIGINT'"),
    'Worker process must remain alive and stop cleanly.',
  );

  const terraformVariables = readText(
    join(repositoryRoot, 'infra/terraform/environments/dev/variables.tf'),
  );
  for (const image of contract.images) {
    assert(
      terraformVariables.includes(`"${image.repository}"`),
      `${image.id} repository does not match Terraform.`,
    );
  }
}

function expectRefusal(name, operation, refusals) {
  try {
    operation();
  } catch {
    refusals.push(name);
    return;
  }
  fail(`Expected refusal did not occur: ${name}`);
}

function runRefusalCoverage(contract, fixture) {
  const refusals = [];
  const manifestCases = [
    ['activation-enabled', (value) => (value.activationStatus = 'active')],
    ['container-build-claimed', (value) => (value.buildExecution.containerBuildExecuted = true)],
    [
      'registry-contact-claimed',
      (value) => (value.buildExecution.externalRegistryContacted = true),
    ],
    ['publish-claimed', (value) => (value.buildExecution.imagePublished = true)],
    ['signature-claimed', (value) => (value.buildExecution.imageSigned = true)],
    ['base-default-allowed', (value) => (value.baseImagePolicy.defaultReferenceForbidden = false)],
    ['node-version-drift', (value) => (value.baseImagePolicy.nodeVersion = '22.0.0')],
    ['pnpm-version-drift', (value) => (value.packageManager = 'pnpm@latest')],
    ['runtime-root', (value) => (value.runtimePolicy.runtimeUser = 0)],
    ['remote-build-allowed', (value) => (value.runtimePolicy.remoteBuildForbidden = false)],
    [
      'source-inclusion-allowed',
      (value) => (value.runtimePolicy.sourceAndTestFilesExcluded = false),
    ],
    ['external-gate-removed', (value) => value.externalGates.pop()],
    ['duplicate-image-id', (value) => (value.images[1].id = 'api')],
    ['api-repository-drift', (value) => (value.images[0].repository = 'example/api')],
    ['dashboard-port-drift', (value) => (value.images[1].port = 8080)],
  ];
  for (const [name, mutate] of manifestCases) {
    expectRefusal(
      name,
      () => {
        const candidate = structuredClone(contract);
        mutate(candidate);
        assertManifest(candidate);
      },
      refusals,
    );
  }

  const fixtureCases = [
    ['base-image-tag', (value) => (value.baseImageReference = 'node:24.19.0')],
    ['short-commit', (value) => (value.buildCommit = 'bbbbbbb')],
    ['uppercase-commit', (value) => (value.buildCommit = 'B'.repeat(40))],
    ['invalid-build-time', (value) => (value.buildTime = 'tomorrow')],
    ['mutable-version', (value) => (value.buildVersion = 'latest')],
    ['mutable-image-tag', (value) => (value.imageTags.api = 'local-missions/api:latest')],
    [
      'tag-repository-drift',
      (value) => (value.imageTags.worker = 'other/worker:sha-' + value.buildCommit),
    ],
    ['fixture-live-claim', (value) => (value.fixtureStatus = 'live')],
  ];
  for (const [name, mutate] of fixtureCases) {
    expectRefusal(
      name,
      () => {
        const candidate = structuredClone(fixture);
        mutate(candidate);
        assertBuildInputs(candidate, contract);
      },
      refusals,
    );
  }

  const api = contract.images.find((image) => image.id === 'api');
  const apiSource = readText(join(repositoryRoot, api.dockerfile));
  const sourceCases = [
    [
      'docker-default-base',
      (value) => value.replace('ARG NODE_IMAGE', 'ARG NODE_IMAGE=node:latest'),
    ],
    [
      'docker-direct-base',
      (value) => value.replace('FROM ${NODE_IMAGE} AS runtime', 'FROM node:latest AS runtime'),
    ],
    ['docker-root-user', (value) => value.replace('USER 10001:10001', 'USER root')],
    ['docker-copy-owner-removed', (value) => value.replace(' --chown=10001:10001', '')],
    ['docker-lockfile-unfrozen', (value) => value.replace(' --frozen-lockfile', '')],
    [
      'docker-input-check-removed',
      (value) => value.replace('RUN node scripts/validate-container-build-inputs.mjs', ''),
    ],
    [
      'docker-secret-argument',
      (value) => value.replace('ARG BUILD_TIME', 'ARG BUILD_TIME\nARG CLIENT_SECRET'),
    ],
    ['docker-copy-all', (value) => value.replace('COPY apps/api apps/api', 'COPY . .')],
    [
      'docker-label-removed',
      (value) => value.replace('org.opencontainers.image.revision', 'example.revision'),
    ],
    [
      'docker-command-drift',
      (value) => value.replace('CMD ["node", "dist/main.js"]', 'CMD ["sh"]'),
    ],
    ['docker-pnpm-drift', (value) => value.replace('pnpm@11.24.0', 'pnpm@latest')],
    ['docker-online-deploy', (value) => value.replace(' --offline /output', ' /output')],
  ];
  for (const [name, mutate] of sourceCases) {
    expectRefusal(name, () => assertDockerfile(api, mutate(apiSource), contract), refusals);
  }

  return refusals;
}

function runBuildInputValidator(fixture) {
  execFileSync(process.execPath, [buildInputValidatorPath], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      BUILD_COMMIT: fixture.buildCommit,
      BUILD_TIME: fixture.buildTime,
      BUILD_VERSION: fixture.buildVersion,
      CONTAINER_BASE_IMAGE: fixture.baseImageReference,
    },
    stdio: 'pipe',
  });
}

function projectProductionRoot(sourceRoot) {
  const rootManifest = readJson(join(repositoryRoot, 'package.json'));
  writeFileSync(
    join(sourceRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: rootManifest.name,
        private: rootManifest.private,
        packageManager: rootManifest.packageManager,
        engines: rootManifest.engines,
      },
      null,
      2,
    )}\n`,
  );

  const lockfilePath = join(sourceRoot, 'pnpm-lock.yaml');
  const lockfile = readText(lockfilePath);
  const rootImporter = /\n {2}\.:\n[\s\S]*?(?=\n {2}apps\/api:\n)/;
  assert(
    rootImporter.test(lockfile),
    'Shared lockfile root importer could not be projected for production deploy.',
  );
  writeFileSync(lockfilePath, lockfile.replace(rootImporter, '\n  .: {}\n'));
}

function offlineDeployEnvironment() {
  return {
    ...process.env,
    CI: 'true',
    // The repository install has already verified the original frozen lockfile. The
    // production projection removes only the root development importer, so replay it
    // without asking pnpm 11 to re-check release ages using unavailable offline metadata.
    PNPM_CONFIG_MINIMUM_RELEASE_AGE: '0',
  };
}

function prepareDeployWorkspace(temporaryRoot) {
  const sourceRoot = join(temporaryRoot, 'deploy-source');
  mkdirSync(sourceRoot, { recursive: true });
  for (const file of ['.npmrc', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    cpSync(join(repositoryRoot, file), join(sourceRoot, file));
  }
  projectProductionRoot(sourceRoot);
  for (const relativePath of [
    'apps/api',
    'apps/worker',
    'packages/config',
    'packages/contracts',
    'packages/db',
  ]) {
    const packageTarget = join(sourceRoot, relativePath);
    mkdirSync(packageTarget, { recursive: true });
    cpSync(join(repositoryRoot, relativePath, 'package.json'), join(packageTarget, 'package.json'));
    cpSync(join(repositoryRoot, relativePath, 'dist'), join(packageTarget, 'dist'), {
      recursive: true,
    });
    const migrations = join(repositoryRoot, relativePath, 'migrations');
    if (existsSync(migrations)) {
      cpSync(migrations, join(packageTarget, 'migrations'), { recursive: true });
    }
  }
  execFileSync(
    'pnpm',
    ['install', '--prod', '--frozen-lockfile', '--offline', '--ignore-scripts'],
    {
      cwd: sourceRoot,
      encoding: 'utf8',
      env: offlineDeployEnvironment(),
      stdio: 'pipe',
    },
  );
  return sourceRoot;
}

function deployPackage(sourceRoot, packageName, target) {
  execFileSync(
    'pnpm',
    [
      '--config.ignore-scripts=true',
      '--filter',
      packageName,
      'deploy',
      '--legacy',
      '--prod',
      '--offline',
      target,
    ],
    {
      cwd: sourceRoot,
      encoding: 'utf8',
      env: offlineDeployEnvironment(),
      stdio: 'pipe',
    },
  );
}

function assertDeployBundle(target, image, requiredWorkspacePackages = []) {
  for (const required of ['package.json', 'dist/main.js', 'node_modules']) {
    assert(existsSync(join(target, required)), `${image.id} bundle is missing ${required}.`);
  }
  for (const forbidden of ['src', 'scripts', '.env', '.env.example', '.turbo']) {
    assert(!existsSync(join(target, forbidden)), `${image.id} bundle contains ${forbidden}.`);
  }
  for (const devPackage of ['typescript', 'vitest', 'tsx']) {
    assert(
      !existsSync(join(target, 'node_modules', devPackage)),
      `${image.id} bundle contains development dependency ${devPackage}.`,
    );
  }
  for (const workspacePackage of requiredWorkspacePackages) {
    const packageRoot = realpathSync(
      join(target, 'node_modules/@local-missions', workspacePackage),
    );
    assert(
      existsSync(join(packageRoot, 'dist')),
      `${workspacePackage} production output is missing.`,
    );
    assert(
      !existsSync(join(packageRoot, 'src')),
      `${workspacePackage} source leaked into the bundle.`,
    );
  }
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolvePromise) => server.close(resolvePromise));
  assert(port > 0, 'Could not reserve a local smoke-test port.');
  return port;
}

function startProcess(command, arguments_, options) {
  const child = spawn(command, arguments_, {
    ...options,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
  child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
  return { child, output: () => ({ stderr, stdout }) };
}

async function waitFor(predicate, description, milliseconds = 8_000) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await delay(50);
  }
  fail(`Timed out waiting for ${description}.`);
}

async function stopProcess(processState, name) {
  const { child } = processState;
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  const result = await Promise.race([
    new Promise((resolvePromise) =>
      child.once('close', (code, signal) => resolvePromise({ code, signal })),
    ),
    delay(5_000).then(() => ({ timeout: true })),
  ]);
  if (result.timeout) {
    child.kill('SIGKILL');
    fail(`${name} did not stop within five seconds.`);
  }
  assert(
    result.code === 0 || result.code === 143 || result.signal === 'SIGTERM',
    `${name} exited with ${result.code ?? result.signal}.`,
  );
}

async function smokeApi(target, fixture) {
  const port = await unusedPort();
  const state = startProcess(process.execPath, ['dist/main.js'], {
    cwd: target,
    env: {
      ...process.env,
      APP_ENV: 'development',
      BUILD_COMMIT: fixture.buildCommit,
      BUILD_TIME: fixture.buildTime,
      BUILD_VERSION: fixture.buildVersion,
      DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:1/local_missions',
      NODE_ENV: 'production',
      PORT: String(port),
    },
  });
  try {
    await waitFor(
      () => state.output().stdout.includes('"event":"api_started"'),
      'the bundled API to start',
    );
    const live = await fetch(`http://127.0.0.1:${port}/health/live`);
    assert(live.ok, 'Bundled API liveness failed.');
    const liveBody = await live.json();
    assert(liveBody.status === 'ok', 'Bundled API liveness response drifted.');
    const build = await fetch(`http://127.0.0.1:${port}/build-info`);
    assert(build.ok, 'Bundled API build-info failed.');
    const buildBody = await build.json();
    assert(buildBody.commit === fixture.buildCommit, 'Bundled API commit provenance drifted.');
    assert(
      buildBody.builtAt === new Date(fixture.buildTime).toISOString(),
      'Bundled API build time drifted.',
    );
  } catch (error) {
    const output = state.output();
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\nAPI stdout:\n${output.stdout}\nAPI stderr:\n${output.stderr}`, {
      cause: error,
    });
  } finally {
    await stopProcess(state, 'Bundled API');
  }
}

async function smokeWorker(target) {
  const state = startProcess(process.execPath, ['dist/main.js'], {
    cwd: target,
    env: { ...process.env, APP_ENV: 'development', NODE_ENV: 'production' },
  });
  try {
    await waitFor(
      () => state.output().stdout.includes('ready with synthetic adapters'),
      'the bundled worker to start',
    );
    await delay(200);
    assert(state.child.exitCode === null, 'Bundled worker exited before SIGTERM.');
  } finally {
    await stopProcess(state, 'Bundled worker');
  }
  assert(
    state.output().stdout.includes('received SIGTERM; shutdown complete'),
    'Bundled worker did not record clean SIGTERM shutdown.',
  );
}

async function smokeDashboard(target) {
  const sourceRoot = join(repositoryRoot, 'apps/dashboard/.next/standalone');
  const serverSource = join(sourceRoot, 'apps/dashboard/server.js');
  assert(existsSync(serverSource), 'Dashboard standalone server output is missing.');
  cpSync(sourceRoot, target, { recursive: true });
  const staticTarget = join(target, 'apps/dashboard/.next/static');
  mkdirSync(dirname(staticTarget), { recursive: true });
  cpSync(join(repositoryRoot, 'apps/dashboard/.next/static'), staticTarget, { recursive: true });
  const runtimeRoot = join(target, 'apps/dashboard');
  for (const forbidden of ['src', '.env', '.env.local']) {
    assert(!existsSync(join(runtimeRoot, forbidden)), `Dashboard bundle contains ${forbidden}.`);
  }

  const port = await unusedPort();
  const state = startProcess(process.execPath, ['server.js'], {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      PORT: String(port),
    },
  });
  try {
    let response;
    await waitFor(async () => {
      try {
        response = await fetch(`http://127.0.0.1:${port}/`);
        return response.ok;
      } catch {
        return false;
      }
    }, 'the bundled dashboard to render');
    const body = await response.text();
    assert(body.includes('Local Missions'), 'Bundled dashboard response drifted.');
  } catch (error) {
    const output = state.output();
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${message}\nDashboard stdout:\n${output.stdout}\nDashboard stderr:\n${output.stderr}`,
      { cause: error },
    );
  } finally {
    await stopProcess(state, 'Bundled dashboard');
  }
}

async function verifyBundles(contract, fixture) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'local-missions-container-'));
  try {
    const deploySource = prepareDeployWorkspace(temporaryRoot);
    const apiTarget = join(temporaryRoot, 'api');
    const workerTarget = join(temporaryRoot, 'worker');
    const dashboardTarget = join(temporaryRoot, 'dashboard');
    deployPackage(deploySource, '@local-missions/api', apiTarget);
    deployPackage(deploySource, '@local-missions/worker', workerTarget);
    const api = contract.images.find((image) => image.id === 'api');
    const worker = contract.images.find((image) => image.id === 'worker');
    assertDeployBundle(apiTarget, api, ['config', 'contracts', 'db']);
    assertDeployBundle(workerTarget, worker);
    await smokeApi(apiTarget, fixture);
    await smokeWorker(workerTarget);
    await smokeDashboard(dashboardTarget);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

const contract = readJson(contractPath);
const fixture = readJson(fixturePath);
assertManifest(contract);
assertBuildInputs(fixture, contract);
assertSourceContracts(contract);
runBuildInputValidator(fixture);
const refusals = runRefusalCoverage(contract, fixture);
await verifyBundles(contract, fixture);

console.log(
  `Container image contract passed for ${contract.images.length} production bundles, 4 local runtime checks, ${refusals.length} refusal scenarios, 7 deferred external gates, and 0 container builds or registry operations.`,
);
