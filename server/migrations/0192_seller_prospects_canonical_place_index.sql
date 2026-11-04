ALTER TABLE `seller_prospects`
  ADD INDEX `idx_seller_prospects_agency_place` (`agency_id`, `canonical_place_id`);
