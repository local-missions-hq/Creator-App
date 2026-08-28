import { describe, expect, it, vi } from 'vitest';

import {
  MobileAuthOrchestrator,
  restoreAndRefreshMobileSession,
  type MobileAuthOrchestrationDependencies,
  type MobileSignInState,
} from './auth-orchestration';
import type { MobileRole, PersistedMobileSession } from './auth-session';
import type { OidcTransaction } from './oidc-client';

const configuration = {
  authorizationEndpoint:
    'https://login.synthetic.invalid/00000000-0000-4000-8000-000000000000/oauth2/v2.0/authorize',
  clientId: '00000000-0000-4000-8000-000000000001',
  issuer: 'https://login.synthetic.invalid/00000000-0000-4000-8000-000000000000/v2.0',
  jwksUri:
    'https://login.synthetic.invalid/00000000-0000-4000-8000-000000000000/discovery/v2.0/keys',
  redirectUri: 'localmissions://auth/callback',
  scopes: [
    'openid',
    'profile',
    'offline_access',
    'api://00000000-0000-4000-8000-000000000002/access_as_user',
  ],
  tokenEndpoint:
    'https://login.synthetic.invalid/00000000-0000-4000-8000-000000000000/oauth2/v2.0/token',
};

function dependencies(
  overrides: Partial<MobileAuthOrchestrationDependencies> = {},
): MobileAuthOrchestrationDependencies {
  let pendingTransaction: OidcTransaction | null = null;
  const sessionStorage = {
    kind: 'native-secure-store' as const,
    clear: vi.fn(),
    load: vi.fn(),
    save: vi.fn(),
  };
  return {
    bootstrap: {
      bootstrap: vi.fn(async ({ sessionPublicId }) => ({
        accountStatus: 'active' as const,
        expiresAt: '2099-01-01T00:00:00.000Z',
        provider: 'google' as const,
        roles: ['creator', 'business_owner', 'business_manager'] as MobileRole[],
        sessionPublicId,
        userPublicId: 'usr_synthetic_orchestration_001',
        workspaces: [
          {
            name: 'Demo Family Fun Center',
            publicId: 'biz_synthetic_orlando_001',
            role: 'business_owner' as const,
          },
          {
            name: 'Lake Eola Cafe',
            publicId: 'biz_synthetic_lake_eola_001',
            role: 'business_manager' as const,
          },
        ],
      })),
      refresh: vi.fn(),
    },
    browser: {
      open: vi.fn(async (input) => {
        const state = new URL(input.authorizationUrl).searchParams.get('state');
        return {
          callbackUrl: `${configuration.redirectUri}?code=${'c'.repeat(32)}&state=${state}`,
          status: 'success' as const,
        };
      }),
    },
    configuration: { available: true, value: configuration },
    crypto: {
      randomBytes: async (length) => new Uint8Array(length).fill(7),
      sha256: async () => new Uint8Array(32).fill(8),
    },
    idTokenVerifier: { verify: vi.fn() },
    sessionStorage,
    sessionIdRandomBytes: async (length) => new Uint8Array(length).fill(9),
    tokenEndpoint: {
      exchangeCode: vi.fn().mockResolvedValue({
        accessToken: 'access-token-synthetic-orchestration-000001',
        expiresInSeconds: 3600,
        idToken: 'id-token-synthetic-orchestration-000000001',
        refreshCredential: 'refresh-synthetic-orchestration-000000001',
        tokenType: 'Bearer',
      }),
      refresh: vi.fn(),
    },
    transactionStore: {
      clear: vi.fn(async () => {
        pendingTransaction = null;
      }),
      consume: vi.fn(async (state) => {
        if (!pendingTransaction || pendingTransaction.state !== state) return null;
        const transaction = pendingTransaction;
        pendingTransaction = null;
        return transaction;
      }),
      save: vi.fn(async (transaction) => {
        pendingTransaction = { ...transaction };
      }),
    },
    ...overrides,
  };
}

describe('mobile authentication orchestration', () => {
  it('connects browser return, code exchange, server bootstrap, and workspace choice', async () => {
    const states: MobileSignInState[] = [];
    const runtime = dependencies();
    const result = await new MobileAuthOrchestrator(runtime).signIn({
      onState: (state) => states.push(state),
      preferredMode: 'business',
      provider: 'google',
    });

    expect(result).toMatchObject({
      session: {
        selectedMode: 'business',
        workspaces: [{}, {}],
      },
      status: 'workspace_required',
    });
    if (!('session' in result)) throw new Error('Expected a completed session.');
    expect(result.session).not.toHaveProperty('workspacePublicId');
    expect(states.map((state) => state.phase)).toEqual([
      'preparing',
      'opening_browser',
      'exchanging',
      'workspace_required',
    ]);
    expect(runtime.tokenEndpoint.exchangeCode).toHaveBeenCalledOnce();
    expect(runtime.bootstrap.bootstrap).toHaveBeenCalledOnce();
    expect(runtime.sessionStorage.save).toHaveBeenCalledOnce();
  });

  it('ignores a duplicate tap while one system-browser attempt is active', async () => {
    let release: ((value: { status: 'cancelled' }) => void) | undefined;
    const runtime = dependencies({
      browser: {
        open: vi.fn(
          () =>
            new Promise<{ status: 'cancelled' }>((resolve) => {
              release = resolve;
            }),
        ),
      },
    });
    const orchestrator = new MobileAuthOrchestrator(runtime);
    const first = orchestrator.signIn({
      onState: vi.fn(),
      preferredMode: 'creator',
      provider: 'apple',
    });
    await Promise.resolve();
    await expect(
      orchestrator.signIn({
        onState: vi.fn(),
        preferredMode: 'creator',
        provider: 'apple',
      }),
    ).resolves.toEqual({ status: 'ignored' });
    release?.({ status: 'cancelled' });
    await expect(first).resolves.toEqual({ status: 'cancelled' });
    expect(runtime.browser.open).toHaveBeenCalledOnce();
  });

  it('fails closed before crypto or browser work when configuration is unavailable', async () => {
    const runtime = dependencies({ configuration: { available: false } });
    const states: MobileSignInState[] = [];
    await expect(
      new MobileAuthOrchestrator(runtime).signIn({
        onState: (state) => states.push(state),
        preferredMode: 'creator',
        provider: 'microsoft',
      }),
    ).resolves.toEqual({ status: 'error' });
    expect(states).toEqual([
      { code: 'configuration_unavailable', phase: 'error', provider: 'microsoft' },
    ]);
    expect(runtime.browser.open).not.toHaveBeenCalled();
    expect(runtime.tokenEndpoint.exchangeCode).not.toHaveBeenCalled();
  });

  it.each([
    {
      browserStatus: 'cancelled' as const,
      expectedState: 'cancelled',
      expectedStatus: 'cancelled',
    },
    { browserStatus: 'failed' as const, expectedState: 'error', expectedStatus: 'error' },
  ])(
    'maps a $browserStatus system-browser result into an explicit retryable state',
    async ({ browserStatus, expectedState, expectedStatus }) => {
      const runtime = dependencies({
        browser: { open: vi.fn().mockResolvedValue({ status: browserStatus }) },
      });
      const states: MobileSignInState[] = [];
      await expect(
        new MobileAuthOrchestrator(runtime).signIn({
          onState: (state) => states.push(state),
          preferredMode: 'creator',
          provider: 'apple',
        }),
      ).resolves.toEqual({ status: expectedStatus });
      expect(states.at(-1)?.phase).toBe(expectedState);
      expect(runtime.transactionStore.clear).toHaveBeenCalledOnce();
      expect(runtime.tokenEndpoint.exchangeCode).not.toHaveBeenCalled();
    },
  );

  it('refreshes protected cold-start state or clears it on refresh failure', async () => {
    const persisted: PersistedMobileSession = {
      accountStatus: 'active',
      expiresAt: '2099-01-01T00:00:00.000Z',
      provider: 'google',
      refreshCredential: 'refresh-synthetic-orchestration-000000001',
      roles: ['creator'],
      selectedMode: 'creator',
      sessionPublicId: 'ses_synthetic_orchestration_001',
      userPublicId: 'usr_synthetic_orchestration_001',
      version: 1,
      workspaces: [],
    };
    const sessionStorage = {
      kind: 'native-secure-store' as const,
      clear: vi.fn(),
      load: vi.fn().mockResolvedValue(persisted),
      save: vi.fn(),
    };
    const bootstrap = {
      bootstrap: vi.fn(),
      refresh: vi.fn().mockResolvedValue({ ...persisted, provider: 'google' }),
    };
    const tokenEndpoint = {
      exchangeCode: vi.fn(),
      refresh: vi.fn().mockResolvedValue({
        accessToken: 'access-token-synthetic-orchestration-000002',
        expiresInSeconds: 3600,
        tokenType: 'Bearer',
      }),
    };
    await expect(
      restoreAndRefreshMobileSession({
        bootstrap,
        clientId: configuration.clientId,
        sessionStorage,
        tokenEndpoint,
      }),
    ).resolves.toMatchObject({
      phase: 'authenticated',
      session: { accessToken: 'access-token-synthetic-orchestration-000002' },
    });

    tokenEndpoint.refresh.mockRejectedValueOnce(new Error('synthetic failure'));
    await expect(
      restoreAndRefreshMobileSession({
        bootstrap,
        clientId: configuration.clientId,
        sessionStorage,
        tokenEndpoint,
      }),
    ).resolves.toEqual({ phase: 'expired' });
    expect(sessionStorage.clear).toHaveBeenCalledOnce();
  });
});
