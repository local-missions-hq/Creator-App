import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 7,
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  isAvailableAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

import type { OidcTransaction } from './oidc-client';
import {
  oidcTransactionStorageKeyForTests,
  SecureOidcTransactionStore,
} from './oidc-transaction-storage';

const transaction: OidcTransaction = {
  codeChallenge: 'c'.repeat(43),
  codeVerifier: 'v'.repeat(43),
  createdAt: '2026-08-28T14:00:00.000Z',
  expiresAt: '2026-08-28T14:10:00.000Z',
  nonce: 'n'.repeat(43),
  providerIntent: 'apple',
  purpose: 'sign_in',
  redirectUri: 'localmissions://auth/callback',
  state: 's'.repeat(43),
  version: 1,
};

describe('native OIDC transaction storage', () => {
  it('protects the verifier and consumes it exactly once with device-bound options', async () => {
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
    const store = new SecureOidcTransactionStore(boundary);
    await store.save(transaction);
    expect(boundary.setItemAsync).toHaveBeenCalledWith(
      oidcTransactionStorageKeyForTests,
      expect.any(String),
      expect.objectContaining({
        keychainAccessible: 7,
        keychainService: 'com.stratios.localmissions.oidc',
      }),
    );
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ codeVerifier: 'v'.repeat(43) });
    await expect(store.consume(transaction.state)).resolves.toEqual(transaction);
    await expect(store.consume(transaction.state)).resolves.toBeNull();
  });

  it('deletes malformed protected transactions and refuses unavailable storage', async () => {
    const boundary = {
      deleteItemAsync: vi.fn(async () => undefined),
      getItemAsync: vi.fn(async () => '{"version":1,"state":"private"}'),
      isAvailableAsync: vi.fn(async () => true),
      setItemAsync: vi.fn(async () => undefined),
    };
    const store = new SecureOidcTransactionStore(boundary);
    await expect(store.consume('private')).resolves.toBeNull();
    expect(boundary.deleteItemAsync).toHaveBeenCalledOnce();
    boundary.isAvailableAsync.mockResolvedValue(false);
    await expect(store.save(transaction)).rejects.toThrow(/Protected sign-in storage/);
  });
});
