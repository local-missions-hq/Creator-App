import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildContractArtifacts } from './contract-artifacts.js';

const evidenceDirectory = fileURLToPath(
  new URL('../../../docs/evidence/M03/api/', import.meta.url),
);
const generatedClient = fileURLToPath(
  new URL('../../../packages/api-client/src/generated/schema.ts', import.meta.url),
);
const artifacts = await buildContractArtifacts();

await mkdir(evidenceDirectory, { recursive: true });
await writeFile(`${evidenceDirectory}/openapi.json`, artifacts.productionOpenApi, 'utf8');
await writeFile(`${evidenceDirectory}/openapi.local.json`, artifacts.localOpenApi, 'utf8');
await writeFile(generatedClient, artifacts.clientSchema, 'utf8');
process.stdout.write(
  'Generated reviewed production/local OpenAPI artifacts and shared typed client.\n',
);
