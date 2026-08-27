import type { ApiErrorCode } from '@local-missions/contracts';
import type { FastifyRequest } from 'fastify';

export type ApiRequestContext = {
  correlationId: string;
  errorCode?: ApiErrorCode;
  requestId: string;
};

export type ContextualRequest = FastifyRequest & {
  apiContext?: ApiRequestContext;
};
