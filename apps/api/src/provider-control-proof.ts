import { Injectable } from '@nestjs/common';
import type { IdentityProvider } from '@local-missions/contracts';

import { dependencyUnavailable } from './api-errors.js';

export type VerifiedProviderControlProof = {
  issuer: string;
  provider: IdentityProvider;
  subject: string;
};

export interface ProviderControlProofVerifier {
  verify(proofToken: string, expectedUserPublicId: string): Promise<VerifiedProviderControlProof>;
}

export const PROVIDER_CONTROL_PROOF_VERIFIER = Symbol('ProviderControlProofVerifier');

@Injectable()
export class UnavailableProviderControlProofVerifier implements ProviderControlProofVerifier {
  async verify(
    _proofToken: string,
    _expectedUserPublicId: string,
  ): Promise<VerifiedProviderControlProof> {
    throw dependencyUnavailable();
  }
}
