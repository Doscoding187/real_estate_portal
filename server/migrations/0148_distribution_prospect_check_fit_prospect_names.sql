ALTER TABLE `distribution_prospect_check_fits`
  CHANGE COLUMN `reference_label` `prospect_name` varchar(200) NULL,
  ADD COLUMN `co_applicant_name` varchar(200) NULL;
