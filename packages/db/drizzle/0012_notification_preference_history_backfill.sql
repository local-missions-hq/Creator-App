INSERT INTO notification_preference_history (
  public_id,
  notification_preference_id,
  enabled,
  preference_version,
  changed_by_user_id,
  occurred_at
)
SELECT
  'nph_backfill_' || replace(preference.id::text, '-', ''),
  preference.id,
  preference.enabled,
  preference.version,
  preference.user_id,
  preference.updated_at
FROM notification_preferences preference
ON CONFLICT (notification_preference_id, preference_version) DO NOTHING;
