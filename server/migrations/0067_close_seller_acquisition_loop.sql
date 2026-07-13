-- This migration intentionally precedes 0068_close_buyer_lead_loop.sql.
-- It is forward-only: if these fields must be retired, add a later migration
-- after exporting or neutralising the affected seller-operational data.

ALTER TABLE `seller_prospects`
  ADD COLUMN `next_action` varchar(255) NULL AFTER `next_follow_up`;

ALTER TABLE `seller_prospects`
  ADD COLUMN `first_contacted_at` timestamp NULL AFTER `next_action`;

ALTER TABLE `seller_prospects`
  ADD COLUMN `mandate_type` enum('sole','open','dual','auction','other') NULL AFTER `outcome`;

ALTER TABLE `seller_prospects`
  ADD COLUMN `mandate_signed_at` timestamp NULL AFTER `mandate_type`;

ALTER TABLE `seller_prospects`
  ADD COLUMN `mandate_expires_at` timestamp NULL AFTER `mandate_signed_at`;

ALTER TABLE `seller_prospects`
  ADD COLUMN `agreed_asking_price` decimal(15,2) NULL AFTER `mandate_expires_at`;

ALTER TABLE `seller_prospects`
  ADD COLUMN `mandate_checklist` json NULL AFTER `agreed_asking_price`;

ALTER TABLE `seller_prospect_activities`
  MODIFY COLUMN `activity_type` enum(
    'created','note','call','email','meeting','status_change','assignment',
    'follow_up_scheduled','follow_up_completed','conversion','contact_attempt','mandate_updated'
  ) NOT NULL;

UPDATE `seller_prospects`
SET `next_action` = CASE
  WHEN `stage` IN ('converted_to_listing','not_interested','lost','archived') THEN NULL
  WHEN `next_follow_up` IS NOT NULL THEN 'Complete scheduled seller follow-up'
  ELSE 'Record the next seller action'
END
WHERE `next_action` IS NULL;

UPDATE `seller_prospects`
SET `first_contacted_at` = `last_contacted_at`
WHERE `first_contacted_at` IS NULL AND `last_contacted_at` IS NOT NULL;
