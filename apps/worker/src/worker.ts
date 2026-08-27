export function workerIdentity(environment = process.env.APP_ENV ?? 'local') {
  return `local-missions-worker:${environment}`;
}

export type LocalNotificationEnvelope = {
  attemptNumber: number;
  channel: 'push' | 'email';
  eventPublicId: string;
  templateKey: string;
};

export type LocalNotificationOutcome = {
  externalDeliveryAttempted: false;
  receiptId: string;
  status: 'no_send';
};

export class LocalNoSendNotificationAdapter {
  constructor(private readonly environment: string) {
    if (!['local', 'test'].includes(environment)) {
      throw new Error('The no-send notification adapter is forbidden outside local and test.');
    }
  }

  deliver(envelope: LocalNotificationEnvelope): LocalNotificationOutcome {
    if (
      !Number.isInteger(envelope.attemptNumber) ||
      envelope.attemptNumber < 1 ||
      !/^nte_[a-z0-9_-]+$/.test(envelope.eventPublicId) ||
      !/^notification[.][a-z0-9_]+[.]v[1-9][0-9]*$/.test(envelope.templateKey)
    ) {
      throw new Error('Local notification envelope is invalid.');
    }
    return {
      externalDeliveryAttempted: false,
      receiptId: `${this.environment}-no-send:${envelope.eventPublicId}:${envelope.attemptNumber}:${envelope.channel}`,
      status: 'no_send',
    };
  }
}
