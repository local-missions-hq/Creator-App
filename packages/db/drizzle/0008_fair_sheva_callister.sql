CREATE TYPE "public"."content_license_channel" AS ENUM('owned_social', 'business_website', 'business_email', 'paid_advertising');--> statement-breakpoint
CREATE TYPE "public"."content_license_kind" AS ENUM('organic_owned_social_90d', 'extended_owned_media_12m', 'paid_advertising_30d');--> statement-breakpoint
CREATE TYPE "public"."content_license_status" AS ENUM('active', 'expired', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."legal_document_type" AS ENUM('creator_terms', 'sponsorship_disclosure');--> statement-breakpoint
CREATE TABLE "content_license_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"content_license_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_license_assets_position_ck" CHECK ("content_license_assets"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "content_license_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"content_license_id" uuid NOT NULL,
	"channel" "content_license_channel" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_license_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_license_id" uuid NOT NULL,
	"from_status" "content_license_status",
	"to_status" "content_license_status" NOT NULL,
	"license_version" integer NOT NULL,
	"actor_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_license_status_history_version_ck" CHECK ("content_license_status_history"."license_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "content_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"mission_contract_acceptance_id" uuid NOT NULL,
	"submission_attempt_id" uuid NOT NULL,
	"financial_action_intent_id" uuid NOT NULL,
	"kind" "content_license_kind" NOT NULL,
	"status" "content_license_status" DEFAULT 'active' NOT NULL,
	"rights_version" integer NOT NULL,
	"base_reward_minor_snapshot" integer NOT NULL,
	"compensation_component_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"attribution_required" boolean DEFAULT true NOT NULL,
	"non_exclusive" boolean DEFAULT true NOT NULL,
	"third_party_sublicensing_allowed" boolean DEFAULT false NOT NULL,
	"ai_training_allowed" boolean DEFAULT false NOT NULL,
	"synthetic_media_allowed" boolean DEFAULT false NOT NULL,
	"face_voice_cloning_allowed" boolean DEFAULT false NOT NULL,
	"permitted_edits" jsonb NOT NULL,
	"activated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"expired_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_licenses_rights_version_ck" CHECK ("content_licenses"."rights_version" > 0),
	CONSTRAINT "content_licenses_base_reward_ck" CHECK ("content_licenses"."base_reward_minor_snapshot" > 0),
	CONSTRAINT "content_licenses_compensation_ck" CHECK (("content_licenses"."kind" = 'organic_owned_social_90d' AND "content_licenses"."compensation_component_minor" = 0) OR
          ("content_licenses"."kind" = 'extended_owned_media_12m'
           AND "content_licenses"."compensation_component_minor" = (("content_licenses"."base_reward_minor_snapshot" * 50 + 50) / 100)) OR
          ("content_licenses"."kind" = 'paid_advertising_30d'
           AND "content_licenses"."compensation_component_minor" = "content_licenses"."base_reward_minor_snapshot")),
	CONSTRAINT "content_licenses_currency_ck" CHECK ("content_licenses"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "content_licenses_standard_safety_ck" CHECK ("content_licenses"."attribution_required" = true AND "content_licenses"."non_exclusive" = true
          AND "content_licenses"."third_party_sublicensing_allowed" = false AND "content_licenses"."ai_training_allowed" = false
          AND "content_licenses"."synthetic_media_allowed" = false AND "content_licenses"."face_voice_cloning_allowed" = false),
	CONSTRAINT "content_licenses_permitted_edits_ck" CHECK ("content_licenses"."permitted_edits" = '["crop","resize","caption","logo_placement","minor_formatting"]'::jsonb),
	CONSTRAINT "content_licenses_term_ck" CHECK (("content_licenses"."kind" = 'organic_owned_social_90d'
           AND "content_licenses"."expires_at" = "content_licenses"."activated_at" + interval '90 days') OR
          ("content_licenses"."kind" = 'extended_owned_media_12m'
           AND "content_licenses"."expires_at" = "content_licenses"."activated_at" + interval '12 months') OR
          ("content_licenses"."kind" = 'paid_advertising_30d'
           AND "content_licenses"."expires_at" = "content_licenses"."activated_at" + interval '30 days')),
	CONSTRAINT "content_licenses_status_shape_ck" CHECK (("content_licenses"."status" = 'active' AND "content_licenses"."expired_at" IS NULL
           AND "content_licenses"."suspended_at" IS NULL AND "content_licenses"."revoked_at" IS NULL) OR
          ("content_licenses"."status" = 'expired' AND "content_licenses"."expired_at" IS NOT NULL
           AND "content_licenses"."suspended_at" IS NULL AND "content_licenses"."revoked_at" IS NULL) OR
          ("content_licenses"."status" = 'suspended' AND "content_licenses"."expired_at" IS NULL
           AND "content_licenses"."suspended_at" IS NOT NULL AND "content_licenses"."revoked_at" IS NULL) OR
          ("content_licenses"."status" = 'revoked' AND "content_licenses"."expired_at" IS NULL
           AND "content_licenses"."revoked_at" IS NOT NULL)),
	CONSTRAINT "content_licenses_version_ck" CHECK ("content_licenses"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "legal_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"type" "legal_document_type" NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"body_sha256" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"published_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_document_versions_version_ck" CHECK ("legal_document_versions"."version" > 0),
	CONSTRAINT "legal_document_versions_title_ck" CHECK (length(btrim("legal_document_versions"."title")) > 0),
	CONSTRAINT "legal_document_versions_hash_ck" CHECK ("legal_document_versions"."body_sha256" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "mission_contract_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"campaign_brief_version_id" uuid NOT NULL,
	"mission_rights_offer_id" uuid NOT NULL,
	"creator_terms_document_id" uuid NOT NULL,
	"disclosure_document_id" uuid NOT NULL,
	"compensation_acknowledged" boolean NOT NULL,
	"deliverables_acknowledged" boolean NOT NULL,
	"disclosure_acknowledged" boolean NOT NULL,
	"rights_acknowledged" boolean NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_contract_acceptances_explicit_ck" CHECK ("mission_contract_acceptances"."compensation_acknowledged" = true AND "mission_contract_acceptances"."deliverables_acknowledged" = true
          AND "mission_contract_acceptances"."disclosure_acknowledged" = true AND "mission_contract_acceptances"."rights_acknowledged" = true)
);
--> statement-breakpoint
CREATE TABLE "mission_rights_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"mission_slot_id" uuid NOT NULL,
	"campaign_brief_version_id" uuid NOT NULL,
	"rights_version" integer DEFAULT 1 NOT NULL,
	"base_reward_minor_snapshot" integer NOT NULL,
	"extended_owned_media_selected" boolean DEFAULT false NOT NULL,
	"extended_owned_media_bonus_minor" integer DEFAULT 0 NOT NULL,
	"paid_advertising_selected" boolean DEFAULT false NOT NULL,
	"paid_advertising_bonus_minor" integer DEFAULT 0 NOT NULL,
	"total_rights_bonus_minor" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"public_disclosure_required" boolean NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_rights_offers_version_ck" CHECK ("mission_rights_offers"."rights_version" > 0),
	CONSTRAINT "mission_rights_offers_base_reward_ck" CHECK ("mission_rights_offers"."base_reward_minor_snapshot" > 0),
	CONSTRAINT "mission_rights_offers_extended_bonus_ck" CHECK (("mission_rights_offers"."extended_owned_media_selected" = true
           AND "mission_rights_offers"."extended_owned_media_bonus_minor" = (("mission_rights_offers"."base_reward_minor_snapshot" * 50 + 50) / 100)) OR
          ("mission_rights_offers"."extended_owned_media_selected" = false AND "mission_rights_offers"."extended_owned_media_bonus_minor" = 0)),
	CONSTRAINT "mission_rights_offers_paid_bonus_ck" CHECK (("mission_rights_offers"."paid_advertising_selected" = true
           AND "mission_rights_offers"."paid_advertising_bonus_minor" = "mission_rights_offers"."base_reward_minor_snapshot") OR
          ("mission_rights_offers"."paid_advertising_selected" = false AND "mission_rights_offers"."paid_advertising_bonus_minor" = 0)),
	CONSTRAINT "mission_rights_offers_total_bonus_ck" CHECK ("mission_rights_offers"."total_rights_bonus_minor" = "mission_rights_offers"."extended_owned_media_bonus_minor" + "mission_rights_offers"."paid_advertising_bonus_minor"),
	CONSTRAINT "mission_rights_offers_currency_ck" CHECK ("mission_rights_offers"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "content_license_assets" ADD CONSTRAINT "content_license_assets_content_license_id_content_licenses_id_fk" FOREIGN KEY ("content_license_id") REFERENCES "public"."content_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_assets" ADD CONSTRAINT "content_license_assets_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_channels" ADD CONSTRAINT "content_license_channels_content_license_id_content_licenses_id_fk" FOREIGN KEY ("content_license_id") REFERENCES "public"."content_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_status_history" ADD CONSTRAINT "content_license_status_history_content_license_id_content_licenses_id_fk" FOREIGN KEY ("content_license_id") REFERENCES "public"."content_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_license_status_history" ADD CONSTRAINT "content_license_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_mission_contract_acceptance_id_mission_contract_acceptances_id_fk" FOREIGN KEY ("mission_contract_acceptance_id") REFERENCES "public"."mission_contract_acceptances"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_submission_attempt_id_submission_attempts_id_fk" FOREIGN KEY ("submission_attempt_id") REFERENCES "public"."submission_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_financial_action_intent_id_financial_action_intents_id_fk" FOREIGN KEY ("financial_action_intent_id") REFERENCES "public"."financial_action_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_contract_acceptances" ADD CONSTRAINT "mission_contract_acceptances_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_contract_acceptances" ADD CONSTRAINT "mission_contract_acceptances_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_contract_acceptances" ADD CONSTRAINT "mission_contract_acceptances_campaign_brief_version_id_campaign_brief_versions_id_fk" FOREIGN KEY ("campaign_brief_version_id") REFERENCES "public"."campaign_brief_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_contract_acceptances" ADD CONSTRAINT "mission_contract_acceptances_mission_rights_offer_id_mission_rights_offers_id_fk" FOREIGN KEY ("mission_rights_offer_id") REFERENCES "public"."mission_rights_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_contract_acceptances" ADD CONSTRAINT "mission_contract_acceptances_creator_terms_document_id_legal_document_versions_id_fk" FOREIGN KEY ("creator_terms_document_id") REFERENCES "public"."legal_document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_contract_acceptances" ADD CONSTRAINT "mission_contract_acceptances_disclosure_document_id_legal_document_versions_id_fk" FOREIGN KEY ("disclosure_document_id") REFERENCES "public"."legal_document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_rights_offers" ADD CONSTRAINT "mission_rights_offers_mission_slot_id_mission_slots_id_fk" FOREIGN KEY ("mission_slot_id") REFERENCES "public"."mission_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_rights_offers" ADD CONSTRAINT "mission_rights_offers_campaign_brief_version_id_campaign_brief_versions_id_fk" FOREIGN KEY ("campaign_brief_version_id") REFERENCES "public"."campaign_brief_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_rights_offers" ADD CONSTRAINT "mission_rights_offers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_assets_public_id_uq" ON "content_license_assets" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_assets_license_asset_uq" ON "content_license_assets" USING btree ("content_license_id","media_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_assets_license_position_uq" ON "content_license_assets" USING btree ("content_license_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_channels_public_id_uq" ON "content_license_channels" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_channels_license_channel_uq" ON "content_license_channels" USING btree ("content_license_id","channel");--> statement-breakpoint
CREATE INDEX "content_license_channels_channel_idx" ON "content_license_channels" USING btree ("channel");--> statement-breakpoint
CREATE UNIQUE INDEX "content_license_status_history_version_uq" ON "content_license_status_history" USING btree ("content_license_id","license_version");--> statement-breakpoint
CREATE INDEX "content_license_status_history_timeline_idx" ON "content_license_status_history" USING btree ("content_license_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_licenses_public_id_uq" ON "content_licenses" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_licenses_assignment_kind_uq" ON "content_licenses" USING btree ("mission_assignment_id","kind");--> statement-breakpoint
CREATE INDEX "content_licenses_status_expiry_idx" ON "content_licenses" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "content_licenses_acceptance_idx" ON "content_licenses" USING btree ("mission_contract_acceptance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_public_id_uq" ON "legal_document_versions" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_type_version_uq" ON "legal_document_versions" USING btree ("type","version");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_type_hash_uq" ON "legal_document_versions" USING btree ("type","body_sha256");--> statement-breakpoint
CREATE INDEX "legal_document_versions_type_effective_idx" ON "legal_document_versions" USING btree ("type","effective_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_contract_acceptances_public_id_uq" ON "mission_contract_acceptances" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_contract_acceptances_assignment_uq" ON "mission_contract_acceptances" USING btree ("mission_assignment_id");--> statement-breakpoint
CREATE INDEX "mission_contract_acceptances_creator_timeline_idx" ON "mission_contract_acceptances" USING btree ("creator_user_id","accepted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_rights_offers_public_id_uq" ON "mission_rights_offers" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mission_rights_offers_slot_uq" ON "mission_rights_offers" USING btree ("mission_slot_id");--> statement-breakpoint
CREATE INDEX "mission_rights_offers_brief_idx" ON "mission_rights_offers" USING btree ("campaign_brief_version_id");
--> statement-breakpoint
CREATE FUNCTION local_missions_reject_immutable_rights_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Accepted rights terms, content scope, and license history are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER legal_document_versions_immutable
BEFORE UPDATE OR DELETE ON legal_document_versions
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
--> statement-breakpoint
CREATE TRIGGER mission_rights_offers_immutable
BEFORE UPDATE OR DELETE ON mission_rights_offers
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
--> statement-breakpoint
CREATE TRIGGER mission_contract_acceptances_immutable
BEFORE UPDATE OR DELETE ON mission_contract_acceptances
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
--> statement-breakpoint
CREATE TRIGGER content_license_assets_immutable
BEFORE UPDATE OR DELETE ON content_license_assets
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
--> statement-breakpoint
CREATE TRIGGER content_license_channels_immutable
BEFORE UPDATE OR DELETE ON content_license_channels
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
--> statement-breakpoint
CREATE TRIGGER content_license_status_history_immutable
BEFORE UPDATE OR DELETE ON content_license_status_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_rights_mutation();
--> statement-breakpoint
CREATE FUNCTION local_missions_validate_rights_offer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid_offer boolean;
BEGIN
  SELECT true INTO valid_offer
    FROM mission_slots slot
    JOIN campaigns campaign ON campaign.id = slot.campaign_id AND campaign.status = 'draft'
    JOIN campaign_brief_versions brief
      ON brief.id = NEW.campaign_brief_version_id AND brief.campaign_id = campaign.id
    JOIN business_memberships member
      ON member.business_id = campaign.business_id
     AND member.user_id = NEW.created_by_user_id
     AND member.status = 'active' AND member.role IN ('owner', 'manager')
   WHERE slot.id = NEW.mission_slot_id
     AND slot.base_reward_minor = NEW.base_reward_minor_snapshot
     AND slot.currency = NEW.currency
     AND slot.bonus_reward_minor >= NEW.total_rights_bonus_minor;
  IF valid_offer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Rights offer must match a funded reward component in the same draft campaign and brief';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER mission_rights_offers_validate
BEFORE INSERT ON mission_rights_offers
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_rights_offer();
--> statement-breakpoint
CREATE FUNCTION local_missions_validate_contract_acceptance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid_acceptance boolean;
BEGIN
  SELECT true INTO valid_acceptance
    FROM mission_assignments assignment
    JOIN mission_rights_offers offer
      ON offer.id = NEW.mission_rights_offer_id
     AND offer.mission_slot_id = assignment.mission_slot_id
     AND offer.campaign_brief_version_id = assignment.campaign_brief_version_id
    JOIN legal_document_versions terms
      ON terms.id = NEW.creator_terms_document_id
     AND terms.type = 'creator_terms' AND terms.effective_at <= NEW.accepted_at
    JOIN legal_document_versions disclosure
      ON disclosure.id = NEW.disclosure_document_id
     AND disclosure.type = 'sponsorship_disclosure' AND disclosure.effective_at <= NEW.accepted_at
   WHERE assignment.id = NEW.mission_assignment_id
     AND assignment.status = 'scheduled'
     AND assignment.creator_user_id = NEW.creator_user_id
     AND assignment.campaign_brief_version_id = NEW.campaign_brief_version_id;
  IF valid_acceptance IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Contract acceptance must bind the scheduled creator, accepted brief, rights offer, and effective document versions';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER mission_contract_acceptances_validate
BEFORE INSERT ON mission_contract_acceptances
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_contract_acceptance();
--> statement-breakpoint
CREATE FUNCTION local_missions_validate_content_license_activation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid_license boolean;
BEGIN
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
  IF valid_license IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Content license requires accepted terms, final approved work, and a full creator-payable obligation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER content_licenses_validate_activation
BEFORE INSERT ON content_licenses
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_content_license_activation();
--> statement-breakpoint
CREATE FUNCTION local_missions_protect_content_license_core()
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
CREATE TRIGGER content_licenses_core_protected
BEFORE UPDATE OR DELETE ON content_licenses
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_content_license_core();
--> statement-breakpoint
CREATE FUNCTION local_missions_validate_content_license_asset()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid_asset boolean;
BEGIN
  SELECT true INTO valid_asset
    FROM content_licenses license
    JOIN media_assets media
      ON media.id = NEW.media_asset_id
     AND media.mission_assignment_id = license.mission_assignment_id
     AND media.status = 'verified'
    JOIN submission_assets submitted
      ON submitted.submission_attempt_id = license.submission_attempt_id
     AND submitted.media_asset_id = media.id
   WHERE license.id = NEW.content_license_id;
  IF valid_asset IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Licensed assets must be verified assets in the accepted final submission';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER content_license_assets_validate
BEFORE INSERT ON content_license_assets
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_content_license_asset();
--> statement-breakpoint
CREATE FUNCTION local_missions_validate_content_license_channel()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid_channel boolean;
BEGIN
  SELECT true INTO valid_channel
    FROM content_licenses license
   WHERE license.id = NEW.content_license_id
     AND (
       (license.kind = 'organic_owned_social_90d' AND NEW.channel = 'owned_social') OR
       (license.kind = 'extended_owned_media_12m'
        AND NEW.channel IN ('owned_social', 'business_website', 'business_email')) OR
       (license.kind = 'paid_advertising_30d' AND NEW.channel = 'paid_advertising')
     );
  IF valid_channel IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Channel is outside the fixed content license scope';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER content_license_channels_validate
BEFORE INSERT ON content_license_channels
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_content_license_channel();
--> statement-breakpoint
CREATE FUNCTION local_missions_validate_complete_content_license()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  asset_count integer;
  channel_count integer;
  history_count integer;
  license_kind text;
  license_status text;
  current_license_version integer;
BEGIN
  SELECT kind::text, status::text, version INTO license_kind, license_status, current_license_version
    FROM content_licenses WHERE id = NEW.id;
  SELECT count(*) INTO asset_count FROM content_license_assets WHERE content_license_id = NEW.id;
  SELECT count(*) INTO channel_count FROM content_license_channels WHERE content_license_id = NEW.id;
  SELECT count(*) INTO history_count
    FROM content_license_status_history
   WHERE content_license_id = NEW.id
     AND to_status::text = license_status AND license_version = current_license_version;
  IF asset_count < 1 OR history_count <> 1 OR
     (license_kind = 'organic_owned_social_90d' AND channel_count <> 1) OR
     (license_kind = 'extended_owned_media_12m' AND channel_count <> 3) OR
     (license_kind = 'paid_advertising_30d' AND channel_count <> 1) THEN
    RAISE EXCEPTION 'Content license requires accepted assets, exact channels, and matching immutable history';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER content_licenses_complete_deferred
AFTER INSERT OR UPDATE ON content_licenses
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_complete_content_license();
