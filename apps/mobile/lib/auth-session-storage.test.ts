import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 7,
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  isAvailableAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

import {
  createNativeSecureSessionStorage,
  createWebPreviewSessionStorage,
  mobileSessionStorageKeyForTests,
} from './auth-session-storage';
import type { PersistedMobileSession } from './auth-session';

const session: PersistedMobileSession = {
  accountStatus: 'active',
  expiresAt: '2026-08-28T15:00:00.000Z',
  provider: 'apple',
  refreshCredential: 'synthetic-refresh-secret',
  roles: ['creator', 'business_owner'],
  selectedMode: 'creator',
  sessionPublicId: 'ses_synthetic_storage_001',
  userPublicId: 'usr_synthetic_storage_001',
  version: 1,
  workspaces: [
    {
      name: 'Synthetic Storage Business',
      publicId: 'biz_synthetic_storage_001',
      role: 'business_owner',
    },
  ],
};

describe('mobile session storage boundaries', () => {
  it('keeps web/local preview memoryless with no token or metadata persistence', async () => {
    const storage = createWebPreviewSessionStorage();
    await storage.save(session);

    expect(storage.kind).toBe('web-preview-memoryless');
    await expect(storage.load()).resolves.toBeNull();
    await expect(storage.clear()).resolves.toBeUndefined();
  });

  it('stores native refresh material only through device-bound SecureStore options', async () => {
    let raw: string | null = null;
    const boundary = {
      deleteItemAsync: vi.fn(async () => {
        raw = null;
      }),
      getItemAsync: vi.fn(async () => raw),
      isAvailableAsync: vi.fn(async () => true),
      setItemAsync: vi.fn(async (_key: string, value: string) => {
        raw = value;
      }),
    };
    const storage = createNativeSecureSessionStorage(boundary);

    await storage.save(session);
    await expect(storage.load()).resolves.toEqual(session);
    expect(boundary.setItemAsync).toHaveBeenCalledWith(
      mobileSessionStorageKeyForTests,
      expect.any(String),
      expect.objectContaining({
        keychainAccessible: 7,
        keychainService: 'com.stratios.localmissions.session',
      }),
    );
    expect(JSON.parse(raw ?? '{}')).not.toHaveProperty('accessToken');
  });

  it('deletes malformed protected state instead of partially restoring it', async () => {
    const boundary = {
      deleteItemAsync: vi.fn(async () => undefined),
      getItemAsync: vi.fn(async () => '{"version":1,"roles":["creator"]}'),
      isAvailableAsync: vi.fn(async () => true),
      setItemAsync: vi.fn(async () => undefined),
    };
    const storage = createNativeSecureSessionStorage(boundary);

    await expect(storage.load()).resolves.toBeNull();
    expect(boundary.deleteItemAsync).toHaveBeenCalledOnce();
  });

  it('deletes injected roles, contradictory workspace roles, and malformed refresh material', async () => {
    for (const injected of [
      { ...session, roles: ['creator', 'platform_administrator'] },
      { ...session, roles: ['creator'], workspaceRole: 'business_owner' },
      { ...session, refreshCredential: 'contains spaces and private data' },
    ]) {
      const boundary = {
        deleteItemAsync: vi.fn(async () => undefined),
        getItemAsync: vi.fn(async () => JSON.stringify(injected)),
        isAvailableAsync: vi.fn(async () => true),
        setItemAsync: vi.fn(async () => undefined),
      };
      const storage = createNativeSecureSessionStorage(boundary);
      await expect(storage.load()).resolves.toBeNull();
      expect(boundary.deleteItemAsync).toHaveBeenCalledOnce();
    }
  });
});
