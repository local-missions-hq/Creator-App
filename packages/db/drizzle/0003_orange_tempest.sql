CREATE TYPE "public"."check_in_accuracy_class" AS ENUM('unavailable', 'coarse', 'precise');--> statement-breakpoint
CREATE TYPE "public"."check_in_challenge_method" AS ENUM('qr', 'staff_code');--> statement-breakpoint
CREATE TYPE "public"."check_in_challenge_status" AS ENUM('active', 'consumed', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."mission_assignment_status" AS ENUM('scheduled', 'checked_in', 'canceled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."venue_staff_assignment_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "check_in_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"method" "check_in_challenge_method" NOT NULL,
	"status" "check_in_challenge_status" DEFAULT 'active' NOT NULL,
	"fallback_reason" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_in_challenges_expiry_ck" CHECK ("check_in_challenges"."expires_at" > "check_in_challenges"."created_at"),
	CONSTRAINT "check_in_challenges_fallback_reason_ck" CHECK (("check_in_challenges"."method" = 'qr' AND "check_in_challenges"."fallback_reason" IS NULL) OR
          ("check_in_challenges"."method" = 'staff_code' AND length(btrim("check_in_challenges"."fallback_reason")) > 0)),
	CONSTRAINT "check_in_challenges_consumed_at_ck" CHECK (("check_in_challenges"."status" = 'consumed' AND "check_in_challenges"."consumed_at" IS NOT NULL) OR
          ("check_in_challenges"."status" <> 'consumed' AND "check_in_challenges"."consumed_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "check_in_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"mission_slot_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"business_location_id" uuid NOT NULL,
	"verification_method" "check_in_challenge_method" NOT NULL,
	"accuracy_class" "check_in_accuracy_class" DEFAULT 'unavailable' NOT NULL,
	"derived_statement" text NOT NULL,
	"verified_by_user_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_in_events_derived_statement_nonempty_ck" CHECK (length(btrim("check_in_events"."derived_statement")) > 0)
);
--> statement-breakpoint
CREATE TABLE "mission_assignment_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"from_status" "mission_assignment_status",
	"to_status" "mission_assignment_status" NOT NULL,
	"assignment_version" integer NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_assignment_status_history_version_positive_ck" CHECK ("mission_assignment_status_history"."assignment_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "mission_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"application_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"mission_slot_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"business_location_id" uuid NOT NULL,
	"window_starts_at" timestamp with time zone NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"status" "mission_assignment_status" DEFAULT 'scheduled' NOT NULL,
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_assignments_window_ck" CHECK ("mission_assignments"."window_ends_at" > "mission_assignments"."window_starts_at"),
	CONSTRAINT "mission_assignments_timezone_nonempty_ck" CHECK (length(btrim("mission_assignments"."timezone")) > 0),
	CONSTRAINT "mission_assignments_version_positive_ck" CHECK ("mission_assignments"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "venue_staff_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"business_membership_id" uuid NOT NULL,
	"business_location_id" uuid NOT NULL,
	"window_starts_at" timestamp with time zone NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL,
	"status" "venue_staff_assignment_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_staff_assignments_window_ck" CHECK ("venue_staff_assignments"."window_ends_at" > "venue_staff_assignments"."window_starts_at")
);
--> statement-breakpoint
ALTER TABLE "check_in_challenges" ADD CONSTRAINT "check_in_challenges_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_challenges" ADD CONSTRAINT "check_in_challenges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_challenge_id_check_in_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."check_in_challenges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_application_id_mission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."mission_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_mission_slot_id_mission_slots_id_fk" FOREIGN KEY ("mission_slot_id") REFERENCES "public"."mission_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignment_status_history" ADD CONSTRAINT "mission_assignment_status_history_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_application_id_mission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."mission_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_mission_slot_id_mission_slots_id_fk" FOREIGN KEY ("mission_slot_id") REFERENCES "public"."mission_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_staff_assignments" ADD CONSTRAINT "venue_staff_assignments_business_membership_id_business_memberships_id_fk" FOREIGN KEY ("business_membership_id") REFERENCES "public"."business_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_staff_assignments" ADD CONSTRAINT "venue_staff_assignments_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_staff_assignments" ADD CONSTRAINT "venue_staff_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_challenges_public_id_uq" ON "check_in_challenges" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_challenges_token_hash_uq" ON "check_in_challenges" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_challenges_active_assignment_uq" ON "check_in_challenges" USING btree ("mission_assignment_id") WHERE "check_in_challenges"."status" = 'active';--> statement-breakpoint
CREATE INDEX "check_in_challenges_assignment_timeline_idx" ON "check_in_challenges" USING btree ("mission_assignment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_events_public_id_uq" ON "check_in_events" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_events_assignment_uq" ON "check_in_events" USING btree ("mission_assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_events_challenge_uq" ON "check_in_events" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "check_in_events_location_timeline_idx" ON "check_in_events" USING btree ("business_location_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_assignment_status_history_version_uq" ON "mission_assignment_status_history" USING btree ("mission_assignment_id","assignment_version");--> statement-breakpoint
CREATE INDEX "mission_assignment_status_history_timeline_idx" ON "mission_assignment_status_history" USING btree ("mission_assignment_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_assignments_public_id_uq" ON "mission_assignments" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_assignments_application_uq" ON "mission_assignments" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_assignments_slot_uq" ON "mission_assignments" USING btree ("mission_slot_id");--> statement-breakpoint
CREATE INDEX "mission_assignments_creator_status_idx" ON "mission_assignments" USING btree ("creator_user_id","status");--> statement-breakpoint
CREATE INDEX "mission_assignments_location_window_idx" ON "mission_assignments" USING btree ("business_location_id","window_starts_at","window_ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_staff_assignments_public_id_uq" ON "venue_staff_assignments" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_staff_assignments_scope_uq" ON "venue_staff_assignments" USING btree ("business_membership_id","business_location_id","window_starts_at","window_ends_at");--> statement-breakpoint
CREATE INDEX "venue_staff_assignments_location_window_idx" ON "venue_staff_assignments" USING btree ("business_location_id","window_starts_at","window_ends_at","status");