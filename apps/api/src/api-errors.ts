import { Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { ApiErrorCode, ApiErrorEnvelope } from '@local-missions/contracts';
import type { FastifyReply } from 'fastify';
import type { ZodIssue } from 'zod';

import type { ContextualRequest } from './api-context.js';

export type ApiErrorDetail = {
  code: string;
  path: string;
};

export class ApiProblem extends HttpException {
  constructor(
    readonly apiCode: ApiErrorCode,
    message: string,
    status: number,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message, status);
  }
}

export function validationProblem(issues: ZodIssue[], prefix: string): ApiProblem {
  return new ApiProblem(
    'VALIDATION_FAILED',
    'Request validation failed.',
    HttpStatus.BAD_REQUEST,
    issues.slice(0, 25).map((issue) => ({
      code: issue.code.toUpperCase(),
      path: [prefix, ...issue.path.map(String)].filter(Boolean).join('.'),
    })),
  );
}

export function dependencyUnavailable(): ApiProblem {
  return new ApiProblem(
    'DEPENDENCY_UNAVAILABLE',
    'A required service is temporarily unavailable.',
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}

function statusToCode(status: number): ApiErrorCode {
  if (status === HttpStatus.BAD_REQUEST) return 'VALIDATION_FAILED';
  if (status === HttpStatus.UNAUTHORIZED) return 'AUTHENTICATION_REQUIRED';
  if (status === HttpStatus.FORBIDDEN) return 'ACCESS_DENIED';
  if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
  if (status === HttpStatus.CONFLICT) return 'STATE_CONFLICT';
  if (status === HttpStatus.TOO_MANY_REQUESTS) return 'RATE_LIMITED';
  if (status === HttpStatus.SERVICE_UNAVAILABLE) return 'DEPENDENCY_UNAVAILABLE';
  return 'INTERNAL_ERROR';
}

function safeMessage(status: number): string {
  if (status === HttpStatus.BAD_REQUEST) return 'Request validation failed.';
  if (status === HttpStatus.UNAUTHORIZED) return 'Authentication is required.';
  if (status === HttpStatus.FORBIDDEN) return 'Access is denied.';
  if (status === HttpStatus.NOT_FOUND) return 'The requested resource was not found.';
  if (status === HttpStatus.CONFLICT) return 'The request conflicts with current state.';
  if (status === HttpStatus.TOO_MANY_REQUESTS) return 'Too many requests.';
  if (status === HttpStatus.SERVICE_UNAVAILABLE)
    return 'A required service is temporarily unavailable.';
  return 'An unexpected error occurred.';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<ContextualRequest>();
    const reply = http.getResponse<FastifyReply>();
    const status =
      exception instanceof HttpException && exception.getStatus() < 500
        ? exception.getStatus()
        : exception instanceof ApiProblem
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = exception instanceof ApiProblem ? exception.apiCode : statusToCode(status);
    const context = request.apiContext ?? {
      correlationId: 'request_context_unavailable',
      requestId: 'request_context_unavailable',
    };

    context.errorCode = code;
    const envelope: ApiErrorEnvelope = {
      correlationId: context.correlationId,
      error: {
        code,
        ...(exception instanceof ApiProblem && exception.details
          ? { details: exception.details }
          : {}),
        message:
          exception instanceof ApiProblem && exception.getStatus() < 500
            ? exception.message
            : safeMessage(status),
      },
      requestId: context.requestId,
    };

    void reply.status(status).send(envelope);
  }
}
