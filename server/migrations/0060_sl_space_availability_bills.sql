ALTER TABLE `sl_space_availability`
  ADD COLUMN `bills_included_json` JSON NULL AFTER `deposit_minor`;
