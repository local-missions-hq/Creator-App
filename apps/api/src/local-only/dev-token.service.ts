import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { LocalDevTokenRequest, LocalDevTokenResponse } from '@local-missions/contracts';
import { z } from 'zod';

import { ApiProblem } from '../api-errors.js';
import type { BearerVerifier, VerifiedBearerIdentity } from '../authentication.js';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

@Injectable()
export class LocalDevTokenService implements BearerVerifier {
  private readonly signingKey: Buffer;

  constructor() {
    if ((process.env.APP_ENV ?? 'local') !== 'local') {
      throw new Error('Local dev-token support is forbidden outside APP_ENV=local.');
    }
    this.signingKey = randomBytes(32);
  }

  issue(input: LocalDevTokenRequest, now = Math.floor(Date.now() / 1_000)): LocalDevTokenResponse {
    const encodedHeader = encode({ alg: 'HS256', typ: 'LOCAL_DEV' });
    const encodedPayload = encode({
      aud: 'local-missions-api',
      exp: now + 900,
      iat: now,
      iss: 'local-missions-local-dev',
      jti: randomUUID(),
      role: input.role,
      sub: input.subjectPublicId,
      ...(input.tenantPublicId ? { tenant: input.tenantPublicId } : {}),
    });
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    const signature = createHmac('sha256', this.signingKey).update(unsigned).digest('base64url');
    return {
      accessToken: `${unsigned}.${signature}`,
      expiresIn: 900,
      tokenType: 'Bearer',
    };
  }

  async verify(token: string): Promise<VerifiedBearerIdentity> {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw this.authenticationProblem();
    }
    const unsigned = `${parts[0]}.${parts[1]}`;
    const expected = createHmac('sha256', this.signingKey).update(unsigned).digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(parts[2], 'base64url');
    } catch {
      throw this.authenticationProblem();
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw this.authenticationProblem();
    }

    try {
      const header = z
        .object({ alg: z.literal('HS256'), typ: z.literal('LOCAL_DEV') })
        .parse(JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')));
      void header;
      const payload = z
        .object({
          aud: z.literal('local-missions-api'),
          exp: z.int().positive(),
          iat: z.int().positive(),
          iss: z.literal('local-missions-local-dev'),
          role: z.enum(['creator', 'business_owner', 'business_manager']),
          sub: z.string().min(1).max(120),
          tenant: z.string().min(1).max(120).optional(),
        })
        .parse(JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')));
      const now = Math.floor(Date.now() / 1_000);
      if (payload.exp <= now || payload.iat > now + 30) throw this.authenticationProblem();
      if (payload.role === 'creator' && payload.tenant) throw this.authenticationProblem();
      if (payload.role !== 'creator' && !payload.tenant) throw this.authenticationProblem();
      return {
        role: payload.role,
        subjectPublicId: payload.sub,
        ...(payload.tenant ? { tenantPublicId: payload.tenant } : {}),
      };
    } catch (error) {
      if (error instanceof ApiProblem) throw error;
      throw this.authenticationProblem();
    }
  }

  private authenticationProblem(): ApiProblem {
    return new ApiProblem('AUTHENTICATION_REQUIRED', 'Authentication is required.', 401);
  }
}
