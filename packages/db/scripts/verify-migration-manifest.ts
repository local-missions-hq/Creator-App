import { readFile } from 'node:fs/promises';

import {
  createMigrationManifest,
  type MigrationManifest,
  migrationManifestPath,
} from './migration-manifest.js';

const expected = await createMigrationManifest();
const committed = JSON.parse(await readFile(migrationManifestPath, 'utf8')) as MigrationManifest;

if (JSON.stringify(committed) !== JSON.stringify(expected)) {
  throw new Error(
    'Migration manifest is missing or stale. Regenerate it and intentionally review every SQL/snapshot hash change.',
  );
}

process.stdout.write(
  `Migration manifest verified ${expected.entries.length} ordered SQL and snapshot hashes with no destructive down statements.\n`,
);
