-- Explore area membership is an explicit single Place assignment. No display text is backfilled.
ALTER TABLE `explore_content` ADD COLUMN `canonical_place_id` varchar(40) NULL AFTER `reference_id`;
