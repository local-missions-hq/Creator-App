import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const forbiddenMarkers = ['LOCAL_DEV', 'LocalDevToken', 'local-missions-local-dev', 'v1/dev'];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = `${directory}/${entry.name}`;
      return entry.isDirectory() ? collectFiles(path) : [path];
    }),
  );
  return files.flat();
}

const files = await collectFiles(outputDirectory);
if (files.some((path) => path.includes('/local-only/'))) {
  throw new Error('Production API build contains the excluded local-only source tree.');
}

for (const path of files.filter((candidate) => /\.(?:d\.ts|js|map)$/.test(candidate))) {
  const contents = await readFile(path, 'utf8');
  const marker = forbiddenMarkers.find((candidate) => contents.includes(candidate));
  if (marker) throw new Error(`Production API build contains forbidden local marker: ${marker}`);
}

process.stdout.write('Production API build excludes every local dev-token marker.\n');
