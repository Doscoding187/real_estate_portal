-- Apply after 0067_close_seller_acquisition_loop.sql. SQL migrations run in
-- lexical order. This is forward-only: recover with a subsequent migration,
-- preserving lead activity and response-history data before any retirement.

ALTER TABLE `leads`
  ADD COLUMN `nextAction` varchar(255) NULL AFTER `nextFollowUp`;

ALTER TABLE `leads`
  ADD COLUMN `firstRespondedAt` timestamp NULL AFTER `nextAction`;

ALTER TABLE `lead_activities`
  MODIFY COLUMN `type` enum('note','call','email','meeting','status_change','contact_attempt') NOT NULL;

ALTER TABLE `lead_activities`
  ADD COLUMN `metadata` text NULL AFTER `description`;

UPDATE `leads`
SET `nextAction` = CASE
  WHEN `status` IN ('converted','closed','lost') THEN NULL
  WHEN `nextFollowUp` IS NOT NULL THEN 'Complete scheduled buyer follow-up'
  WHEN `status` = 'new' THEN 'Make first buyer contact'
  WHEN `status` = 'contacted' THEN 'Qualify buyer needs'
  WHEN `status` = 'qualified' THEN 'Schedule viewing'
  WHEN `status` = 'viewing_scheduled' THEN 'Capture viewing outcome'
  WHEN `status` = 'offer_sent' THEN 'Track offer'
  ELSE 'Review lead activity'
END
WHERE `nextAction` IS NULL;

UPDATE `leads`
SET `firstRespondedAt` = `lastContactedAt`
WHERE `firstRespondedAt` IS NULL AND `lastContactedAt` IS NOT NULL;
