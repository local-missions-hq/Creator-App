import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function exactKeys(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array.`);
  assert(new Set(actual).size === actual.length, `${label} contains duplicates.`);
  assert(
    actual.length === expected.length && expected.every((key) => actual.includes(key)),
    `${label} does not match the reviewed contract.`,
  );
}

function blankExampleKeys(content) {
  return new Set(
    content
      .split(/\r?\n/u)
      .filter((line) => /^[A-Z][A-Z0-9_]*=$/u.test(line))
      .map((line) => line.slice(0, -1)),
  );
}

const manifestText = read('config/external-auth-gate.v1.json');
const manifest = JSON.parse(manifestText);
const runbook = read('docs/operations/external-auth-configuration-gate.md');
const mobileExample = read('apps/mobile/.env.example');
const apiExample = read('apps/api/.env.example');
const mobileParser = read('apps/mobile/lib/oidc-client.ts');
const apiParser = read('apps/api/src/entra-token-verifier.ts');

const mobileKeys = [
  'EXPO_PUBLIC_ENTRA_AUTHORIZATION_ENDPOINT',
  'EXPO_PUBLIC_ENTRA_TOKEN_ENDPOINT',
  'EXPO_PUBLIC_ENTRA_ISSUER',
  'EXPO_PUBLIC_ENTRA_JWKS_URI',
  'EXPO_PUBLIC_ENTRA_CLIENT_ID',
  'EXPO_PUBLIC_ENTRA_REDIRECT_URI',
  'EXPO_PUBLIC_ENTRA_SCOPE',
];
const apiKeys = [
  'ENTRA_TENANT_ID',
  'ENTRA_API_AUDIENCE',
  'ENTRA_ISSUER',
  'ENTRA_JWKS_URI',
  'ENTRA_REQUIRED_SCOPE',
];
const providerKeys = ['apple', 'google', 'microsoft', 'passwordless_email'];
const registrationKeys = [
  'mobile_public_client',
  'customer_api_resource',
  'participant_web_client',
];
const matrixKeys = [
  'apple_consent_success_cancel_denied',
  'google_consent_success_cancel_denied',
  'microsoft_consent_success_cancel_denied',
  'email_code_success_expired_single_use',
  'email_code_resend_throttle',
  'disabled_provider',
  'failed_or_malformed_native_return',
  'matching_changed_or_private_relay_email',
  'real_iphone_system_browser_deep_link',
];
const approvalKeys = [
  'tenant_and_environment_ownership',
  'app_registration_mutation',
  'provider_credentials_and_terms',
  'test_environment_activation',
  'real_identity_test_execution',
  'physical_iphone_round_trip',
  'production_activation',
];

assert(manifest.schemaVersion === 1, 'Unexpected external-auth manifest version.');
assert(
  manifest.checkpoint === 'M04-external-auth-configuration-gate-local-010',
  'Unexpected external-auth checkpoint.',
);
assert(
  manifest.activationState === 'planned_not_activated',
  'External authentication must remain unactivated in this checkpoint.',
);
exactKeys(
  manifest.registrations.map((entry) => entry.key),
  registrationKeys,
  'Registration inventory',
);
const mobileRegistration = manifest.registrations.find(
  (entry) => entry.key === 'mobile_public_client',
);
assert(mobileRegistration.clientSecretAllowed === false, 'Mobile client secret must be forbidden.');
exactKeys(
  mobileRegistration.redirectUris,
  ['localmissions://auth/callback'],
  'Mobile redirect URI',
);
assert(
  mobileRegistration.grant === 'authorization_code_pkce_s256',
  'Mobile grant must require authorization code with S256 PKCE.',
);

exactKeys(
  manifest.providers.map((entry) => entry.key),
  providerKeys,
  'Provider inventory',
);
assert(
  manifest.providers.every(
    (entry) =>
      entry.enabledBeforeRoleSelection === true && entry.mobileRouting === 'same_hosted_user_flow',
  ),
  'Every V1 provider must use the same hosted flow before role selection.',
);
exactKeys(manifest.forbiddenProviders, ['facebook', 'meta'], 'Forbidden provider inventory');

exactKeys(manifest.environmentContracts.mobilePublic, mobileKeys, 'Mobile environment contract');
exactKeys(manifest.environmentContracts.apiIdentifiers, apiKeys, 'API environment contract');
assert(
  manifest.environmentContracts.forbiddenMobileNames.every((name) => name.includes('SECRET')),
  'Forbidden mobile names must enumerate secret-bearing variables.',
);
const mobileExampleKeys = blankExampleKeys(mobileExample);
const apiExampleKeys = blankExampleKeys(apiExample);
for (const key of mobileKeys) {
  assert(mobileExampleKeys.has(key), `Mobile environment example is missing ${key}.`);
  assert(mobileParser.includes(`environment.${key}`), `Mobile parser does not read ${key}.`);
}
for (const key of apiKeys) {
  assert(apiExampleKeys.has(key), `API environment example is missing ${key}.`);
  assert(apiParser.includes(`environment.${key}`), `API verifier does not read ${key}.`);
}
for (const key of manifest.environmentContracts.forbiddenMobileNames) {
  assert(!mobileExampleKeys.has(key), `Mobile environment example exposes forbidden ${key}.`);
}

exactKeys(
  manifest.transportBoundaries.map((entry) => entry.key),
  ['authorization', 'mobile_token', 'mobile_id_token_jwks', 'api_access_token_jwks'],
  'Transport boundary inventory',
);
assert(
  manifest.transportBoundaries.every((entry) => entry.httpsRequired === true),
  'Every external auth transport must require HTTPS.',
);
assert(
  manifest.transportBoundaries.find((entry) => entry.key === 'mobile_token').implementationState ===
    'unavailable_until_reviewed_transport_is_implemented',
  'Mobile token transport must remain unavailable.',
);

exactKeys(
  manifest.testMatrix.map((entry) => entry.key),
  matrixKeys,
  'Provider test matrix',
);
assert(
  manifest.testMatrix.every((entry) => entry.externalStatus !== 'passed'),
  'External provider/device evidence must remain unclaimed.',
);
exactKeys(
  manifest.approvalGates.map((entry) => entry.key),
  approvalKeys,
  'External approval inventory',
);
assert(
  manifest.approvalGates.every((entry) => !entry.status.startsWith('approved')),
  'No external approval may be claimed by the local gate.',
);

for (const statement of [
  'does not authorize anyone to create an Entra tenant',
  'no client secret is allowed',
  'Facebook and Meta are absent from V1',
  'physical-iPhone execution remain open M4 gates',
]) {
  assert(runbook.includes(statement), `Runbook is missing safety statement: ${statement}`);
}
for (const pattern of [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /(?:sk|whsec)_(?:live|test)?_[A-Za-z0-9]{16,}/u,
]) {
  assert(!pattern.test(`${manifestText}\n${runbook}`), 'External-auth contract contains a secret.');
}

console.log(
  `External auth gate passed for ${registrationKeys.length} registrations, ${providerKeys.length} V1 providers, ${mobileKeys.length + apiKeys.length} environment fields, ${matrixKeys.length} test cases, and ${approvalKeys.length} approval gates; activation remains blocked.`,
);
