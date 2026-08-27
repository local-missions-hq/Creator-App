const defaultLocalDatabaseUrl =
  'postgresql://local_missions:local_missions_local_only@127.0.0.1:5432/local_missions';

export function getLocalDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim() || defaultLocalDatabaseUrl;
  const parsed = new URL(value);
  const isLoopback = ['127.0.0.1', '::1', 'localhost'].includes(parsed.hostname);

  if (!isLoopback || parsed.pathname !== '/local_missions') {
    throw new Error(
      'M3 local database commands accept only the loopback local_missions database. Staging and production migrations require a later explicit deployment path.',
    );
  }

  return value;
}
