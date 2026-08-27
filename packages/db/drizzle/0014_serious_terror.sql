CREATE TYPE "public"."local_pass_challenge_purpose" AS ENUM('claim', 'recovery', 'refusal_report', 'substitute_acceptance', 'status_access');--> statement-breakpoint
CREATE TYPE "public"."local_pass_challenge_status" AS ENUM('pending', 'verified', 'consumed', 'superseded', 'locked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."local_pass_incident_reason" AS ENUM('offer_refused', 'incorrect_substitute', 'incorrect_redemption');--> statement-breakpoint
CREATE TYPE "public"."local_pass_incident_status" AS ENUM('open', 'confirmed', 'dismissed');--> statement-breakpoint
ALTER TYPE "public"."platform_staff_role" ADD VALUE 'trust_safety_reviewer' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "local_pass_customer_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"local_pass_link_id" uuid,
	"local_pass_claim_id" uuid,
	"campaign_id" uuid NOT NULL,
	"purpose" "local_pass_challenge_purpose" NOT NULL,
	"status" "local_pass_challenge_status" DEFAULT 'pending' NOT NULL,
	"destination_dedup_token" text,
	"destination_token_key_version" integer,
	"destination_ciphertext" text,
	"risk_dedup_token" text,
	"risk_token_key_version" integer,
	"otp_digest" text,
	"send_number" integer NOT NULL,
	"verify_attempt_count" integer DEFAULT 0 NOT NULL,
	"max_verify_attempts" integer DEFAULT 5 NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resend_not_before" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"contact_delete_after" timestamp with time zone NOT NULL,
	"contact_deleted_at" timestamp with time zone,
	"linkage_delete_after" timestamp with time zone NOT NULL,
	"linkage_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_pass_customer_challenges_target_ck" CHECK (("local_pass_customer_challenges"."purpose" = 'claim' AND "local_pass_customer_challenges"."local_pass_link_id" IS NOT NULL AND "local_pass_customer_challenges"."local_pass_claim_id" IS NULL)
          OR ("local_pass_customer_challenges"."purpose" <> 'claim' AND "local_pass_customer_challenges"."local_pass_claim_id" IS NOT NULL)),
	CONSTRAINT "local_pass_customer_challenges_private_tokens_ck" CHECK (("local_pass_customer_challenges"."destination_dedup_token" IS NULL AND "local_pass_customer_challenges"."destination_token_key_version" IS NULL
           AND "local_pass_customer_challenges"."risk_dedup_token" IS NULL AND "local_pass_customer_challenges"."risk_token_key_version" IS NULL AND "local_pass_customer_challenges"."otp_digest" IS NULL)
          OR ("local_pass_customer_challenges"."destination_dedup_token" ~ '^[a-f0-9]{64}$' AND "local_pass_customer_challenges"."destination_token_key_version" > 0
              AND "local_pass_customer_challenges"."risk_dedup_token" ~ '^[a-f0-9]{64}$' AND "local_pass_customer_challenges"."risk_token_key_version" > 0
              AND "local_pass_customer_challenges"."otp_digest" ~ '^[a-f0-9]{64}$')),
	CONSTRAINT "local_pass_customer_challenges_ciphertext_ck" CHECK ("local_pass_customer_challenges"."destination_ciphertext" IS NULL OR
          ("local_pass_customer_challenges"."destination_ciphertext" ~ '^enc:v[0-9]+:[A-Za-z0-9_+/=-]+$'
           AND length("local_pass_customer_challenges"."destination_ciphertext") BETWEEN 23 AND 2060)),
	CONSTRAINT "local_pass_customer_challenges_attempts_ck" CHECK ("local_pass_customer_challenges"."send_number" BETWEEN 1 AND 3 AND "local_pass_customer_challenges"."max_verify_attempts" BETWEEN 1 AND 5
          AND "local_pass_customer_challenges"."verify_attempt_count" BETWEEN 0 AND "local_pass_customer_challenges"."max_verify_attempts"),
	CONSTRAINT "local_pass_customer_challenges_window_ck" CHECK ("local_pass_customer_challenges"."resend_not_before" = "local_pass_customer_challenges"."issued_at" + interval '60 seconds'
          AND "local_pass_customer_challenges"."expires_at" = "local_pass_customer_challenges"."issued_at" + interval '5 minutes'
          AND "local_pass_customer_challenges"."contact_delete_after" >= "local_pass_customer_challenges"."expires_at" + interval '30 days'
          AND "local_pass_customer_challenges"."linkage_delete_after" >= "local_pass_customer_challenges"."expires_at" + interval '12 months'),
	CONSTRAINT "local_pass_customer_challenges_status_ck" CHECK (("local_pass_customer_challenges"."status" = 'verified' AND "local_pass_customer_challenges"."verified_at" IS NOT NULL AND "local_pass_customer_challenges"."consumed_at" IS NULL)
          OR ("local_pass_customer_challenges"."status" = 'consumed' AND "local_pass_customer_challenges"."verified_at" IS NOT NULL AND "local_pass_customer_challenges"."consumed_at" IS NOT NULL)
          OR ("local_pass_customer_challenges"."status" NOT IN ('verified','consumed') AND "local_pass_customer_challenges"."consumed_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "local_pass_fulfillment_incident_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"local_pass_fulfillment_incident_id" uuid NOT NULL,
	"from_status" "local_pass_incident_status",
	"to_status" "local_pass_incident_status" NOT NULL,
	"incident_version" integer NOT NULL,
	"actor_user_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_pass_fulfillment_incident_history_reason_ck" CHECK (length(btrim("local_pass_fulfillment_incident_history"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "local_pass_fulfillment_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"local_pass_claim_id" uuid NOT NULL,
	"local_pass_offer_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"business_location_id" uuid NOT NULL,
	"customer_challenge_id" uuid NOT NULL,
	"reason" "local_pass_incident_reason" NOT NULL,
	"status" "local_pass_incident_status" DEFAULT 'open' NOT NULL,
	"customer_statement" text NOT NULL,
	"intentional" boolean,
	"reviewed_by_user_id" uuid,
	"review_reason" text,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "local_pass_fulfillment_incidents_statement_ck" CHECK (length(btrim("local_pass_fulfillment_incidents"."customer_statement")) BETWEEN 10 AND 1000),
	CONSTRAINT "local_pass_fulfillment_incidents_review_ck" CHECK (("local_pass_fulfillment_incidents"."status" = 'open' AND "local_pass_fulfillment_incidents"."reviewed_by_user_id" IS NULL AND "local_pass_fulfillment_incidents"."reviewed_at" IS NULL
           AND "local_pass_fulfillment_incidents"."review_reason" IS NULL AND "local_pass_fulfillment_incidents"."intentional" IS NULL)
          OR ("local_pass_fulfillment_incidents"."status" <> 'open' AND "local_pass_fulfillment_incidents"."reviewed_by_user_id" IS NOT NULL AND "local_pass_fulfillment_incidents"."reviewed_at" IS NOT NULL
              AND length(btrim("local_pass_fulfillment_incidents"."review_reason")) BETWEEN 10 AND 1000 AND "local_pass_fulfillment_incidents"."intentional" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "local_pass_claims" DROP CONSTRAINT "local_pass_claims_customer_token_ck";--> statement-breakpoint
ALTER TABLE "local_pass_claims" DROP CONSTRAINT "local_pass_claims_key_version_ck";--> statement-breakpoint
ALTER TABLE "local_pass_claims" ALTER COLUMN "customer_dedup_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "local_pass_claims" ALTER COLUMN "token_key_version" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "local_pass_claims" ADD COLUMN "customer_linkage_delete_after" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "local_pass_claims" ADD COLUMN "customer_linkage_deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "local_pass_customer_challenges" ADD CONSTRAINT "local_pass_customer_challenges_local_pass_link_id_local_pass_links_id_fk" FOREIGN KEY ("local_pass_link_id") REFERENCES "public"."local_pass_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_customer_challenges" ADD CONSTRAINT "local_pass_customer_challenges_local_pass_claim_id_local_pass_claims_id_fk" FOREIGN KEY ("local_pass_claim_id") REFERENCES "public"."local_pass_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_customer_challenges" ADD CONSTRAINT "local_pass_customer_challenges_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incident_history" ADD CONSTRAINT "local_pass_fulfillment_incident_history_local_pass_fulfillment_incident_id_local_pass_fulfillment_incidents_id_fk" FOREIGN KEY ("local_pass_fulfillment_incident_id") REFERENCES "public"."local_pass_fulfillment_incidents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incident_history" ADD CONSTRAINT "local_pass_fulfillment_incident_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incidents" ADD CONSTRAINT "local_pass_fulfillment_incidents_local_pass_claim_id_local_pass_claims_id_fk" FOREIGN KEY ("local_pass_claim_id") REFERENCES "public"."local_pass_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incidents" ADD CONSTRAINT "local_pass_fulfillment_incidents_local_pass_offer_id_local_pass_offers_id_fk" FOREIGN KEY ("local_pass_offer_id") REFERENCES "public"."local_pass_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incidents" ADD CONSTRAINT "local_pass_fulfillment_incidents_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incidents" ADD CONSTRAINT "local_pass_fulfillment_incidents_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incidents" ADD CONSTRAINT "local_pass_fulfillment_incidents_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incidents" ADD CONSTRAINT "local_pass_fulfillment_incidents_customer_challenge_id_local_pass_customer_challenges_id_fk" FOREIGN KEY ("customer_challenge_id") REFERENCES "public"."local_pass_customer_challenges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_pass_fulfillment_incidents" ADD CONSTRAINT "local_pass_fulfillment_incidents_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_customer_challenges_public_id_uq" ON "local_pass_customer_challenges" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "local_pass_customer_challenges_destination_rate_idx" ON "local_pass_customer_challenges" USING btree ("destination_dedup_token","issued_at");--> statement-breakpoint
CREATE INDEX "local_pass_customer_challenges_risk_rate_idx" ON "local_pass_customer_challenges" USING btree ("risk_dedup_token","issued_at");--> statement-breakpoint
CREATE INDEX "local_pass_customer_challenges_claim_idx" ON "local_pass_customer_challenges" USING btree ("local_pass_claim_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_fulfillment_incident_history_version_uq" ON "local_pass_fulfillment_incident_history" USING btree ("local_pass_fulfillment_incident_id","incident_version");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_fulfillment_incidents_public_id_uq" ON "local_pass_fulfillment_incidents" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_fulfillment_incidents_challenge_uq" ON "local_pass_fulfillment_incidents" USING btree ("customer_challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_pass_fulfillment_incidents_one_open_claim_uq" ON "local_pass_fulfillment_incidents" USING btree ("local_pass_claim_id") WHERE "local_pass_fulfillment_incidents"."status" = 'open';--> statement-breakpoint
CREATE INDEX "local_pass_fulfillment_incidents_business_status_idx" ON "local_pass_fulfillment_incidents" USING btree ("business_id","status","reported_at");--> statement-breakpoint
ALTER TABLE "local_pass_claims" ADD CONSTRAINT "local_pass_claims_customer_token_ck" CHECK ("local_pass_claims"."customer_dedup_token" IS NULL OR "local_pass_claims"."customer_dedup_token" ~ '^[a-f0-9]{64}$');--> statement-breakpoint
ALTER TABLE "local_pass_claims" ADD CONSTRAINT "local_pass_claims_key_version_ck" CHECK (("local_pass_claims"."customer_dedup_token" IS NULL AND "local_pass_claims"."token_key_version" IS NULL) OR
          ("local_pass_claims"."customer_dedup_token" IS NOT NULL AND "local_pass_claims"."token_key_version" > 0));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION local_missions_protect_local_pass_core()
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
    (to_jsonb(NEW) - ARRAY[
      'status', 'redeemed_at', 'expired_at', 'version', 'updated_at',
      'customer_dedup_token', 'token_key_version', 'customer_linkage_delete_after',
      'customer_linkage_deleted_at'
    ]) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY[
      'status', 'redeemed_at', 'expired_at', 'version', 'updated_at',
      'customer_dedup_token', 'token_key_version', 'customer_linkage_delete_after',
      'customer_linkage_deleted_at'
    ])
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
CREATE TRIGGER local_pass_fulfillment_incident_history_immutable
BEFORE UPDATE OR DELETE ON local_pass_fulfillment_incident_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_immutable_local_pass_mutation();
--> statement-breakpoint
CREATE FUNCTION local_missions_protect_local_pass_claim_edges()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Local Pass claim-edge records cannot be deleted';
  END IF;

  IF TG_TABLE_NAME = 'local_pass_customer_challenges' AND
    (to_jsonb(NEW) - ARRAY[
      'status', 'verify_attempt_count', 'verified_at', 'consumed_at',
      'destination_ciphertext', 'contact_deleted_at', 'destination_dedup_token',
      'destination_token_key_version', 'risk_dedup_token', 'risk_token_key_version',
      'otp_digest', 'linkage_deleted_at', 'contact_delete_after', 'linkage_delete_after'
    ]) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY[
      'status', 'verify_attempt_count', 'verified_at', 'consumed_at',
      'destination_ciphertext', 'contact_deleted_at', 'destination_dedup_token',
      'destination_token_key_version', 'risk_dedup_token', 'risk_token_key_version',
      'otp_digest', 'linkage_deleted_at', 'contact_delete_after', 'linkage_delete_after'
    ])
  THEN
    RAISE EXCEPTION 'Local Pass customer challenge identity is immutable';
  END IF;

  IF TG_TABLE_NAME = 'local_pass_fulfillment_incidents' AND
    (to_jsonb(NEW) - ARRAY[
      'status', 'intentional', 'reviewed_by_user_id', 'review_reason', 'reviewed_at', 'version'
    ]) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY[
      'status', 'intentional', 'reviewed_by_user_id', 'review_reason', 'reviewed_at', 'version'
    ])
  THEN
    RAISE EXCEPTION 'Local Pass fulfillment evidence is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER local_pass_customer_challenges_core_protected
BEFORE UPDATE OR DELETE ON local_pass_customer_challenges
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_local_pass_claim_edges();
--> statement-breakpoint
CREATE TRIGGER local_pass_fulfillment_incidents_core_protected
BEFORE UPDATE OR DELETE ON local_pass_fulfillment_incidents
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_local_pass_claim_edges();
