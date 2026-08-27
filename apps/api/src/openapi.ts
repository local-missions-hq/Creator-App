import { Injectable } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
  type SchemaObject,
} from '@nestjs/swagger';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  apiErrorEnvelopeSchema,
  apiPageSchema,
  idempotencyKeySchema,
  optimisticVersionSchema,
} from '@local-missions/contracts';
import { z, type ZodType } from 'zod';

import { API_VERSION } from './health.js';

export function openApiSchema(schema: ZodType): SchemaObject {
  const converted = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
  delete converted.$schema;
  return converted as SchemaObject;
}

function addRequestContextContract(document: OpenAPIObject): void {
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.ApiErrorEnvelope = openApiSchema(apiErrorEnvelopeSchema);
  document.components.schemas.CursorPage = openApiSchema(apiPageSchema);
  document.components.schemas.IdempotencyKey = openApiSchema(idempotencyKeySchema);
  document.components.schemas.OptimisticVersion = openApiSchema(optimisticVersionSchema);
  document.components.parameters = {
    ...(document.components.parameters ?? {}),
    CorrelationId: {
      description: 'Optional caller correlation ID. Invalid values are replaced.',
      in: 'header',
      name: 'x-correlation-id',
      required: false,
      schema: { maxLength: 128, minLength: 8, type: 'string' },
    },
    RequestId: {
      description: 'Optional caller request ID. Invalid values are replaced.',
      in: 'header',
      name: 'x-request-id',
      required: false,
      schema: { maxLength: 128, minLength: 8, type: 'string' },
    },
    IdempotencyKey: {
      description: 'Required on retryable money, submission, approval, and payout writes.',
      in: 'header',
      name: 'idempotency-key',
      required: true,
      schema: { $ref: '#/components/schemas/IdempotencyKey' },
    },
    IfMatchVersion: {
      description: 'Expected positive resource version for optimistic concurrency.',
      in: 'header',
      name: 'if-match-version',
      required: true,
      schema: { $ref: '#/components/schemas/OptimisticVersion' },
    },
  };
  document.components.headers = {
    ...(document.components.headers ?? {}),
    CorrelationId: {
      description: 'Correlation ID assigned to this request.',
      schema: { type: 'string' },
    },
    RequestId: {
      description: 'Unique request ID assigned to this request.',
      schema: { type: 'string' },
    },
  };
  document.components.responses = Object.fromEntries(
    [
      ['BadRequest', 'Request validation failed.'],
      ['Unauthorized', 'Authentication is required.'],
      ['Forbidden', 'Access is denied.'],
      ['NotFound', 'The requested resource was not found.'],
      ['Conflict', 'The request conflicts with current state.'],
      ['RateLimited', 'Too many requests.'],
      ['DependencyUnavailable', 'A required service is temporarily unavailable.'],
    ].map(([name, description]) => [
      name,
      {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ApiErrorEnvelope' } },
        },
        description,
        headers: {
          'x-correlation-id': { $ref: '#/components/headers/CorrelationId' },
          'x-request-id': { $ref: '#/components/headers/RequestId' },
        },
      },
    ]),
  );

  for (const pathItem of Object.values(document.paths)) {
    if (!pathItem) continue;
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = pathItem[method];
      if (!operation) continue;
      operation.parameters = [
        { $ref: '#/components/parameters/RequestId' },
        { $ref: '#/components/parameters/CorrelationId' },
        ...(operation.parameters ?? []),
      ];
      for (const response of Object.values(operation.responses)) {
        if (!response || '$ref' in response) continue;
        response.headers = {
          ...(response.headers ?? {}),
          'x-correlation-id': { $ref: '#/components/headers/CorrelationId' },
          'x-request-id': { $ref: '#/components/headers/RequestId' },
        };
      }
    }
  }
}

export function createOpenApiDocument(app: NestFastifyApplication): OpenAPIObject {
  const configuration = new DocumentBuilder()
    .setTitle('Local Missions API')
    .setDescription(
      'Versioned Local Missions API. The committed production contract intentionally excludes local-only authentication helpers.',
    )
    .setVersion(API_VERSION)
    .addBearerAuth({ bearerFormat: 'JWT', scheme: 'bearer', type: 'http' }, 'entra-bearer')
    .build();
  const document = SwaggerModule.createDocument(app, configuration, {
    operationIdFactory: (controllerKey, methodKey) => `${controllerKey}_${methodKey}`,
  });
  addRequestContextContract(document);
  return document;
}

@Injectable()
export class OpenApiDocumentStore {
  private document: OpenAPIObject | undefined;

  set(document: OpenAPIObject): void {
    this.document = document;
  }

  get(): OpenAPIObject {
    if (!this.document) throw new Error('OpenAPI document is not initialized.');
    return this.document;
  }
}
