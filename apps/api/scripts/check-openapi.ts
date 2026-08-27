import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildContractArtifacts } from './contract-artifacts.js';

const paths = {
  clientSchema: fileURLToPath(
    new URL('../../../packages/api-client/src/generated/schema.ts', import.meta.url),
  ),
  localOpenApi: fileURLToPath(
    new URL('../../../docs/evidence/M03/api/openapi.local.json', import.meta.url),
  ),
  productionOpenApi: fileURLToPath(
    new URL('../../../docs/evidence/M03/api/openapi.json', import.meta.url),
  ),
};
const expected = await buildContractArtifacts();

for (const [name, path] of Object.entries(paths)) {
  const committed = await readFile(path, 'utf8');
  if (committed !== expected[name as keyof typeof expected]) {
    throw new Error(`${name} is stale. Run pnpm openapi:generate and review the diff.`);
  }
}

process.stdout.write('OpenAPI snapshots and shared typed client match the API source.\n');
