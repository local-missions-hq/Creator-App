const baseImage = process.env.CONTAINER_BASE_IMAGE?.trim() ?? '';
const commit = process.env.BUILD_COMMIT?.trim() ?? '';
const builtAt = process.env.BUILD_TIME?.trim() ?? '';
const version = process.env.BUILD_VERSION?.trim() ?? '';

const failures = [];

if (!/^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/.test(baseImage)) {
  failures.push('CONTAINER_BASE_IMAGE must be a registry image pinned by SHA-256 digest');
}
if (!/^[a-f0-9]{40}$/.test(commit)) {
  failures.push('BUILD_COMMIT must be the full lowercase 40-character Git commit');
}
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(builtAt) || Number.isNaN(Date.parse(builtAt))) {
  failures.push('BUILD_TIME must be a valid UTC timestamp with whole-second precision');
}
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  failures.push('BUILD_VERSION must be a numeric semantic version');
}

if (failures.length > 0) {
  throw new Error(`Container build inputs refused:\n- ${failures.join('\n- ')}`);
}

console.log('Container build inputs passed immutable-base and provenance checks.');
