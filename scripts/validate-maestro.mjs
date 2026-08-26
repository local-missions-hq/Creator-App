import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const maestroRoot = join(repositoryRoot, '.maestro');
const mobileRoot = join(repositoryRoot, 'apps', 'mobile');
const allowedCommands = new Set([
  'assertVisible',
  'openLink',
  'runFlow',
  'scrollUntilVisible',
  'tapOn',
]);

function filesBelow(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);

    if (entry.isDirectory()) {
      return filesBelow(target, extension);
    }

    return entry.name.endsWith(extension) ? [target] : [];
  });
}

const sourceText = filesBelow(mobileRoot, '.tsx')
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');
const flowFiles = readdirSync(maestroRoot)
  .filter((name) => name.endsWith('-flow.yaml'))
  .map((name) => join(maestroRoot, name));

if (flowFiles.length !== 2) {
  throw new Error(`Expected exactly two Maestro flows; found ${flowFiles.length}.`);
}

let referencedIdCount = 0;

for (const flowFile of flowFiles) {
  const flow = readFileSync(flowFile, 'utf8');
  const [header, commands] = flow.split(/^---$/m);

  if (!header || !commands) {
    throw new Error(`${flowFile} must contain YAML front matter and a command document.`);
  }

  if (!header.includes('appId: host.exp.Exponent')) {
    throw new Error(`${flowFile} must target Expo Go for the current local prototype.`);
  }

  if (!/openLink: ['"]\$\{EXPO_URL\}\/--\//.test(commands)) {
    throw new Error(`${flowFile} must open a local Expo route through EXPO_URL.`);
  }

  for (const match of commands.matchAll(/^- ([A-Za-z]+):/gm)) {
    const command = match[1];
    if (!command || !allowedCommands.has(command)) {
      throw new Error(`${flowFile} contains unsupported top-level command ${String(command)}.`);
    }
  }

  for (const match of commands.matchAll(/^\s+id: ([a-z0-9-]+)$/gm)) {
    const id = match[1];
    referencedIdCount += 1;

    if (!id || (!sourceText.includes(`'${id}'`) && !sourceText.includes(`"${id}"`))) {
      throw new Error(`${flowFile} references missing mobile testID ${String(id)}.`);
    }
  }
}

console.log(
  `Maestro flow structure passed for ${flowFiles.length} flows and ${referencedIdCount} testID references.`,
);
console.log('This is static validation only; install Maestro CLI to execute the Simulator flows.');
