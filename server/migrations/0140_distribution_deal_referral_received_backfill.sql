-- Correct legacy deals that claim a scheduled viewing without any viewing booking.
INSERT INTO `distribution_deal_events` (
  `deal_id`,
  `event_type`,
  `from_stage`,
  `to_stage`,
  `actor_user_id`,
  `owner_type`,
  `owner_id`,
  `assigned_agent_id`,
  `visibility_scope`,
  `metadata`,
  `notes`
)
SELECT
  `id`,
  'override',
  'viewing_scheduled',
  'referral_received',
  NULL,
  `owner_type`,
  `owner_id`,
  `assigned_agent_id`,
  `visibility_scope`,
  JSON_OBJECT(
    'source', 'migration.referral_received_backfill',
    'reason', 'No viewing booking exists for the persisted viewing_scheduled stage.'
  ),
  'Corrected the initial referral state because no viewing booking exists.'
FROM `distribution_deals`
WHERE `current_stage` = 'viewing_scheduled'
  AND NOT EXISTS (
    SELECT 1
    FROM `distribution_viewings`
    WHERE `deal_id` = `distribution_deals`.`id`
  );

UPDATE `distribution_deals`
SET `current_stage` = 'referral_received'
WHERE `current_stage` = 'viewing_scheduled'
  AND NOT EXISTS (
    SELECT 1
    FROM `distribution_viewings`
    WHERE `deal_id` = `distribution_deals`.`id`
  );
