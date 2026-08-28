import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from './app.module.js';
import { createApiApplication } from './create-application.js';
import type { SafeRequestLog } from './api-logging.js';
import { LocalAppModule } from './local-only/local-app.module.js';
import { LocalDevTokenService } from './local-only/dev-token.service.js';
import { LocalProviderProofService } from './local-only/provider-proof.service.js';

const localDatabaseUrl =
  'postgresql://local_missions:local_missions_local_only@127.0.0.1:5432/local_missions';

let productionApp: NestFastifyApplication;
let localApp: NestFastifyApplication;
const logs: SafeRequestLog[] = [];

beforeAll(async () => {
  process.env.APP_ENV = 'local';
  process.env.DATABASE_URL = localDatabaseUrl;
  productionApp = (await createApiApplication(AppModule, { logSink: (entry) => logs.push(entry) }))
    .app;
  localApp = (await createApiApplication(LocalAppModule, { logSink: (entry) => logs.push(entry) }))
    .app;
});

beforeEach(() => {
  logs.length = 0;
});

afterAll(async () => {
  await localApp.close();
  await productionApp.close();
});

describe('API operational boundary', () => {
  it('discovers every implemented V1 resource including account lifecycle', async () => {
    const response = await productionApp.inject({ method: 'GET', url: '/v1' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      resources: ['account', 'me', 'creator-missions', 'business-campaigns', 'mission-templates'],
      version: 'v1',
    });
  });

  it('keeps liveness independent, readiness database-backed, and build info non-secret', async () => {
    const live = await productionApp.inject({ method: 'GET', url: '/health/live' });
    const ready = await productionApp.inject({ method: 'GET', url: '/health/ready' });
    const build = await productionApp.inject({ method: 'GET', url: '/build-info' });

    expect(live.statusCode).toBe(200);
    expect(live.json()).toEqual({
      service: 'local-missions-api',
      status: 'ok',
      version: '0.1.0',
    });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({ dependencies: { database: 'up' }, status: 'ready' });
    expect(build.json()).toEqual({
      builtAt: 'local',
      commit: 'local',
      service: 'local-missions-api',
      version: '0.1.0',
    });
  });

  it('returns a stable cursor page without duplicate mission-template versions', async () => {
    const first = await productionApp.inject({
      method: 'GET',
      url: '/v1/mission-templates?limit=2',
    });
    const firstBody = first.json<{
      data: { code: string; version: number }[];
      page: { hasMore: boolean; nextCursor: string };
    }>();
    const second = await productionApp.inject({
      method: 'GET',
      url: `/v1/mission-templates?limit=2&cursor=${firstBody.page.nextCursor}`,
    });
    const secondBody = second.json<typeof firstBody>();

    expect(first.statusCode).toBe(200);
    expect(firstBody.page.hasMore).toBe(true);
    expect(second.statusCode).toBe(200);
    expect(
      new Set([...firstBody.data, ...secondBody.data].map((item) => `${item.code}:${item.version}`))
        .size,
    ).toBe(4);
  });

  it('returns bounded validation details and propagates valid request context IDs', async () => {
    const response = await productionApp.inject({
      headers: {
        'x-correlation-id': 'corr_api_integration_001',
        'x-request-id': 'req_api_integration_001',
      },
      method: 'GET',
      url: '/v1/mission-templates?cursor=not-valid!',
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers['x-request-id']).toBe('req_api_integration_001');
    expect(response.headers['x-correlation-id']).toBe('corr_api_integration_001');
    expect(response.json()).toEqual({
      correlationId: 'corr_api_integration_001',
      error: {
        code: 'VALIDATION_FAILED',
        details: [{ code: 'INVALID_FORMAT', path: 'query.cursor' }],
        message: 'Request validation failed.',
      },
      requestId: 'req_api_integration_001',
    });
  });

  it('replaces untrusted request headers and writes only allowlisted structured log fields', async () => {
    const sensitiveBodyMarker = 'usr_synthetic_creator_private_marker';
    const response = await localApp.inject({
      headers: { 'x-correlation-id': 'contains spaces', 'x-request-id': '../bad' },
      method: 'POST',
      payload: { role: 'creator', subjectPublicId: sensitiveBodyMarker },
      url: '/v1/dev/token?do_not_log=this_value',
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['x-correlation-id']).toBe(response.headers['x-request-id']);
    const finalLog = logs.at(-1);
    expect(finalLog).toBeTruthy();
    expect(Object.keys(finalLog ?? {}).sort()).toEqual(
      ['correlationId', 'durationMs', 'event', 'method', 'requestId', 'route', 'statusCode'].sort(),
    );
    expect(finalLog?.route).toBe('/v1/dev/token');
    expect(JSON.stringify(finalLog)).not.toContain(sensitiveBodyMarker);
    expect(JSON.stringify(finalLog)).not.toContain('do_not_log');
    expect(JSON.stringify(finalLog)).not.toContain('this_value');
  });

  it('serves the matching contract and excludes local auth from production routes', async () => {
    const productionDocument = await productionApp.inject({ method: 'GET', url: '/openapi.json' });
    const localDocument = await localApp.inject({ method: 'GET', url: '/openapi.json' });
    const productionToken = await productionApp.inject({
      method: 'POST',
      payload: { role: 'creator', subjectPublicId: 'usr_synthetic_creator_001' },
      url: '/v1/dev/token',
    });
    const localToken = await localApp.inject({
      method: 'POST',
      payload: { role: 'creator', subjectPublicId: 'usr_synthetic_creator_001' },
      url: '/v1/dev/token',
    });

    expect(productionDocument.json().paths['/v1/dev/token']).toBeUndefined();
    expect(productionDocument.json().paths['/v1/dev/provider-proof']).toBeUndefined();
    expect(localDocument.json().paths['/v1/dev/token']).toBeTruthy();
    expect(localDocument.json().paths['/v1/dev/provider-proof']).toBeTruthy();
    expect(productionToken.statusCode).toBe(404);
    expect(productionToken.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(productionToken.json()).toMatchObject({
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
    });
    expect(localToken.statusCode).toBe(201);
    expect(localToken.json()).toMatchObject({ expiresIn: 900, tokenType: 'Bearer' });
    expect(localToken.json().accessToken.split('.')).toHaveLength(3);
  });

  it('fails closed if local token code is instantiated for a deployed environment', () => {
    process.env.APP_ENV = 'staging';
    try {
      expect(() => new LocalDevTokenService()).toThrow(/forbidden/);
      expect(() => new LocalProviderProofService()).toThrow(/forbidden/);
    } finally {
      process.env.APP_ENV = 'local';
    }
  });

  it('keeps liveness up and readiness safely unavailable when PostgreSQL is unreachable', async () => {
    process.env.DATABASE_URL =
      'postgresql://local_missions:local_missions_local_only@127.0.0.1:1/local_missions';
    const unavailable = await createApiApplication(AppModule, { logSink: () => undefined });
    try {
      const live = await unavailable.app.inject({ method: 'GET', url: '/health/live' });
      const ready = await unavailable.app.inject({ method: 'GET', url: '/health/ready' });
      expect(live.statusCode).toBe(200);
      expect(ready.statusCode).toBe(503);
      expect(ready.json()).toMatchObject({
        error: {
          code: 'DEPENDENCY_UNAVAILABLE',
          message: 'A required service is temporarily unavailable.',
        },
      });
      expect(JSON.stringify(ready.json())).not.toContain('127.0.0.1');
      expect(JSON.stringify(ready.json())).not.toContain('postgresql');
    } finally {
      await unavailable.app.close();
      process.env.DATABASE_URL = localDatabaseUrl;
    }
  });
});
