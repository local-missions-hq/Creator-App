import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptDirectory);
const architecturePath = join(repositoryRoot, 'architecture.md');
const decisionsDirectory = join(repositoryRoot, 'docs', 'decisions');
const checkOnly = process.argv.includes('--check');

const architecture = await readFile(architecturePath, 'utf8');
const rows = [...architecture.matchAll(/^\| ADR-(\d{3}) \| (.+?) \| (.+?) \|$/gm)].map(
  ([, number, decision, sourceStatus]) => ({
    id: `ADR-${number}`,
    number: Number(number),
    decision,
    sourceStatus,
  }),
);

if (rows.length !== 59 || rows[0]?.id !== 'ADR-001' || rows.at(-1)?.id !== 'ADR-059') {
  throw new Error(`Expected the ADR-001 through ADR-059 register; found ${rows.length} records.`);
}

const contextFor = (number) => {
  if (number === 59) {
    return 'This record schedules the physical-device accessibility proof without weakening the release requirement or misrepresenting Simulator evidence as actual VoiceOver testing.';
  }
  if (number <= 10) {
    return 'This record establishes a foundational application, data, integration, or scaling boundary for the Local Missions V1 platform.';
  }
  if (number <= 15) {
    return 'This record establishes a shared identity, funding, completion, review, or refund rule that both app modes and the server must interpret consistently.';
  }
  if (number <= 23) {
    return 'This record keeps everyday creators eligible while making optional Reach and campaign economics explicit, measurable, and non-negotiable outside the approved product rules.';
  }
  if (number <= 29) {
    return 'This record defines identity-provider or locality privacy behavior for a shared multi-role account without exposing sensitive creator information to businesses.';
  }
  if (number <= 36) {
    return 'This record defines the objective V1 mission contract, workload, media, rights, add-on, or renewal boundary presented to businesses and creators.';
  }
  if (number <= 44) {
    return 'This record defines controlled-pilot, Local Pass, Reach-evidence, payment-liability, creator-finality, or reserve behavior that requires auditable server enforcement.';
  }
  if (number <= 50) {
    return 'This record defines employee operations, Azure topology, ephemeral development, teardown safety, or Community-launch independence for the controlled V1 rollout.';
  }
  return 'This record defines pre-live testing, App Store release, waitlist, invitation, data-lifecycle, correction, or appeal behavior for the controlled Orlando pilot.';
};

const gatesFor = (number) => {
  const gates = [
    'Implementation and verification remain incomplete until the applicable milestone evidence in `plans.md` passes.',
    'A material change requires a later ADR that explicitly supersedes this record.',
  ];

  if ([4, 5, 19, 20, 24, 25, 26, 27, 28, 41, 42, 44].includes(number)) {
    gates.unshift(
      'Provider, legal, privacy, accounting, insurance, or security review may tighten this boundary but cannot silently weaken the founder-approved protection.',
    );
  }

  if ([2, 8, 9, 46, 47, 48, 49].includes(number)) {
    gates.unshift(
      'Cloud resources, service sizes, prices, and production network settings must be re-verified when the relevant infrastructure milestone begins.',
    );
  }

  if (number === 59) {
    gates.unshift(
      'The prepared physical-iPhone Creator and Business VoiceOver paths must pass during M16 before M16 may close or external TestFlight testing may begin.',
      'Accessibility Inspector, native accessibility-tree inspection, Maestro, Spoken Content, and macOS VoiceOver must not be reported as actual iOS VoiceOver gesture evidence.',
    );
  }

  return gates;
};

const renderRecord = ({ id, number, decision, sourceStatus }) => {
  const decisionDate = number === 59 ? '2026-08-27' : '2026-08-26';
  const recordStatus =
    number === 59
      ? 'Accepted — founder-approved milestone scheduling decision'
      : 'Accepted — founder-approved V1 baseline';
  const gates = gatesFor(number)
    .map((gate) => `- ${gate}`)
    .join('\n');
  return `# ${id}: ${decision.replaceAll('**', '').replaceAll('`', '')}

- **Status:** ${recordStatus}
- **Decision date:** ${decisionDate}
- **Source register status at freeze:** ${sourceStatus}
- **Scope:** Local Missions V1 unless superseded

## Context

${contextFor(number)} The complete rationale, workflow details, limits, and related decisions remain in [../../architecture.md](../../architecture.md) and the milestone acceptance criteria remain in [../../plans.md](../../plans.md).

## Decision

${decision}

## Consequences

- Mobile, API, worker, dashboard, data, audit, and test behavior must use this decision as one consistent product rule wherever it applies.
- Server-side authorization and state transitions remain authoritative; a client label, support note, or direct provider action cannot bypass the rule.
- User-facing language and evidence must distinguish implemented behavior from concepts, test mode, and future/provider-gated capability.

## Verification and gates

${gates}

## Change control

This frozen record is generated from the architecture decision register. Do not rewrite accepted history to change behavior; create a new ADR, explain the migration and consequences, and mark this record superseded.
`;
};

const renderIndex = () => {
  const table = rows
    .map(
      ({ id, decision, sourceStatus }) => `| [${id}](./${id}.md) | ${decision} | ${sourceStatus} |`,
    )
    .join('\n');

  return `# Local Missions architecture decisions

ADR-001 through ADR-058 are the founder-approved V1 baseline frozen on 2026-08-26. ADR-059 is the founder-approved milestone scheduling decision added on 2026-08-27 without weakening the physical-device accessibility gate. These generated records make the register reviewable as individual decisions; [../../architecture.md](../../architecture.md) remains the detailed architecture overview and [../../plans.md](../../plans.md) remains the build-and-verification contract.

| ADR | Decision | Source status at freeze |
|---|---|---|
${table}

## Change rule

Do not silently edit accepted decision history. A material change requires a new ADR that names the superseded record, migration effect, evidence, and approval.
`;
};

const expectedFiles = new Map([
  ...rows.map((row) => [join(decisionsDirectory, `${row.id}.md`), renderRecord(row)]),
  [join(decisionsDirectory, 'README.md'), renderIndex()],
]);

if (checkOnly) {
  const mismatches = [];
  for (const [path, expected] of expectedFiles) {
    try {
      const actual = await readFile(path, 'utf8');
      if (actual !== expected) mismatches.push(relative(repositoryRoot, path));
    } catch {
      mismatches.push(relative(repositoryRoot, path));
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Generated ADR records are missing or stale: ${mismatches.join(', ')}`);
  }

  process.stdout.write(`Verified ${expectedFiles.size} generated ADR files.\n`);
} else {
  await mkdir(decisionsDirectory, { recursive: true });
  for (const [path, contents] of expectedFiles) {
    await writeFile(path, contents, 'utf8');
  }
  process.stdout.write(`Generated ${expectedFiles.size} ADR files.\n`);
}
