import type { Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { OpenAPIObject } from '@nestjs/swagger';

import { ApiExceptionFilter } from './api-errors.js';
import {
  installSafeRequestContextHooks,
  type SafeLogSink,
  stdoutSafeLogSink,
} from './api-logging.js';
import { createOpenApiDocument, OpenApiDocumentStore } from './openapi.js';

export type CreatedApiApplication = {
  app: NestFastifyApplication;
  document: OpenAPIObject;
};

export async function createApiApplication(
  rootModule: Type<unknown>,
  options: { logSink?: SafeLogSink } = {},
): Promise<CreatedApiApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(rootModule, new FastifyAdapter(), {
    logger: false,
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  installSafeRequestContextHooks(
    app.getHttpAdapter().getInstance(),
    options.logSink ?? stdoutSafeLogSink,
  );
  app.enableShutdownHooks();
  const document = createOpenApiDocument(app);
  app.get(OpenApiDocumentStore).set(document);
  await app.init();
  return { app, document };
}
