CREATE TYPE "public"."correction_reason_code" AS ENUM('missing_count', 'corrupt_file', 'duration_out_of_range', 'wrong_orientation', 'insufficient_resolution', 'wrong_subject', 'unrelated_brand_watermark', 'missing_disclosure');--> statement-breakpoint
CREATE TYPE "public"."deliverable_requirement_type" AS ENUM('photo', 'raw_clip', 'edited_video', 'social_post', 'private_response', 'attendance_proof');--> statement-breakpoint
CREATE TYPE "public"."media_asset_status" AS ENUM('pending_scan', 'verified', 'quarantined', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."media_orientation" AS ENUM('any', 'portrait_9_16');--> statement-breakpoint
CREATE TYPE "public"."submission_evidence_kind" AS ENUM('platform_post', 'structured_response', 'check_in_reference');--> statement-breakpoint
CREATE TYPE "public"."submission_review_decision_type" AS ENUM('approved', 'correction_requested', 'auto_approved');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('under_review', 'correction_requested', 'approved', 'auto_approved', 'disputed');--> statement-breakpoint
ALTER TYPE "public"."mission_application_status" ADD VALUE 'completed' BEFORE 'withdrawn';--> statement-breakpoint
CREATE TABLE "correction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"source_submission_attempt_id" uuid NOT NULL,
	"deliverable_requirement_id" uuid NOT NULL,
	"reason_code" "correction_reason_code" NOT NULL,
	"explanation" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "correction_requests_explanation_nonempty_ck" CHECK (length(btrim("correction_requests"."explanation")) > 0),
	CONSTRAINT "correction_requests_due_after_created_ck" CHECK ("correction_requests"."due_at" > "correction_requests"."created_at")
);
--> statement-breakpoint
CREATE TABLE "deliverable_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"campaign_brief_version_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"type" "deliverable_requirement_type" NOT NULL,
	"required_count" integer NOT NULL,
	"allowed_mime_types" jsonb NOT NULL,
	"min_duration_seconds" integer,
	"max_duration_seconds" integer,
	"orientation" "media_orientation" DEFAULT 'any' NOT NULL,
	"min_width_pixels" integer DEFAULT 0 NOT NULL,
	"min_height_pixels" integer DEFAULT 0 NOT NULL,
	"requires_disclosure" boolean DEFAULT false NOT NULL,
	"objective_description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliverable_requirements_ordinal_positive_ck" CHECK ("deliverable_requirements"."ordinal" > 0),
	CONSTRAINT "deliverable_requirements_count_positive_ck" CHECK ("deliverable_requirements"."required_count" > 0),
	CONSTRAINT "deliverable_requirements_mime_types_ck" CHECK (jsonb_typeof("deliverable_requirements"."allowed_mime_types") = 'array' AND jsonb_array_length("deliverable_requirements"."allowed_mime_types") > 0),
	CONSTRAINT "deliverable_requirements_duration_ck" CHECK (("deliverable_requirements"."min_duration_seconds" IS NULL AND "deliverable_requirements"."max_duration_seconds" IS NULL) OR
          ("deliverable_requirements"."min_duration_seconds" > 0 AND "deliverable_requirements"."max_duration_seconds" >= "deliverable_requirements"."min_duration_seconds")),
	CONSTRAINT "deliverable_requirements_dimensions_ck" CHECK ("deliverable_requirements"."min_width_pixels" >= 0 AND "deliverable_requirements"."min_height_pixels" >= 0),
	CONSTRAINT "deliverable_requirements_description_nonempty_ck" CHECK (length(btrim("deliverable_requirements"."objective_description")) > 0)
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"storage_object_key" text NOT NULL,
	"checksum_sha256" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"duration_seconds" integer,
	"width_pixels" integer NOT NULL,
	"height_pixels" integer NOT NULL,
	"orientation" "media_orientation" NOT NULL,
	"status" "media_asset_status" DEFAULT 'pending_scan' NOT NULL,
	"validation_reason" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_object_key_nonempty_ck" CHECK (length(btrim("media_assets"."storage_object_key")) > 0),
	CONSTRAINT "media_assets_checksum_sha256_ck" CHECK ("media_assets"."checksum_sha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "media_assets_mime_type_nonempty_ck" CHECK (length(btrim("media_assets"."mime_type")) > 0),
	CONSTRAINT "media_assets_byte_size_positive_ck" CHECK ("media_assets"."byte_size" > 0),
	CONSTRAINT "media_assets_duration_positive_ck" CHECK ("media_assets"."duration_seconds" IS NULL OR "media_assets"."duration_seconds" > 0),
	CONSTRAINT "media_assets_dimensions_positive_ck" CHECK ("media_assets"."width_pixels" > 0 AND "media_assets"."height_pixels" > 0),
	CONSTRAINT "media_assets_validation_state_ck" CHECK (("media_assets"."status" = 'pending_scan' AND "media_assets"."validation_reason" IS NULL AND "media_assets"."verified_at" IS NULL) OR
          ("media_assets"."status" = 'verified' AND "media_assets"."validation_reason" IS NULL AND "media_assets"."verified_at" IS NOT NULL) OR
          ("media_assets"."status" IN ('quarantined', 'rejected') AND length(btrim("media_assets"."validation_reason")) > 0 AND "media_assets"."verified_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "submission_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_attempt_id" uuid NOT NULL,
	"deliverable_requirement_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_assets_position_positive_ck" CHECK ("submission_assets"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "submission_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" "submission_status" DEFAULT 'under_review' NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"review_deadline_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_attempts_number_ck" CHECK ("submission_attempts"."attempt_number" BETWEEN 1 AND 2),
	CONSTRAINT "submission_attempts_review_deadline_ck" CHECK ("submission_attempts"."review_deadline_at" = "submission_attempts"."submitted_at" + interval '48 hours'),
	CONSTRAINT "submission_attempts_version_positive_ck" CHECK ("submission_attempts"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "submission_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_attempt_id" uuid NOT NULL,
	"deliverable_requirement_id" uuid NOT NULL,
	"kind" "submission_evidence_kind" NOT NULL,
	"position" integer NOT NULL,
	"evidence_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_evidence_position_positive_ck" CHECK ("submission_evidence"."position" > 0),
	CONSTRAINT "submission_evidence_object_ck" CHECK (jsonb_typeof("submission_evidence"."evidence_data") = 'object')
);
--> statement-breakpoint
CREATE TABLE "submission_review_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"submission_attempt_id" uuid NOT NULL,
	"decision" "submission_review_decision_type" NOT NULL,
	"reason_code" "correction_reason_code",
	"explanation" text,
	"actor_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_review_decisions_reason_ck" CHECK (("submission_review_decisions"."decision" = 'correction_requested' AND "submission_review_decisions"."reason_code" IS NOT NULL AND length(btrim("submission_review_decisions"."explanation")) > 0) OR
          ("submission_review_decisions"."decision" IN ('approved', 'auto_approved') AND "submission_review_decisions"."reason_code" IS NULL)),
	CONSTRAINT "submission_review_decisions_actor_ck" CHECK (("submission_review_decisions"."actor_type" = 'user' AND "submission_review_decisions"."actor_id" IS NOT NULL) OR
          ("submission_review_decisions"."actor_type" = 'service' AND "submission_review_decisions"."actor_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "submission_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_attempt_id" uuid NOT NULL,
	"from_status" "submission_status",
	"to_status" "submission_status" NOT NULL,
	"submission_version" integer NOT NULL,
	"actor_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_status_history_version_positive_ck" CHECK ("submission_status_history"."submission_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "mission_application_status_history" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mission_assignment_status_history" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mission_application_status_history" ADD COLUMN "actor_type" "audit_actor_type" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "mission_assignment_status_history" ADD COLUMN "actor_type" "audit_actor_type" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD COLUMN "campaign_brief_version_id" uuid;--> statement-breakpoint
UPDATE "mission_assignments" ma
   SET "campaign_brief_version_id" = (
    SELECT cbv.id
      FROM "campaign_brief_versions" cbv
     WHERE cbv."campaign_id" = ma."campaign_id"
     ORDER BY cbv."version" DESC
     LIMIT 1
  );--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "mission_assignments" WHERE "campaign_brief_version_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate mission assignments without a campaign brief version';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "mission_assignments" ALTER COLUMN "campaign_brief_version_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_source_submission_attempt_id_submission_attempts_id_fk" FOREIGN KEY ("source_submission_attempt_id") REFERENCES "public"."submission_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_deliverable_requirement_id_deliverable_requirements_id_fk" FOREIGN KEY ("deliverable_requirement_id") REFERENCES "public"."deliverable_requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_requirements" ADD CONSTRAINT "deliverable_requirements_campaign_brief_version_id_campaign_brief_versions_id_fk" FOREIGN KEY ("campaign_brief_version_id") REFERENCES "public"."campaign_brief_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_assets" ADD CONSTRAINT "submission_assets_submission_attempt_id_submission_attempts_id_fk" FOREIGN KEY ("submission_attempt_id") REFERENCES "public"."submission_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_assets" ADD CONSTRAINT "submission_assets_deliverable_requirement_id_deliverable_requirements_id_fk" FOREIGN KEY ("deliverable_requirement_id") REFERENCES "public"."deliverable_requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_assets" ADD CONSTRAINT "submission_assets_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_attempts" ADD CONSTRAINT "submission_attempts_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_evidence" ADD CONSTRAINT "submission_evidence_submission_attempt_id_submission_attempts_id_fk" FOREIGN KEY ("submission_attempt_id") REFERENCES "public"."submission_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_evidence" ADD CONSTRAINT "submission_evidence_deliverable_requirement_id_deliverable_requirements_id_fk" FOREIGN KEY ("deliverable_requirement_id") REFERENCES "public"."deliverable_requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_review_decisions" ADD CONSTRAINT "submission_review_decisions_submission_attempt_id_submission_attempts_id_fk" FOREIGN KEY ("submission_attempt_id") REFERENCES "public"."submission_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_status_history" ADD CONSTRAINT "submission_status_history_submission_attempt_id_submission_attempts_id_fk" FOREIGN KEY ("submission_attempt_id") REFERENCES "public"."submission_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "correction_requests_public_id_uq" ON "correction_requests" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "correction_requests_assignment_uq" ON "correction_requests" USING btree ("mission_assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "correction_requests_source_submission_uq" ON "correction_requests" USING btree ("source_submission_attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverable_requirements_public_id_uq" ON "deliverable_requirements" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverable_requirements_brief_ordinal_uq" ON "deliverable_requirements" USING btree ("campaign_brief_version_id","ordinal");--> statement-breakpoint
CREATE INDEX "deliverable_requirements_brief_type_idx" ON "deliverable_requirements" USING btree ("campaign_brief_version_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_public_id_uq" ON "media_assets" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_creator_object_uq" ON "media_assets" USING btree ("creator_user_id","storage_object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_assignment_checksum_uq" ON "media_assets" USING btree ("mission_assignment_id","checksum_sha256");--> statement-breakpoint
CREATE INDEX "media_assets_assignment_status_idx" ON "media_assets" USING btree ("mission_assignment_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_assets_attempt_asset_uq" ON "submission_assets" USING btree ("submission_attempt_id","media_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_assets_attempt_requirement_position_uq" ON "submission_assets" USING btree ("submission_attempt_id","deliverable_requirement_id","position");--> statement-breakpoint
CREATE INDEX "submission_assets_requirement_idx" ON "submission_assets" USING btree ("deliverable_requirement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_attempts_public_id_uq" ON "submission_attempts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_attempts_assignment_number_uq" ON "submission_attempts" USING btree ("mission_assignment_id","attempt_number");--> statement-breakpoint
CREATE INDEX "submission_attempts_review_queue_idx" ON "submission_attempts" USING btree ("status","review_deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_evidence_attempt_requirement_position_uq" ON "submission_evidence" USING btree ("submission_attempt_id","deliverable_requirement_id","position");--> statement-breakpoint
CREATE INDEX "submission_evidence_requirement_idx" ON "submission_evidence" USING btree ("deliverable_requirement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_review_decisions_public_id_uq" ON "submission_review_decisions" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_review_decisions_submission_uq" ON "submission_review_decisions" USING btree ("submission_attempt_id");--> statement-breakpoint
CREATE INDEX "submission_review_decisions_timeline_idx" ON "submission_review_decisions" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_status_history_version_uq" ON "submission_status_history" USING btree ("submission_attempt_id","submission_version");--> statement-breakpoint
CREATE INDEX "submission_status_history_timeline_idx" ON "submission_status_history" USING btree ("submission_attempt_id","occurred_at");--> statement-breakpoint
ALTER TABLE "mission_assignments" ADD CONSTRAINT "mission_assignments_campaign_brief_version_id_campaign_brief_versions_id_fk" FOREIGN KEY ("campaign_brief_version_id") REFERENCES "public"."campaign_brief_versions"("id") ON DELETE restrict ON UPDATE no action;
