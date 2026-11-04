ALTER TABLE `distribution_prospect_check_fit_matches`
  DROP COLUMN `city`,
  DROP COLUMN `province`,
  ADD COLUMN `location_label` varchar(500) NULL AFTER `development_name`;
