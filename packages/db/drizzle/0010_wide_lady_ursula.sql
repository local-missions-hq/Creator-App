CREATE TYPE "public"."notification_aggregate_type" AS ENUM('user', 'mission_application', 'mission_assignment');--> statement-breakpoint
CREATE TYPE "public"."notification_audience" AS ENUM('creator', 'business_member', 'platform_staff', 'account_owner');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('mission_action', 'mission_reminder', 'money', 'dispute', 'security');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'push', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('suppressed', 'no_send', 'failed', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."notification_event_type" AS ENUM('mission_accepted', 'mission_reminder', 'check_in_reminder', 'submission_due', 'revision_requested', 'mission_approved', 'payout_available', 'dispute_update', 'security_alert');--> statement-breakpoint
CREATE TYPE "public"."notification_outbox_status" AS ENUM('pending', 'processing', 'completed', 'dead_letter');--> statement-breakpoint
CREATE TABLE "in_app_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"notification_event_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "in_app_notifications_archive_ck" CHECK ("in_app_notifications"."archived_at" IS NULL OR "in_app_notifications"."read_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "notification_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"notification_outbox_message_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_delivery_status" NOT NULL,
	"error_code" text,
	"adapter_receipt_id" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_delivery_attempts_number_ck" CHECK ("notification_delivery_attempts"."attempt_number" > 0),
	CONSTRAINT "notification_delivery_attempts_external_channel_ck" CHECK ("notification_delivery_attempts"."channel" IN ('push','email')),
	CONSTRAINT "notification_delivery_attempts_error_code_ck" CHECK ("notification_delivery_attempts"."error_code" IS NULL OR "notification_delivery_attempts"."error_code" ~ '^[A-Z0-9_]{1,80}$'),
	CONSTRAINT "notification_delivery_attempts_shape_ck" CHECK ((
        "notification_delivery_attempts"."status" IN ('no_send','delivered') AND "notification_delivery_attempts"."adapter_receipt_id" IS NOT NULL
        AND "notification_delivery_attempts"."error_code" IS NULL
      ) OR (
        "notification_delivery_attempts"."status" IN ('suppressed','failed') AND "notification_delivery_attempts"."adapter_receipt_id" IS NULL
        AND "notification_delivery_attempts"."error_code" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"type" "notification_event_type" NOT NULL,
	"category" "notification_category" NOT NULL,
	"audience" "notification_audience" NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"business_id" uuid,
	"aggregate_type" "notification_aggregate_type" NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"template_key" text NOT NULL,
	"deep_link_route" text NOT NULL,
	"deduplication_key" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_events_template_key_ck" CHECK ("notification_events"."template_key" ~ '^notification.[a-z0-9_]+.v[1-9][0-9]*$'),
	CONSTRAINT "notification_events_deep_link_ck" CHECK ("notification_events"."deep_link_route" ~ '^/[a-z0-9_/-]{1,240}$'),
	CONSTRAINT "notification_events_dedup_key_ck" CHECK (length(btrim("notification_events"."deduplication_key")) BETWEEN 1 AND 240),
	CONSTRAINT "notification_events_category_ck" CHECK ((
        "notification_events"."type" IN ('mission_accepted','revision_requested','mission_approved')
        AND "notification_events"."category" = 'mission_action'
      ) OR (
        "notification_events"."type" IN ('mission_reminder','check_in_reminder','submission_due')
        AND "notification_events"."category" = 'mission_reminder'
      ) OR ("notification_events"."type" = 'payout_available' AND "notification_events"."category" = 'money')
        OR ("notification_events"."type" = 'dispute_update' AND "notification_events"."category" = 'dispute')
        OR ("notification_events"."type" = 'security_alert' AND "notification_events"."category" = 'security')),
	CONSTRAINT "notification_events_aggregate_shape_ck" CHECK ((
        "notification_events"."type" = 'security_alert' AND "notification_events"."aggregate_type" = 'user'
        AND "notification_events"."audience" = 'account_owner' AND "notification_events"."business_id" IS NULL
      ) OR (
        "notification_events"."type" = 'mission_accepted' AND "notification_events"."aggregate_type" = 'mission_application'
        AND "notification_events"."audience" = 'creator' AND "notification_events"."business_id" IS NOT NULL
      ) OR (
        "notification_events"."type" NOT IN ('security_alert','mission_accepted')
        AND "notification_events"."aggregate_type" = 'mission_assignment' AND "notification_events"."business_id" IS NOT NULL
        AND "notification_events"."audience" IN ('creator','business_member','platform_staff')
      ))
);
--> statement-breakpoint
CREATE TABLE "notification_outbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"notification_event_id" uuid NOT NULL,
	"status" "notification_outbox_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lock_token" uuid,
	"locked_by" text,
	"locked_until" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"dead_lettered_at" timestamp with time zone,
	"replay_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_outbox_messages_counts_ck" CHECK ("notification_outbox_messages"."attempt_count" >= 0 AND "notification_outbox_messages"."max_attempts" > 0
          AND "notification_outbox_messages"."replay_count" >= 0 AND "notification_outbox_messages"."version" > 0),
	CONSTRAINT "notification_outbox_messages_state_ck" CHECK ((
        "notification_outbox_messages"."status" = 'pending' AND "notification_outbox_messages"."lock_token" IS NULL AND "notification_outbox_messages"."locked_by" IS NULL
        AND "notification_outbox_messages"."locked_until" IS NULL AND "notification_outbox_messages"."completed_at" IS NULL
        AND "notification_outbox_messages"."dead_lettered_at" IS NULL
      ) OR (
        "notification_outbox_messages"."status" = 'processing' AND "notification_outbox_messages"."lock_token" IS NOT NULL
        AND length(btrim("notification_outbox_messages"."locked_by")) > 0 AND "notification_outbox_messages"."locked_until" IS NOT NULL
        AND "notification_outbox_messages"."completed_at" IS NULL AND "notification_outbox_messages"."dead_lettered_at" IS NULL
      ) OR (
        "notification_outbox_messages"."status" = 'completed' AND "notification_outbox_messages"."lock_token" IS NULL AND "notification_outbox_messages"."locked_by" IS NULL
        AND "notification_outbox_messages"."locked_until" IS NULL AND "notification_outbox_messages"."completed_at" IS NOT NULL
        AND "notification_outbox_messages"."dead_lettered_at" IS NULL
      ) OR (
        "notification_outbox_messages"."status" = 'dead_letter' AND "notification_outbox_messages"."lock_token" IS NULL
        AND "notification_outbox_messages"."locked_by" IS NULL AND "notification_outbox_messages"."locked_until" IS NULL
        AND "notification_outbox_messages"."completed_at" IS NULL AND "notification_outbox_messages"."dead_lettered_at" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "notification_outbox_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_outbox_message_id" uuid NOT NULL,
	"from_status" "notification_outbox_status",
	"to_status" "notification_outbox_status" NOT NULL,
	"outbox_version" integer NOT NULL,
	"attempt_count" integer NOT NULL,
	"actor_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_outbox_status_history_counts_ck" CHECK ("notification_outbox_status_history"."outbox_version" > 0 AND "notification_outbox_status_history"."attempt_count" >= 0),
	CONSTRAINT "notification_outbox_status_history_reason_ck" CHECK (length(btrim("notification_outbox_status_history"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "notification_category" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_external_channel_ck" CHECK ("notification_preferences"."channel" IN ('push','email')),
	CONSTRAINT "notification_preferences_security_required_ck" CHECK ("notification_preferences"."category" <> 'security' OR "notification_preferences"."enabled" = true),
	CONSTRAINT "notification_preferences_version_ck" CHECK ("notification_preferences"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_notification_event_id_notification_events_id_fk" FOREIGN KEY ("notification_event_id") REFERENCES "public"."notification_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_notification_outbox_message_id_notification_outbox_messages_id_fk" FOREIGN KEY ("notification_outbox_message_id") REFERENCES "public"."notification_outbox_messages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox_messages" ADD CONSTRAINT "notification_outbox_messages_notification_event_id_notification_events_id_fk" FOREIGN KEY ("notification_event_id") REFERENCES "public"."notification_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox_status_history" ADD CONSTRAINT "notification_outbox_status_history_notification_outbox_message_id_notification_outbox_messages_id_fk" FOREIGN KEY ("notification_outbox_message_id") REFERENCES "public"."notification_outbox_messages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox_status_history" ADD CONSTRAINT "notification_outbox_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "in_app_notifications_public_id_uq" ON "in_app_notifications" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "in_app_notifications_event_uq" ON "in_app_notifications" USING btree ("notification_event_id");--> statement-breakpoint
CREATE INDEX "in_app_notifications_recipient_timeline_idx" ON "in_app_notifications" USING btree ("recipient_user_id","archived_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_delivery_attempts_public_id_uq" ON "notification_delivery_attempts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_delivery_attempts_message_attempt_channel_uq" ON "notification_delivery_attempts" USING btree ("notification_outbox_message_id","attempt_number","channel");--> statement-breakpoint
CREATE INDEX "notification_delivery_attempts_message_idx" ON "notification_delivery_attempts" USING btree ("notification_outbox_message_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_events_public_id_uq" ON "notification_events" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_events_recipient_dedup_uq" ON "notification_events" USING btree ("recipient_user_id","type","deduplication_key");--> statement-breakpoint
CREATE INDEX "notification_events_recipient_timeline_idx" ON "notification_events" USING btree ("recipient_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "notification_events_aggregate_idx" ON "notification_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "notification_events_business_idx" ON "notification_events" USING btree ("business_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_messages_public_id_uq" ON "notification_outbox_messages" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_messages_event_uq" ON "notification_outbox_messages" USING btree ("notification_event_id");--> statement-breakpoint
CREATE INDEX "notification_outbox_messages_due_idx" ON "notification_outbox_messages" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "notification_outbox_messages_lease_idx" ON "notification_outbox_messages" USING btree ("status","locked_until");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_outbox_status_history_version_uq" ON "notification_outbox_status_history" USING btree ("notification_outbox_message_id","outbox_version");--> statement-breakpoint
CREATE INDEX "notification_outbox_status_history_timeline_idx" ON "notification_outbox_status_history" USING btree ("notification_outbox_message_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_public_id_uq" ON "notification_preferences" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_category_channel_uq" ON "notification_preferences" USING btree ("user_id","category","channel");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id","category");