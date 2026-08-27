import { Module } from '@nestjs/common';

import {
  AuthenticationService,
  BEARER_VERIFIER,
  UnavailableBearerVerifier,
} from './authentication.js';
import { DatabaseService } from './database.service.js';
import { DomainApiService } from './domain-api.service.js';
import { DomainController } from './domain.controller.js';
import { HealthController } from './health.controller.js';
import { OpenApiController } from './openapi.controller.js';
import { OpenApiDocumentStore } from './openapi.js';
import { V1Controller } from './v1.controller.js';

@Module({
  controllers: [HealthController, OpenApiController, V1Controller, DomainController],
  providers: [
    AuthenticationService,
    DatabaseService,
    DomainApiService,
    OpenApiDocumentStore,
    UnavailableBearerVerifier,
    { provide: BEARER_VERIFIER, useExisting: UnavailableBearerVerifier },
  ],
})
export class AppModule {}
