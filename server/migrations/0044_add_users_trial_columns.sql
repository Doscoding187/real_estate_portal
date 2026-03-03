-- Hotfix: align users table with auth/entitlement query contract.
-- This migration is intentionally idempotent for safe rollout.
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `plan` ENUM('trial', 'paid') NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS `trialStatus` ENUM('active', 'expired') NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS `trialStartedAt` TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS `trialEndsAt` TIMESTAMP NULL;
