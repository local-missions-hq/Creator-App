import type {
  AppEnvironment,
  BuildInfo,
  HealthStatus,
  LivenessStatus,
  ReadinessStatus,
} from '@local-missions/contracts';

export const API_VERSION = '0.1.0';

function environment(value = process.env.APP_ENV): AppEnvironment {
  if (value === 'development' || value === 'staging' || value === 'production') return value;
  return 'local';
}

function version(value = process.env.BUILD_VERSION): string {
  return /^\d+\.\d+\.\d+$/.test(value ?? '') ? (value as string) : API_VERSION;
}

export function buildLegacyHealthStatus(): HealthStatus {
  return {
    environment: environment(),
    service: 'local-missions-api',
    status: 'ok',
    version: version(),
  };
}

export function buildLivenessStatus(): LivenessStatus {
  return {
    service: 'local-missions-api',
    status: 'ok',
    version: version(),
  };
}

export function buildReadinessStatus(): ReadinessStatus {
  return {
    dependencies: { database: 'up' },
    service: 'local-missions-api',
    status: 'ready',
    version: version(),
  };
}

export function buildInformation(): BuildInfo {
  const candidateCommit = process.env.BUILD_COMMIT?.trim();
  const candidateTime = process.env.BUILD_TIME?.trim();
  return {
    builtAt:
      candidateTime && !Number.isNaN(Date.parse(candidateTime))
        ? new Date(candidateTime).toISOString()
        : 'local',
    commit: candidateCommit && /^[a-f0-9]{7,40}$/.test(candidateCommit) ? candidateCommit : 'local',
    service: 'local-missions-api',
    version: version(),
  };
}
