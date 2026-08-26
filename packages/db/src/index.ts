import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const auditActorType = pgEnum('audit_actor_type', ['user', 'service', 'provider']);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id'),
    actorType: auditActorType('actor_type').notNull(),
    action: text('action').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('audit_events_subject_idx').on(table.subjectType, table.subjectId)],
);

export const initialSchemaTables = ['audit_events'] as const;
