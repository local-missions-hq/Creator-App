import { describe, expect, it, vi } from 'vitest';

import {
  authorizeMobileResource,
  authorizeMobileRoute,
  createLocalPreviewSession,
  grantRecentAuthentication,
  hasRecentAuthentication,
  persistedSessionFromRuntime,
  restoreMobileSession,
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
  workspacePublicId: 'biz_synthetic_restore_001',
};

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
