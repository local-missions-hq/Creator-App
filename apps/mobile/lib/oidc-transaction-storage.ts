import * as SecureStore from 'expo-secure-store';

import type { OidcTransaction, OidcTransactionStore } from './oidc-client';

const oidcTransactionKey = 'local_missions.oidc_transaction.v1';
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  keychainService: 'com.stratios.localmissions.oidc',
};

type SecureStoreBoundary = Pick<
  typeof SecureStore,
  'deleteItemAsync' | 'getItemAsync' | 'isAvailableAsync' | 'setItemAsync'
>;

function isTransaction(value: unknown): value is OidcTransaction {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<OidcTransaction>;
  return (
    item.version === 1 &&
    typeof item.state === 'string' &&
    typeof item.nonce === 'string' &&
    typeof item.codeVerifier === 'string' &&
    typeof item.codeChallenge === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.expiresAt === 'string' &&
    item.redirectUri === 'localmissions://auth/callback' &&
    ['apple', 'google', 'microsoft', 'passwordless_email'].includes(item.providerIntent ?? '') &&
    ['identity_link', 'recent_auth', 'sign_in'].includes(item.purpose ?? '')
  );
}

abstract class SerializedOidcStore implements OidcTransactionStore {
  private queue: Promise<void> = Promise.resolve();

  abstract clear(): Promise<void>;
  abstract loadPending(): Promise<OidcTransaction | null>;
  abstract save(transaction: OidcTransaction): Promise<void>;

  async consume(state: string): Promise<OidcTransaction | null> {
    let release: () => void = () => {};
    const previous = this.queue;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const transaction = await this.loadPending();
      if (!transaction || transaction.state !== state) return null;
      await this.clear();
      return transaction;
    } finally {
      release();
    }
  }
}

export class MemoryOidcTransactionStore extends SerializedOidcStore {
  private pending: OidcTransaction | null = null;

  async clear() {
    this.pending = null;
  }

  async loadPending() {
    return this.pending;
  }

  async save(transaction: OidcTransaction) {
    this.pending = { ...transaction };
  }
}

export class SecureOidcTransactionStore extends SerializedOidcStore {
  constructor(private readonly boundary: SecureStoreBoundary = SecureStore) {
    super();
  }

  async clear() {
    await this.boundary.deleteItemAsync(oidcTransactionKey, options);
  }

  async loadPending() {
    if (!(await this.boundary.isAvailableAsync())) return null;
    const raw = await this.boundary.getItemAsync(oidcTransactionKey, options);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (isTransaction(value)) return value;
    } catch {
      // Invalid protected state is removed below.
    }
    await this.clear();
    return null;
  }

  async save(transaction: OidcTransaction) {
    if (!(await this.boundary.isAvailableAsync())) {
      throw new OidcBoundaryStorageError();
    }
    await this.boundary.setItemAsync(oidcTransactionKey, JSON.stringify(transaction), options);
  }
}

export class OidcBoundaryStorageError extends Error {
  constructor() {
    super('Protected sign-in storage is unavailable.');
  }
}

export const oidcTransactionStorageKeyForTests = oidcTransactionKey;
