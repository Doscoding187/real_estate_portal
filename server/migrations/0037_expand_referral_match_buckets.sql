-- Expand referral match buckets to preferred/nearby/other while keeping legacy fallback rows readable.

ALTER TABLE `referral_matches`
  MODIFY COLUMN `match_bucket` ENUM('preferred_area', 'nearby_area', 'other_area', 'fallback_area')
  NOT NULL DEFAULT 'other_area';
