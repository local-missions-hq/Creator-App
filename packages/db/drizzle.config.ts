import { defineConfig } from 'drizzle-kit';

import { getLocalDatabaseUrl } from './scripts/local-database.js';

export default defineConfig({
  dbCredentials: {
    url: getLocalDatabaseUrl(),
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema.ts',
  strict: true,
  verbose: true,
});
