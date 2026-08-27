CREATE TYPE "public"."business_membership_role" AS ENUM('owner', 'manager', 'venue_staff');--> statement-breakpoint
CREATE TYPE "public"."business_membership_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."creator_profile_status" AS ENUM('invited', 'onboarding', 'approved', 'paused', 'denied');--> statement-breakpoint
CREATE TYPE "public"."identity_provider" AS ENUM('apple', 'google', 'microsoft', 'passwordless_email');--> statement-breakpoint
CREATE TYPE "public"."locality_status" AS ENUM('unverified', 'pending', 'verified', 'expired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payout_onboarding_status" AS ENUM('not_started', 'pending', 'ready', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled', 'deletion_requested');--> statement-breakpoint
CREATE TABLE "business_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" text NOT NULL,
	"region" text NOT NULL,
	"postal_code" text NOT NULL,
	"timezone" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "business_locations_name_nonempty_ck" CHECK (length(btrim("business_locations"."name")) > 0),
	CONSTRAINT "business_locations_region_ck" CHECK ("business_locations"."region" ~ '^[A-Z]{2}$'),
	CONSTRAINT "business_locations_postal_code_ck" CHECK ("business_locations"."postal_code" ~ '^[0-9]{5}$'),
	CONSTRAINT "business_locations_version_positive_ck" CHECK ("business_locations"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "business_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "business_membership_role" NOT NULL,
	"status" "business_membership_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "business_memberships_version_positive_ck" CHECK ("business_memberships"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "creator_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"status" "creator_profile_status" DEFAULT 'invited' NOT NULL,
	"locality_status" "locality_status" DEFAULT 'unverified' NOT NULL,
	"verified_postal_area" text,
	"locality_verified_at" timestamp with time zone,
	"locality_expires_at" timestamp with time zone,
	"payout_onboarding_status" "payout_onboarding_status" DEFAULT 'not_started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "creator_profiles_postal_area_ck" CHECK ("creator_profiles"."verified_postal_area" IS NULL OR "creator_profiles"."verified_postal_area" ~ '^[0-9]{5}$'),
	CONSTRAINT "creator_profiles_verified_locality_ck" CHECK ("creator_profiles"."locality_status" <> 'verified' OR (
        "creator_profiles"."verified_postal_area" IS NOT NULL AND
        "creator_profiles"."locality_verified_at" IS NOT NULL AND
        "creator_profiles"."locality_expires_at" > "creator_profiles"."locality_verified_at"
      )),
	CONSTRAINT "creator_profiles_version_positive_ck" CHECK ("creator_profiles"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "external_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_identities_issuer_nonempty_ck" CHECK (length(btrim("external_identities"."issuer")) > 0),
	CONSTRAINT "external_identities_subject_nonempty_ck" CHECK (length(btrim("external_identities"."subject")) > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "users_public_id_nonempty_ck" CHECK (length(btrim("users"."public_id")) > 0),
	CONSTRAINT "users_version_positive_ck" CHECK ("users"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_locations_public_id_uq" ON "business_locations" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "business_locations_business_active_idx" ON "business_locations" USING btree ("business_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "business_memberships_business_user_uq" ON "business_memberships" USING btree ("business_id","user_id");--> statement-breakpoint
CREATE INDEX "business_memberships_user_status_idx" ON "business_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_profiles_public_id_uq" ON "creator_profiles" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "creator_profiles_locality_status_idx" ON "creator_profiles" USING btree ("locality_status");--> statement-breakpoint
CREATE UNIQUE INDEX "external_identities_issuer_subject_uq" ON "external_identities" USING btree ("issuer","subject");--> statement-breakpoint
CREATE UNIQUE INDEX "external_identities_user_provider_uq" ON "external_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "external_identities_user_idx" ON "external_identities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_public_id_uq" ON "users" USING btree ("public_id");