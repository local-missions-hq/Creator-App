CREATE TYPE "public"."mission_application_status" AS ENUM('submitted', 'accepted', 'withdrawn', 'rejected', 'expired', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."mission_slot_status" AS ENUM('available', 'reserved', 'accepted', 'in_progress', 'completed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."mission_slot_type" AS ENUM('community', 'reach');--> statement-breakpoint
CREATE TYPE "public"."mission_template_code" AS ENUM('visit_create', 'visit_share', 'event_attendance', 'private_experience_feedback');--> statement-breakpoint
CREATE TYPE "public"."mission_template_status" AS ENUM('active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."reach_level" AS ENUM('level_1', 'level_2', 'level_3');--> statement-breakpoint
CREATE TYPE "public"."slot_reservation_status" AS ENUM('active', 'converted', 'released', 'expired');--> statement-breakpoint
CREATE TABLE "campaign_brief_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"mission_template_id" uuid NOT NULL,
	"plain_language_brief" text NOT NULL,
	"checklist" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_brief_versions_version_positive_ck" CHECK ("campaign_brief_versions"."version" > 0),
	CONSTRAINT "campaign_brief_versions_plain_brief_nonempty_ck" CHECK (length(btrim("campaign_brief_versions"."plain_language_brief")) > 0)
);
--> statement-breakpoint
CREATE TABLE "mission_application_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" "mission_application_status",
	"to_status" "mission_application_status" NOT NULL,
	"application_version" integer NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_application_status_history_version_positive_ck" CHECK ("mission_application_status_history"."application_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "mission_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"campaign_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"status" "mission_application_status" DEFAULT 'submitted' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_applications_version_positive_ck" CHECK ("mission_applications"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "mission_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"campaign_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"type" "mission_slot_type" NOT NULL,
	"status" "mission_slot_status" DEFAULT 'available' NOT NULL,
	"base_reward_minor" integer NOT NULL,
	"bonus_reward_minor" integer DEFAULT 0 NOT NULL,
	"reward_minor" integer NOT NULL,
	"reach_level" "reach_level",
	"currency" text DEFAULT 'USD' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_slots_ordinal_positive_ck" CHECK ("mission_slots"."ordinal" > 0),
	CONSTRAINT "mission_slots_base_reward_positive_ck" CHECK ("mission_slots"."base_reward_minor" > 0),
	CONSTRAINT "mission_slots_bonus_nonnegative_ck" CHECK ("mission_slots"."bonus_reward_minor" >= 0),
	CONSTRAINT "mission_slots_reward_total_ck" CHECK ("mission_slots"."reward_minor" = "mission_slots"."base_reward_minor" + "mission_slots"."bonus_reward_minor"),
	CONSTRAINT "mission_slots_community_reach_ck" CHECK ((
        "mission_slots"."type" = 'community' AND "mission_slots"."reach_level" IS NULL AND "mission_slots"."bonus_reward_minor" = 0
      ) OR (
        "mission_slots"."type" = 'reach' AND "mission_slots"."reach_level" IS NOT NULL AND "mission_slots"."bonus_reward_minor" > 0
      )),
	CONSTRAINT "mission_slots_reach_bonus_ck" CHECK ("mission_slots"."type" = 'community' OR (
        ("mission_slots"."reach_level" = 'level_1' AND "mission_slots"."bonus_reward_minor" * 2 = "mission_slots"."base_reward_minor") OR
        ("mission_slots"."reach_level" = 'level_2' AND "mission_slots"."bonus_reward_minor" = "mission_slots"."base_reward_minor") OR
        ("mission_slots"."reach_level" = 'level_3' AND "mission_slots"."bonus_reward_minor" = "mission_slots"."base_reward_minor" * 2)
      )),
	CONSTRAINT "mission_slots_currency_iso_ck" CHECK ("mission_slots"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "mission_slots_version_positive_ck" CHECK ("mission_slots"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "mission_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "mission_template_code" NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"checklist_schema" jsonb NOT NULL,
	"status" "mission_template_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_templates_version_positive_ck" CHECK ("mission_templates"."version" > 0),
	CONSTRAINT "mission_templates_name_nonempty_ck" CHECK (length(btrim("mission_templates"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "slot_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_slot_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "slot_reservation_status" DEFAULT 'active' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "slot_reservations_release_ck" CHECK (("slot_reservations"."status" IN ('active', 'converted') AND "slot_reservations"."released_at" IS NULL) OR
          ("slot_reservations"."status" IN ('released', 'expired') AND "slot_reservations"."released_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "campaign_brief_versions" ADD CONSTRAINT "campaign_brief_versions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_brief_versions" ADD CONSTRAINT "campaign_brief_versions_mission_template_id_mission_templates_id_fk" FOREIGN KEY ("mission_template_id") REFERENCES "public"."mission_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_brief_versions" ADD CONSTRAINT "campaign_brief_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_application_status_history" ADD CONSTRAINT "mission_application_status_history_application_id_mission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."mission_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_applications" ADD CONSTRAINT "mission_applications_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_applications" ADD CONSTRAINT "mission_applications_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_slots" ADD CONSTRAINT "mission_slots_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_mission_slot_id_mission_slots_id_fk" FOREIGN KEY ("mission_slot_id") REFERENCES "public"."mission_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_application_id_mission_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."mission_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_brief_versions_campaign_version_uq" ON "campaign_brief_versions" USING btree ("campaign_id","version");--> statement-breakpoint
CREATE INDEX "campaign_brief_versions_template_idx" ON "campaign_brief_versions" USING btree ("mission_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_application_status_history_version_uq" ON "mission_application_status_history" USING btree ("application_id","application_version");--> statement-breakpoint
CREATE INDEX "mission_application_status_history_timeline_idx" ON "mission_application_status_history" USING btree ("application_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_applications_public_id_uq" ON "mission_applications" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_applications_campaign_creator_uq" ON "mission_applications" USING btree ("campaign_id","creator_user_id");--> statement-breakpoint
CREATE INDEX "mission_applications_campaign_status_idx" ON "mission_applications" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_slots_public_id_uq" ON "mission_slots" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_slots_campaign_ordinal_uq" ON "mission_slots" USING btree ("campaign_id","ordinal");--> statement-breakpoint
CREATE INDEX "mission_slots_campaign_status_type_idx" ON "mission_slots" USING btree ("campaign_id","status","type");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_templates_code_version_uq" ON "mission_templates" USING btree ("code","version");--> statement-breakpoint
CREATE UNIQUE INDEX "slot_reservations_application_uq" ON "slot_reservations" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slot_reservations_live_slot_uq" ON "slot_reservations" USING btree ("mission_slot_id") WHERE "slot_reservations"."status" IN ('active', 'converted');--> statement-breakpoint
CREATE INDEX "slot_reservations_slot_status_idx" ON "slot_reservations" USING btree ("mission_slot_id","status");