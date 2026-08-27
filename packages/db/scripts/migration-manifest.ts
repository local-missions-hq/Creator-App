import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export type MigrationManifestEntry = {
  index: number;
  journalTimestamp: number;
  snapshotSha256: string;
  sqlSha256: string;
  tag: string;
};

export type MigrationManifest = {
  dialect: 'postgresql';
  entries: MigrationManifestEntry[];
  hashAlgorithm: 'sha256';
  manifestVersion: 1;
};

type MigrationJournal = {
  dialect: string;
  entries: {
    breakpoints: boolean;
    idx: number;
    tag: string;
    version: string;
    when: number;
  }[];
  version: string;
};

export const migrationsDirectory = fileURLToPath(new URL('../drizzle/', import.meta.url));
export const migrationManifestPath = fileURLToPath(
  new URL('../drizzle/migration-manifest.json', import.meta.url),
);

function sha256(contents: string): string {
  return createHash('sha256').update(contents).digest('hex');
}

export async function createMigrationManifest(): Promise<MigrationManifest> {
  const journal = JSON.parse(
    await readFile(`${migrationsDirectory}/meta/_journal.json`, 'utf8'),
  ) as MigrationJournal;
  if (journal.dialect !== 'postgresql' || journal.version !== '7') {
    throw new Error('Unexpected Drizzle journal dialect or version.');
  }

  const files = await readdir(migrationsDirectory);
  const sqlTags = files
    .filter((name) => /^\d{4}_[a-z0-9_]+[.]sql$/.test(name))
    .map((name) => name.slice(0, -4))
    .sort();
  const journalTags = journal.entries.map((entry) => entry.tag);
  if (JSON.stringify(sqlTags) !== JSON.stringify(journalTags)) {
    throw new Error('Migration SQL files do not exactly match the ordered Drizzle journal.');
  }

  const entries = await Promise.all(
    journal.entries.map(async (entry, index) => {
      if (
        entry.idx !== index ||
        entry.version !== '7' ||
        entry.breakpoints !== true ||
        !/^\d{4}_[a-z0-9_]+$/.test(entry.tag)
      ) {
        throw new Error(`Invalid Drizzle journal entry at index ${index}.`);
      }
      const sql = await readFile(`${migrationsDirectory}/${entry.tag}.sql`, 'utf8');
      const destructivePattern = /\b(?:DROP\s+(?:TABLE|DATABASE|SCHEMA)|TRUNCATE|DELETE\s+FROM)\b/i;
      if (destructivePattern.test(sql)) {
        throw new Error(
          `Migration ${entry.tag} contains an unreviewed destructive statement and cannot be manifested.`,
        );
      }
      const snapshot = await readFile(
        `${migrationsDirectory}/meta/${String(index).padStart(4, '0')}_snapshot.json`,
        'utf8',
      );
      return {
        index,
        journalTimestamp: entry.when,
        snapshotSha256: sha256(snapshot),
        sqlSha256: sha256(sql),
        tag: entry.tag,
      };
    }),
  );

  return {
    dialect: 'postgresql',
    entries,
    hashAlgorithm: 'sha256',
    manifestVersion: 1,
  };
}
