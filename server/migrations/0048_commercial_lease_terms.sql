CREATE TABLE `commercial_availability_lease_terms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `commercial_availability_id` INT NOT NULL,
  `minimum_lease_months` INT NULL,
  `quoted_lease_months` INT NULL,
  `annual_escalation_percent` DECIMAL(5,2) NULL,
  `deposit_minor` INT NULL,
  `tenant_installation_allowance_minor` INT NULL,
  `beneficial_occupation_days` INT NULL,
  `source_label` VARCHAR(255) NULL,
  `supplied_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_commercial_availability_lease_terms_availability` (`commercial_availability_id`),
  CONSTRAINT `fk_commercial_lease_terms_availability` FOREIGN KEY (`commercial_availability_id`) REFERENCES `commercial_availabilities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_commercial_lease_terms_nonnegative` CHECK (((`minimum_lease_months` IS NULL) OR (`minimum_lease_months` > 0)) AND ((`quoted_lease_months` IS NULL) OR (`quoted_lease_months` > 0)) AND ((`annual_escalation_percent` IS NULL) OR (`annual_escalation_percent` >= 0)) AND ((`deposit_minor` IS NULL) OR (`deposit_minor` >= 0)) AND ((`tenant_installation_allowance_minor` IS NULL) OR (`tenant_installation_allowance_minor` >= 0)) AND ((`beneficial_occupation_days` IS NULL) OR (`beneficial_occupation_days` >= 0)))
);
