CREATE TYPE "public"."dispute_evidence_kind" AS ENUM('deliverable_requirement', 'media_asset', 'check_in_event', 'correction_request', 'submission_attempt', 'submission_evidence');--> statement-breakpoint
CREATE TYPE "public"."dispute_opened_by" AS ENUM('creator', 'business');--> statement-breakpoint
CREATE TYPE "public"."dispute_reason_code" AS ENUM('correction_outside_contract', 'requirement_already_satisfied', 'false_check_in', 'missing_count', 'corrupt_file', 'duration_out_of_range', 'wrong_orientation', 'insufficient_resolution', 'wrong_subject', 'unrelated_brand_watermark', 'missing_disclosure', 'suspected_fraud');--> statement-breakpoint
CREATE TYPE "public"."dispute_resolution_outcome" AS ENUM('earned_full', 'no_payout');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved_earned_full', 'resolved_no_payout');--> statement-breakpoint
CREATE TYPE "public"."financial_action_intent_source_type" AS ENUM('submission_approval', 'dispute_resolution');--> statement-breakpoint
CREATE TYPE "public"."financial_action_intent_status" AS ENUM('pending_ledger');--> statement-breakpoint
CREATE TYPE "public"."financial_action_intent_type" AS ENUM('creator_payable_full', 'slot_refund_full');--> statement-breakpoint
CREATE TYPE "public"."platform_staff_role" AS ENUM('dispute_reviewer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."platform_staff_status" AS ENUM('active', 'revoked');--> statement-breakpoint
ALTER TYPE "public"."mission_application_status" ADD VALUE 'no_payout' BEFORE 'withdrawn';--> statement-breakpoint
ALTER TYPE "public"."mission_assignment_status" ADD VALUE 'no_payout';--> statement-breakpoint
ALTER TYPE "public"."mission_slot_status" ADD VALUE 'no_payout' BEFORE 'canceled';--> statement-breakpoint
ALTER TYPE "public"."submission_status" ADD VALUE 'resolved_approved';--> statement-breakpoint
ALTER TYPE "public"."submission_status" ADD VALUE 'resolved_no_payout';--> statement-breakpoint
CREATE TABLE "dispute_evidence_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"dispute_id" uuid NOT NULL,
	"kind" "dispute_evidence_kind" NOT NULL,
	"reference_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispute_evidence_items_position_positive_ck" CHECK ("dispute_evidence_items"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "dispute_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"dispute_id" uuid NOT NULL,
	"outcome" "dispute_resolution_outcome" NOT NULL,
	"explanation" text NOT NULL,
	"resolved_by_user_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispute_resolutions_explanation_nonempty_ck" CHECK (length(btrim("dispute_resolutions"."explanation")) > 0)
);
--> statement-breakpoint
CREATE TABLE "dispute_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_id" uuid NOT NULL,
	"from_status" "dispute_status",
	"to_status" "dispute_status" NOT NULL,
	"dispute_version" integer NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_type" "audit_actor_type" DEFAULT 'user' NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispute_status_history_version_positive_ck" CHECK ("dispute_status_history"."dispute_version" > 0),
	CONSTRAINT "dispute_status_history_user_actor_ck" CHECK ("dispute_status_history"."actor_type" = 'user')
);
--> statement-breakpoint
CREATE TABLE "financial_action_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"source_type" "financial_action_intent_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"action" "financial_action_intent_type" NOT NULL,
	"status" "financial_action_intent_status" DEFAULT 'pending_ledger' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_action_intents_source_action_ck" CHECK (("financial_action_intents"."source_type" = 'submission_approval' AND "financial_action_intents"."action" = 'creator_payable_full') OR
          ("financial_action_intents"."source_type" = 'dispute_resolution'))
);
--> statement-breakpoint
CREATE TABLE "platform_staff_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "platform_staff_role" NOT NULL,
	"status" "platform_staff_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "platform_staff_memberships_version_positive_ck" CHECK ("platform_staff_memberships"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "submission_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"submission_attempt_id" uuid NOT NULL,
	"correction_request_id" uuid,
	"deliverable_requirement_id" uuid NOT NULL,
	"opened_by" "dispute_opened_by" NOT NULL,
	"opened_by_user_id" uuid NOT NULL,
	"reason_code" "dispute_reason_code" NOT NULL,
	"explanation" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_disputes_explanation_nonempty_ck" CHECK (length(btrim("submission_disputes"."explanation")) > 0),
	CONSTRAINT "submission_disputes_version_positive_ck" CHECK ("submission_disputes"."version" > 0),
	CONSTRAINT "submission_disputes_resolution_time_ck" CHECK (("submission_disputes"."status" = 'open' AND "submission_disputes"."resolved_at" IS NULL) OR
          ("submission_disputes"."status" <> 'open' AND "submission_disputes"."resolved_at" IS NOT NULL)),
	CONSTRAINT "submission_disputes_opener_shape_ck" CHECK (("submission_disputes"."opened_by" = 'creator' AND "submission_disputes"."correction_request_id" IS NOT NULL) OR
          ("submission_disputes"."opened_by" = 'business' AND "submission_disputes"."correction_request_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "dispute_evidence_items" ADD CONSTRAINT "dispute_evidence_items_dispute_id_submission_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."submission_disputes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_resolutions" ADD CONSTRAINT "dispute_resolutions_dispute_id_submission_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."submission_disputes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_resolutions" ADD CONSTRAINT "dispute_resolutions_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_status_history" ADD CONSTRAINT "dispute_status_history_dispute_id_submission_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."submission_disputes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_action_intents" ADD CONSTRAINT "financial_action_intents_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_staff_memberships" ADD CONSTRAINT "platform_staff_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_disputes" ADD CONSTRAINT "submission_disputes_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_disputes" ADD CONSTRAINT "submission_disputes_submission_attempt_id_submission_attempts_id_fk" FOREIGN KEY ("submission_attempt_id") REFERENCES "public"."submission_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_disputes" ADD CONSTRAINT "submission_disputes_correction_request_id_correction_requests_id_fk" FOREIGN KEY ("correction_request_id") REFERENCES "public"."correction_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_disputes" ADD CONSTRAINT "submission_disputes_deliverable_requirement_id_deliverable_requirements_id_fk" FOREIGN KEY ("deliverable_requirement_id") REFERENCES "public"."deliverable_requirements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_disputes" ADD CONSTRAINT "submission_disputes_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_evidence_items_public_id_uq" ON "dispute_evidence_items" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_evidence_items_dispute_position_uq" ON "dispute_evidence_items" USING btree ("dispute_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_evidence_items_dispute_reference_uq" ON "dispute_evidence_items" USING btree ("dispute_id","kind","reference_id");--> statement-breakpoint
CREATE INDEX "dispute_evidence_items_reference_idx" ON "dispute_evidence_items" USING btree ("kind","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_resolutions_public_id_uq" ON "dispute_resolutions" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_resolutions_dispute_uq" ON "dispute_resolutions" USING btree ("dispute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dispute_status_history_version_uq" ON "dispute_status_history" USING btree ("dispute_id","dispute_version");--> statement-breakpoint
CREATE INDEX "dispute_status_history_timeline_idx" ON "dispute_status_history" USING btree ("dispute_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_action_intents_public_id_uq" ON "financial_action_intents" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_action_intents_assignment_uq" ON "financial_action_intents" USING btree ("mission_assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_action_intents_source_uq" ON "financial_action_intents" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "financial_action_intents_status_created_idx" ON "financial_action_intents" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_staff_memberships_public_id_uq" ON "platform_staff_memberships" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_staff_memberships_user_uq" ON "platform_staff_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_staff_memberships_role_status_idx" ON "platform_staff_memberships" USING btree ("role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_disputes_public_id_uq" ON "submission_disputes" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_disputes_assignment_uq" ON "submission_disputes" USING btree ("mission_assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_disputes_submission_uq" ON "submission_disputes" USING btree ("submission_attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_disputes_correction_uq" ON "submission_disputes" USING btree ("correction_request_id");--> statement-breakpoint
CREATE INDEX "submission_disputes_status_opened_idx" ON "submission_disputes" USING btree ("status","opened_at");--> statement-breakpoint
INSERT INTO "financial_action_intents" (
  "public_id", "mission_assignment_id", "source_type", "source_id", "action"
)
SELECT 'fin_migrated_' || decision."public_id",
       attempt."mission_assignment_id",
       'submission_approval'::"financial_action_intent_source_type",
       decision."id",
       'creator_payable_full'::"financial_action_intent_type"
  FROM "submission_review_decisions" decision
  JOIN "submission_attempts" attempt ON attempt."id" = decision."submission_attempt_id"
 WHERE decision."decision" IN ('approved', 'auto_approved')
   AND attempt."status" IN ('approved', 'auto_approved')
ON CONFLICT DO NOTHING;
