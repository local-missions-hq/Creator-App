CREATE TYPE "public"."ledger_account_code" AS ENUM('provider_clearing', 'campaign_funds', 'creator_payable', 'business_refund_payable', 'platform_fee_revenue', 'finance_adjustment_control');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."ledger_transaction_source_type" AS ENUM('provider_funding', 'financial_action_intent', 'finance_adjustment');--> statement-breakpoint
CREATE TYPE "public"."ledger_transaction_type" AS ENUM('campaign_funding', 'slot_completion', 'slot_refund', 'finance_adjustment');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe');--> statement-breakpoint
CREATE TYPE "public"."payment_provider_object_type" AS ENUM('payment_intent', 'charge', 'transfer', 'refund', 'payout', 'dispute');--> statement-breakpoint
ALTER TYPE "public"."financial_action_intent_status" ADD VALUE 'posted';--> statement-breakpoint
ALTER TYPE "public"."platform_staff_role" ADD VALUE 'finance_operator' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "campaign_funding_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"campaign_id" uuid NOT NULL,
	"payment_provider_reference_id" uuid NOT NULL,
	"provider_event_id" text NOT NULL,
	"transfer_group" text NOT NULL,
	"creator_reward_pool_minor" integer NOT NULL,
	"platform_fee_minor" integer NOT NULL,
	"total_due_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"funded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_funding_snapshots_total_ck" CHECK ("campaign_funding_snapshots"."total_due_minor" = "campaign_funding_snapshots"."creator_reward_pool_minor" + "campaign_funding_snapshots"."platform_fee_minor"),
	CONSTRAINT "campaign_funding_snapshots_amounts_positive_ck" CHECK ("campaign_funding_snapshots"."creator_reward_pool_minor" > 0 AND "campaign_funding_snapshots"."platform_fee_minor" > 0),
	CONSTRAINT "campaign_funding_snapshots_currency_ck" CHECK ("campaign_funding_snapshots"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "campaign_funding_snapshots_provider_event_nonempty_ck" CHECK (length(btrim("campaign_funding_snapshots"."provider_event_id")) > 0),
	CONSTRAINT "campaign_funding_snapshots_transfer_group_nonempty_ck" CHECK (length(btrim("campaign_funding_snapshots"."transfer_group")) > 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"code" "ledger_account_code" NOT NULL,
	"campaign_id" uuid,
	"creator_user_id" uuid,
	"business_id" uuid,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_accounts_currency_ck" CHECK ("ledger_accounts"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "ledger_accounts_scope_ck" CHECK ((
        "ledger_accounts"."code" IN ('provider_clearing', 'platform_fee_revenue', 'finance_adjustment_control')
        AND "ledger_accounts"."campaign_id" IS NULL AND "ledger_accounts"."creator_user_id" IS NULL AND "ledger_accounts"."business_id" IS NULL
      ) OR (
        "ledger_accounts"."code" = 'campaign_funds' AND "ledger_accounts"."campaign_id" IS NOT NULL
        AND "ledger_accounts"."creator_user_id" IS NULL AND "ledger_accounts"."business_id" IS NULL
      ) OR (
        "ledger_accounts"."code" = 'creator_payable' AND "ledger_accounts"."creator_user_id" IS NOT NULL
        AND "ledger_accounts"."campaign_id" IS NULL AND "ledger_accounts"."business_id" IS NULL
      ) OR (
        "ledger_accounts"."code" = 'business_refund_payable' AND "ledger_accounts"."business_id" IS NOT NULL
        AND "ledger_accounts"."campaign_id" IS NULL AND "ledger_accounts"."creator_user_id" IS NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"ledger_transaction_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"ledger_account_id" uuid NOT NULL,
	"direction" "ledger_entry_direction" NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"slot_funding_allocation_id" uuid,
	"mission_assignment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_position_positive_ck" CHECK ("ledger_entries"."position" > 0),
	CONSTRAINT "ledger_entries_amount_positive_ck" CHECK ("ledger_entries"."amount_minor" > 0),
	CONSTRAINT "ledger_entries_currency_ck" CHECK ("ledger_entries"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"type" "ledger_transaction_type" NOT NULL,
	"source_type" "ledger_transaction_source_type" NOT NULL,
	"source_public_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"payment_provider_reference_id" uuid,
	"campaign_id" uuid,
	"mission_assignment_id" uuid,
	"total_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_transactions_total_positive_ck" CHECK ("ledger_transactions"."total_minor" > 0),
	CONSTRAINT "ledger_transactions_currency_ck" CHECK ("ledger_transactions"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "ledger_transactions_source_nonempty_ck" CHECK (length(btrim("ledger_transactions"."source_public_id")) > 0 AND length(btrim("ledger_transactions"."request_hash")) > 0),
	CONSTRAINT "ledger_transactions_shape_ck" CHECK ((
        "ledger_transactions"."type" = 'campaign_funding' AND "ledger_transactions"."source_type" = 'provider_funding'
        AND "ledger_transactions"."payment_provider_reference_id" IS NOT NULL AND "ledger_transactions"."campaign_id" IS NOT NULL
        AND "ledger_transactions"."mission_assignment_id" IS NULL AND "ledger_transactions"."created_by_user_id" IS NULL
      ) OR (
        "ledger_transactions"."type" IN ('slot_completion', 'slot_refund')
        AND "ledger_transactions"."source_type" = 'financial_action_intent'
        AND "ledger_transactions"."payment_provider_reference_id" IS NULL AND "ledger_transactions"."campaign_id" IS NOT NULL
        AND "ledger_transactions"."mission_assignment_id" IS NOT NULL AND "ledger_transactions"."created_by_user_id" IS NULL
      ) OR (
        "ledger_transactions"."type" = 'finance_adjustment' AND "ledger_transactions"."source_type" = 'finance_adjustment'
        AND "ledger_transactions"."payment_provider_reference_id" IS NULL AND "ledger_transactions"."created_by_user_id" IS NOT NULL
        AND length(btrim("ledger_transactions"."reason")) > 0
      ))
);
--> statement-breakpoint
CREATE TABLE "payment_provider_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_account_reference" text NOT NULL,
	"object_type" "payment_provider_object_type" NOT NULL,
	"provider_object_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_provider_references_account_nonempty_ck" CHECK (length(btrim("payment_provider_references"."provider_account_reference")) > 0),
	CONSTRAINT "payment_provider_references_object_nonempty_ck" CHECK (length(btrim("payment_provider_references"."provider_object_id")) > 0)
);
--> statement-breakpoint
CREATE TABLE "slot_funding_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"campaign_funding_snapshot_id" uuid NOT NULL,
	"mission_slot_id" uuid NOT NULL,
	"creator_reward_minor" integer NOT NULL,
	"platform_fee_minor" integer NOT NULL,
	"total_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slot_funding_allocations_total_ck" CHECK ("slot_funding_allocations"."total_minor" = "slot_funding_allocations"."creator_reward_minor" + "slot_funding_allocations"."platform_fee_minor"),
	CONSTRAINT "slot_funding_allocations_amounts_positive_ck" CHECK ("slot_funding_allocations"."creator_reward_minor" > 0 AND "slot_funding_allocations"."platform_fee_minor" > 0),
	CONSTRAINT "slot_funding_allocations_currency_ck" CHECK ("slot_funding_allocations"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "financial_action_intents" ADD COLUMN "posted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "financial_action_intents" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_action_intents" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_funding_snapshots" ADD CONSTRAINT "campaign_funding_snapshots_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_funding_snapshots" ADD CONSTRAINT "campaign_funding_snapshots_payment_provider_reference_id_payment_provider_references_id_fk" FOREIGN KEY ("payment_provider_reference_id") REFERENCES "public"."payment_provider_references"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_creator_user_id_users_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("ledger_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_account_id_ledger_accounts_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_slot_funding_allocation_id_slot_funding_allocations_id_fk" FOREIGN KEY ("slot_funding_allocation_id") REFERENCES "public"."slot_funding_allocations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_payment_provider_reference_id_payment_provider_references_id_fk" FOREIGN KEY ("payment_provider_reference_id") REFERENCES "public"."payment_provider_references"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_mission_assignment_id_mission_assignments_id_fk" FOREIGN KEY ("mission_assignment_id") REFERENCES "public"."mission_assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_funding_allocations" ADD CONSTRAINT "slot_funding_allocations_campaign_funding_snapshot_id_campaign_funding_snapshots_id_fk" FOREIGN KEY ("campaign_funding_snapshot_id") REFERENCES "public"."campaign_funding_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_funding_allocations" ADD CONSTRAINT "slot_funding_allocations_mission_slot_id_mission_slots_id_fk" FOREIGN KEY ("mission_slot_id") REFERENCES "public"."mission_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_funding_snapshots_public_id_uq" ON "campaign_funding_snapshots" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_funding_snapshots_campaign_uq" ON "campaign_funding_snapshots" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_funding_snapshots_provider_reference_uq" ON "campaign_funding_snapshots" USING btree ("payment_provider_reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_funding_snapshots_provider_event_uq" ON "campaign_funding_snapshots" USING btree ("provider_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_funding_snapshots_transfer_group_uq" ON "campaign_funding_snapshots" USING btree ("transfer_group");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_public_id_uq" ON "ledger_accounts" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_platform_code_currency_uq" ON "ledger_accounts" USING btree ("code","currency") WHERE "ledger_accounts"."campaign_id" IS NULL AND "ledger_accounts"."creator_user_id" IS NULL AND "ledger_accounts"."business_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_campaign_code_currency_uq" ON "ledger_accounts" USING btree ("code","campaign_id","currency") WHERE "ledger_accounts"."campaign_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_creator_code_currency_uq" ON "ledger_accounts" USING btree ("code","creator_user_id","currency") WHERE "ledger_accounts"."creator_user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_business_code_currency_uq" ON "ledger_accounts" USING btree ("code","business_id","currency") WHERE "ledger_accounts"."business_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entries_public_id_uq" ON "ledger_entries" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entries_transaction_position_uq" ON "ledger_entries" USING btree ("ledger_transaction_id","position");--> statement-breakpoint
CREATE INDEX "ledger_entries_account_created_idx" ON "ledger_entries" USING btree ("ledger_account_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_entries_allocation_idx" ON "ledger_entries" USING btree ("slot_funding_allocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_transactions_public_id_uq" ON "ledger_transactions" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_transactions_source_uq" ON "ledger_transactions" USING btree ("source_type","source_public_id");--> statement-breakpoint
CREATE INDEX "ledger_transactions_campaign_created_idx" ON "ledger_transactions" USING btree ("campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_transactions_assignment_created_idx" ON "ledger_transactions" USING btree ("mission_assignment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_references_public_id_uq" ON "payment_provider_references" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_references_object_uq" ON "payment_provider_references" USING btree ("provider","provider_account_reference","object_type","provider_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slot_funding_allocations_public_id_uq" ON "slot_funding_allocations" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slot_funding_allocations_slot_uq" ON "slot_funding_allocations" USING btree ("mission_slot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slot_funding_allocations_snapshot_slot_uq" ON "slot_funding_allocations" USING btree ("campaign_funding_snapshot_id","mission_slot_id");--> statement-breakpoint
CREATE INDEX "slot_funding_allocations_snapshot_idx" ON "slot_funding_allocations" USING btree ("campaign_funding_snapshot_id");--> statement-breakpoint
ALTER TABLE "financial_action_intents" ADD CONSTRAINT "financial_action_intents_posted_shape_ck" CHECK ((("financial_action_intents"."status")::text = 'pending_ledger' AND "financial_action_intents"."posted_at" IS NULL) OR
          (("financial_action_intents"."status")::text = 'posted' AND "financial_action_intents"."posted_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "financial_action_intents" ADD CONSTRAINT "financial_action_intents_version_positive_ck" CHECK ("financial_action_intents"."version" > 0);
--> statement-breakpoint
CREATE FUNCTION "local_missions_reject_immutable_financial_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "payment_provider_references_immutable_trg"
BEFORE UPDATE OR DELETE ON "payment_provider_references"
FOR EACH ROW EXECUTE FUNCTION "local_missions_reject_immutable_financial_mutation"();
--> statement-breakpoint
CREATE TRIGGER "campaign_funding_snapshots_immutable_trg"
BEFORE UPDATE OR DELETE ON "campaign_funding_snapshots"
FOR EACH ROW EXECUTE FUNCTION "local_missions_reject_immutable_financial_mutation"();
--> statement-breakpoint
CREATE TRIGGER "slot_funding_allocations_immutable_trg"
BEFORE UPDATE OR DELETE ON "slot_funding_allocations"
FOR EACH ROW EXECUTE FUNCTION "local_missions_reject_immutable_financial_mutation"();
--> statement-breakpoint
CREATE TRIGGER "ledger_accounts_immutable_trg"
BEFORE UPDATE OR DELETE ON "ledger_accounts"
FOR EACH ROW EXECUTE FUNCTION "local_missions_reject_immutable_financial_mutation"();
--> statement-breakpoint
CREATE TRIGGER "ledger_transactions_immutable_trg"
BEFORE UPDATE OR DELETE ON "ledger_transactions"
FOR EACH ROW EXECUTE FUNCTION "local_missions_reject_immutable_financial_mutation"();
--> statement-breakpoint
CREATE TRIGGER "ledger_entries_immutable_trg"
BEFORE UPDATE OR DELETE ON "ledger_entries"
FOR EACH ROW EXECUTE FUNCTION "local_missions_reject_immutable_financial_mutation"();
--> statement-breakpoint
CREATE FUNCTION "local_missions_protect_financial_action_intent"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD."status"::text = 'posted' THEN
    RAISE EXCEPTION 'financial action intents cannot be deleted or changed after posting'
      USING ERRCODE = '55000';
  END IF;
  IF NEW."status"::text <> 'posted'
     OR NEW."posted_at" IS NULL
     OR NEW."version" <> OLD."version" + 1
     OR NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."public_id" IS DISTINCT FROM OLD."public_id"
     OR NEW."mission_assignment_id" IS DISTINCT FROM OLD."mission_assignment_id"
     OR NEW."source_type" IS DISTINCT FROM OLD."source_type"
     OR NEW."source_id" IS DISTINCT FROM OLD."source_id"
     OR NEW."action" IS DISTINCT FROM OLD."action"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION 'financial action intent permits only pending_ledger to posted'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "financial_action_intents_append_only_trg"
BEFORE UPDATE OR DELETE ON "financial_action_intents"
FOR EACH ROW EXECUTE FUNCTION "local_missions_protect_financial_action_intent"();
--> statement-breakpoint
CREATE FUNCTION "local_missions_validate_ledger_balance"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  target_transaction_id uuid;
  expected_total integer;
  expected_currency text;
  entry_count integer;
  debit_total bigint;
  credit_total bigint;
  currency_count integer;
BEGIN
  IF TG_TABLE_NAME = 'ledger_transactions' THEN
    target_transaction_id := NEW."id";
  ELSE
    target_transaction_id := NEW."ledger_transaction_id";
  END IF;
  SELECT "total_minor", "currency"
    INTO expected_total, expected_currency
    FROM "ledger_transactions"
   WHERE "id" = target_transaction_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  SELECT count(*)::integer,
         coalesce(sum("amount_minor") FILTER (WHERE "direction" = 'debit'), 0),
         coalesce(sum("amount_minor") FILTER (WHERE "direction" = 'credit'), 0),
         count(DISTINCT "currency")::integer
    INTO entry_count, debit_total, credit_total, currency_count
    FROM "ledger_entries"
   WHERE "ledger_transaction_id" = target_transaction_id;
  IF entry_count < 2
     OR debit_total <> expected_total
     OR credit_total <> expected_total
     OR currency_count <> 1
     OR EXISTS (
       SELECT 1 FROM "ledger_entries"
        WHERE "ledger_transaction_id" = target_transaction_id
          AND "currency" <> expected_currency
     ) THEN
    RAISE EXCEPTION 'ledger transaction % is not balanced', target_transaction_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "ledger_transactions_balance_trg"
AFTER INSERT ON "ledger_transactions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "local_missions_validate_ledger_balance"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "ledger_entries_balance_trg"
AFTER INSERT ON "ledger_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "local_missions_validate_ledger_balance"();
--> statement-breakpoint
CREATE FUNCTION "local_missions_validate_funding_allocations"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  target_snapshot_id uuid;
  expected_campaign_id uuid;
  expected_slot_count integer;
  expected_reward integer;
  expected_fee integer;
  expected_total integer;
  expected_currency text;
  actual_slot_count integer;
  actual_reward bigint;
  actual_fee bigint;
  actual_total bigint;
  invalid_slot_count integer;
BEGIN
  IF TG_TABLE_NAME = 'campaign_funding_snapshots' THEN
    target_snapshot_id := NEW."id";
  ELSE
    target_snapshot_id := NEW."campaign_funding_snapshot_id";
  END IF;
  SELECT snapshot."campaign_id", campaign."slot_count",
         snapshot."creator_reward_pool_minor", snapshot."platform_fee_minor",
         snapshot."total_due_minor", snapshot."currency"
    INTO expected_campaign_id, expected_slot_count, expected_reward,
         expected_fee, expected_total, expected_currency
    FROM "campaign_funding_snapshots" snapshot
    JOIN "campaigns" campaign ON campaign."id" = snapshot."campaign_id"
   WHERE snapshot."id" = target_snapshot_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  SELECT count(*)::integer,
         coalesce(sum(allocation."creator_reward_minor"), 0),
         coalesce(sum(allocation."platform_fee_minor"), 0),
         coalesce(sum(allocation."total_minor"), 0),
         count(*) FILTER (
           WHERE slot."campaign_id" <> expected_campaign_id
              OR slot."reward_minor" <> allocation."creator_reward_minor"
              OR slot."currency" <> allocation."currency"
              OR allocation."currency" <> expected_currency
         )::integer
    INTO actual_slot_count, actual_reward, actual_fee, actual_total, invalid_slot_count
    FROM "slot_funding_allocations" allocation
    JOIN "mission_slots" slot ON slot."id" = allocation."mission_slot_id"
   WHERE allocation."campaign_funding_snapshot_id" = target_snapshot_id;
  IF actual_slot_count <> expected_slot_count
     OR actual_reward <> expected_reward
     OR actual_fee <> expected_fee
     OR actual_total <> expected_total
     OR invalid_slot_count <> 0 THEN
    RAISE EXCEPTION 'campaign funding snapshot % does not reconcile to slot allocations', target_snapshot_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "campaign_funding_snapshots_allocations_trg"
AFTER INSERT ON "campaign_funding_snapshots"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "local_missions_validate_funding_allocations"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "slot_funding_allocations_snapshot_trg"
AFTER INSERT ON "slot_funding_allocations"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "local_missions_validate_funding_allocations"();
