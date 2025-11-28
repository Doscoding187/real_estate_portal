-- Add developer subscription tables

-- Developer Subscriptions table
CREATE TABLE IF NOT EXISTS `developer_subscriptions` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `developer_id` int NOT NULL,
  `plan_id` int,
  `tier` enum('free_trial', 'basic', 'premium') DEFAULT 'free_trial' NOT NULL,
  `status` enum('active', 'cancelled', 'expired') DEFAULT 'active' NOT NULL,
  `trial_ends_at` timestamp,
  `current_period_start` timestamp,
  `current_period_end` timestamp,
  `stripe_subscription_id` varchar(100),
  `stripe_customer_id` varchar(100),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL
);

-- Developer Subscription Limits table (stores current limits based on tier)
CREATE TABLE IF NOT EXISTS `developer_subscription_limits` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `subscription_id` int NOT NULL,
  `max_developments` int DEFAULT 1 NOT NULL,
  `max_leads_per_month` int DEFAULT 50 NOT NULL,
  `max_team_members` int DEFAULT 1 NOT NULL,
  `analytics_retention_days` int DEFAULT 30 NOT NULL,
  `crm_integration_enabled` tinyint DEFAULT 0 NOT NULL,
  `advanced_analytics_enabled` tinyint DEFAULT 0 NOT NULL,
  `bond_integration_enabled` tinyint DEFAULT 0 NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE CASCADE
);

-- Developer Subscription Usage table (tracks current usage against limits)
CREATE TABLE IF NOT EXISTS `developer_subscription_usage` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `subscription_id` int NOT NULL,
  `developments_count` int DEFAULT 0 NOT NULL,
  `leads_this_month` int DEFAULT 0 NOT NULL,
  `team_members_count` int DEFAULT 0 NOT NULL,
  `last_reset_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX `idx_developer_subscriptions_developer_id` ON `developer_subscriptions`(`developer_id`);
CREATE INDEX `idx_developer_subscriptions_status` ON `developer_subscriptions`(`status`);
CREATE INDEX `idx_developer_subscriptions_tier` ON `developer_subscriptions`(`tier`);
CREATE INDEX `idx_developer_subscription_limits_subscription_id` ON `developer_subscription_limits`(`subscription_id`);
CREATE INDEX `idx_developer_subscription_usage_subscription_id` ON `developer_subscription_usage`(`subscription_id`);
