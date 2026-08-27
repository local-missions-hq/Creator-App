ALTER TABLE "mission_slots" DROP CONSTRAINT "mission_slots_bonus_nonnegative_ck";--> statement-breakpoint
ALTER TABLE "mission_slots" DROP CONSTRAINT "mission_slots_community_reach_ck";--> statement-breakpoint
ALTER TABLE "mission_slots" DROP CONSTRAINT "mission_slots_reach_bonus_ck";--> statement-breakpoint
ALTER TABLE "mission_slots" ADD COLUMN "reach_bonus_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mission_slots" ADD COLUMN "contract_add_on_bonus_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "mission_slots"
   SET "reach_bonus_minor" = "bonus_reward_minor"
 WHERE "type" = 'reach';--> statement-breakpoint
ALTER TABLE "mission_slots" ADD CONSTRAINT "mission_slots_bonus_components_ck" CHECK ("mission_slots"."bonus_reward_minor" = "mission_slots"."reach_bonus_minor" + "mission_slots"."contract_add_on_bonus_minor");--> statement-breakpoint
ALTER TABLE "mission_slots" ADD CONSTRAINT "mission_slots_bonus_nonnegative_ck" CHECK ("mission_slots"."reach_bonus_minor" >= 0 AND "mission_slots"."contract_add_on_bonus_minor" >= 0
          AND "mission_slots"."bonus_reward_minor" >= 0);--> statement-breakpoint
ALTER TABLE "mission_slots" ADD CONSTRAINT "mission_slots_community_reach_ck" CHECK ((
        "mission_slots"."type" = 'community' AND "mission_slots"."reach_level" IS NULL AND "mission_slots"."reach_bonus_minor" = 0
      ) OR (
        "mission_slots"."type" = 'reach' AND "mission_slots"."reach_level" IS NOT NULL AND "mission_slots"."reach_bonus_minor" > 0
      ));--> statement-breakpoint
ALTER TABLE "mission_slots" ADD CONSTRAINT "mission_slots_reach_bonus_ck" CHECK ("mission_slots"."type" = 'community' OR (
        ("mission_slots"."reach_level" = 'level_1' AND "mission_slots"."reach_bonus_minor" * 2 = "mission_slots"."base_reward_minor") OR
        ("mission_slots"."reach_level" = 'level_2' AND "mission_slots"."reach_bonus_minor" = "mission_slots"."base_reward_minor") OR
        ("mission_slots"."reach_level" = 'level_3' AND "mission_slots"."reach_bonus_minor" = "mission_slots"."base_reward_minor" * 2)
      ));--> statement-breakpoint
CREATE OR REPLACE FUNCTION local_missions_validate_rights_offer()
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
     AND slot.contract_add_on_bonus_minor >= NEW.total_rights_bonus_minor;
  IF valid_offer IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Rights offer must match a funded contract add-on component in the same draft campaign and brief';
  END IF;
  RETURN NEW;
END;
$$;
