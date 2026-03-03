ALTER TABLE `users`
  ADD COLUMN `plan` enum('trial','paid') NOT NULL DEFAULT 'trial',
  ADD COLUMN `trialStatus` enum('active','expired') NOT NULL DEFAULT 'active',
  ADD COLUMN `trialStartedAt` timestamp NULL,
  ADD COLUMN `trialEndsAt` timestamp NULL;
