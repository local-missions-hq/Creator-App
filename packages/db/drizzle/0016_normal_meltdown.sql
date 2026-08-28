CREATE TYPE "public"."reach_analytics_consent_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."reach_analytics_source_type" AS ENUM('official_platform_api', 'approved_analytics_provider');--> statement-breakpoint
CREATE TYPE "public"."reach_authenticity_status" AS ENUM('passed', 'failed', 'review_required');--> statement-breakpoint
CREATE TYPE "public"."reach_capability_status" AS ENUM('disabled', 'enabled', 'outage');--> statement-breakpoint
CREATE TYPE "public"."reach_evidence_deletion_outcome" AS ENUM('deleted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reach_evidence_deletion_status" AS ENUM('pending', 'processing', 'completed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."reach_provider_outage_status" AS ENUM('active', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."reach_qualification_status" AS ENUM('active', 'superseded', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."reach_verification_status" AS ENUM('pending_review', 'verified', 'rejected', 'appeal_pending', 'final_rejected');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('instagram', 'tiktok', 'youtube');--> statement-breakpoint
CREATE TABLE "reach_analytics_consent_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reach_analytics_consent_id" uuid NOT NULL,
	"from_status" "reach_analytics_consent_status",
	"to_status" "reach_analytics_consent_status" NOT NULL,
	"consent_version" integer NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_analytics_consent_history_version_ck" CHECK ("reach_analytics_consent_history"."consent_version" > 0),
	CONSTRAINT "reach_analytics_consent_history_reason_ck" CHECK (length(btrim("reach_analytics_consent_history"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "reach_analytics_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"status" "reach_analytics_consent_status" DEFAULT 'active' NOT NULL,
	"consent_version" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_analytics_consents_version_name_ck" CHECK ("reach_analytics_consents"."consent_version" ~ '^reach-consent-v[1-9][0-9]*$'),
	CONSTRAINT "reach_analytics_consents_status_ck" CHECK (("reach_analytics_consents"."status" = 'active' AND "reach_analytics_consents"."revoked_at" IS NULL) OR
          ("reach_analytics_consents"."status" = 'revoked' AND "reach_analytics_consents"."revoked_at" IS NOT NULL)),
	CONSTRAINT "reach_analytics_consents_version_ck" CHECK ("reach_analytics_consents"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "reach_evidence_deletion_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"reach_evidence_deletion_job_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"outcome" "reach_evidence_deletion_outcome" NOT NULL,
	"worker_id" text NOT NULL,
	"error_code" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_evidence_deletion_attempts_number_ck" CHECK ("reach_evidence_deletion_attempts"."attempt_number" > 0),
	CONSTRAINT "reach_evidence_deletion_attempts_error_ck" CHECK (("reach_evidence_deletion_attempts"."outcome" = 'failed' AND "reach_evidence_deletion_attempts"."error_code" ~ '^[A-Z0-9_]{2,80}$') OR
          ("reach_evidence_deletion_attempts"."outcome" = 'deleted' AND "reach_evidence_deletion_attempts"."error_code" IS NULL)),
	CONSTRAINT "reach_evidence_deletion_attempts_time_ck" CHECK ("reach_evidence_deletion_attempts"."completed_at" >= "reach_evidence_deletion_attempts"."started_at")
);
--> statement-breakpoint
CREATE TABLE "reach_evidence_deletion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"reach_verification_id" uuid NOT NULL,
	"status" "reach_evidence_deletion_status" DEFAULT 'pending' NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"lock_token" uuid,
	"locked_by" text,
	"locked_until" timestamp with time zone,
	"last_error_code" text,
	"completed_at" timestamp with time zone,
	"dead_lettered_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_evidence_deletion_jobs_attempts_ck" CHECK ("reach_evidence_deletion_jobs"."attempt_count" >= 0 AND "reach_evidence_deletion_jobs"."max_attempts" BETWEEN 1 AND 10
          AND "reach_evidence_deletion_jobs"."attempt_count" <= "reach_evidence_deletion_jobs"."max_attempts"),
	CONSTRAINT "reach_evidence_deletion_jobs_lock_ck" CHECK (("reach_evidence_deletion_jobs"."status" = 'processing' AND "reach_evidence_deletion_jobs"."lock_token" IS NOT NULL
          AND "reach_evidence_deletion_jobs"."locked_by" IS NOT NULL AND "reach_evidence_deletion_jobs"."locked_until" IS NOT NULL) OR
          ("reach_evidence_deletion_jobs"."status" <> 'processing' AND "reach_evidence_deletion_jobs"."lock_token" IS NULL
          AND "reach_evidence_deletion_jobs"."locked_by" IS NULL AND "reach_evidence_deletion_jobs"."locked_until" IS NULL)),
	CONSTRAINT "reach_evidence_deletion_jobs_terminal_ck" CHECK (("reach_evidence_deletion_jobs"."status" = 'completed' AND "reach_evidence_deletion_jobs"."completed_at" IS NOT NULL
          AND "reach_evidence_deletion_jobs"."dead_lettered_at" IS NULL) OR
          ("reach_evidence_deletion_jobs"."status" = 'dead_letter' AND "reach_evidence_deletion_jobs"."dead_lettered_at" IS NOT NULL
          AND "reach_evidence_deletion_jobs"."completed_at" IS NULL) OR
          ("reach_evidence_deletion_jobs"."status" IN ('pending','processing') AND "reach_evidence_deletion_jobs"."completed_at" IS NULL
          AND "reach_evidence_deletion_jobs"."dead_lettered_at" IS NULL)),
	CONSTRAINT "reach_evidence_deletion_jobs_version_ck" CHECK ("reach_evidence_deletion_jobs"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "reach_platform_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"platform" "social_platform" NOT NULL,
	"status" "reach_capability_status" DEFAULT 'disabled' NOT NULL,
	"approved_source_type" "reach_analytics_source_type",
	"approved_provider_key" text,
	"methodology_version" text,
	"feasibility_approved" boolean DEFAULT false NOT NULL,
	"security_approved" boolean DEFAULT false NOT NULL,
	"privacy_approved" boolean DEFAULT false NOT NULL,
	"provider_policy_approved" boolean DEFAULT false NOT NULL,
	"reliability_approved" boolean DEFAULT false NOT NULL,
	"retention_approved" boolean DEFAULT false NOT NULL,
	"operations_approved" boolean DEFAULT false NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_platform_capabilities_provider_key_ck" CHECK ("reach_platform_capabilities"."approved_provider_key" IS NULL OR "reach_platform_capabilities"."approved_provider_key" ~ '^[a-z0-9][a-z0-9._-]{2,79}$'),
	CONSTRAINT "reach_platform_capabilities_methodology_ck" CHECK ("reach_platform_capabilities"."methodology_version" IS NULL OR "reach_platform_capabilities"."methodology_version" ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
	CONSTRAINT "reach_platform_capabilities_enabled_ck" CHECK ("reach_platform_capabilities"."status" = 'disabled' OR (
        "reach_platform_capabilities"."approved_source_type" IS NOT NULL AND "reach_platform_capabilities"."approved_provider_key" IS NOT NULL
        AND "reach_platform_capabilities"."methodology_version" IS NOT NULL AND "reach_platform_capabilities"."reviewed_by_user_id" IS NOT NULL
        AND "reach_platform_capabilities"."reviewed_at" IS NOT NULL AND "reach_platform_capabilities"."feasibility_approved" = true
        AND "reach_platform_capabilities"."security_approved" = true AND "reach_platform_capabilities"."privacy_approved" = true
        AND "reach_platform_capabilities"."provider_policy_approved" = true AND "reach_platform_capabilities"."reliability_approved" = true
        AND "reach_platform_capabilities"."retention_approved" = true AND "reach_platform_capabilities"."operations_approved" = true
      )),
	CONSTRAINT "reach_platform_capabilities_version_ck" CHECK ("reach_platform_capabilities"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "reach_provider_outages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"platform" "social_platform" NOT NULL,
	"status" "reach_provider_outage_status" DEFAULT 'active' NOT NULL,
	"reason_code" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"resolved_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_provider_outages_reason_ck" CHECK ("reach_provider_outages"."reason_code" ~ '^[A-Z0-9_]{2,80}$'),
	CONSTRAINT "reach_provider_outages_status_ck" CHECK (("reach_provider_outages"."status" = 'active' AND "reach_provider_outages"."resolved_at" IS NULL
          AND "reach_provider_outages"."resolved_by_user_id" IS NULL) OR
          ("reach_provider_outages"."status" = 'resolved' AND "reach_provider_outages"."resolved_at" IS NOT NULL
          AND "reach_provider_outages"."resolved_by_user_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "reach_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"reach_verification_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"tier" "reach_level" NOT NULL,
	"status" "reach_qualification_status" DEFAULT 'active' NOT NULL,
	"source_type" "reach_analytics_source_type" NOT NULL,
	"methodology_version" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"grace_granted_at" timestamp with time zone,
	"grace_until" timestamp with time zone,
	"grace_provider_outage_id" uuid,
	"superseded_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_qualifications_term_ck" CHECK ("reach_qualifications"."expires_at" = "reach_qualifications"."verified_at" + interval '90 days'),
	CONSTRAINT "reach_qualifications_grace_ck" CHECK (("reach_qualifications"."grace_granted_at" IS NULL AND "reach_qualifications"."grace_until" IS NULL
          AND "reach_qualifications"."grace_provider_outage_id" IS NULL) OR
          ("reach_qualifications"."grace_granted_at" IS NOT NULL AND "reach_qualifications"."grace_until" = "reach_qualifications"."expires_at" + interval '14 days'
          AND "reach_qualifications"."grace_provider_outage_id" IS NOT NULL)),
	CONSTRAINT "reach_qualifications_terminal_ck" CHECK (("reach_qualifications"."status" = 'active' AND "reach_qualifications"."superseded_at" IS NULL
          AND "reach_qualifications"."expired_at" IS NULL AND "reach_qualifications"."revoked_at" IS NULL) OR
          ("reach_qualifications"."status" = 'superseded' AND "reach_qualifications"."superseded_at" IS NOT NULL) OR
          ("reach_qualifications"."status" = 'expired' AND "reach_qualifications"."expired_at" IS NOT NULL) OR
          ("reach_qualifications"."status" = 'revoked' AND "reach_qualifications"."revoked_at" IS NOT NULL)),
	CONSTRAINT "reach_qualifications_version_ck" CHECK ("reach_qualifications"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "reach_retention_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"reach_evidence_deletion_job_id" uuid NOT NULL,
	"code" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_retention_alerts_code_ck" CHECK ("reach_retention_alerts"."code" = 'REACH_EVIDENCE_DELETION_FAILED'),
	CONSTRAINT "reach_retention_alerts_attempts_ck" CHECK ("reach_retention_alerts"."attempt_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "reach_verification_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reach_verification_id" uuid NOT NULL,
	"from_status" "reach_verification_status",
	"to_status" "reach_verification_status" NOT NULL,
	"verification_version" integer NOT NULL,
	"actor_user_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"reason_code" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_verification_status_history_reason_ck" CHECK ("reach_verification_status_history"."reason_code" ~ '^[A-Z0-9_]{2,80}$'),
	CONSTRAINT "reach_verification_status_history_version_ck" CHECK ("reach_verification_status_history"."verification_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "reach_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"reach_analytics_consent_id" uuid NOT NULL,
	"status" "reach_verification_status" DEFAULT 'pending_review' NOT NULL,
	"source_type" "reach_analytics_source_type" NOT NULL,
	"provider_key" text NOT NULL,
	"provider_connection_reference" text,
	"evidence_reference" text,
	"estimated_local_audience_count" integer,
	"authenticity_status" "reach_authenticity_status" NOT NULL,
	"methodology_version" text NOT NULL,
	"reviewer_user_id" uuid,
	"review_reason" text,
	"reviewed_at" timestamp with time zone,
	"appeal_deadline" timestamp with time zone,
	"appealed_at" timestamp with time zone,
	"appeal_reviewer_user_id" uuid,
	"appeal_decided_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"evidence_deletion_due_at" timestamp with time zone,
	"evidence_deleted_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reach_verifications_provider_key_ck" CHECK ("reach_verifications"."provider_key" ~ '^[a-z0-9][a-z0-9._-]{2,79}$'),
	CONSTRAINT "reach_verifications_private_references_ck" CHECK (("reach_verifications"."provider_connection_reference" IS NULL OR
           "reach_verifications"."provider_connection_reference" ~ '^private/reach/[a-z0-9/_-]{8,180}$') AND
          ("reach_verifications"."evidence_reference" IS NULL OR
           "reach_verifications"."evidence_reference" ~ '^private/reach/[a-z0-9/_-]{8,180}$')),
	CONSTRAINT "reach_verifications_audience_ck" CHECK ("reach_verifications"."estimated_local_audience_count" IS NULL OR "reach_verifications"."estimated_local_audience_count" >= 0),
	CONSTRAINT "reach_verifications_methodology_ck" CHECK ("reach_verifications"."methodology_version" ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
	CONSTRAINT "reach_verifications_review_shape_ck" CHECK ("reach_verifications"."status" IN ('pending_review','appeal_pending') OR (
        "reach_verifications"."reviewer_user_id" IS NOT NULL AND "reach_verifications"."review_reason" IS NOT NULL
        AND "reach_verifications"."reviewed_at" IS NOT NULL AND "reach_verifications"."completed_at" IS NOT NULL
        AND "reach_verifications"."evidence_deletion_due_at" IS NOT NULL
      )),
	CONSTRAINT "reach_verifications_verified_shape_ck" CHECK ("reach_verifications"."status" <> 'verified' OR (
        "reach_verifications"."verified_at" IS NOT NULL AND "reach_verifications"."expires_at" = "reach_verifications"."verified_at" + interval '90 days'
      )),
	CONSTRAINT "reach_verifications_deleted_shape_ck" CHECK ("reach_verifications"."evidence_deleted_at" IS NULL OR (
        "reach_verifications"."provider_connection_reference" IS NULL AND "reach_verifications"."evidence_reference" IS NULL
        AND "reach_verifications"."estimated_local_audience_count" IS NULL
      )),
	CONSTRAINT "reach_verifications_version_ck" CHECK ("reach_verifications"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "mission_slots" DROP CONSTRAINT "mission_slots_community_reach_ck";--> statement-breakpoint
ALTER TABLE "mission_slots" ADD COLUMN "reach_platform" "social_platform";--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD COLUMN "reach_qualification_id" uuid;--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD COLUMN "reach_platform_snapshot" "social_platform";--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD COLUMN "reach_level_snapshot" "reach_level";--> statement-breakpoint
UPDATE mission_slots SET reach_platform = 'instagram'
 WHERE type = 'reach' AND reach_platform IS NULL;--> statement-breakpoint
INSERT INTO reach_platform_capabilities (public_id, platform)
VALUES ('reach_capability_instagram', 'instagram'),
       ('reach_capability_tiktok', 'tiktok'),
       ('reach_capability_youtube', 'youtube');--> statement-breakpoint
ALTER TABLE "reach_analytics_consent_history" ADD CONSTRAINT "reach_analytics_consent_history_reach_analytics_consent_id_reach_analytics_consents_id_fk" FOREIGN KEY ("reach_analytics_consent_id") REFERENCES "public"."reach_analytics_consents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_analytics_consent_history" ADD CONSTRAINT "reach_analytics_consent_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_analytics_consents" ADD CONSTRAINT "reach_analytics_consents_creator_user_id_creator_profiles_user_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."creator_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_evidence_deletion_attempts" ADD CONSTRAINT "reach_evidence_deletion_attempts_reach_evidence_deletion_job_id_reach_evidence_deletion_jobs_id_fk" FOREIGN KEY ("reach_evidence_deletion_job_id") REFERENCES "public"."reach_evidence_deletion_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_evidence_deletion_jobs" ADD CONSTRAINT "reach_evidence_deletion_jobs_reach_verification_id_reach_verifications_id_fk" FOREIGN KEY ("reach_verification_id") REFERENCES "public"."reach_verifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_platform_capabilities" ADD CONSTRAINT "reach_platform_capabilities_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_provider_outages" ADD CONSTRAINT "reach_provider_outages_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_provider_outages" ADD CONSTRAINT "reach_provider_outages_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_qualifications" ADD CONSTRAINT "reach_qualifications_reach_verification_id_reach_verifications_id_fk" FOREIGN KEY ("reach_verification_id") REFERENCES "public"."reach_verifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_qualifications" ADD CONSTRAINT "reach_qualifications_creator_user_id_creator_profiles_user_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."creator_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_retention_alerts" ADD CONSTRAINT "reach_retention_alerts_reach_evidence_deletion_job_id_reach_evidence_deletion_jobs_id_fk" FOREIGN KEY ("reach_evidence_deletion_job_id") REFERENCES "public"."reach_evidence_deletion_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_verification_status_history" ADD CONSTRAINT "reach_verification_status_history_reach_verification_id_reach_verifications_id_fk" FOREIGN KEY ("reach_verification_id") REFERENCES "public"."reach_verifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_verification_status_history" ADD CONSTRAINT "reach_verification_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_verifications" ADD CONSTRAINT "reach_verifications_creator_user_id_creator_profiles_user_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."creator_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_verifications" ADD CONSTRAINT "reach_verifications_reach_analytics_consent_id_reach_analytics_consents_id_fk" FOREIGN KEY ("reach_analytics_consent_id") REFERENCES "public"."reach_analytics_consents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_verifications" ADD CONSTRAINT "reach_verifications_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reach_verifications" ADD CONSTRAINT "reach_verifications_appeal_reviewer_user_id_users_id_fk" FOREIGN KEY ("appeal_reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reach_analytics_consent_history_version_uq" ON "reach_analytics_consent_history" USING btree ("reach_analytics_consent_id","consent_version");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_analytics_consents_public_id_uq" ON "reach_analytics_consents" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_analytics_consents_creator_platform_uq" ON "reach_analytics_consents" USING btree ("creator_user_id","platform");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_evidence_deletion_attempts_public_id_uq" ON "reach_evidence_deletion_attempts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_evidence_deletion_attempts_number_uq" ON "reach_evidence_deletion_attempts" USING btree ("reach_evidence_deletion_job_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_evidence_deletion_jobs_public_id_uq" ON "reach_evidence_deletion_jobs" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_evidence_deletion_jobs_verification_uq" ON "reach_evidence_deletion_jobs" USING btree ("reach_verification_id");--> statement-breakpoint
CREATE INDEX "reach_evidence_deletion_jobs_due_idx" ON "reach_evidence_deletion_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_platform_capabilities_public_id_uq" ON "reach_platform_capabilities" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_platform_capabilities_platform_uq" ON "reach_platform_capabilities" USING btree ("platform");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_provider_outages_public_id_uq" ON "reach_provider_outages" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_provider_outages_active_platform_uq" ON "reach_provider_outages" USING btree ("platform") WHERE "reach_provider_outages"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "reach_qualifications_public_id_uq" ON "reach_qualifications" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_qualifications_verification_uq" ON "reach_qualifications" USING btree ("reach_verification_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_qualifications_active_creator_platform_uq" ON "reach_qualifications" USING btree ("creator_user_id","platform") WHERE "reach_qualifications"."status" = 'active';--> statement-breakpoint
CREATE INDEX "reach_qualifications_eligibility_idx" ON "reach_qualifications" USING btree ("creator_user_id","platform","status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_retention_alerts_public_id_uq" ON "reach_retention_alerts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_retention_alerts_job_uq" ON "reach_retention_alerts" USING btree ("reach_evidence_deletion_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_verification_status_history_version_uq" ON "reach_verification_status_history" USING btree ("reach_verification_id","verification_version");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_verifications_public_id_uq" ON "reach_verifications" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reach_verifications_active_creator_platform_uq" ON "reach_verifications" USING btree ("creator_user_id","platform") WHERE "reach_verifications"."status" IN ('pending_review','appeal_pending');--> statement-breakpoint
CREATE INDEX "reach_verifications_creator_platform_idx" ON "reach_verifications" USING btree ("creator_user_id","platform","submitted_at");--> statement-breakpoint
CREATE INDEX "reach_verifications_deletion_due_idx" ON "reach_verifications" USING btree ("evidence_deletion_due_at","evidence_deleted_at");--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_reach_qualification_id_reach_qualifications_id_fk" FOREIGN KEY ("reach_qualification_id") REFERENCES "public"."reach_qualifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_slots" ADD CONSTRAINT "mission_slots_community_reach_ck" CHECK ((
        "mission_slots"."type" = 'community' AND "mission_slots"."reach_level" IS NULL
          AND "mission_slots"."reach_platform" IS NULL AND "mission_slots"."reach_bonus_minor" = 0
      ) OR (
        "mission_slots"."type" = 'reach' AND "mission_slots"."reach_level" IS NOT NULL
          AND "mission_slots"."reach_platform" IS NOT NULL AND "mission_slots"."reach_bonus_minor" > 0
      ));--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_reach_snapshot_shape_ck" CHECK (("slot_reservations"."reach_qualification_id" IS NULL AND "slot_reservations"."reach_platform_snapshot" IS NULL
          AND "slot_reservations"."reach_level_snapshot" IS NULL) OR
          ("slot_reservations"."reach_qualification_id" IS NOT NULL AND "slot_reservations"."reach_platform_snapshot" IS NOT NULL
          AND "slot_reservations"."reach_level_snapshot" IS NOT NULL));--> statement-breakpoint
ALTER TABLE reach_qualifications
  ADD CONSTRAINT reach_qualifications_grace_outage_fk
  FOREIGN KEY (grace_provider_outage_id) REFERENCES reach_provider_outages(id)
  ON DELETE RESTRICT;--> statement-breakpoint
CREATE FUNCTION local_missions_validate_reach_reservation_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid_snapshot boolean;
BEGIN
  SELECT CASE
    WHEN slot.type = 'community' THEN NEW.reach_qualification_id IS NULL
    ELSE EXISTS (
      SELECT 1
        FROM reach_qualifications qualification
        JOIN reach_analytics_consents consent
          ON consent.creator_user_id = qualification.creator_user_id
         AND consent.platform = qualification.platform AND consent.status = 'active'
        JOIN reach_platform_capabilities capability
          ON capability.platform = qualification.platform
       WHERE qualification.id = NEW.reach_qualification_id
         AND qualification.creator_user_id = application.creator_user_id
         AND qualification.platform = slot.reach_platform
         AND qualification.tier = slot.reach_level
         AND qualification.platform = NEW.reach_platform_snapshot
         AND qualification.tier = NEW.reach_level_snapshot
         AND qualification.status = 'active'
         AND (
           (capability.status = 'enabled' AND qualification.expires_at > now()) OR
           (capability.status = 'outage' AND qualification.grace_until > now() AND EXISTS (
             SELECT 1 FROM reach_provider_outages outage
              WHERE outage.id = qualification.grace_provider_outage_id
                AND outage.platform = qualification.platform AND outage.status = 'active'
           ))
         )
    )
  END INTO valid_snapshot
    FROM mission_slots slot
    JOIN mission_applications application ON application.id = NEW.application_id
   WHERE slot.id = NEW.mission_slot_id;
  IF valid_snapshot IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Reach reservation requires active consent and a current exact-platform tier';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER slot_reservations_validate_reach_snapshot
BEFORE INSERT OR UPDATE OF reach_qualification_id, reach_platform_snapshot, reach_level_snapshot
ON slot_reservations
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_reach_reservation_snapshot();
--> statement-breakpoint
CREATE FUNCTION local_missions_reject_immutable_reach_record()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Reach audit and evidence-attempt records are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER reach_analytics_consent_history_immutable
BEFORE UPDATE OR DELETE ON reach_analytics_consent_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_reach_record();
--> statement-breakpoint
CREATE TRIGGER reach_verification_status_history_immutable
BEFORE UPDATE OR DELETE ON reach_verification_status_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_reach_record();
--> statement-breakpoint
CREATE TRIGGER reach_evidence_deletion_attempts_immutable
BEFORE UPDATE OR DELETE ON reach_evidence_deletion_attempts
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_reach_record();
--> statement-breakpoint
CREATE TRIGGER reach_retention_alerts_immutable
BEFORE UPDATE OR DELETE ON reach_retention_alerts
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_reach_record();
