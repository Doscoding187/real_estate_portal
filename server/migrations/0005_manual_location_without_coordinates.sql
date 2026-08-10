-- PLE-6C: allow a confirmed manual street-level location without provider coordinates.
-- Reviewed compatibility migration; existing coordinate values remain unchanged.

ALTER TABLE `listings`
  MODIFY COLUMN `latitude` decimal(10,7) NULL,
  MODIFY COLUMN `longitude` decimal(10,7) NULL;
