-- Reconcile agent profile columns expected by the current Drizzle schema.

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `slug` VARCHAR(200) NULL AFTER `displayName`;

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `focus` ENUM('sales','rentals','both') NULL AFTER `specialization`;

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `propertyTypes` TEXT NULL AFTER `focus`;

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `socialLinks` TEXT NULL AFTER `propertyTypes`;

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `profileCompletionScore` INT NOT NULL DEFAULT 0 AFTER `languages`;

ALTER TABLE `agents`
  ADD COLUMN IF NOT EXISTS `profileCompletionFlags` TEXT NULL AFTER `profileCompletionScore`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_agents_slug` ON `agents` (`slug`);

CREATE INDEX IF NOT EXISTS `idx_agents_slug` ON `agents` (`slug`);
