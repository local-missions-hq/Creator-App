import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedRole } from '@local-missions/contracts';

import { ApiProblem, dependencyUnavailable } from './api-errors.js';

export type VerifiedBearerIdentity = {
  role: AuthenticatedRole;
  subjectPublicId: string;
  tenantPublicId?: string;
};

export interface BearerVerifier {
  verify(token: string): Promise<VerifiedBearerIdentity>;
}

export const BEARER_VERIFIER = Symbol('BearerVerifier');

@Injectable()
export class UnavailableBearerVerifier implements BearerVerifier {
  async verify(_token: string): Promise<VerifiedBearerIdentity> {
    throw dependencyUnavailable();
  }
}

@Injectable()
export class AuthenticationService {
  constructor(@Inject(BEARER_VERIFIER) private readonly verifier: BearerVerifier) {}

  async verifyAuthorizationHeader(value: string | string[] | undefined) {
    const header = Array.isArray(value) ? value[0] : value;
    const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header ?? '');
    if (!match?.[1]) {
      throw new ApiProblem('AUTHENTICATION_REQUIRED', 'Authentication is required.', 401);
    }
    return this.verifier.verify(match[1]);
  }
}
