ALTER TABLE `developments`
  ADD COLUMN `inventory_mode` enum('aggregate','itemized') NOT NULL DEFAULT 'aggregate';
