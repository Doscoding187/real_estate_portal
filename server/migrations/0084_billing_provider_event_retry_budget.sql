-- P5 billing authority: bound provider-event retry attempts.
ALTER TABLE `billing_provider_events`
  ADD COLUMN `attempt_count` int NOT NULL DEFAULT 0 AFTER `status`,
  ADD COLUMN `max_attempts` int NOT NULL DEFAULT 3 AFTER `attempt_count`;
