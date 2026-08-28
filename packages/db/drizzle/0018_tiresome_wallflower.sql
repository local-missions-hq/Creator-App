CREATE TYPE "public"."account_hold_status" AS ENUM('active', 'released');--> statement-breakpoint
CREATE TYPE "public"."account_request_status" AS ENUM('requested', 'processing', 'completed', 'canceled', 'denied');--> statement-breakpoint
CREATE TYPE "public"."account_request_type" AS ENUM('export', 'deletion');--> statement-breakpoint
CREATE TYPE "public"."account_session_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."identity_binding_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."recent_auth_purpose" AS ENUM('identity_link', 'identity_unlink', 'account_deletion', 'payout_destination_change', 'contact_change');--> statement-breakpoint
CREATE TYPE "public"."sensitive_action" AS ENUM('funding', 'payout_destination_change', 'identity_provider_change', 'account_deletion');--> statement-breakpoint
CREATE TABLE "account_request_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_request_id" uuid NOT NULL,
	"from_status" "account_request_status",
	"to_status" "account_request_status" NOT NULL,
	"request_version" integer NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_request_history_version_ck" CHECK ("account_request_history"."request_version" > 0),
	CONSTRAINT "account_request_history_reason_ck" CHECK (length(btrim("account_request_history"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "account_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "account_request_type" NOT NULL,
	"status" "account_request_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"denied_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "account_requests_status_ck" CHECK (("account_requests"."status" IN ('requested','processing') AND "account_requests"."completed_at" IS NULL
           AND "account_requests"."canceled_at" IS NULL AND "account_requests"."denied_at" IS NULL) OR
          ("account_requests"."status" = 'completed' AND "account_requests"."completed_at" IS NOT NULL
           AND "account_requests"."canceled_at" IS NULL AND "account_requests"."denied_at" IS NULL) OR
          ("account_requests"."status" = 'canceled' AND "account_requests"."canceled_at" IS NOT NULL
           AND "account_requests"."completed_at" IS NULL AND "account_requests"."denied_at" IS NULL) OR
          ("account_requests"."status" = 'denied' AND "account_requests"."denied_at" IS NOT NULL
           AND "account_requests"."completed_at" IS NULL AND "account_requests"."canceled_at" IS NULL)),
	CONSTRAINT "account_requests_version_ck" CHECK ("account_requests"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "account_sensitive_hold_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_sensitive_hold_id" uuid NOT NULL,
	"action" "sensitive_action" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_sensitive_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "account_hold_status" DEFAULT 'active' NOT NULL,
	"reason_code" text NOT NULL,
	"placed_by_user_id" uuid NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_by_user_id" uuid,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "account_sensitive_holds_reason_ck" CHECK ("account_sensitive_holds"."reason_code" ~ '^[A-Z0-9_]{2,80}$'),
	CONSTRAINT "account_sensitive_holds_status_ck" CHECK (("account_sensitive_holds"."status" = 'active' AND "account_sensitive_holds"."released_by_user_id" IS NULL
           AND "account_sensitive_holds"."released_at" IS NULL AND "account_sensitive_holds"."release_reason" IS NULL) OR
          ("account_sensitive_holds"."status" = 'released' AND "account_sensitive_holds"."released_by_user_id" IS NOT NULL
           AND "account_sensitive_holds"."released_at" IS NOT NULL AND length(btrim("account_sensitive_holds"."release_reason")) > 0)),
	CONSTRAINT "account_sensitive_holds_version_ck" CHECK ("account_sensitive_holds"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "account_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"external_identity_id" uuid NOT NULL,
	"status" "account_session_status" DEFAULT 'active' NOT NULL,
	"authenticated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "account_sessions_expiry_ck" CHECK ("account_sessions"."expires_at" > "account_sessions"."authenticated_at"),
	CONSTRAINT "account_sessions_status_shape_ck" CHECK (("account_sessions"."status" = 'active' AND "account_sessions"."revoked_at" IS NULL AND "account_sessions"."revocation_reason" IS NULL) OR
          ("account_sessions"."status" IN ('revoked','expired') AND "account_sessions"."revoked_at" IS NOT NULL
           AND length(btrim("account_sessions"."revocation_reason")) > 0)),
	CONSTRAINT "account_sessions_version_ck" CHECK ("account_sessions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "identity_binding_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_identity_id" uuid NOT NULL,
	"from_status" "identity_binding_status",
	"to_status" "identity_binding_status" NOT NULL,
	"binding_version" integer NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"account_session_id" uuid,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_binding_status_history_version_ck" CHECK ("identity_binding_status_history"."binding_version" > 0),
	CONSTRAINT "identity_binding_status_history_reason_ck" CHECK (length(btrim("identity_binding_status_history"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "recent_auth_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"account_session_id" uuid NOT NULL,
	"purpose" "recent_auth_purpose" NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "recent_auth_grants_window_ck" CHECK ("recent_auth_grants"."expires_at" > "recent_auth_grants"."granted_at"
          AND "recent_auth_grants"."expires_at" <= "recent_auth_grants"."granted_at" + interval '10 minutes'),
	CONSTRAINT "recent_auth_grants_consumed_ck" CHECK ("recent_auth_grants"."consumed_at" IS NULL OR "recent_auth_grants"."consumed_at" >= "recent_auth_grants"."granted_at")
);
--> statement-breakpoint
DROP INDEX "external_identities_user_provider_uq";--> statement-breakpoint
DROP INDEX "external_identities_user_idx";--> statement-breakpoint
ALTER TABLE "external_identities" ADD COLUMN "status" "identity_binding_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "external_identities" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "external_identities" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "external_identities" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "account_request_history" ADD CONSTRAINT "account_request_history_account_request_id_account_requests_id_fk" FOREIGN KEY ("account_request_id") REFERENCES "public"."account_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_request_history" ADD CONSTRAINT "account_request_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_requests" ADD CONSTRAINT "account_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_sensitive_hold_actions" ADD CONSTRAINT "account_sensitive_hold_actions_account_sensitive_hold_id_account_sensitive_holds_id_fk" FOREIGN KEY ("account_sensitive_hold_id") REFERENCES "public"."account_sensitive_holds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_sensitive_holds" ADD CONSTRAINT "account_sensitive_holds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_sensitive_holds" ADD CONSTRAINT "account_sensitive_holds_placed_by_user_id_users_id_fk" FOREIGN KEY ("placed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_sensitive_holds" ADD CONSTRAINT "account_sensitive_holds_released_by_user_id_users_id_fk" FOREIGN KEY ("released_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_sessions" ADD CONSTRAINT "account_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_sessions" ADD CONSTRAINT "account_sessions_external_identity_id_external_identities_id_fk" FOREIGN KEY ("external_identity_id") REFERENCES "public"."external_identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_binding_status_history" ADD CONSTRAINT "identity_binding_status_history_external_identity_id_external_identities_id_fk" FOREIGN KEY ("external_identity_id") REFERENCES "public"."external_identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_binding_status_history" ADD CONSTRAINT "identity_binding_status_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_binding_status_history" ADD CONSTRAINT "identity_binding_status_history_account_session_id_account_sessions_id_fk" FOREIGN KEY ("account_session_id") REFERENCES "public"."account_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_auth_grants" ADD CONSTRAINT "recent_auth_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_auth_grants" ADD CONSTRAINT "recent_auth_grants_account_session_id_account_sessions_id_fk" FOREIGN KEY ("account_session_id") REFERENCES "public"."account_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_request_history_version_uq" ON "account_request_history" USING btree ("account_request_id","request_version");--> statement-breakpoint
CREATE INDEX "account_request_history_timeline_idx" ON "account_request_history" USING btree ("account_request_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_requests_public_id_uq" ON "account_requests" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_requests_open_user_type_uq" ON "account_requests" USING btree ("user_id","type") WHERE "account_requests"."status" IN ('requested','processing');--> statement-breakpoint
CREATE INDEX "account_requests_user_timeline_idx" ON "account_requests" USING btree ("user_id","requested_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_sensitive_hold_actions_hold_action_uq" ON "account_sensitive_hold_actions" USING btree ("account_sensitive_hold_id","action");--> statement-breakpoint
CREATE UNIQUE INDEX "account_sensitive_holds_public_id_uq" ON "account_sensitive_holds" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_sensitive_holds_active_user_uq" ON "account_sensitive_holds" USING btree ("user_id") WHERE "account_sensitive_holds"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "account_sessions_public_id_uq" ON "account_sessions" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "account_sessions_user_status_idx" ON "account_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "account_sessions_identity_status_idx" ON "account_sessions" USING btree ("external_identity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_binding_status_history_version_uq" ON "identity_binding_status_history" USING btree ("external_identity_id","binding_version");--> statement-breakpoint
CREATE INDEX "identity_binding_status_history_timeline_idx" ON "identity_binding_status_history" USING btree ("external_identity_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recent_auth_grants_public_id_uq" ON "recent_auth_grants" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "recent_auth_grants_user_purpose_idx" ON "recent_auth_grants" USING btree ("user_id","purpose","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "external_identities_user_provider_uq" ON "external_identities" USING btree ("user_id","provider") WHERE "external_identities"."status" = 'active';--> statement-breakpoint
CREATE INDEX "external_identities_user_idx" ON "external_identities" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_status_shape_ck" CHECK (("external_identities"."status" = 'active' AND "external_identities"."revoked_at" IS NULL) OR
          ("external_identities"."status" = 'revoked' AND "external_identities"."revoked_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_version_ck" CHECK ("external_identities"."version" > 0);
--> statement-breakpoint
INSERT INTO identity_binding_status_history (
  external_identity_id, from_status, to_status, binding_version, actor_user_id, reason, occurred_at
)
SELECT id, NULL, 'active', version, user_id, 'Existing identity binding upgraded', created_at
FROM external_identities
ON CONFLICT (external_identity_id, binding_version) DO NOTHING;--> statement-breakpoint
CREATE FUNCTION local_missions_protect_identity_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Identity bindings cannot be deleted';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status', 'revoked_at', 'version', 'updated_at'])
       IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status', 'revoked_at', 'version', 'updated_at'])
  THEN
    RAISE EXCEPTION 'Identity binding ownership and provider subject are immutable';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      OLD.status = 'active' AND NEW.status = 'revoked'
      AND OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL
      AND NEW.version = OLD.version + 1
    ) THEN
      RAISE EXCEPTION 'Illegal identity binding status transition';
    END IF;
  ELSIF NEW.revoked_at IS DISTINCT FROM OLD.revoked_at OR NEW.version <> OLD.version THEN
    RAISE EXCEPTION 'Identity binding status fields require a legal transition';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER external_identities_protect
BEFORE UPDATE OR DELETE ON external_identities
FOR EACH ROW EXECUTE FUNCTION local_missions_protect_identity_binding();--> statement-breakpoint
CREATE FUNCTION local_missions_record_identity_binding_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id uuid;
  session_id uuid;
BEGIN
  actor_id := COALESCE(NULLIF(current_setting('local_missions.actor_user_id', true), '')::uuid, NEW.user_id);
  session_id := NULLIF(current_setting('local_missions.account_session_id', true), '')::uuid;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO identity_binding_status_history (
      external_identity_id, from_status, to_status, binding_version,
      actor_user_id, account_session_id, reason
    ) VALUES (
      NEW.id, NULL, NEW.status, NEW.version, actor_id, session_id, 'Identity binding created'
    );
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO identity_binding_status_history (
      external_identity_id, from_status, to_status, binding_version,
      actor_user_id, account_session_id, reason
    ) VALUES (
      NEW.id, OLD.status, NEW.status, NEW.version, actor_id, session_id, 'Identity binding revoked'
    );
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER external_identities_history
AFTER INSERT OR UPDATE ON external_identities
FOR EACH ROW EXECUTE FUNCTION local_missions_record_identity_binding_history();--> statement-breakpoint
CREATE FUNCTION local_missions_validate_account_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM external_identities identity
    JOIN users account ON account.id = identity.user_id
    WHERE identity.id = NEW.external_identity_id
      AND identity.user_id = NEW.user_id
      AND identity.status = 'active'
      AND account.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Account session requires an active same-user identity binding';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER account_sessions_validate_scope
BEFORE INSERT ON account_sessions
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_account_session();--> statement-breakpoint
CREATE FUNCTION local_missions_validate_recent_auth_grant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM account_sessions session
    WHERE session.id = NEW.account_session_id
      AND session.user_id = NEW.user_id
      AND session.status = 'active'
      AND session.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Recent authentication requires an active same-user session';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER recent_auth_grants_validate_scope
BEFORE INSERT ON recent_auth_grants
FOR EACH ROW EXECUTE FUNCTION local_missions_validate_recent_auth_grant();--> statement-breakpoint
CREATE FUNCTION local_missions_reject_account_history_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Account lifecycle history is immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER identity_binding_status_history_immutable
BEFORE UPDATE OR DELETE ON identity_binding_status_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_account_history_mutation();--> statement-breakpoint
CREATE TRIGGER account_request_history_immutable
BEFORE UPDATE OR DELETE ON account_request_history
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_account_history_mutation();--> statement-breakpoint
CREATE TRIGGER account_sensitive_hold_actions_immutable
BEFORE UPDATE OR DELETE ON account_sensitive_hold_actions
FOR EACH ROW EXECUTE FUNCTION local_missions_reject_account_history_mutation();
