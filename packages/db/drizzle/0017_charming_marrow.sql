CREATE TYPE "public"."local_pass_attribution_confidence" AS ENUM('observed_link_open', 'verified_claim', 'verified_redemption');--> statement-breakpoint
CREATE TYPE "public"."venue_contact_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "venue_contact_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_contact_id" uuid NOT NULL,
	"from_status" "venue_contact_status",
	"to_status" "venue_contact_status" NOT NULL,
	"contact_version" integer NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_contact_status_history_version_ck" CHECK ("venue_contact_status_history"."contact_version" > 0),
	CONSTRAINT "venue_contact_status_history_reason_ck" CHECK (length(btrim("venue_contact_status_history"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "venue_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"business_id" uuid NOT NULL,
	"business_location_id" uuid NOT NULL,
	"business_membership_id" uuid NOT NULL,
	"status" "venue_contact_status" DEFAULT 'active' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "venue_contacts_status_shape_ck" CHECK (("venue_contacts"."status" = 'active' AND "venue_contacts"."revoked_at" IS NULL) OR
          ("venue_contacts"."status" = 'revoked' AND "venue_contacts"."revoked_at" IS NOT NULL)),
	CONSTRAINT "venue_contacts_version_positive_ck" CHECK ("venue_contacts"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" DROP CONSTRAINT "local_pass_attribution_events_shape_ck";--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" ADD COLUMN "confidence" "local_pass_attribution_confidence";--> statement-breakpoint
UPDATE "local_pass_attribution_events"
   SET "confidence" = CASE "kind"::text
     WHEN 'link_open' THEN 'observed_link_open'::"local_pass_attribution_confidence"
     WHEN 'pass_claimed' THEN 'verified_claim'::"local_pass_attribution_confidence"
     WHEN 'verified_pass_redemption' THEN 'verified_redemption'::"local_pass_attribution_confidence"
   END;--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" ALTER COLUMN "confidence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "venue_contact_status_history" ADD CONSTRAINT "venue_contact_status_history_venue_contact_id_venue_contacts_id_fk" FOREIGN KEY ("venue_contact_id") REFERENCES "public"."venue_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_contact_status_history" ADD CONSTRAINT "venue_contact_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_contacts" ADD CONSTRAINT "venue_contacts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_contacts" ADD CONSTRAINT "venue_contacts_business_location_id_business_locations_id_fk" FOREIGN KEY ("business_location_id") REFERENCES "public"."business_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_contacts" ADD CONSTRAINT "venue_contacts_business_membership_id_business_memberships_id_fk" FOREIGN KEY ("business_membership_id") REFERENCES "public"."business_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "venue_contact_status_history_version_uq" ON "venue_contact_status_history" USING btree ("venue_contact_id","contact_version");--> statement-breakpoint
CREATE INDEX "venue_contact_status_history_timeline_idx" ON "venue_contact_status_history" USING btree ("venue_contact_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_contacts_public_id_uq" ON "venue_contacts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_contacts_active_location_member_uq" ON "venue_contacts" USING btree ("business_location_id","business_membership_id") WHERE "venue_contacts"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "venue_contacts_active_primary_location_uq" ON "venue_contacts" USING btree ("business_location_id") WHERE "venue_contacts"."status" = 'active' AND "venue_contacts"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "venue_contacts_business_status_idx" ON "venue_contacts" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "audit_events_subject_timeline_idx" ON "audit_events" USING btree ("subject_type","subject_id","occurred_at");--> statement-breakpoint
CREATE FUNCTION local_missions_validate_venue_contact_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM business_locations location
      JOIN business_memberships membership
        ON membership.id = NEW.business_membership_id
       AND membership.business_id = location.business_id
       AND membership.status = 'active'
     WHERE location.id = NEW.business_location_id
       AND location.business_id = NEW.business_id
       AND location.is_active = true
  ) THEN
    RAISE EXCEPTION 'Venue contact requires an active same-business location and membership';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER venue_contacts_validate_scope
BEFORE INSERT OR UPDATE OF business_id, business_location_id, business_membership_id
ON venue_contacts
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_venue_contact_scope();--> statement-breakpoint
CREATE FUNCTION local_missions_protect_venue_contact()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Venue contacts cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status', 'revoked_at', 'version', 'updated_at'])
       IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status', 'revoked_at', 'version', 'updated_at'])
  THEN
    RAISE EXCEPTION 'Venue contact scope is immutable';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      OLD.status = 'active'
      AND NEW.status = 'revoked'
      AND OLD.revoked_at IS NULL
      AND NEW.revoked_at IS NOT NULL
      AND NEW.version = OLD.version + 1
    ) THEN
      RAISE EXCEPTION 'Illegal venue contact status transition';
    END IF;
  ELSIF NEW.revoked_at IS DISTINCT FROM OLD.revoked_at OR NEW.version <> OLD.version THEN
    RAISE EXCEPTION 'Venue contact status fields require a legal transition';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER venue_contacts_protect
BEFORE UPDATE OR DELETE ON venue_contacts
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_venue_contact();--> statement-breakpoint
CREATE FUNCTION local_missions_reject_venue_contact_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Venue contact history is immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER venue_contact_status_history_immutable
BEFORE UPDATE OR DELETE ON venue_contact_status_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_venue_contact_history_mutation();--> statement-breakpoint
ALTER TABLE "local_pass_attribution_events" ADD CONSTRAINT "local_pass_attribution_events_shape_ck" CHECK (("local_pass_attribution_events"."kind" = 'link_open'
           AND "local_pass_attribution_events"."confidence" = 'observed_link_open'
           AND "local_pass_attribution_events"."local_pass_claim_id" IS NULL AND "local_pass_attribution_events"."local_pass_redemption_id" IS NULL) OR
          ("local_pass_attribution_events"."kind" = 'pass_claimed'
           AND "local_pass_attribution_events"."confidence" = 'verified_claim'
           AND "local_pass_attribution_events"."local_pass_claim_id" IS NOT NULL AND "local_pass_attribution_events"."local_pass_redemption_id" IS NULL) OR
          ("local_pass_attribution_events"."kind" = 'verified_pass_redemption'
           AND "local_pass_attribution_events"."confidence" = 'verified_redemption'
           AND "local_pass_attribution_events"."local_pass_claim_id" IS NOT NULL AND "local_pass_attribution_events"."local_pass_redemption_id" IS NOT NULL));
