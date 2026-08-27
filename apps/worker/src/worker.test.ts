import { describe, expect, it } from 'vitest';

import { LocalNoSendNotificationAdapter, workerIdentity } from './worker.js';

describe('workerIdentity', () => {
  it('shows its local environment', () => {
    expect(workerIdentity('local')).toBe('local-missions-worker:local');
  });

  it('records a deterministic local no-send result without external delivery', () => {
    const adapter = new LocalNoSendNotificationAdapter('local');
    const template = ['notification', 'mission_accepted', 'v1'].join('.');
    expect(
      adapter.deliver({
        attemptNumber: 1,
        channel: 'push',
        eventPublicId: 'nte_accept_001',
        templateKey: template,
      }),
    ).toEqual({
      externalDeliveryAttempted: false,
      receiptId: 'local-no-send:nte_accept_001:1:push',
      status: 'no_send',
    });
  });

  it('cannot instantiate the no-send adapter for a deployed environment', () => {
    expect(() => new LocalNoSendNotificationAdapter('development')).toThrow(/forbidden/);
    expect(() => new LocalNoSendNotificationAdapter('production')).toThrow(/forbidden/);
  });
});
