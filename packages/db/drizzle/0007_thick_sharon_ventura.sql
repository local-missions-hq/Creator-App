CREATE TYPE "public"."local_pass_claim_status" AS ENUM('active', 'redeemed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."local_pass_claim_token_status" AS ENUM('active', 'consumed', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."local_pass_evidence_kind" AS ENUM('link_open', 'pass_claimed', 'verified_pass_redemption');--> statement-breakpoint
CREATE TYPE "public"."local_pass_fulfillment_kind" AS ENUM('original_offer', 'preapproved_substitute', 'customer_accepted_substitute');--> statement-breakpoint
CREATE TYPE "public"."local_pass_link_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."local_pass_offer_status" AS ENUM('configured', 'active', 'claims_paused', 'closed');--> statement-breakpoint
CREATE TABLE "local_pass_attribution_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"kind" "local_pass_evidence_kind" NOT NULL,
	"campaign_id" uuid NOT NULL,
	"local_pass_link_id" uuid NOT NULL,
	"local_pass_claim_id" uuid,
	"local_pass_redemption_id" uuid,
	"creator_user_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_pass_attribution_events_shape_ck" CHECK (("local_pass_attribution_events"."kind" = 'link_open'
           AND "local_pass_attribution_events"."local_pass_claim_id" IS NULL AND "local_pass_attribution_events"."local_pass_redemption_id" IS NULL) OR
          ("local_pass_attribution_events"."kind" = 'pass_claimed'
           AND "local_pass_attribution_events"."local_pass_claim_id" IS NOT NULL AND "local_pass_attribution_events"."local_pass_redemption_id" IS NULL) OR
          ("local_pass_attribution_events"."kind" = 'verified_pass_redemption'
           AND "local_pass_attribution_events"."local_pass_claim_id" IS NOT NULL AND "local_pass_attribution_events"."local_pass_redemption_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "local_pass_claim_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"local_pass_claim_id" uuid NOT NULL,
	"from_status" "local_pass_claim_status",
	"to_status" "local_pass_claim_status" NOT NULL,
	"claim_version" integer NOT NULL,
	"actor_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_pass_claim_status_history_version_ck" CHECK ("local_pass_claim_status_history"."claim_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "local_pass_claim_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"local_pass_claim_id" uuid NOT NULL,
	"rotation" integer NOT NULL,
	"token_hash" text NOT NULL,
	"status" "local_pass_claim_token_status" DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "local_pass_claim_tokens_rotation_ck" CHECK ("local_pass_claim_tokens"."rotation" > 0),
	CONSTRAINT "local_pass_claim_tokens_hash_ck" CHECK ("local_pass_claim_tokens"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "local_pass_claim_tokens_lifetime_ck" CHECK ("local_pass_claim_tokens"."expires_at" > "local_pass_claim_tokens"."issued_at" AND "local_pass_claim_tokens"."expires_at" <= "local_pass_claim_tokens"."issued_at" + interval '5 minutes'),
	CONSTRAINT "local_pass_claim_tokens_consumed_shape_ck" CHECK (("local_pass_claim_tokens"."status" = 'consumed' AND "local_pass_claim_tokens"."consumed_at" IS NOT NULL) OR
          ("local_pass_claim_tokens"."status" <> 'consumed' AND "local_pass_claim_tokens"."consumed_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "local_pass_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"local_pass_offer_id" uuid NOT NULL,
	"local_pass_link_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"customer_dedup_token" text NOT NULL,
	"token_key_version" integer NOT NULL,
	"status" "local_pass_claim_status" DEFAULT 'active' NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_pass_claims_customer_token_ck" CHECK ("local_pass_claims"."customer_dedup_token" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "local_pass_claims_key_version_ck" CHECK ("local_pass_claims"."token_key_version" > 0),
	CONSTRAINT "local_pass_claims_seven_day_ck" CHECK ("local_pass_claims"."expires_at" = "local_pass_claims"."claimed_at" + interval '7 days'),
	CONSTRAINT "local_pass_claims_status_shape_ck" CHECK (("local_pass_claims"."status" = 'active' AND "local_pass_claims"."redeemed_at" IS NULL AND "local_pass_claims"."expired_at" IS NULL) OR
          ("local_pass_claims"."status" = 'redeemed' AND "local_pass_claims"."redeemed_at" IS NOT NULL AND "local_pass_claims"."expired_at" IS NULL) OR
          ("local_pass_claims"."status" = 'expired' AND "local_pass_claims"."redeemed_at" IS NULL AND "local_pass_claims"."expired_at" IS NOT NULL)),
	CONSTRAINT "local_pass_claims_version_positive_ck" CHECK ("local_pass_claims"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "local_pass_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"local_pass_offer_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"mission_assignment_id" uuid NOT NULL,
	"creator_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"status" "local_pass_link_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "local_pass_links_token_hash_ck" CHECK ("local_pass_links"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "local_pass_links_revoked_shape_ck" CHECK (("local_pass_links"."status" = 'active' AND "local_pass_links"."revoked_at" IS NULL) OR
          ("local_pass_links"."status" = 'revoked' AND "local_pass_links"."revoked_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "local_pass_offer_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"local_pass_offer_id" uuid NOT NULL,
	"from_status" "local_pass_offer_status",
	"to_status" "local_pass_offer_status" NOT NULL,
	"offer_version" integer NOT NULL,
	"actor_id" uuid,
	"actor_type" "audit_actor_type" DEFAULT 'user' NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_pass_offer_status_history_version_ck" CHECK ("local_pass_offer_status_history"."offer_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "local_pass_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"campaign_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"business_location_id" uuid NOT NULL,
	"status" "local_pass_offer_status" DEFAULT 'configured' NOT NULL,
	"title" text NOT NULL,
	"offer_description" text NOT NULL,
	"purchase_requirement" text,
	"exclusions" text NOT NULL,
	"stated_retail_value_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"total_quantity" integer NOT NULL,
	"committed_quantity" integer DEFAULT 0 NOT NULL,
	"redeemed_quantity" integer DEFAULT 0 NOT NULL,
	"available_starts_at" timestamp with time zone NOT NULL,
	"available_ends_at" timestamp with time zone NOT NULL,
	"preapproved_substitute_description" text,
	"preapproved_substitute_value_minor" integer,
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_pass_offers_title_nonempty_ck" CHECK (length(btrim("local_pass_offers"."title")) > 0),
	CONSTRAINT "local_pass_offers_description_nonempty_ck" CHECK (length(btrim("local_pass_offers"."offer_description")) > 0 AND length(btrim("local_pass_offers"."exclusions")) > 0),
	CONSTRAINT "local_pass_offers_value_nonnegative_ck" CHECK ("local_pass_offers"."stated_retail_value_minor" >= 0),
	CONSTRAINT "local_pass_offers_currency_ck" CHECK ("local_pass_offers"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "local_pass_offers_quantity_ck" CHECK ("local_pass_offers"."total_quantity" BETWEEN 1 AND 500),
	CONSTRAINT "local_pass_offers_inventory_ck" CHECK ("local_pass_offers"."committed_quantity" >= 0 AND "local_pass_offers"."redeemed_quantity" >= 0
          AND "local_pass_offers"."redeemed_quantity" <= "local_pass_offers"."committed_quantity"
          AND "local_pass_offers"."committed_quantity" <= "local_pass_offers"."total_quantity"),
	CONSTRAINT "local_pass_offers_window_ck" CHECK ("local_pass_offers"."available_ends_at" > "local_pass_offers"."available_starts_at"),
	CONSTRAINT "local_pass_offers_substitute_ck" CHECK (("local_pass_offers"."preapproved_substitute_description" IS NULL AND "local_pass_offers"."preapproved_substitute_value_minor" IS NULL) OR
          (length(btrim("local_pass_offers"."preapproved_substitute_description")) > 0
           AND "local_pass_offers"."preapproved_substitute_value_minor" >= "local_pass_offers"."stated_retail_value_minor")),
	CONSTRAINT "local_pass_offers_version_positive_ck" CHECK ("local_pass_offers"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "local_pass_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"local_pass_claim_id" uuid NOT NULL,
	"local_pass_claim_token_id" uuid NOT NULL,
	"local_pass_offer_id" uuid NOT NULL,
	"business_location_id" uuid NOT NULL,
	"redeemed_by_user_id" uuid NOT NULL,
	"fulfillment_kind" "local_pass_fulfillment_kind" NOT NULL,
	"substitute_description" text,
	"substitute_value_minor" integer,
	"offer_confirmed" boolean NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_pass_redemptions_offer_confirmed_ck" CHECK ("local_pass_redemptions"."offer_confirmed" = true),
	CONSTRAINT "local_pass_redemptions_fulfillment_ck" CHECK (("local_pass_redemptions"."fulfillment_kind" = 'original_offer'
           AND "local_pass_redemptions"."substitute_description" IS NULL AND "local_pass_redemptions"."substitute_value_minor" IS NULL) OR
          ("local_pass_redemptions"."fulfillment_kind" <> 'original_offer'
           AND length(btrim("local_pass_redemptions"."substitute_description")) > 0
           AND "local_pass_redemptions"."substitute_value_minor" >= 0))
);
--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" ADD CONSTRAINT "local_pass_attribution_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" ADD CONSTRAINT "local_pass_attribution_events_local_pass_link_id_local_pass_links_id_fk" FOREIGN KEY ("local_pass_link_id") REFERENCES "public"."local_pass_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" ADD CONSTRAINT "local_pass_attribution_events_local_pass_claim_id_local_pass_claims_id_fk" FOREIGN KEY ("local_pass_claim_id") REFERENCES "public"."local_pass_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" ADD CONSTRAINT "local_pass_attribution_events_local_pass_redemption_id_local_pass_redemptions_id_fk" FOREIGN KEY ("local_pass_redemption_id") REFERENCES "public"."local_pass_redemptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" ADD CONSTRAINT "local_pass_attribution_events_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_claim_status_history" ADD CONSTRAINT "local_pass_claim_status_history_local_pass_claim_id_local_pass_claims_id_fk" FOREIGN KEY ("local_pass_claim_id") REFERENCES "public"."local_pass_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_claim_status_history" ADD CONSTRAINT "local_pass_claim_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_claim_tokens" ADD CONSTRAINT "local_pass_claim_tokens_local_pass_claim_id_local_pass_claims_id_fk" FOREIGN KEY ("local_pass_claim_id") REFERENCES "public"."local_pass_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_claims" ADD CONSTRAINT "local_pass_claims_local_pass_offer_id_local_pass_offers_id_fk" FOREIGN KEY ("local_pass_offer_id") REFERENCES "public"."local_pass_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_claims" ADD CONSTRAINT "local_pass_claims_local_pass_link_id_local_pass_links_id_fk" FOREIGN KEY ("local_pass_link_id") REFERENCES "public"."local_pass_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_claims" ADD CONSTRAINT "local_pass_claims_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_claims" ADD CONSTRAINT "local_pass_claims_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_links" ADD CONSTRAINT "local_pass_links_local_pass_offer_id_local_pass_offers_id_fk" FOREIGN KEY ("local_pass_offer_id") REFERENCES "public"."local_pass_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_links" ADD CONSTRAINT "local_pass_links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_links" ADD CONSTRAINT "local_pass_links_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_links" ADD CONSTRAINT "local_pass_links_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_offer_status_history" ADD CONSTRAINT "local_pass_offer_status_history_local_pass_offer_id_local_pass_offers_id_fk" FOREIGN KEY ("local_pass_offer_id") REFERENCES "public"."local_pass_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_offer_status_history" ADD CONSTRAINT "local_pass_offer_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_offers" ADD CONSTRAINT "local_pass_offers_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_offers" ADD CONSTRAINT "local_pass_offers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_offers" ADD CONSTRAINT "local_pass_offers_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_offers" ADD CONSTRAINT "local_pass_offers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_redemptions" ADD CONSTRAINT "local_pass_redemptions_local_pass_claim_id_local_pass_claims_id_fk" FOREIGN KEY ("local_pass_claim_id") REFERENCES "public"."local_pass_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_redemptions" ADD CONSTRAINT "local_pass_redemptions_local_pass_claim_token_id_local_pass_claim_tokens_id_fk" FOREIGN KEY ("local_pass_claim_token_id") REFERENCES "public"."local_pass_claim_tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_redemptions" ADD CONSTRAINT "local_pass_redemptions_local_pass_offer_id_local_pass_offers_id_fk" FOREIGN KEY ("local_pass_offer_id") REFERENCES "public"."local_pass_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_redemptions" ADD CONSTRAINT "local_pass_redemptions_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_redemptions" ADD CONSTRAINT "local_pass_redemptions_redeemed_by_user_id_users_id_fk" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_attribution_events_public_id_uq" ON "local_pass_attribution_events" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_attribution_events_claim_kind_uq" ON "local_pass_attribution_events" USING btree ("local_pass_claim_id","kind") WHERE "local_pass_attribution_events"."local_pass_claim_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "local_pass_attribution_events_campaign_kind_idx" ON "local_pass_attribution_events" USING btree ("campaign_id","kind","occurred_at");--> statement-breakpoint
CREATE INDEX "local_pass_attribution_events_creator_kind_idx" ON "local_pass_attribution_events" USING btree ("creator_user_id","kind","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_claim_status_history_version_uq" ON "local_pass_claim_status_history" USING btree ("local_pass_claim_id","claim_version");--> statement-breakpoint
CREATE INDEX "local_pass_claim_status_history_timeline_idx" ON "local_pass_claim_status_history" USING btree ("local_pass_claim_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_claim_tokens_public_id_uq" ON "local_pass_claim_tokens" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_claim_tokens_hash_uq" ON "local_pass_claim_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_claim_tokens_claim_rotation_uq" ON "local_pass_claim_tokens" USING btree ("local_pass_claim_id","rotation");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_claim_tokens_one_active_uq" ON "local_pass_claim_tokens" USING btree ("local_pass_claim_id") WHERE "local_pass_claim_tokens"."status" = 'active';--> statement-breakpoint
CREATE INDEX "local_pass_claim_tokens_status_expiry_idx" ON "local_pass_claim_tokens" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_claims_public_id_uq" ON "local_pass_claims" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_claims_campaign_customer_uq" ON "local_pass_claims" USING btree ("campaign_id","customer_dedup_token");--> statement-breakpoint
CREATE INDEX "local_pass_claims_offer_status_expiry_idx" ON "local_pass_claims" USING btree ("local_pass_offer_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "local_pass_claims_creator_status_idx" ON "local_pass_claims" USING btree ("creator_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_links_public_id_uq" ON "local_pass_links" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_links_token_hash_uq" ON "local_pass_links" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_links_assignment_uq" ON "local_pass_links" USING btree ("mission_assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_links_campaign_creator_uq" ON "local_pass_links" USING btree ("campaign_id","creator_user_id");--> statement-breakpoint
CREATE INDEX "local_pass_links_offer_status_idx" ON "local_pass_links" USING btree ("local_pass_offer_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_offer_status_history_version_uq" ON "local_pass_offer_status_history" USING btree ("local_pass_offer_id","offer_version");--> statement-breakpoint
CREATE INDEX "local_pass_offer_status_history_timeline_idx" ON "local_pass_offer_status_history" USING btree ("local_pass_offer_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_offers_public_id_uq" ON "local_pass_offers" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_offers_campaign_uq" ON "local_pass_offers" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "local_pass_offers_location_status_idx" ON "local_pass_offers" USING btree ("business_location_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_redemptions_public_id_uq" ON "local_pass_redemptions" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_redemptions_claim_uq" ON "local_pass_redemptions" USING btree ("local_pass_claim_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_redemptions_token_uq" ON "local_pass_redemptions" USING btree ("local_pass_claim_token_id");--> statement-breakpoint
CREATE INDEX "local_pass_redemptions_offer_occurred_idx" ON "local_pass_redemptions" USING btree ("local_pass_offer_id","occurred_at");
--> statement-breakpoint
CREATE FUNCTION local_missions_reject_immutable_local_pass_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Local Pass evidence and history are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER local_pass_offer_history_immutable
BEFORE UPDATE OR DELETE ON local_pass_offer_status_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_local_pass_mutation();
--> statement-breakpoint
CREATE TRIGGER local_pass_claim_history_immutable
BEFORE UPDATE OR DELETE ON local_pass_claim_status_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_local_pass_mutation();
--> statement-breakpoint
CREATE TRIGGER local_pass_redemptions_immutable
BEFORE UPDATE OR DELETE ON local_pass_redemptions
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_local_pass_mutation();
--> statement-breakpoint
CREATE TRIGGER local_pass_attribution_events_immutable
BEFORE UPDATE OR DELETE ON local_pass_attribution_events
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_local_pass_mutation();
--> statement-breakpoint
CREATE FUNCTION local_missions_protect_local_pass_core()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Local Pass core records cannot be deleted';
  END IF;

  IF TG_TABLE_NAME = 'local_pass_offers' AND
    (to_jsonb(NEW) - ARRAY['status', 'committed_quantity', 'redeemed_quantity', 'version', 'updated_at'])
      IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['status', 'committed_quantity', 'redeemed_quantity', 'version', 'updated_at'])
  THEN
    RAISE EXCEPTION 'Published Local Pass offer terms are immutable';
  END IF;

  IF TG_TABLE_NAME = 'local_pass_links' AND
    (to_jsonb(NEW) - ARRAY['status', 'revoked_at']) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['status', 'revoked_at'])
  THEN
    RAISE EXCEPTION 'Local Pass creator attribution is immutable';
  END IF;

  IF TG_TABLE_NAME = 'local_pass_claims' AND
    (to_jsonb(NEW) - ARRAY['status', 'redeemed_at', 'expired_at', 'version', 'updated_at'])
      IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['status', 'redeemed_at', 'expired_at', 'version', 'updated_at'])
  THEN
    RAISE EXCEPTION 'Local Pass claim identity and attribution are immutable';
  END IF;

  IF TG_TABLE_NAME = 'local_pass_claim_tokens' AND
    (to_jsonb(NEW) - ARRAY['status', 'consumed_at']) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['status', 'consumed_at'])
  THEN
    RAISE EXCEPTION 'Local Pass rotating token identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER local_pass_offers_core_protected
BEFORE UPDATE OR DELETE ON local_pass_offers
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_local_pass_core();
--> statement-breakpoint
CREATE TRIGGER local_pass_links_core_protected
BEFORE UPDATE OR DELETE ON local_pass_links
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_local_pass_core();
--> statement-breakpoint
CREATE TRIGGER local_pass_claims_core_protected
BEFORE UPDATE OR DELETE ON local_pass_claims
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_local_pass_core();
--> statement-breakpoint
CREATE TRIGGER local_pass_claim_tokens_core_protected
BEFORE UPDATE OR DELETE ON local_pass_claim_tokens
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_local_pass_core();
