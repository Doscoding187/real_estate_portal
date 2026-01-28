ALTER TABLE `developments` ADD `monthly_levy_from` decimal(10, 2) DEFAULT '0';
ALTER TABLE `developments` ADD `monthly_levy_to` decimal(10, 2) DEFAULT '0';
ALTER TABLE `developments` ADD `rates_from` decimal(10, 2) DEFAULT '0';
ALTER TABLE `developments` ADD `rates_to` decimal(10, 2) DEFAULT '0';
ALTER TABLE `developments` ADD `transfer_costs_included` tinyint DEFAULT 0;
ALTER TABLE `unit_types` ADD `extras` json;
