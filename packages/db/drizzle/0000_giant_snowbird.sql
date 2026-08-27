CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'service', 'provider');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'submitted', 'approved', 'funded', 'published', 'canceled');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"action" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "businesses_version_positive_ck" CHECK ("businesses"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "campaign_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"from_status" "campaign_status",
	"to_status" "campaign_status" NOT NULL,
	"campaign_version" integer NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_status_history_version_positive_ck" CHECK ("campaign_status_history"."campaign_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"business_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"creator_reward_pool_minor" integer NOT NULL,
	"platform_fee_minor" integer NOT NULL,
	"total_due_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"slot_count" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_reward_pool_nonnegative_ck" CHECK ("campaigns"."creator_reward_pool_minor" >= 0),
	CONSTRAINT "campaigns_platform_fee_nonnegative_ck" CHECK ("campaigns"."platform_fee_minor" >= 0),
	CONSTRAINT "campaigns_total_due_matches_ck" CHECK ("campaigns"."total_due_minor" = "campaigns"."creator_reward_pool_minor" + "campaigns"."platform_fee_minor"),
	CONSTRAINT "campaigns_slot_count_pilot_ck" CHECK ("campaigns"."slot_count" BETWEEN 1 AND 20),
	CONSTRAINT "campaigns_version_positive_ck" CHECK ("campaigns"."version" > 0),
	CONSTRAINT "campaigns_currency_iso_ck" CHECK ("campaigns"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "idempotency_records_response_status_ck" CHECK ("idempotency_records"."response_status" IS NULL OR "idempotency_records"."response_status" BETWEEN 200 AND 599)
);
--> statement-breakpoint
ALTER TABLE "campaign_status_history" ADD CONSTRAINT "campaign_status_history_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_subject_idx" ON "audit_events" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_public_id_uq" ON "businesses" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_status_history_version_uq" ON "campaign_status_history" USING btree ("campaign_id","campaign_version");--> statement-breakpoint
CREATE INDEX "campaign_status_history_timeline_idx" ON "campaign_status_history" USING btree ("campaign_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_public_id_uq" ON "campaigns" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "campaigns_business_status_idx" ON "campaigns" USING btree ("business_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_operation_key_uq" ON "idempotency_records" USING btree ("operation","idempotency_key");