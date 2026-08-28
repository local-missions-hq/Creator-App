import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { IdentityProvider, LocalProviderProofResponse } from '@local-missions/contracts';
import { z } from 'zod';

import { ApiProblem } from '../api-errors.js';
import type {
  ProviderControlProofVerifier,
  VerifiedProviderControlProof,
} from '../provider-control-proof.js';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

const syntheticUserPublicId = /^usr_[a-z0-9_]*synthetic[a-z0-9_]{3,80}$/;

@Injectable()
export class LocalProviderProofService implements ProviderControlProofVerifier {
  private readonly consumedProofs = new Set<string>();
  private readonly signingKey: Buffer;

  constructor() {
    if ((process.env.APP_ENV ?? 'local') !== 'local') {
      throw new Error('Local provider-control proof support is forbidden outside APP_ENV=local.');
    }
    this.signingKey = randomBytes(32);
  }

  issue(
    userPublicId: string,
    provider: IdentityProvider,
    now = Math.floor(Date.now() / 1_000),
  ): LocalProviderProofResponse {
    if (!syntheticUserPublicId.test(userPublicId)) throw this.proofProblem();
    const encodedHeader = encode({ alg: 'HS256', typ: 'LOCAL_PROVIDER_CONTROL' });
    const encodedPayload = encode({
      aud: 'local-missions-provider-link',
      exp: now + 300,
      iat: now,
      iss: 'local-missions-local-provider-proof',
      jti: randomUUID(),
      provider,
      providerSubject: `synthetic:${provider}:${userPublicId}:${randomUUID()}`,
      userPublicId,
    });
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', this.signingKey).update(unsigned).digest('base64url');
    return {
      expiresIn: 300,
      proofToken: `${unsigned}.${signature}`,
      provider,
      tokenType: 'LocalProviderControlProof',
    };
  }

  async verify(
    proofToken: string,
    expectedUserPublicId: string,
  ): Promise<VerifiedProviderControlProof> {
    const parts = proofToken.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) throw this.proofProblem();
    const unsigned = `${parts[0]}.${parts[1]}`;
    const expected = createHmac('sha256', this.signingKey).update(unsigned).digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(parts[2], 'base64url');
    } catch {
      throw this.proofProblem();
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw this.proofProblem();
    }

    try {
      z.object({ alg: z.literal('HS256'), typ: z.literal('LOCAL_PROVIDER_CONTROL') }).parse(
        JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')),
      );
      const payload = z
        .object({
          aud: z.literal('local-missions-provider-link'),
          exp: z.int().positive(),
          iat: z.int().positive(),
          iss: z.literal('local-missions-local-provider-proof'),
          jti: z.uuid(),
          provider: z.enum(['apple', 'google', 'microsoft', 'passwordless_email']),
          providerSubject: z.string().regex(/^synthetic:[a-z_]+:usr_[a-z0-9_]+:[a-f0-9-]{36}$/),
          userPublicId: z.string().regex(syntheticUserPublicId),
        })
        .parse(JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')));
      const now = Math.floor(Date.now() / 1_000);
      if (
        payload.exp <= now ||
        payload.iat > now + 30 ||
        payload.userPublicId !== expectedUserPublicId
      ) {
        throw this.proofProblem();
      }
      if (this.consumedProofs.has(payload.jti)) {
        throw new ApiProblem(
          'STATE_CONFLICT',
          'The provider-control proof has already been used.',
          409,
        );
      }
      this.consumedProofs.add(payload.jti);
      return {
        issuer: `https://identity.local.test/${payload.provider}`,
        provider: payload.provider,
        subject: payload.providerSubject,
      };
    } catch (error) {
      if (error instanceof ApiProblem) throw error;
      throw this.proofProblem();
    }
  }

  private proofProblem(): ApiProblem {
    return new ApiProblem('ACCESS_DENIED', 'Verified provider control is required.', 403);
  }
}
