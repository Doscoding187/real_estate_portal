-- P5 billing authority: fence provider workers and make failed work due-time aware.
ALTER TABLE `billing_provider_events`
  ADD COLUMN `next_attempt_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `max_attempts`,
  ADD COLUMN `claim_token` varchar(64) NULL AFTER `next_attempt_at`,
  ADD COLUMN `claim_expires_at` timestamp NULL AFTER `claim_token`;
