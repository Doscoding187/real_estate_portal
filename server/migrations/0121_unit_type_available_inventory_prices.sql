ALTER TABLE `unit_types`
  ADD COLUMN `available_sale_price_from` decimal(15,2),
  ADD COLUMN `available_sale_price_to` decimal(15,2),
  ADD COLUMN `available_rent_price_from` decimal(15,2),
  ADD COLUMN `available_rent_price_to` decimal(15,2);
