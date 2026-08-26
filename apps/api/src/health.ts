export type HealthStatus = {
  environment: string;
  service: 'local-missions-api';
  status: 'ok';
  version: string;
};

export function buildHealthStatus(environment = process.env.APP_ENV ?? 'local'): HealthStatus {
  return {
    environment,
    service: 'local-missions-api',
    status: 'ok',
    version: '0.1.0',
  };
}
