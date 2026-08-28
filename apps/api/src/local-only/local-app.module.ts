import { Module } from '@nestjs/common';

import { AuthenticationService, BEARER_VERIFIER } from '../authentication.js';
import { DatabaseService } from '../database.service.js';
import { DomainApiService } from '../domain-api.service.js';
import { DomainController } from '../domain.controller.js';
import { HealthController } from '../health.controller.js';
import { OpenApiController } from '../openapi.controller.js';
import { OpenApiDocumentStore } from '../openapi.js';
import { PROVIDER_CONTROL_PROOF_VERIFIER } from '../provider-control-proof.js';
import { V1Controller } from '../v1.controller.js';
import { SessionController } from '../session.controller.js';
import { DevTokenController } from './dev-token.controller.js';
import { LocalDevTokenService } from './dev-token.service.js';
import { ProviderProofController } from './provider-proof.controller.js';
import { LocalProviderProofService } from './provider-proof.service.js';

@Module({
  controllers: [
    HealthController,
    OpenApiController,
    V1Controller,
    SessionController,
    DomainController,
    DevTokenController,
    ProviderProofController,
  ],
  providers: [
    AuthenticationService,
    DatabaseService,
    DomainApiService,
    OpenApiDocumentStore,
    LocalDevTokenService,
    LocalProviderProofService,
    { provide: BEARER_VERIFIER, useExisting: LocalDevTokenService },
    { provide: PROVIDER_CONTROL_PROOF_VERIFIER, useExisting: LocalProviderProofService },
  ],
})
export class LocalAppModule {}
