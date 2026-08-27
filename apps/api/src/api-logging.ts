import { randomUUID } from 'node:crypto';

import { apiRequestIdSchema } from '@local-missions/contracts';
import type { FastifyInstance } from 'fastify';

import type { ContextualRequest } from './api-context.js';

export type SafeRequestLog = {
  correlationId: string;
  durationMs: number;
  errorCode?: string;
  event: 'api_request_completed';
  method: string;
  requestId: string;
  route: string;
  statusCode: number;
};

export type SafeLogSink = (entry: SafeRequestLog) => void;

export const stdoutSafeLogSink: SafeLogSink = (entry) => {
  process.stdout.write(`${JSON.stringify(entry)}\n`);
};

function normalizedHeader(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && apiRequestIdSchema.safeParse(candidate).success ? candidate : undefined;
}

export function installSafeRequestContextHooks(
  fastify: FastifyInstance,
  sink: SafeLogSink = stdoutSafeLogSink,
): void {
  const startedAt = new WeakMap<object, bigint>();

  fastify.addHook('onRequest', (request, reply, done) => {
    const contextualRequest = request as ContextualRequest;
    const requestId = normalizedHeader(request.headers['x-request-id']) ?? randomUUID();
    const correlationId = normalizedHeader(request.headers['x-correlation-id']) ?? requestId;

    contextualRequest.apiContext = { correlationId, requestId };
    startedAt.set(request, process.hrtime.bigint());
    void reply.header('x-request-id', requestId);
    void reply.header('x-correlation-id', correlationId);
    done();
  });

  fastify.addHook('onResponse', (request, reply, done) => {
    const contextualRequest = request as ContextualRequest;
    const requestStartedAt = startedAt.get(request) ?? process.hrtime.bigint();
    const durationMs = Number(process.hrtime.bigint() - requestStartedAt) / 1_000_000;
    const requestId = contextualRequest.apiContext?.requestId ?? 'request_context_unavailable';
    const correlationId =
      contextualRequest.apiContext?.correlationId ?? 'request_context_unavailable';
    sink({
      correlationId,
      durationMs: Math.round(durationMs * 100) / 100,
      ...(contextualRequest.apiContext?.errorCode
        ? { errorCode: contextualRequest.apiContext.errorCode }
        : {}),
      event: 'api_request_completed',
      method: request.method,
      requestId,
      route: request.routeOptions?.url ?? request.url.split('?')[0] ?? '/',
      statusCode: reply.statusCode,
    });
    done();
  });
}
