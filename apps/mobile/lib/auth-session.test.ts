import { describe, expect, it, vi } from 'vitest';

import {
  apiAuthorizationContextForSession,
  authenticatedMobileApiHeaders,
  authorizeMobileResource,
  authorizeMobileRoute,
  createLocalPreviewSession,
  grantRecentAuthentication,
  hasRecentAuthentication,
  persistedSessionFromRuntime,
  restoreMobileSession,
  selectBusinessWorkspace,
  selectMobileMode,
  type MobileAuthState,
  type MobileSessionStorage,
  type PersistedMobileSession,
} from './auth-session';

const futureSession: PersistedMobileSession = {
  accountStatus: 'active',
  expiresAt: '2026-08-28T15:00:00.000Z',
  provider: 'apple',
  refreshCredential: 'synthetic-refresh-secret',
  roles: ['creator', 'business_owner'],
  selectedMode: 'creator',
  sessionPublicId: 'ses_synthetic_restore_001',
  userPublicId: 'usr_synthetic_restore_001',
  version: 1,
  workspaces: [
    {
      name: 'Synthetic Restore Business',
      publicId: 'biz_synthetic_restore_001',
      role: 'business_owner',
    },
  ],
  workspacePublicId: 'biz_synthetic_restore_001',
  workspaceRole: 'business_owner',
};
const syntheticHeaderSessionPublicId = ['ses', 'synthetic', 'headers', '001'].join('_');

function storageWith(value: PersistedMobileSession | null): MobileSessionStorage {
  return {
    kind: 'native-secure-store',
    clear: vi.fn(),
    load: vi.fn().mockResolvedValue(value),
    save: vi.fn(),
  };
}

describe('mobile auth session lifecycle', () => {
  it('restores a valid protected cold-start session and normalizes a stale selected mode', async () => {
    const storage = storageWith({ ...futureSession, roles: ['creator'], selectedMode: 'business' });
    const restored = await restoreMobileSession(storage, new Date('2026-08-28T14:00:00.000Z'));

    expect(restored).toMatchObject({
      phase: 'authenticated',
      session: { selectedMode: 'creator', source: 'api' },
    });
    expect(storage.clear).not.toHaveBeenCalled();
  });

  it('clears expired protected state before exposing private routes', async () => {
    const storage = storageWith({ ...futureSession, expiresAt: '2026-08-28T13:59:59.000Z' });

    await expect(
      restoreMobileSession(storage, new Date('2026-08-28T14:00:00.000Z')),
    ).resolves.toEqual({ phase: 'expired' });
    expect(storage.clear).toHaveBeenCalledOnce();
  });

  it('fails closed and attempts cleanup when protected cold-start storage cannot be read', async () => {
    const storage = storageWith(null);
    vi.mocked(storage.load).mockRejectedValue(new Error('keychain unavailable'));

    await expect(restoreMobileSession(storage)).resolves.toEqual({
      phase: 'anonymous',
      reason: 'missing',
    });
    expect(storage.clear).toHaveBeenCalledOnce();
  });

  it.each(['disabled', 'deletion_requested'] as const)(
    'clears and blocks a %s account during cold start',
    async (accountStatus) => {
      const storage = storageWith({ ...futureSession, accountStatus });

      await expect(restoreMobileSession(storage)).resolves.toEqual({
        phase: 'blocked',
        reason: accountStatus,
      });
      expect(storage.clear).toHaveBeenCalledOnce();
    },
  );

  it('authorizes public routes but enforces the complete Creator, Business, and Venue role matrix', () => {
    const creatorState: MobileAuthState = {
      phase: 'authenticated',
      session: { ...createLocalPreviewSession(), roles: ['creator'] },
    };
    expect(authorizeMobileRoute({ phase: 'anonymous' }, '/')).toEqual({ allowed: true });
    expect(authorizeMobileRoute({ phase: 'anonymous' }, '/creator/discover')).toMatchObject({
      allowed: false,
      reason: 'anonymous',
    });
    expect(authorizeMobileRoute(creatorState, '/creator/discover')).toMatchObject({
      allowed: true,
      requiredMode: 'creator',
    });
    expect(authorizeMobileRoute(creatorState, '/business/dashboard')).toMatchObject({
      allowed: false,
      reason: 'missing-role',
    });
    expect(authorizeMobileRoute(creatorState, '/venue/check-in')).toMatchObject({
      allowed: false,
      reason: 'missing-role',
    });
    expect(authorizeMobileResource(creatorState, 'creator_missions')).toBe(true);
    expect(authorizeMobileResource(creatorState, 'account')).toBe(true);
    expect(authorizeMobileResource(creatorState, 'business_campaigns')).toBe(false);
    expect(authorizeMobileResource(creatorState, 'venue_check_in')).toBe(false);
  });

  it('switches only among server-resolved modes and keeps the access token out of persisted output', () => {
    const state: MobileAuthState = {
      phase: 'authenticated',
      session: { ...createLocalPreviewSession(), accessToken: 'memory-only-access-token' },
    };
    const switched = selectMobileMode(state, 'business');
    expect(switched).toMatchObject({
      phase: 'authenticated',
      session: { selectedMode: 'business' },
    });
    if (switched.phase !== 'authenticated') throw new Error('Expected authenticated state.');
    expect(persistedSessionFromRuntime(switched.session)).not.toHaveProperty('accessToken');
    expect(() =>
      selectMobileMode(
        {
          phase: 'authenticated',
          session: { ...createLocalPreviewSession(), roles: ['creator'] },
        },
        'business',
      ),
    ).toThrow(/does not have that mode/);
  });

  it('derives API role and workspace context only from the selected authenticated mode', () => {
    expect(apiAuthorizationContextForSession(createLocalPreviewSession('creator'))).toEqual({
      role: 'creator',
    });
    expect(apiAuthorizationContextForSession(createLocalPreviewSession('business'))).toEqual({
      businessPublicId: 'biz_synthetic_orlando_001',
      role: 'business_owner',
    });
    expect(
      apiAuthorizationContextForSession({
        ...createLocalPreviewSession('business'),
        roles: ['creator', 'business_manager'],
        workspaces: [
          {
            name: 'Synthetic Orlando Business',
            publicId: 'biz_synthetic_orlando_001',
            role: 'business_manager',
          },
        ],
        workspaceRole: 'business_manager',
      }),
    ).toEqual({
      businessPublicId: 'biz_synthetic_orlando_001',
      role: 'business_manager',
    });
    expect(() =>
      apiAuthorizationContextForSession({
        ...createLocalPreviewSession('business'),
        workspacePublicId: undefined,
      }),
    ).toThrow(/selected business workspace/);
    expect(() =>
      apiAuthorizationContextForSession({
        ...createLocalPreviewSession('business'),
        roles: ['business_owner', 'business_manager'],
        workspaceRole: undefined,
      }),
    ).toThrow(/selected workspace role/);
    expect(() =>
      apiAuthorizationContextForSession({
        ...createLocalPreviewSession(),
        selectedMode: 'venue_staff',
      }),
    ).toThrow(/not available/);
  });

  it('requires and applies an explicit server-resolved Business workspace choice', () => {
    const preview = createLocalPreviewSession('business');
    const unselected: MobileAuthState = {
      phase: 'authenticated',
      session: { ...preview, workspacePublicId: undefined, workspaceRole: undefined },
    };
    expect(() =>
      apiAuthorizationContextForSession(
        unselected.phase === 'authenticated' ? unselected.session : preview,
      ),
    ).toThrow(/selected business workspace/);

    const selected = selectBusinessWorkspace(unselected, 'biz_synthetic_lake_eola_001');
    expect(selected).toMatchObject({
      phase: 'authenticated',
      session: {
        selectedMode: 'business',
        workspacePublicId: 'biz_synthetic_lake_eola_001',
        workspaceRole: 'business_manager',
      },
    });
    expect(() => selectBusinessWorkspace(unselected, 'biz_invented_workspace_001')).toThrow(
      /does not have that Business workspace/,
    );
  });

  it('builds explicit API headers and rejects contradictory role context', () => {
    expect(
      authenticatedMobileApiHeaders('test-token-not-a-secret', syntheticHeaderSessionPublicId, {
        businessPublicId: 'biz_synthetic_orlando_001',
        role: 'business_owner',
      }),
    ).toEqual({
      Authorization: 'Bearer test-token-not-a-secret',
      'x-local-missions-business': 'biz_synthetic_orlando_001',
      'x-local-missions-role': 'business_owner',
      'x-local-missions-session': syntheticHeaderSessionPublicId,
    });
    expect(() =>
      authenticatedMobileApiHeaders('test-token-not-a-secret', syntheticHeaderSessionPublicId, {
        businessPublicId: 'biz_synthetic_orlando_001',
        role: 'creator',
      }),
    ).toThrow(/cannot include/);
    expect(() =>
      authenticatedMobileApiHeaders('test-token-not-a-secret', syntheticHeaderSessionPublicId, {
        role: 'business_manager',
      }),
    ).toThrow(/requires a selected business workspace/);
  });

  it('keeps recent-auth proof purpose-specific, five-minute, and memory-only', () => {
    const now = new Date('2026-08-28T14:00:00.000Z');
    const state = grantRecentAuthentication(
      { phase: 'authenticated', session: createLocalPreviewSession() },
      'identity_link',
      now,
    );
    expect(hasRecentAuthentication(state, 'identity_link', new Date(now.getTime() + 299_000))).toBe(
      true,
    );
    expect(hasRecentAuthentication(state, 'identity_unlink', now)).toBe(false);
    expect(hasRecentAuthentication(state, 'identity_link', new Date(now.getTime() + 300_000))).toBe(
      false,
    );
    if (state.phase !== 'authenticated') throw new Error('Expected authenticated state.');
    expect(persistedSessionFromRuntime(state.session)).not.toHaveProperty('recentAuth');
  });
});
