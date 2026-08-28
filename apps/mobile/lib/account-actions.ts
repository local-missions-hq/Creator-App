import type { createMobileAccountDataAdapter } from './account-data';

export type AccountSensitiveCache = {
  clearSensitiveAccountState(): Promise<void>;
};

export async function revokeSessionAndClearLocalState(input: {
  adapter: ReturnType<typeof createMobileAccountDataAdapter>;
  cache: AccountSensitiveCache;
  sessionPublicId: string;
}) {
  try {
    return await input.adapter.revokeSession(input.sessionPublicId);
  } finally {
    await input.cache.clearSensitiveAccountState();
  }
}
