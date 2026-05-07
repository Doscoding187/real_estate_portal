ALTER TABLE `distribution_development_access`
  ADD COLUMN IF NOT EXISTS `brochure_config_json` JSON NULL AFTER `notes`;
