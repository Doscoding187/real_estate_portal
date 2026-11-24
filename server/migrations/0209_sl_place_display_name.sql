ALTER TABLE `sl_places`
  ADD COLUMN `residence_name` VARCHAR(160) NOT NULL DEFAULT '' AFTER `slug`;
