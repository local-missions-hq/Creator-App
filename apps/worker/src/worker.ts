export function workerIdentity(environment = process.env.APP_ENV ?? 'local') {
  return `local-missions-worker:${environment}`;
}
