-- Residential Rental Flow v1
-- Adds transaction type + rent range to developments, and rental terms to unit_types

ALTER TABLE `developments`
  ADD COLUMN `transaction_type` enum('for_sale','for_rent','auction') NOT NULL DEFAULT 'for_sale';

ALTER TABLE `developments`
  ADD COLUMN `monthly_rent_from` decimal(15,2) NULL;

ALTER TABLE `developments`
  ADD COLUMN `monthly_rent_to` decimal(15,2) NULL;

ALTER TABLE `unit_types`
  ADD COLUMN `monthly_rent_from` decimal(15,2) NULL;

ALTER TABLE `unit_types`
  ADD COLUMN `monthly_rent_to` decimal(15,2) NULL;

ALTER TABLE `unit_types`
  ADD COLUMN `deposit_required` decimal(15,2) NULL;

ALTER TABLE `unit_types`
  ADD COLUMN `lease_term` varchar(100) NULL;

ALTER TABLE `unit_types`
  ADD COLUMN `is_furnished` tinyint DEFAULT 0;
