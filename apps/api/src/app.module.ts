import { Module } from '@nestjs/common';

import { DatabaseService } from './database.service.js';
import { HealthController } from './health.controller.js';
import { OpenApiController } from './openapi.controller.js';
import { OpenApiDocumentStore } from './openapi.js';
import { V1Controller } from './v1.controller.js';

@Module({
  controllers: [HealthController, OpenApiController, V1Controller],
  providers: [DatabaseService, OpenApiDocumentStore],
})
export class AppModule {}
