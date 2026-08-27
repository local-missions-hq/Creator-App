CREATE TABLE "notification_preference_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"notification_preference_id" uuid NOT NULL,
	"enabled" boolean NOT NULL,
	"preference_version" integer NOT NULL,
	"changed_by_user_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preference_history_version_ck" CHECK ("notification_preference_history"."preference_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "notification_events" DROP CONSTRAINT "notification_events_template_key_ck";--> statement-breakpoint
ALTER TABLE "notification_preference_history" ADD CONSTRAINT "notification_preference_history_notification_preference_id_notification_preferences_id_fk" FOREIGN KEY ("notification_preference_id") REFERENCES "public"."notification_preferences"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preference_history" ADD CONSTRAINT "notification_preference_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preference_history_public_id_uq" ON "notification_preference_history" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preference_history_version_uq" ON "notification_preference_history" USING btree ("notification_preference_id","preference_version");--> statement-breakpoint
CREATE INDEX "notification_preference_history_timeline_idx" ON "notification_preference_history" USING btree ("notification_preference_id","occurred_at");--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_template_key_ck" CHECK ("notification_events"."template_key" ~ '^notification[.][a-z0-9_]+[.]v[1-9][0-9]*$');--> statement-breakpoint
CREATE FUNCTION local_missions_reject_immutable_notification_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME;
END;
$$;--> statement-breakpoint
CREATE TRIGGER notification_events_immutable
BEFORE UPDATE OR DELETE ON notification_events
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_notification_mutation();--> statement-breakpoint
CREATE TRIGGER notification_delivery_attempts_immutable
BEFORE UPDATE OR DELETE ON notification_delivery_attempts
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_notification_mutation();--> statement-breakpoint
CREATE TRIGGER notification_preference_history_immutable
BEFORE UPDATE OR DELETE ON notification_preference_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_notification_mutation();--> statement-breakpoint
CREATE TRIGGER notification_outbox_status_history_immutable
BEFORE UPDATE OR DELETE ON notification_outbox_status_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_notification_mutation();--> statement-breakpoint
CREATE FUNCTION local_missions_validate_notification_preference_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Notification preferences cannot be hard-deleted';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id <> OLD.id OR NEW.public_id <> OLD.public_id OR NEW.user_id <> OLD.user_id
    OR NEW.category <> OLD.category OR NEW.channel <> OLD.channel
    OR NEW.created_at <> OLD.created_at OR NEW.version <> OLD.version + 1
    OR NEW.updated_at < OLD.updated_at
  ) THEN
    RAISE EXCEPTION 'Notification preference identity is immutable and version must advance once';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER notification_preferences_validate_mutation
BEFORE UPDATE OR DELETE ON notification_preferences
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_notification_preference_mutation();--> statement-breakpoint
CREATE FUNCTION local_missions_record_notification_preference_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO notification_preference_history (
    public_id, notification_preference_id, enabled, preference_version,
    changed_by_user_id, occurred_at
  ) VALUES (
    'nph_' || replace(gen_random_uuid()::text, '-', ''), NEW.id, NEW.enabled,
    NEW.version, NEW.user_id, NEW.updated_at
  );
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER notification_preferences_record_history
AFTER INSERT OR UPDATE ON notification_preferences
FOR EACH ROW EXECUTE FUNCTION local_missions_record_notification_preference_history();--> statement-breakpoint
CREATE FUNCTION local_missions_validate_notification_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid_scope boolean;
  expected_route text;
BEGIN
  IF NEW.template_key <> 'notification.' || NEW.type::text || '.v1' THEN
    RAISE EXCEPTION 'Notification template must be the fixed versioned template for its event type';
  END IF;

  IF NEW.type = 'security_alert' THEN
    SELECT true INTO valid_scope
      FROM users user_record
     WHERE user_record.id = NEW.recipient_user_id
       AND user_record.id = NEW.aggregate_id
       AND user_record.status = 'active';
  ELSIF NEW.type = 'mission_accepted' THEN
    SELECT true INTO valid_scope
      FROM mission_applications application
      JOIN campaigns campaign ON campaign.id = application.campaign_id
     WHERE application.id = NEW.aggregate_id
       AND application.creator_user_id = NEW.recipient_user_id
       AND application.status = 'accepted'
       AND campaign.business_id = NEW.business_id;
  ELSE
    SELECT true INTO valid_scope
      FROM mission_assignments assignment
      JOIN campaigns campaign ON campaign.id = assignment.campaign_id
     WHERE assignment.id = NEW.aggregate_id
       AND campaign.business_id = NEW.business_id
       AND (
         (NEW.audience = 'creator' AND assignment.creator_user_id = NEW.recipient_user_id)
         OR (
           NEW.audience = 'business_member' AND EXISTS (
             SELECT 1 FROM business_memberships member
              WHERE member.business_id = campaign.business_id
                AND member.user_id = NEW.recipient_user_id
                AND member.status = 'active' AND member.role IN ('owner', 'manager')
           )
         ) OR (
           NEW.audience = 'platform_staff' AND NEW.type = 'dispute_update' AND EXISTS (
             SELECT 1 FROM platform_staff_memberships staff
              WHERE staff.user_id = NEW.recipient_user_id AND staff.status = 'active'
                AND staff.role IN ('dispute_reviewer', 'admin')
           )
         )
       );
  END IF;

  expected_route := '/notifications/' || NEW.public_id;
  IF valid_scope IS DISTINCT FROM true OR NEW.deep_link_route <> expected_route THEN
    RAISE EXCEPTION 'Notification recipient, tenant, aggregate, audience, or deep link is invalid';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER notification_events_validate
BEFORE INSERT ON notification_events
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_notification_event();--> statement-breakpoint
CREATE FUNCTION local_missions_fan_out_notification_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  outbox_id uuid;
BEGIN
  INSERT INTO notification_outbox_messages (public_id, notification_event_id)
  VALUES ('nto_' || replace(gen_random_uuid()::text, '-', ''), NEW.id)
  RETURNING id INTO outbox_id;

  INSERT INTO notification_outbox_status_history (
    notification_outbox_message_id, to_status, outbox_version,
    attempt_count, actor_type, reason
  ) VALUES (outbox_id, 'pending', 1, 0, 'service', 'Domain event committed to transactional outbox');

  INSERT INTO in_app_notifications (
    public_id, notification_event_id, recipient_user_id
  ) VALUES ('nia_' || replace(gen_random_uuid()::text, '-', ''), NEW.id, NEW.recipient_user_id);
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER notification_events_fan_out
AFTER INSERT ON notification_events
FOR EACH ROW EXECUTE FUNCTION local_missions_fan_out_notification_event();--> statement-breakpoint
CREATE FUNCTION local_missions_validate_in_app_notification_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'In-app notifications cannot be hard-deleted';
  END IF;
  IF NEW.id <> OLD.id OR NEW.public_id <> OLD.public_id
    OR NEW.notification_event_id <> OLD.notification_event_id
    OR NEW.recipient_user_id <> OLD.recipient_user_id OR NEW.created_at <> OLD.created_at
    OR (OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at)
    OR (OLD.archived_at IS NOT NULL AND NEW.archived_at IS DISTINCT FROM OLD.archived_at)
    OR NEW.updated_at < OLD.updated_at
  THEN
    RAISE EXCEPTION 'In-app notification identity and acknowledged state are immutable';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER in_app_notifications_validate_mutation
BEFORE UPDATE OR DELETE ON in_app_notifications
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_in_app_notification_mutation();--> statement-breakpoint
CREATE FUNCTION local_missions_validate_notification_outbox_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Notification outbox messages cannot be hard-deleted';
  END IF;
  IF NEW.id <> OLD.id OR NEW.public_id <> OLD.public_id
    OR NEW.notification_event_id <> OLD.notification_event_id OR NEW.created_at <> OLD.created_at
    OR NEW.version <> OLD.version + 1 OR NEW.updated_at < OLD.updated_at
  THEN
    RAISE EXCEPTION 'Notification outbox identity is immutable and version must advance once';
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'processing' THEN
    IF NEW.attempt_count <> OLD.attempt_count + 1 OR NEW.replay_count <> OLD.replay_count
      OR NEW.max_attempts <> OLD.max_attempts OR NEW.available_at <> OLD.available_at
    THEN RAISE EXCEPTION 'Pending notification claim has invalid counters'; END IF;
  ELSIF OLD.status = 'processing' AND NEW.status = 'processing' AND OLD.locked_until <= now() THEN
    IF NEW.attempt_count <> OLD.attempt_count + 1 OR NEW.replay_count <> OLD.replay_count
      OR NEW.max_attempts <> OLD.max_attempts OR NEW.available_at <> OLD.available_at
    THEN RAISE EXCEPTION 'Expired notification lease reclaim has invalid counters'; END IF;
  ELSIF OLD.status = 'processing' AND NEW.status IN ('pending', 'completed', 'dead_letter') THEN
    IF NEW.attempt_count <> OLD.attempt_count OR NEW.replay_count <> OLD.replay_count
      OR NEW.max_attempts <> OLD.max_attempts
    THEN RAISE EXCEPTION 'Notification completion or failure has invalid counters'; END IF;
  ELSIF OLD.status = 'dead_letter' AND NEW.status = 'pending' THEN
    IF NEW.attempt_count <> OLD.attempt_count OR NEW.replay_count <> OLD.replay_count + 1
      OR NEW.max_attempts <= OLD.max_attempts
    THEN RAISE EXCEPTION 'Notification replay has invalid counters'; END IF;
  ELSE
    RAISE EXCEPTION 'Illegal notification outbox transition from % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER notification_outbox_messages_validate_mutation
BEFORE UPDATE OR DELETE ON notification_outbox_messages
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_notification_outbox_mutation();--> statement-breakpoint
CREATE FUNCTION local_missions_validate_complete_notification_outbox()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_outbox_id uuid;
  current_status notification_outbox_status;
  current_version integer;
  matching_history integer;
BEGIN
  current_outbox_id := CASE
    WHEN TG_TABLE_NAME = 'notification_outbox_messages'
      THEN (to_jsonb(NEW) ->> 'id')::uuid
    ELSE (to_jsonb(NEW) ->> 'notification_outbox_message_id')::uuid
  END;
  SELECT status, version INTO current_status, current_version
    FROM notification_outbox_messages WHERE id = current_outbox_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*) INTO matching_history
    FROM notification_outbox_status_history history
   WHERE history.notification_outbox_message_id = current_outbox_id
     AND history.outbox_version = current_version
     AND history.to_status = current_status;
  IF matching_history <> 1 THEN
    RAISE EXCEPTION 'Notification outbox status must have exactly one matching immutable history row';
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER notification_outbox_complete_deferred
AFTER INSERT OR UPDATE ON notification_outbox_messages
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_complete_notification_outbox();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER notification_outbox_history_complete_deferred
AFTER INSERT ON notification_outbox_status_history
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_complete_notification_outbox();
