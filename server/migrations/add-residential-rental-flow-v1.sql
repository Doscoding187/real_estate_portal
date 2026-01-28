-- Residential Rental Flow v1
-- Adds transaction type + rent range to developments, and rental terms to unit_types

ALTER TABLE `developments`
  ADD COLUMN `transaction_type` enum('for_sale','for_rent','auction') NOT NULL DEFAULT 'for_sale' AFTER `development_type`,
  ADD COLUMN `monthly_rent_from` decimal(15,2) NULL AFTER `price_to`,
  ADD COLUMN `monthly_rent_to` decimal(15,2) NULL AFTER `monthly_rent_from`;

ALTER TABLE `unit_types`
  ADD COLUMN `monthly_rent_from` decimal(15,2) NULL AFTER `base_price_to`,
  ADD COLUMN `monthly_rent_to` decimal(15,2) NULL AFTER `monthly_rent_from`,
  ADD COLUMN `deposit_required` decimal(15,2) NULL AFTER `monthly_rent_to`,
  ADD COLUMN `lease_term` varchar(100) NULL AFTER `deposit_required`,
  ADD COLUMN `is_furnished` tinyint DEFAULT 0 AFTER `lease_term`;
