# Transactional notification outbox and local no-send state machine

Status: passed as checkpoint `M03-notification-outbox-010`  
Date: 2026-08-27

## Scope proved

This checkpoint adds the local transactional foundation for mission-action, reminder, money, dispute, and security notifications. The fixed event catalog covers mission acceptance, mission/check-in reminders, submission due, revision requested, mission approval, payout availability, dispute updates, and security alerts. Promotional and follower-based events are absent.

Mission acceptance now creates its versioned domain event inside the exact PostgreSQL transaction that accepts the application, converts the reservation, accepts the slot, records application history, and appends audit evidence. An event trigger creates one pending outbox message, one immutable initial outbox-history row, and one durable in-app notification before commit. If notification creation fails, the mission acceptance rolls back completely.

The worker claims due outbox rows with `FOR UPDATE SKIP LOCKED`, a bounded lease, a random lock token, and an incremented attempt/version. Retryable failures retain only a bounded error code and schedule exponential backoff. Non-retryable or exhausted work enters a visible dead-letter state. Only an active platform administrator can replay it with a reason and audit event.

## Privacy and delivery boundary

- Notification events retain a template key, authorized aggregate reference, generic protected deep-link route, recipient, tenant scope, deduplication key, and correlation ID.
- Notification tables contain no phone number, email address, device token, provider payload/response body, private mission copy, media URL, location, reward, or customer data.
- Locked-screen copy is not persisted in this slice. A future provider adapter must render the generic versioned template rather than receive free-form mission content.
- In-app notifications are always created durably for important actions and are readable only by the exact recipient.
- Push and email preferences are explicit and versioned. Required security notifications cannot be disabled; ordinary mission channels can be opted out.
- The local/test adapter records only `no_send` or `suppressed`. It reports `externalDeliveryAttempted: false` and cannot be instantiated for development, staging, or production.
- No Azure Service Bus namespace, Expo token, email provider, SMS provider, external message, phone, or real customer record was created.

## Database protections

- Seven new tables separate user preferences and immutable preference history, minimized domain events, outbox messages and immutable status history, durable in-app notifications, and immutable delivery attempts.
- Database triggers independently validate event type/category/template, exact recipient, audience, tenant, aggregate, and protected deep-link route.
- Event, delivery-attempt, preference-history, and outbox-history rows reject mutation or deletion. Preference identity is immutable and versions advance exactly once.
- Outbox transitions are limited to pending claim, expired-lease reclaim, retry, completion, dead letter, and audited replay. Counters, leases, timestamps, and replay budgets are database checked.
- A deferred constraint requires every current outbox version/status to have exactly one matching immutable history row.
- In-app identity is immutable; read/archive acknowledgment can move only forward and hard deletion is rejected.

## Real PostgreSQL proof

Seven integration tests passed against PostgreSQL 17:

1. Forward migration preserved prior data, installed all seven minimized tables, excluded sensitive delivery/contact fields, and rejected event/inbox mutation.
2. Mission acceptance, event, outbox, in-app notice, initial history, and two audits shared one PostgreSQL transaction ID; a forced event conflict rolled the whole acceptance back.
3. Concurrent duplicate enqueue returned one event, outbox, and visible notice; wrong-Creator and cross-role attempts failed; Creator and Business inboxes remained isolated.
4. A Creator push opt-out produced `suppressed`, while the enabled email channel produced only local `no_send`; two workers produced one claim winner.
5. A retryable failure scheduled the first exponential delay, retained only its safe error code, and invalidated the old worker lease.
6. A non-retryable failure entered dead letter; an outsider could not replay it; an active administrator replayed it with immutable history and audit evidence.
7. Durable inbox reads were recipient-only, idempotent, and acknowledgment-only; required security delivery could not be opted out.

The combined M3 database suite passes 65 tests across ten transactional slices. Evidence report: [`test-results/notification-store-junit.xml`](./test-results/notification-store-junit.xml). Migrations: [`../../../packages/db/drizzle/0010_wide_lady_ursula.sql`](../../../packages/db/drizzle/0010_wide_lady_ursula.sql) and [`../../../packages/db/drizzle/0011_perpetual_ender_wiggin.sql`](../../../packages/db/drizzle/0011_perpetual_ender_wiggin.sql).

## Deliberate later work

Expo installation/token registration, invalid-token rotation, email-provider fallback, quiet hours, localized rendering, Azure Service Bus transport, real provider responses, device deep-link execution, foreground/background/terminated iPhone delivery, reminder scheduling, admin console screens, and cloud dead-letter operations remain M14/M5 work. The `/v1` notification API and generated clients remain open in M3. This checkpoint proves transactional intent and recoverable local worker state, not external delivery.
