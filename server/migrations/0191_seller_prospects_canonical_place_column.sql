ALTER TABLE `seller_prospects`
  ADD COLUMN `canonical_place_id` varchar(40) NULL AFTER `property_address`;
