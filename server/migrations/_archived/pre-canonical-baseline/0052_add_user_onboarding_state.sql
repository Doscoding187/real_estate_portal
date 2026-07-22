ALTER TABLE `users`
  ADD COLUMN `onboarding_complete` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `onboarding_step` INT NOT NULL DEFAULT 0,
  ADD COLUMN `subscription_tier` ENUM('free', 'starter', 'professional', 'elite') NOT NULL DEFAULT 'free',
  ADD COLUMN `subscription_status` ENUM('trial', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'trial';

CREATE INDEX `idx_users_onboarding_state`
  ON `users` (`role`, `onboarding_complete`, `onboarding_step`);

CREATE INDEX `idx_users_subscription_state`
  ON `users` (`subscription_status`, `subscription_tier`);
