ALTER TABLE `unit_types`
  ADD COLUMN `released_for_sale_units` int NOT NULL DEFAULT 0,
  ADD COLUMN `released_for_rent_units` int NOT NULL DEFAULT 0,
  ADD COLUMN `reserved_for_sale_units` int NOT NULL DEFAULT 0,
  ADD COLUMN `reserved_for_rent_units` int NOT NULL DEFAULT 0;
