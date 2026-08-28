import { existsSync, readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const manifest = JSON.parse(read('config/authorization-matrix.v1.json'));
const expectedRows = [
  'anonymous-private-data',
  'creator-owned-applications-submissions',
  'business-tenant-isolation',
  'venue-staff-assignment-scope',
  'support-read-finance-separation',
  'admin-reason-high-priority-audit',
  'disabled-user-propagation',
  'untrusted-client-role',
  'email-independent-identity-binding',
  'concurrent-provider-subject-collision',
  'dual-control-link-proof-and-audit',
  'last-method-unlink-replay-recovery',
];

assert(manifest.matrixVersion === 1, 'Authorization matrix version must remain 1.');
assert(
  manifest.checkpoint === 'M04-authorization-matrix-audit-local-012',
  'Authorization matrix checkpoint is unexpected.',
);
assert(manifest.externalCompletionClaimed === false, 'External completion must remain unclaimed.');
assert(
  JSON.stringify(manifest.rows.map((row) => row.id)) === JSON.stringify(expectedRows),
  'Authorization matrix rows must remain complete and ordered.',
);
for (const row of manifest.rows) {
  assert(row.status === 'local_proven', `Authorization row ${row.id} is not locally proven.`);
  assert(
    typeof row.requirement === 'string' && row.requirement.length >= 40,
    `Authorization row ${row.id} needs a concrete requirement.`,
  );
  assert(
    Array.isArray(row.proofs) && row.proofs.length >= 2,
    `Authorization row ${row.id} needs at least two proof sources.`,
  );
  for (const proof of row.proofs) {
    assert(
      existsSync(new URL(`../${proof}`, import.meta.url)),
      `Authorization row ${row.id} references missing proof ${proof}.`,
    );
  }
}
assert(
  Array.isArray(manifest.stillOpen) && manifest.stillOpen.length === 5,
  'External and native-device gates must remain explicitly open.',
);

const policy = read('packages/db/src/authorization-policy-store.ts');
const policyTest = read('packages/db/src/authorization-policy-store.integration.test.ts');
const accountStore = read('packages/db/src/account-lifecycle-store.ts');
const accountTest = read('packages/db/src/account-lifecycle-store.integration.test.ts');
const domainTest = read('apps/api/src/domain-api.integration.test.ts');
const schema = read('packages/db/src/schema.ts');

for (const marker of [
  'readCreatorApplication',
  'readCreatorSubmission',
  'readBusinessCampaign',
  'readVenueStaffAssignment',
  'readSupportDispute',
  'authorizeFinancialStateMutation',
  'recordAdminOverride',
  "priority: 'high'",
]) {
  assert(policy.includes(marker), `Authorization policy is missing ${marker}.`);
}
for (const marker of [
  'requires an authenticated server actor',
  'only their own application and submission',
  'cross-business campaign',
  'only an assigned Venue Staff location',
  'Support a read-only investigation projection',
  'high-priority override audit',
  'rechecks disabled-user state immediately',
]) {
  assert(policyTest.includes(marker), `Authorization matrix test is missing ${marker}.`);
}
assert(schema.includes("'support_agent'"), 'The distinct Support role is missing from the schema.');
assert(
  domainTest.includes('rejects anonymous private API access') &&
    domainTest.includes('denies untrusted external context') &&
    domainTest.includes('rechecks account and membership state'),
  'API authentication, untrusted-context, or propagation proof is missing.',
);
assert(
  accountStore.includes("revocation_reason = 'TOTAL_LOCKOUT_RECOVERY'") &&
    accountTest.includes('one secure provider-subject binding') &&
    accountTest.includes('permits exactly one concurrent unlink winner'),
  'Identity collision, recovery revocation, or unlink proof is missing.',
);

process.stdout.write(
  `Authorization matrix passed for ${manifest.rows.length} local rows; ${manifest.stillOpen.length} external/native gates remain open.\n`,
);
