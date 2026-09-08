ALTER TABLE `commercial_availabilities`
  ADD COLUMN `pricing_mode` ENUM('componentised','gross_quote') NOT NULL DEFAULT 'componentised' AFTER `transaction_type`;

ALTER TABLE `commercial_availabilities`
  ADD COLUMN `vat_treatment` ENUM('included','excluded','not_applicable','unknown') NOT NULL DEFAULT 'unknown' AFTER `pricing_mode`;
