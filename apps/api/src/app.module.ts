import { Module } from '@nestjs/common';

import {
  AuthenticationService,
  BEARER_VERIFIER,
  UnavailableBearerVerifier,
} from './authentication.js';
import { DatabaseService } from './database.service.js';
import { DomainApiService } from './domain-api.service.js';
import { DomainController } from './domain.controller.js';
import {
  createRemoteEntraKeyResolver,
  EntraAccessTokenVerifier,
  readEntraVerifierConfiguration,
} from './entra-token-verifier.js';
import { HealthController } from './health.controller.js';
import { OpenApiController } from './openapi.controller.js';
import { OpenApiDocumentStore } from './openapi.js';
import {
  PROVIDER_CONTROL_PROOF_VERIFIER,
  UnavailableProviderControlProofVerifier,
} from './provider-control-proof.js';
import { V1Controller } from './v1.controller.js';

@Module({
  controllers: [HealthController, OpenApiController, V1Controller, DomainController],
  providers: [
    AuthenticationService,
    DatabaseService,
    DomainApiService,
    OpenApiDocumentStore,
    UnavailableProviderControlProofVerifier,
    UnavailableBearerVerifier,
    {
      provide: BEARER_VERIFIER,
      useFactory: () => {
        const resolved = readEntraVerifierConfiguration(process.env);
        if (!resolved.available) return new UnavailableBearerVerifier();
        return new EntraAccessTokenVerifier(
          resolved.configuration,
          createRemoteEntraKeyResolver(resolved.configuration),
        );
      },
    },
    {
      provide: PROVIDER_CONTROL_PROOF_VERIFIER,
      useExisting: UnavailableProviderControlProofVerifier,
    },
  ],
})
export class AppModule {}
