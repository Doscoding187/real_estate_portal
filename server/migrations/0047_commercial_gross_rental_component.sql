ALTER TABLE `commercial_availability_economics`
  MODIFY COLUMN `component_code` ENUM('base_rent','gross_rent','operating_costs','rates_recoveries','parking','fixed_levies','utilities','security_service','other_recovery','deposit','incentive') NOT NULL;
