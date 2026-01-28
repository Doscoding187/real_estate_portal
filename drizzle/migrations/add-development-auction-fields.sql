-- Add auction fields for development wizard (auction transaction)

ALTER TABLE `developments`
  ADD COLUMN `auction_start_date` datetime NULL AFTER `monthly_rent_to`,
  ADD COLUMN `auction_end_date` datetime NULL AFTER `auction_start_date`,
  ADD COLUMN `starting_bid_from` decimal(15,2) NULL AFTER `auction_end_date`,
  ADD COLUMN `reserve_price_from` decimal(15,2) NULL AFTER `starting_bid_from`;

ALTER TABLE `unit_types`
  ADD COLUMN `starting_bid` decimal(15,2) NULL AFTER `is_furnished`,
  ADD COLUMN `reserve_price` decimal(15,2) NULL AFTER `starting_bid`,
  ADD COLUMN `auction_start_date` datetime NULL AFTER `reserve_price`,
  ADD COLUMN `auction_end_date` datetime NULL AFTER `auction_start_date`,
  ADD COLUMN `auction_status` enum('scheduled','active','sold','passed_in','withdrawn') DEFAULT 'scheduled' AFTER `auction_end_date`;

CREATE INDEX `idx_developments_auction_dates`
  ON `developments` (`auction_start_date`, `auction_end_date`);
CREATE INDEX `idx_unit_types_auction_status`
  ON `unit_types` (`auction_status`);
