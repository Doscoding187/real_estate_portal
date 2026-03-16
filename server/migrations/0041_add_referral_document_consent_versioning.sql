ALTER TABLE `referral_documents`
  ADD COLUMN `consent_template_id` VARCHAR(80) NULL AFTER `consent_text`;

ALTER TABLE `referral_documents`
  ADD COLUMN `consent_template_version` VARCHAR(32) NULL AFTER `consent_template_id`;

ALTER TABLE `referral_documents`
  ADD COLUMN `consent_captured_at` TIMESTAMP NULL AFTER `consent_template_version`;

UPDATE `referral_documents`
SET
  `consent_template_id` = COALESCE(`consent_template_id`, 'referral_upload_consent'),
  `consent_template_version` = COALESCE(`consent_template_version`, 'legacy'),
  `consent_captured_at` = COALESCE(`consent_captured_at`, `uploaded_at`, `created_at`)
WHERE `consent_confirmed` = 1;
