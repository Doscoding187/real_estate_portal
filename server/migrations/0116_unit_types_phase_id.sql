-- Connect canonical aggregate inventory to one explicitly managed phase.
ALTER TABLE `unit_types` ADD COLUMN `phase_id` int NULL;
