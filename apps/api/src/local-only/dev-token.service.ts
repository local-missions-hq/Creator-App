import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { LocalDevTokenRequest, LocalDevTokenResponse } from '@local-missions/contracts';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

@Injectable()
export class LocalDevTokenService {
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
}
