import { describe, expect, it, vi } from 'vitest';

import { revokeSessionAndClearLocalState } from './account-actions';

describe('account session logout coordinator', () => {
  it('clears sensitive local account state after server revocation', async () => {
    const clearSensitiveAccountState = vi.fn().mockResolvedValue(undefined);
    const revokeSession = vi
      .fn()
      .mockResolvedValue({ sessionPublicId: 'ses_synthetic_creator_001', status: 'revoked' });

    await expect(
      revokeSessionAndClearLocalState({
        adapter: { revokeSession } as never,
        cache: { clearSensitiveAccountState },
        sessionPublicId: 'ses_synthetic_creator_001',
      }),
    ).resolves.toMatchObject({ status: 'revoked' });
    expect(revokeSession).toHaveBeenCalledOnce();
    expect(clearSensitiveAccountState).toHaveBeenCalledOnce();
  });

  it('still clears local state when remote revocation cannot be confirmed', async () => {
    const clearSensitiveAccountState = vi.fn().mockResolvedValue(undefined);
    const revokeSession = vi.fn().mockRejectedValue(new Error('network unavailable'));

    await expect(
      revokeSessionAndClearLocalState({
        adapter: { revokeSession } as never,
        cache: { clearSensitiveAccountState },
        sessionPublicId: 'ses_synthetic_creator_001',
      }),
    ).rejects.toThrow(/network unavailable/);
    expect(clearSensitiveAccountState).toHaveBeenCalledOnce();
  });
});
