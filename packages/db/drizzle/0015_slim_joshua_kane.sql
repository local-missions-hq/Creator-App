CREATE TYPE "public"."content_license_renewal_funding_status" AS ENUM('pending_provider', 'confirmed', 'failed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."content_license_renewal_payable_status" AS ENUM('pending_transfer', 'transfer_queued', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."content_license_renewal_status" AS ENUM('requested', 'accepted', 'declined', 'funding_pending', 'funded', 'funding_failed', 'abandoned');--> statement-breakpoint
ALTER TYPE "public"."payment_provider_object_type" ADD VALUE 'invoice' BEFORE 'payment_intent';--> statement-breakpoint
CREATE TABLE "content_license_renewal_funding_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"content_license_renewal_id" uuid NOT NULL,
	"status" "content_license_renewal_funding_status" DEFAULT 'pending_provider' NOT NULL,
	"creator_reward_minor" integer NOT NULL,
	"platform_fee_minor" integer NOT NULL,
	"total_due_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "content_license_renewal_funding_intents_amount_ck" CHECK ("content_license_renewal_funding_intents"."creator_reward_minor" > 0 AND "content_license_renewal_funding_intents"."platform_fee_minor" > 0
          AND "content_license_renewal_funding_intents"."total_due_minor" = "content_license_renewal_funding_intents"."creator_reward_minor" + "content_license_renewal_funding_intents"."platform_fee_minor"),
	CONSTRAINT "content_license_renewal_funding_intents_status_ck" CHECK (("content_license_renewal_funding_intents"."status" = 'pending_provider' AND "content_license_renewal_funding_intents"."completed_at" IS NULL) OR
          ("content_license_renewal_funding_intents"."status" <> 'pending_provider' AND "content_license_renewal_funding_intents"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "content_license_renewal_funding_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"content_license_renewal_funding_intent_id" uuid NOT NULL,
	"invoice_provider_reference_id" uuid NOT NULL,
	"payment_intent_provider_reference_id" uuid NOT NULL,
	"activated_content_license_id" uuid NOT NULL,
	"provider_event_id" text NOT NULL,
	"creator_reward_minor" integer NOT NULL,
	"platform_fee_minor" integer NOT NULL,
	"total_due_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"funded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_license_renewal_funding_snapshots_amount_ck" CHECK ("content_license_renewal_funding_snapshots"."creator_reward_minor" > 0 AND "content_license_renewal_funding_snapshots"."platform_fee_minor" > 0
          AND "content_license_renewal_funding_snapshots"."total_due_minor" = "content_license_renewal_funding_snapshots"."creator_reward_minor" + "content_license_renewal_funding_snapshots"."platform_fee_minor")
);
--> statement-breakpoint
CREATE TABLE "content_license_renewal_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_license_renewal_id" uuid NOT NULL,
	"from_status" "content_license_renewal_status",
	"to_status" "content_license_renewal_status" NOT NULL,
	"renewal_version" integer NOT NULL,
	"actor_user_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_license_renewal_history_reason_ck" CHECK (length(btrim("content_license_renewal_history"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "content_license_renewal_payables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"content_license_renewal_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"status" "content_license_renewal_payable_status" DEFAULT 'pending_transfer' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"transferred_at" timestamp with time zone,
	CONSTRAINT "content_license_renewal_payables_amount_ck" CHECK ("content_license_renewal_payables"."amount_minor" > 0),
	CONSTRAINT "content_license_renewal_payables_status_ck" CHECK (("content_license_renewal_payables"."status" = 'transferred' AND "content_license_renewal_payables"."transferred_at" IS NOT NULL) OR
          ("content_license_renewal_payables"."status" <> 'transferred' AND "content_license_renewal_payables"."transferred_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "content_license_renewals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"source_content_license_id" uuid NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"kind" "content_license_kind" NOT NULL,
	"status" "content_license_renewal_status" DEFAULT 'requested' NOT NULL,
	"original_base_reward_minor" integer NOT NULL,
	"creator_reward_minor" integer NOT NULL,
	"platform_fee_minor" integer NOT NULL,
	"total_due_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision_at" timestamp with time zone,
	"funding_requested_at" timestamp with time zone,
	"funded_at" timestamp with time zone,
	"terminal_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_license_renewals_base_ck" CHECK ("content_license_renewals"."original_base_reward_minor" > 0),
	CONSTRAINT "content_license_renewals_reward_ck" CHECK (("content_license_renewals"."kind" = 'organic_owned_social_90d'
           AND "content_license_renewals"."creator_reward_minor" = (("content_license_renewals"."original_base_reward_minor" * 25 + 50) / 100)) OR
          ("content_license_renewals"."kind" = 'extended_owned_media_12m'
           AND "content_license_renewals"."creator_reward_minor" = (("content_license_renewals"."original_base_reward_minor" * 50 + 50) / 100)) OR
          ("content_license_renewals"."kind" = 'paid_advertising_30d'
           AND "content_license_renewals"."creator_reward_minor" = "content_license_renewals"."original_base_reward_minor")),
	CONSTRAINT "content_license_renewals_fee_ck" CHECK ("content_license_renewals"."platform_fee_minor" = (("content_license_renewals"."creator_reward_minor" * 15 + 50) / 100)
          AND "content_license_renewals"."total_due_minor" = "content_license_renewals"."creator_reward_minor" + "content_license_renewals"."platform_fee_minor"),
	CONSTRAINT "content_license_renewals_currency_ck" CHECK ("content_license_renewals"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "content_license_renewals_status_ck" CHECK (("content_license_renewals"."status" = 'requested' AND "content_license_renewals"."decision_at" IS NULL AND "content_license_renewals"."funding_requested_at" IS NULL
           AND "content_license_renewals"."funded_at" IS NULL AND "content_license_renewals"."terminal_at" IS NULL) OR
          ("content_license_renewals"."status" = 'accepted' AND "content_license_renewals"."decision_at" IS NOT NULL AND "content_license_renewals"."funding_requested_at" IS NULL
           AND "content_license_renewals"."funded_at" IS NULL AND "content_license_renewals"."terminal_at" IS NULL) OR
          ("content_license_renewals"."status" = 'funding_pending' AND "content_license_renewals"."decision_at" IS NOT NULL AND "content_license_renewals"."funding_requested_at" IS NOT NULL
           AND "content_license_renewals"."funded_at" IS NULL AND "content_license_renewals"."terminal_at" IS NULL) OR
          ("content_license_renewals"."status" = 'funded' AND "content_license_renewals"."decision_at" IS NOT NULL AND "content_license_renewals"."funding_requested_at" IS NOT NULL
           AND "content_license_renewals"."funded_at" IS NOT NULL AND "content_license_renewals"."terminal_at" IS NULL) OR
          ("content_license_renewals"."status" IN ('declined','funding_failed','abandoned') AND "content_license_renewals"."terminal_at" IS NOT NULL
           AND "content_license_renewals"."funded_at" IS NULL)),
	CONSTRAINT "content_license_renewals_version_ck" CHECK ("content_license_renewals"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "content_licenses" DROP CONSTRAINT "content_licenses_compensation_ck";--> statement-breakpoint
ALTER TABLE "content_licenses" DROP CONSTRAINT "content_licenses_status_shape_ck";--> statement-breakpoint
DROP INDEX "content_licenses_assignment_kind_uq";--> statement-breakpoint
ALTER TABLE "content_licenses" ALTER COLUMN "financial_action_intent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "content_licenses" ADD COLUMN "term_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "content_license_renewal_funding_intents" ADD CONSTRAINT "content_license_renewal_funding_intents_content_license_renewal_id_content_license_renewals_id_fk" FOREIGN KEY ("content_license_renewal_id") REFERENCES "public"."content_license_renewals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_funding_intents" ADD CONSTRAINT "content_license_renewal_funding_intents_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_funding_snapshots" ADD CONSTRAINT "content_license_renewal_funding_snapshots_content_license_renewal_funding_intent_id_content_license_renewal_funding_intents_id_fk" FOREIGN KEY ("content_license_renewal_funding_intent_id") REFERENCES "public"."content_license_renewal_funding_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_funding_snapshots" ADD CONSTRAINT "content_license_renewal_funding_snapshots_invoice_provider_reference_id_payment_provider_references_id_fk" FOREIGN KEY ("invoice_provider_reference_id") REFERENCES "public"."payment_provider_references"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_funding_snapshots" ADD CONSTRAINT "content_license_renewal_funding_snapshots_payment_intent_provider_reference_id_payment_provider_references_id_fk" FOREIGN KEY ("payment_intent_provider_reference_id") REFERENCES "public"."payment_provider_references"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_funding_snapshots" ADD CONSTRAINT "content_license_renewal_funding_snapshots_activated_content_license_id_content_licenses_id_fk" FOREIGN KEY ("activated_content_license_id") REFERENCES "public"."content_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_history" ADD CONSTRAINT "content_license_renewal_history_content_license_renewal_id_content_license_renewals_id_fk" FOREIGN KEY ("content_license_renewal_id") REFERENCES "public"."content_license_renewals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_history" ADD CONSTRAINT "content_license_renewal_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_payables" ADD CONSTRAINT "content_license_renewal_payables_content_license_renewal_id_content_license_renewals_id_fk" FOREIGN KEY ("content_license_renewal_id") REFERENCES "public"."content_license_renewals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewal_payables" ADD CONSTRAINT "content_license_renewal_payables_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewals" ADD CONSTRAINT "content_license_renewals_source_content_license_id_content_licenses_id_fk" FOREIGN KEY ("source_content_license_id") REFERENCES "public"."content_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewals" ADD CONSTRAINT "content_license_renewals_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewals" ADD CONSTRAINT "content_license_renewals_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewals" ADD CONSTRAINT "content_license_renewals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_renewals" ADD CONSTRAINT "content_license_renewals_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_funding_intents_public_id_uq" ON "content_license_renewal_funding_intents" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_funding_intents_renewal_uq" ON "content_license_renewal_funding_intents" USING btree ("content_license_renewal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_funding_snapshots_public_id_uq" ON "content_license_renewal_funding_snapshots" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_funding_snapshots_intent_uq" ON "content_license_renewal_funding_snapshots" USING btree ("content_license_renewal_funding_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_funding_snapshots_invoice_uq" ON "content_license_renewal_funding_snapshots" USING btree ("invoice_provider_reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_funding_snapshots_payment_uq" ON "content_license_renewal_funding_snapshots" USING btree ("payment_intent_provider_reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_funding_snapshots_license_uq" ON "content_license_renewal_funding_snapshots" USING btree ("activated_content_license_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_funding_snapshots_event_uq" ON "content_license_renewal_funding_snapshots" USING btree ("provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_history_version_uq" ON "content_license_renewal_history" USING btree ("content_license_renewal_id","renewal_version");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_payables_public_id_uq" ON "content_license_renewal_payables" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewal_payables_renewal_uq" ON "content_license_renewal_payables" USING btree ("content_license_renewal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewals_public_id_uq" ON "content_license_renewals" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_renewals_source_uq" ON "content_license_renewals" USING btree ("source_content_license_id");--> statement-breakpoint
CREATE INDEX "content_license_renewals_creator_status_idx" ON "content_license_renewals" USING btree ("creator_user_id","status");--> statement-breakpoint
CREATE INDEX "content_license_renewals_business_status_idx" ON "content_license_renewals" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "content_licenses_assignment_kind_term_uq" ON "content_licenses" USING btree ("mission_assignment_id","kind","term_number");--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_term_number_ck" CHECK ("content_licenses"."term_number" > 0);--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_funding_source_ck" CHECK (("content_licenses"."term_number" = 1 AND "content_licenses"."financial_action_intent_id" IS NOT NULL) OR
          ("content_licenses"."term_number" > 1 AND "content_licenses"."financial_action_intent_id" IS NULL));--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_compensation_ck" CHECK (("content_licenses"."kind" = 'organic_owned_social_90d' AND "content_licenses"."term_number" = 1
           AND "content_licenses"."compensation_component_minor" = 0) OR
          ("content_licenses"."kind" = 'organic_owned_social_90d' AND "content_licenses"."term_number" > 1
           AND "content_licenses"."compensation_component_minor" = (("content_licenses"."base_reward_minor_snapshot" * 25 + 50) / 100)) OR
          ("content_licenses"."kind" = 'extended_owned_media_12m'
           AND "content_licenses"."compensation_component_minor" = (("content_licenses"."base_reward_minor_snapshot" * 50 + 50) / 100)) OR
          ("content_licenses"."kind" = 'paid_advertising_30d'
           AND "content_licenses"."compensation_component_minor" = "content_licenses"."base_reward_minor_snapshot"));--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_status_shape_ck" CHECK (("content_licenses"."status" = 'active' AND "content_licenses"."expired_at" IS NULL
           AND "content_licenses"."suspended_at" IS NULL AND "content_licenses"."revoked_at" IS NULL) OR
          ("content_licenses"."status" = 'expired' AND "content_licenses"."expired_at" IS NOT NULL
           AND "content_licenses"."suspended_at" IS NULL AND "content_licenses"."revoked_at" IS NULL) OR
          ("content_licenses"."status" = 'suspended' AND "content_licenses"."expired_at" IS NULL
           AND "content_licenses"."suspended_at" IS NOT NULL AND "content_licenses"."revoked_at" IS NULL) OR
          ("content_licenses"."status" = 'revoked' AND "content_licenses"."expired_at" IS NULL
           AND "content_licenses"."revoked_at" IS NOT NULL));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION local_missions_validate_content_license_activation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid_license boolean;
BEGIN
  IF NEW.term_number = 1 THEN
    SELECT true INTO valid_license
      FROM mission_assignments assignment
      JOIN mission_applications application ON application.id = assignment.application_id
      JOIN mission_slots slot ON slot.id = assignment.mission_slot_id
      JOIN campaigns campaign ON campaign.id = assignment.campaign_id
      JOIN mission_contract_acceptances acceptance
        ON acceptance.id = NEW.mission_contract_acceptance_id
       AND acceptance.mission_assignment_id = assignment.id
       AND acceptance.creator_user_id = assignment.creator_user_id
       AND acceptance.campaign_brief_version_id = assignment.campaign_brief_version_id
      JOIN mission_rights_offers offer
        ON offer.id = acceptance.mission_rights_offer_id
       AND offer.mission_slot_id = assignment.mission_slot_id
      JOIN submission_attempts submission
        ON submission.id = NEW.submission_attempt_id
       AND submission.mission_assignment_id = assignment.id
       AND submission.status IN ('approved', 'auto_approved', 'resolved_approved')
      JOIN financial_action_intents intent
        ON intent.id = NEW.financial_action_intent_id
       AND intent.mission_assignment_id = assignment.id
       AND intent.action = 'creator_payable_full'
     WHERE assignment.id = NEW.mission_assignment_id
       AND assignment.status = 'completed'
       AND application.status = 'completed'
       AND slot.status = 'completed'
       AND campaign.status = 'published'
       AND offer.rights_version = NEW.rights_version
       AND offer.base_reward_minor_snapshot = NEW.base_reward_minor_snapshot
       AND offer.currency = NEW.currency
       AND (
         (NEW.kind = 'organic_owned_social_90d' AND NEW.compensation_component_minor = 0) OR
         (NEW.kind = 'extended_owned_media_12m'
          AND offer.extended_owned_media_selected = true
          AND NEW.compensation_component_minor = offer.extended_owned_media_bonus_minor) OR
         (NEW.kind = 'paid_advertising_30d'
          AND offer.paid_advertising_selected = true
          AND NEW.compensation_component_minor = offer.paid_advertising_bonus_minor)
       );
  ELSE
    SELECT true INTO valid_license
      FROM content_license_renewals renewal
      JOIN content_licenses source
        ON source.id = renewal.source_content_license_id
       AND source.mission_assignment_id = NEW.mission_assignment_id
       AND source.kind = NEW.kind
       AND source.term_number = NEW.term_number - 1
      JOIN content_license_renewal_funding_intents funding
        ON funding.content_license_renewal_id = renewal.id
     WHERE renewal.mission_assignment_id = NEW.mission_assignment_id
       AND renewal.status = 'funding_pending'
       AND renewal.kind = NEW.kind
       AND renewal.original_base_reward_minor = NEW.base_reward_minor_snapshot
       AND renewal.creator_reward_minor = NEW.compensation_component_minor
       AND renewal.currency = NEW.currency
       AND source.mission_contract_acceptance_id = NEW.mission_contract_acceptance_id
       AND source.submission_attempt_id = NEW.submission_attempt_id
       AND source.rights_version + 1 = NEW.rights_version
       AND source.status IN ('active', 'expired')
       AND NEW.activated_at >= source.expires_at
       AND funding.status = 'pending_provider'
       AND funding.creator_reward_minor = NEW.compensation_component_minor
       AND funding.currency = NEW.currency;
  END IF;
  IF valid_license IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Content license requires accepted terms, final approved work, and an authoritative creator-payable obligation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION local_missions_validate_complete_content_license()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  asset_count integer;
  channel_count integer;
  history_count integer;
  renewal_proof_count integer;
  license_kind text;
  license_status text;
  current_license_version integer;
  current_term_number integer;
BEGIN
  SELECT kind::text, status::text, version, term_number
    INTO license_kind, license_status, current_license_version, current_term_number
    FROM content_licenses WHERE id = NEW.id;
  SELECT count(*) INTO asset_count FROM content_license_assets WHERE content_license_id = NEW.id;
  SELECT count(*) INTO channel_count FROM content_license_channels WHERE content_license_id = NEW.id;
  SELECT count(*) INTO history_count
    FROM content_license_status_history
   WHERE content_license_id = NEW.id
     AND to_status::text = license_status AND license_version = current_license_version;
  IF current_term_number > 1 THEN
    SELECT count(*) INTO renewal_proof_count
      FROM content_license_renewal_funding_snapshots snapshot
      JOIN content_license_renewal_funding_intents funding
        ON funding.id = snapshot.content_license_renewal_funding_intent_id
       AND funding.status = 'confirmed'
      JOIN content_license_renewals renewal
        ON renewal.id = funding.content_license_renewal_id
       AND renewal.status = 'funded'
      JOIN content_license_renewal_payables payable
        ON payable.content_license_renewal_id = renewal.id
       AND payable.creator_user_id = renewal.creator_user_id
       AND payable.amount_minor = renewal.creator_reward_minor
       AND payable.currency = renewal.currency
     WHERE snapshot.activated_content_license_id = NEW.id;
  ELSE
    renewal_proof_count := 1;
  END IF;
  IF asset_count < 1 OR history_count <> 1 OR renewal_proof_count <> 1 OR
     (license_kind = 'organic_owned_social_90d' AND channel_count <> 1) OR
     (license_kind = 'extended_owned_media_12m' AND channel_count <> 3) OR
     (license_kind = 'paid_advertising_30d' AND channel_count <> 1) THEN
    RAISE EXCEPTION 'Content license requires accepted assets, exact channels, matching history, and renewal funding proof';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION local_missions_protect_content_license_core()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Content licenses cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status', 'expired_at', 'suspended_at', 'revoked_at', 'version', 'updated_at'])
       IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status', 'expired_at', 'suspended_at', 'revoked_at', 'version', 'updated_at']) THEN
    RAISE EXCEPTION 'Content license identity, scope, compensation, and fixed term are immutable';
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Content license updates require one versioned status transition';
  END IF;
  IF NOT (
    (OLD.status = 'active' AND NEW.status IN ('expired', 'suspended', 'revoked')) OR
    (OLD.status = 'suspended' AND NEW.status IN ('active', 'expired', 'revoked'))
  ) THEN
    RAISE EXCEPTION 'Illegal content license status transition';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION local_missions_protect_content_license_renewal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Content license renewals cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - ARRAY[
        'status', 'decision_at', 'funding_requested_at', 'funded_at',
        'terminal_at', 'version', 'updated_at'
      ]) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY[
        'status', 'decision_at', 'funding_requested_at', 'funded_at',
        'terminal_at', 'version', 'updated_at'
      ]) THEN
    RAISE EXCEPTION 'Content license renewal identity and economics are immutable';
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Renewal updates require one versioned status transition';
  END IF;
  IF NOT (
    (OLD.status = 'requested' AND NEW.status IN ('accepted','declined')) OR
    (OLD.status = 'accepted' AND NEW.status IN ('funding_pending','abandoned')) OR
    (OLD.status = 'funding_pending' AND NEW.status IN ('funded','funding_failed','abandoned'))
  ) THEN
    RAISE EXCEPTION 'Illegal content license renewal transition';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER content_license_renewals_core_protected
BEFORE UPDATE OR DELETE ON content_license_renewals
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_content_license_renewal();
--> statement-breakpoint
CREATE FUNCTION local_missions_protect_content_license_renewal_funding_intent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Content license renewal funding intents cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status', 'completed_at', 'version']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status', 'completed_at', 'version']) THEN
    RAISE EXCEPTION 'Content license renewal funding intent economics are immutable';
  END IF;
  IF OLD.status <> 'pending_provider' OR NEW.status NOT IN ('confirmed','failed','abandoned')
     OR NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'Illegal content license renewal funding transition';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER content_license_renewal_funding_intents_core_protected
BEFORE UPDATE OR DELETE ON content_license_renewal_funding_intents
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_content_license_renewal_funding_intent();
--> statement-breakpoint
CREATE TRIGGER content_license_renewal_history_immutable
BEFORE UPDATE OR DELETE ON content_license_renewal_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
--> statement-breakpoint
CREATE TRIGGER content_license_renewal_funding_snapshots_immutable
BEFORE UPDATE OR DELETE ON content_license_renewal_funding_snapshots
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
--> statement-breakpoint
CREATE TRIGGER content_license_renewal_payables_immutable
BEFORE UPDATE OR DELETE ON content_license_renewal_payables
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
