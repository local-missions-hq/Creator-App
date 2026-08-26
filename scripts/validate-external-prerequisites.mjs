import { readFileSync } from 'node:fs';

const register = readFileSync(
  new URL('../docs/external-prerequisites.md', import.meta.url),
  'utf8',
);

const requiredKeys = [
  'APPLE_DEVELOPER_ACCOUNT_STATUS',
  'APP_STORE_CONNECT_ACCOUNT_STATUS',
  'EXPO_ORGANIZATION',
  'STRIPE_TEST_ACCOUNT_STATUS',
  'ENTRA_EXTERNAL_ID_TENANT_PLAN',
  'AZURE_PRIMARY_REGION',
  'AZURE_COST_OWNER_ROLE',
  'AZURE_COST_ALERT_DESTINATION',
  'AZURE_EPHEMERAL_BUDGET_POLICY',
  'PUBLIC_APP_DOMAIN_PLACEHOLDER',
  'API_DOMAIN_PLACEHOLDER',
  'SUPPORT_EMAIL_PLACEHOLDER',
  'PRIVACY_EMAIL_PLACEHOLDER',
  'SECURITY_EMAIL_PLACEHOLDER',
  'AZURE_COST_EMAIL_PLACEHOLDER',
];

const missingKeys = requiredKeys.filter((key) => !register.includes(`\`${key}\``));
const requiredSafetyStatements = [
  'not authorization to create, configure, fund, or connect it',
  'must never be treated as production contacts',
  'do not belong in this register',
  'does not close any live-provider gate',
];
const missingSafetyStatements = requiredSafetyStatements.filter(
  (statement) => !register.toLowerCase().includes(statement.toLowerCase()),
);

if (missingKeys.length > 0 || missingSafetyStatements.length > 0) {
  if (missingKeys.length > 0) console.error(`Missing prerequisite keys: ${missingKeys.join(', ')}`);
  if (missingSafetyStatements.length > 0) {
    console.error(`Missing safety statements: ${missingSafetyStatements.join('; ')}`);
  }
  process.exit(1);
}

console.log(
  `External prerequisite register passed for ${requiredKeys.length} required records and ${requiredSafetyStatements.length} safety boundaries.`,
);
