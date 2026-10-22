-- Support phase-scoped inventory reads and release checks.
CREATE INDEX `idx_unit_types_phase_id` ON `unit_types` (`phase_id`);
