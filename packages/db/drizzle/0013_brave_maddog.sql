CREATE TYPE "public"."locality_appeal_reason" AS ENUM('review_error', 'accessibility_issue', 'newer_evidence');--> statement-breakpoint
CREATE TYPE "public"."locality_evidence_deletion_outcome" AS ENUM('deleted', 'no_object', 'failed');--> statement-breakpoint
CREATE TYPE "public"."locality_evidence_deletion_status" AS ENUM('pending', 'processing', 'completed', 'dead_letter');--> statement-breakpoint
CREATE TYPE "public"."locality_legal_hold_reason" AS ENUM('binding_legal_request', 'litigation_preservation', 'security_incident');--> statement-breakpoint
CREATE TYPE "public"."locality_review_reason" AS ENUM('approved', 'unreadable', 'document_too_old', 'postal_area_mismatch', 'unsupported_proof', 'ineligible_area', 'suspected_tampering');--> statement-breakpoint
CREATE TYPE "public"."locality_verification_method" AS ENUM('utility_bill', 'lease_or_mortgage', 'government_mail', 'accessible_manual_review');--> statement-breakpoint
CREATE TYPE "public"."locality_verification_status" AS ENUM('pending_review', 'correction_needed', 'verified', 'rejected', 'appeal_pending', 'final_rejected', 'expired', 'invalidated');--> statement-breakpoint
ALTER TYPE "public"."platform_staff_role" ADD VALUE 'verification_reviewer' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "locality_evidence_deletion_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"locality_evidence_deletion_job_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"outcome" "locality_evidence_deletion_outcome" NOT NULL,
	"worker_id" text NOT NULL,
	"error_code" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locality_evidence_deletion_attempts_number_ck" CHECK ("locality_evidence_deletion_attempts"."attempt_number" > 0),
	CONSTRAINT "locality_evidence_deletion_attempts_error_ck" CHECK (("locality_evidence_deletion_attempts"."outcome" = 'failed' AND "locality_evidence_deletion_attempts"."error_code" ~ '^[A-Z0-9_]{2,80}$')
        OR ("locality_evidence_deletion_attempts"."outcome" <> 'failed' AND "locality_evidence_deletion_attempts"."error_code" IS NULL)),
	CONSTRAINT "locality_evidence_deletion_attempts_time_ck" CHECK ("locality_evidence_deletion_attempts"."completed_at" >= "locality_evidence_deletion_attempts"."started_at")
);
--> statement-breakpoint
CREATE TABLE "locality_evidence_deletion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"locality_verification_id" uuid NOT NULL,
	"status" "locality_evidence_deletion_status" DEFAULT 'pending' NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"lock_token" uuid,
	"locked_by" text,
	"locked_until" timestamp with time zone,
	"last_error_code" text,
	"completed_at" timestamp with time zone,
	"dead_lettered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "locality_evidence_deletion_jobs_attempts_ck" CHECK ("locality_evidence_deletion_jobs"."attempt_count" >= 0 AND "locality_evidence_deletion_jobs"."max_attempts" BETWEEN 1 AND 10
        AND "locality_evidence_deletion_jobs"."attempt_count" <= "locality_evidence_deletion_jobs"."max_attempts"),
	CONSTRAINT "locality_evidence_deletion_jobs_lock_ck" CHECK (("locality_evidence_deletion_jobs"."status" = 'processing' AND "locality_evidence_deletion_jobs"."lock_token" IS NOT NULL
        AND "locality_evidence_deletion_jobs"."locked_by" IS NOT NULL AND "locality_evidence_deletion_jobs"."locked_until" IS NOT NULL)
        OR ("locality_evidence_deletion_jobs"."status" <> 'processing' AND "locality_evidence_deletion_jobs"."lock_token" IS NULL
        AND "locality_evidence_deletion_jobs"."locked_by" IS NULL AND "locality_evidence_deletion_jobs"."locked_until" IS NULL)),
	CONSTRAINT "locality_evidence_deletion_jobs_error_ck" CHECK ("locality_evidence_deletion_jobs"."last_error_code" IS NULL OR "locality_evidence_deletion_jobs"."last_error_code" ~ '^[A-Z0-9_]{2,80}$'),
	CONSTRAINT "locality_evidence_deletion_jobs_terminal_ck" CHECK (("locality_evidence_deletion_jobs"."status" = 'completed' AND "locality_evidence_deletion_jobs"."completed_at" IS NOT NULL
        AND "locality_evidence_deletion_jobs"."dead_lettered_at" IS NULL)
        OR ("locality_evidence_deletion_jobs"."status" = 'dead_letter' AND "locality_evidence_deletion_jobs"."dead_lettered_at" IS NOT NULL
        AND "locality_evidence_deletion_jobs"."completed_at" IS NULL)
        OR ("locality_evidence_deletion_jobs"."status" IN ('pending', 'processing') AND "locality_evidence_deletion_jobs"."completed_at" IS NULL
        AND "locality_evidence_deletion_jobs"."dead_lettered_at" IS NULL)),
	CONSTRAINT "locality_evidence_deletion_jobs_version_ck" CHECK ("locality_evidence_deletion_jobs"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "locality_legal_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"locality_verification_id" uuid NOT NULL,
	"case_id" text NOT NULL,
	"reason" "locality_legal_hold_reason" NOT NULL,
	"scope" text DEFAULT 'locality_evidence' NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"review_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"released_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "locality_legal_holds_case_ck" CHECK ("locality_legal_holds"."case_id" ~ '^[A-Z0-9_-]{6,80}$'),
	CONSTRAINT "locality_legal_holds_scope_ck" CHECK ("locality_legal_holds"."scope" = 'locality_evidence'),
	CONSTRAINT "locality_legal_holds_window_ck" CHECK ("locality_legal_holds"."review_at" > "locality_legal_holds"."created_at" AND "locality_legal_holds"."review_at" <= "locality_legal_holds"."expires_at"
        AND "locality_legal_holds"."expires_at" <= "locality_legal_holds"."created_at" + interval '90 days'),
	CONSTRAINT "locality_legal_holds_release_ck" CHECK (("locality_legal_holds"."released_at" IS NULL AND "locality_legal_holds"."released_by_user_id" IS NULL)
        OR ("locality_legal_holds"."released_at" IS NOT NULL AND "locality_legal_holds"."released_by_user_id" IS NOT NULL)),
	CONSTRAINT "locality_legal_holds_version_ck" CHECK ("locality_legal_holds"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "locality_retention_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"locality_evidence_deletion_job_id" uuid NOT NULL,
	"code" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locality_retention_alerts_code_ck" CHECK ("locality_retention_alerts"."code" = 'LOCALITY_EVIDENCE_DELETION_FAILED'),
	CONSTRAINT "locality_retention_alerts_attempts_ck" CHECK ("locality_retention_alerts"."attempt_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "locality_verification_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locality_verification_id" uuid NOT NULL,
	"from_status" "locality_verification_status",
	"to_status" "locality_verification_status" NOT NULL,
	"verification_version" integer NOT NULL,
	"actor_user_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"reason_code" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locality_verification_status_history_reason_ck" CHECK ("locality_verification_status_history"."reason_code" ~ '^[A-Z0-9_]{2,80}$'),
	CONSTRAINT "locality_verification_status_history_version_ck" CHECK ("locality_verification_status_history"."verification_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "locality_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"status" "locality_verification_status" DEFAULT 'pending_review' NOT NULL,
	"method" "locality_verification_method" NOT NULL,
	"declared_postal_area" text NOT NULL,
	"evidence_reference" text,
	"review_policy_version" text DEFAULT 'locality-v1' NOT NULL,
	"reviewer_user_id" uuid,
	"review_reason" "locality_review_reason",
	"reviewed_at" timestamp with time zone,
	"appeal_deadline" timestamp with time zone,
	"appealed_at" timestamp with time zone,
	"appeal_reason" "locality_appeal_reason",
	"appeal_reviewer_user_id" uuid,
	"appeal_decided_at" timestamp with time zone,
	"verification_completed_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"evidence_deletion_due_at" timestamp with time zone,
	"evidence_deleted_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"invalidation_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "locality_verifications_postal_area_ck" CHECK ("locality_verifications"."declared_postal_area" ~ '^[0-9]{5}$'),
	CONSTRAINT "locality_verifications_evidence_reference_ck" CHECK ("locality_verifications"."evidence_reference" IS NULL OR "locality_verifications"."evidence_reference" ~ '^private/locality/[a-z0-9/_-]{8,180}$'),
	CONSTRAINT "locality_verifications_policy_ck" CHECK ("locality_verifications"."review_policy_version" ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
	CONSTRAINT "locality_verifications_verified_shape_ck" CHECK ("locality_verifications"."status" NOT IN ('verified', 'expired') OR (
        "locality_verifications"."review_reason" = 'approved' AND "locality_verifications"."reviewed_at" IS NOT NULL
        AND "locality_verifications"."verification_completed_at" IS NOT NULL AND "locality_verifications"."verified_at" IS NOT NULL
        AND "locality_verifications"."expires_at" > "locality_verifications"."verified_at"
      )),
	CONSTRAINT "locality_verifications_deleted_shape_ck" CHECK ("locality_verifications"."evidence_deleted_at" IS NULL OR "locality_verifications"."evidence_reference" IS NULL),
	CONSTRAINT "locality_verifications_invalidation_ck" CHECK ("locality_verifications"."status" <> 'invalidated' OR (
        "locality_verifications"."invalidated_at" IS NOT NULL AND length(btrim("locality_verifications"."invalidation_reason")) > 0
      )),
	CONSTRAINT "locality_verifications_version_positive_ck" CHECK ("locality_verifications"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "locality_evidence_deletion_attempts" ADD CONSTRAINT "locality_evidence_deletion_attempts_locality_evidence_deletion_job_id_locality_evidence_deletion_jobs_id_fk" FOREIGN KEY ("locality_evidence_deletion_job_id") REFERENCES "public"."locality_evidence_deletion_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_evidence_deletion_jobs" ADD CONSTRAINT "locality_evidence_deletion_jobs_locality_verification_id_locality_verifications_id_fk" FOREIGN KEY ("locality_verification_id") REFERENCES "public"."locality_verifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_legal_holds" ADD CONSTRAINT "locality_legal_holds_locality_verification_id_locality_verifications_id_fk" FOREIGN KEY ("locality_verification_id") REFERENCES "public"."locality_verifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_legal_holds" ADD CONSTRAINT "locality_legal_holds_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_legal_holds" ADD CONSTRAINT "locality_legal_holds_released_by_user_id_users_id_fk" FOREIGN KEY ("released_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_retention_alerts" ADD CONSTRAINT "locality_retention_alerts_locality_evidence_deletion_job_id_locality_evidence_deletion_jobs_id_fk" FOREIGN KEY ("locality_evidence_deletion_job_id") REFERENCES "public"."locality_evidence_deletion_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_verification_status_history" ADD CONSTRAINT "locality_verification_status_history_locality_verification_id_locality_verifications_id_fk" FOREIGN KEY ("locality_verification_id") REFERENCES "public"."locality_verifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_verification_status_history" ADD CONSTRAINT "locality_verification_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_verifications" ADD CONSTRAINT "locality_verifications_creator_user_id_creator_profiles_user_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."creator_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_verifications" ADD CONSTRAINT "locality_verifications_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locality_verifications" ADD CONSTRAINT "locality_verifications_appeal_reviewer_user_id_users_id_fk" FOREIGN KEY ("appeal_reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "locality_evidence_deletion_attempts_public_id_uq" ON "locality_evidence_deletion_attempts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_evidence_deletion_attempts_number_uq" ON "locality_evidence_deletion_attempts" USING btree ("locality_evidence_deletion_job_id","attempt_number");--> statement-breakpoint
CREATE INDEX "locality_evidence_deletion_attempts_job_idx" ON "locality_evidence_deletion_attempts" USING btree ("locality_evidence_deletion_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_evidence_deletion_jobs_public_id_uq" ON "locality_evidence_deletion_jobs" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_evidence_deletion_jobs_verification_uq" ON "locality_evidence_deletion_jobs" USING btree ("locality_verification_id");--> statement-breakpoint
CREATE INDEX "locality_evidence_deletion_jobs_due_idx" ON "locality_evidence_deletion_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_legal_holds_public_id_uq" ON "locality_legal_holds" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_legal_holds_case_uq" ON "locality_legal_holds" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_legal_holds_active_verification_uq" ON "locality_legal_holds" USING btree ("locality_verification_id") WHERE "locality_legal_holds"."released_at" IS NULL;--> statement-breakpoint
CREATE INDEX "locality_legal_holds_expiry_idx" ON "locality_legal_holds" USING btree ("expires_at","released_at");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_retention_alerts_public_id_uq" ON "locality_retention_alerts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_retention_alerts_job_uq" ON "locality_retention_alerts" USING btree ("locality_evidence_deletion_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_verification_status_history_version_uq" ON "locality_verification_status_history" USING btree ("locality_verification_id","verification_version");--> statement-breakpoint
CREATE INDEX "locality_verification_status_history_timeline_idx" ON "locality_verification_status_history" USING btree ("locality_verification_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_verifications_public_id_uq" ON "locality_verifications" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locality_verifications_active_creator_uq" ON "locality_verifications" USING btree ("creator_user_id") WHERE "locality_verifications"."status" IN ('pending_review', 'correction_needed', 'appeal_pending');--> statement-breakpoint
CREATE INDEX "locality_verifications_creator_created_idx" ON "locality_verifications" USING btree ("creator_user_id","created_at");--> statement-breakpoint
CREATE INDEX "locality_verifications_expiry_idx" ON "locality_verifications" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "locality_verifications_deletion_due_idx" ON "locality_verifications" USING btree ("evidence_deletion_due_at","evidence_deleted_at");
--> statement-breakpoint
INSERT INTO locality_verifications (
  public_id, creator_user_id, status, method, declared_postal_area,
  evidence_reference, reviewer_user_id, review_reason, reviewed_at,
  verification_completed_at, verified_at, expires_at,
  evidence_deletion_due_at, evidence_deleted_at, submitted_at, created_at, updated_at
)
SELECT
  'lv_backfill_' || replace(profile.user_id::text, '-', ''),
  profile.user_id,
  CASE WHEN profile.locality_status = 'expired'
    THEN 'expired'::locality_verification_status
    ELSE 'verified'::locality_verification_status END,
  'accessible_manual_review'::locality_verification_method,
  profile.verified_postal_area,
  NULL,
  NULL,
  'approved'::locality_review_reason,
  profile.locality_verified_at,
  profile.locality_verified_at,
  profile.locality_verified_at,
  profile.locality_expires_at,
  profile.locality_verified_at + interval '30 days',
  profile.locality_verified_at,
  profile.locality_verified_at,
  profile.locality_verified_at,
  profile.locality_verified_at
FROM creator_profiles profile
WHERE profile.locality_status IN ('verified', 'expired')
  AND profile.verified_postal_area IS NOT NULL
  AND profile.locality_verified_at IS NOT NULL
  AND profile.locality_expires_at > profile.locality_verified_at
ON CONFLICT (creator_user_id) WHERE status IN ('pending_review', 'correction_needed', 'appeal_pending')
DO NOTHING;
--> statement-breakpoint
INSERT INTO locality_verification_status_history (
  locality_verification_id, from_status, to_status, verification_version,
  actor_user_id, actor_type, reason_code, occurred_at
)
SELECT verification.id, NULL, verification.status, 1, NULL, 'service',
       'PRIOR_DERIVED_CREDENTIAL_BACKFILLED', verification.created_at
FROM locality_verifications verification
WHERE verification.public_id LIKE 'lv_backfill_%'
ON CONFLICT (locality_verification_id, verification_version) DO NOTHING;
--> statement-breakpoint
INSERT INTO locality_evidence_deletion_jobs (
  public_id, locality_verification_id, status, available_at,
  attempt_count, max_attempts, completed_at, created_at, updated_at
)
SELECT 'ledj_backfill_' || replace(verification.id::text, '-', ''), verification.id,
       'completed', verification.evidence_deletion_due_at, 0, 5,
       verification.evidence_deleted_at, verification.created_at, verification.updated_at
FROM locality_verifications verification
WHERE verification.public_id LIKE 'lv_backfill_%'
ON CONFLICT (locality_verification_id) DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION local_missions_reject_immutable_locality_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER locality_verification_status_history_immutable
BEFORE UPDATE OR DELETE ON locality_verification_status_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_locality_mutation();
--> statement-breakpoint
CREATE TRIGGER locality_evidence_deletion_attempts_immutable
BEFORE UPDATE OR DELETE ON locality_evidence_deletion_attempts
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_locality_mutation();
--> statement-breakpoint
CREATE TRIGGER locality_retention_alerts_immutable
BEFORE UPDATE OR DELETE ON locality_retention_alerts
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_locality_mutation();
