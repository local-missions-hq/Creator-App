import { writeFile } from 'node:fs/promises';

import { createMigrationManifest, migrationManifestPath } from './migration-manifest.js';

const manifest = await createMigrationManifest();
await writeFile(migrationManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`Generated migration manifest for ${manifest.entries.length} migrations.\n`);
