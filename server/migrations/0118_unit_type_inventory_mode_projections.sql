ALTER TABLE `unit_types`
  ADD COLUMN `available_for_sale_units` int NOT NULL DEFAULT 0,
  ADD COLUMN `available_for_rent_units` int NOT NULL DEFAULT 0;
