-- Pricing, subscriptions, entitlements, and governance foundations
-- Implements launch-ready Agent OS / Agency OS / Enterprise OS packaging.

ALTER TABLE `plans`
  ADD COLUMN `segment` ENUM('agent', 'agency', 'enterprise', 'developer') NOT NULL DEFAULT 'agent';

ALTER TABLE `plans`
  ADD COLUMN `price_monthly` INT NOT NULL DEFAULT 0;

ALTER TABLE `plans`
  ADD COLUMN `trial_days` INT NOT NULL DEFAULT 14;

ALTER TABLE `plans`
  ADD COLUMN `metadata` JSON NULL;

CREATE TABLE IF NOT EXISTS `plan_entitlements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plan_id` INT NOT NULL,
  `feature_key` VARCHAR(120) NOT NULL,
  `value_json` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_plan_entitlements_plan_feature` (`plan_id`, `feature_key`),
  KEY `idx_plan_entitlements_plan` (`plan_id`),
  CONSTRAINT `fk_plan_entitlements_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `owner_type` ENUM('agent', 'agency') NOT NULL,
  `owner_id` INT NOT NULL,
  `plan_id` INT NULL,
  `status` ENUM('trial', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'trial',
  `trial_ends_at` TIMESTAMP NULL,
  `billing_cycle_anchor` TIMESTAMP NULL,
  `metadata` JSON NULL,
  `created_by` INT NULL,
  `updated_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_subscriptions_owner` (`owner_type`, `owner_id`),
  KEY `idx_subscriptions_owner` (`owner_type`, `owner_id`),
  KEY `idx_subscriptions_status` (`status`),
  CONSTRAINT `fk_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_subscriptions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_subscriptions_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `agency_agent_memberships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agency_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `status` ENUM('invited', 'active', 'suspended', 'left') NOT NULL DEFAULT 'invited',
  `governance_mode` ENUM('affiliated', 'managed') NOT NULL DEFAULT 'affiliated',
  `role` ENUM('agent', 'team_lead', 'manager') NOT NULL DEFAULT 'agent',
  `permissions_overrides` JSON NULL,
  `effective_from` TIMESTAMP NULL,
  `effective_to` TIMESTAMP NULL,
  `created_by` INT NULL,
  `updated_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_agency_agent_memberships_pair` (`agency_id`, `agent_id`),
  KEY `idx_agency_agent_memberships_agency` (`agency_id`, `status`),
  KEY `idx_agency_agent_memberships_agent` (`agent_id`, `status`),
  CONSTRAINT `fk_agency_agent_memberships_agency` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_agency_agent_memberships_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_agency_agent_memberships_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_agency_agent_memberships_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `managerial_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `actor_user_id` INT NOT NULL,
  `action` VARCHAR(120) NOT NULL,
  `target_type` VARCHAR(80) NOT NULL,
  `target_id` INT NOT NULL,
  `before_data` JSON NULL,
  `after_data` JSON NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_managerial_audit_actor` (`actor_user_id`),
  KEY `idx_managerial_audit_target` (`target_type`, `target_id`),
  KEY `idx_managerial_audit_created` (`created_at`),
  CONSTRAINT `fk_managerial_audit_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);

ALTER TABLE `leads`
  ADD COLUMN `owner_type` ENUM('agent', 'agency') NOT NULL DEFAULT 'agent';
ALTER TABLE `leads`
  ADD COLUMN `owner_id` INT NULL;
ALTER TABLE `leads`
  ADD COLUMN `assigned_agent_id` INT NULL;
ALTER TABLE `leads`
  ADD COLUMN `visibility_scope` ENUM('private', 'team', 'agency') NOT NULL DEFAULT 'private';
ALTER TABLE `leads`
  ADD COLUMN `governance_mode` ENUM('solo', 'affiliated', 'managed', 'enterprise_managed') NOT NULL DEFAULT 'solo';
ALTER TABLE `leads`
  ADD KEY `idx_leads_owner_scope` (`owner_type`, `owner_id`, `visibility_scope`);
ALTER TABLE `leads`
  ADD KEY `idx_leads_assigned_agent` (`assigned_agent_id`);

ALTER TABLE `lead_activities`
  ADD COLUMN `owner_type` ENUM('agent', 'agency') NOT NULL DEFAULT 'agent';
ALTER TABLE `lead_activities`
  ADD COLUMN `owner_id` INT NULL;
ALTER TABLE `lead_activities`
  ADD COLUMN `assigned_agent_id` INT NULL;
ALTER TABLE `lead_activities`
  ADD COLUMN `visibility_scope` ENUM('private', 'team', 'agency') NOT NULL DEFAULT 'private';
ALTER TABLE `lead_activities`
  ADD KEY `idx_lead_activities_owner_scope` (`owner_type`, `owner_id`, `visibility_scope`);

ALTER TABLE `offers`
  ADD COLUMN `owner_type` ENUM('agent', 'agency') NOT NULL DEFAULT 'agent';
ALTER TABLE `offers`
  ADD COLUMN `owner_id` INT NULL;
ALTER TABLE `offers`
  ADD COLUMN `assigned_agent_id` INT NULL;
ALTER TABLE `offers`
  ADD COLUMN `visibility_scope` ENUM('private', 'team', 'agency') NOT NULL DEFAULT 'private';
ALTER TABLE `offers`
  ADD KEY `idx_offers_owner_scope` (`owner_type`, `owner_id`, `visibility_scope`);

ALTER TABLE `distribution_deals`
  ADD COLUMN `owner_type` ENUM('agent', 'agency') NOT NULL DEFAULT 'agent';
ALTER TABLE `distribution_deals`
  ADD COLUMN `owner_id` INT NULL;
ALTER TABLE `distribution_deals`
  ADD COLUMN `assigned_agent_id` INT NULL;
ALTER TABLE `distribution_deals`
  ADD COLUMN `visibility_scope` ENUM('private', 'team', 'agency') NOT NULL DEFAULT 'private';
ALTER TABLE `distribution_deals`
  ADD KEY `idx_distribution_deals_owner` (`owner_type`, `owner_id`, `visibility_scope`);
ALTER TABLE `distribution_deals`
  ADD KEY `idx_distribution_deals_assigned_agent` (`assigned_agent_id`);

ALTER TABLE `distribution_deal_events`
  ADD COLUMN `owner_type` ENUM('agent', 'agency') NOT NULL DEFAULT 'agent';
ALTER TABLE `distribution_deal_events`
  ADD COLUMN `owner_id` INT NULL;
ALTER TABLE `distribution_deal_events`
  ADD COLUMN `assigned_agent_id` INT NULL;
ALTER TABLE `distribution_deal_events`
  ADD COLUMN `visibility_scope` ENUM('private', 'team', 'agency') NOT NULL DEFAULT 'private';
ALTER TABLE `distribution_deal_events`
  ADD KEY `idx_distribution_deal_events_owner` (`owner_type`, `owner_id`, `visibility_scope`);

ALTER TABLE `agent_tasks`
  ADD COLUMN `owner_type` ENUM('agent', 'agency') NOT NULL DEFAULT 'agent';
ALTER TABLE `agent_tasks`
  ADD COLUMN `owner_id` INT NULL;
ALTER TABLE `agent_tasks`
  ADD COLUMN `assigned_agent_id` INT NULL;
ALTER TABLE `agent_tasks`
  ADD COLUMN `visibility_scope` ENUM('private', 'team', 'agency') NOT NULL DEFAULT 'private';
ALTER TABLE `agent_tasks`
  ADD KEY `idx_agent_tasks_owner_scope` (`owner_type`, `owner_id`, `visibility_scope`);
ALTER TABLE `agent_tasks`
  ADD KEY `idx_agent_tasks_assigned_agent` (`assigned_agent_id`);

UPDATE `plans`
SET
  `displayName` = 'Starter',
  `description` = 'Microsite + seller and buyer funnels for independent agents.',
  `segment` = 'agent',
  `price` = 49900,
  `price_monthly` = 49900,
  `trial_days` = 30,
  `currency` = 'ZAR',
  `interval` = 'month',
  `isActive` = 1,
  `isPopular` = 0,
  `sortOrder` = 10,
  `features` = JSON_ARRAY(
    'Microsite',
    'Seller valuation funnel',
    'Buyer lead capture',
    'Basic pipeline',
    '5 active listings',
    'Basic analytics',
    'Free first month'
  ),
  `limits` = JSON_OBJECT('active_listings', 5),
  `metadata` = JSON_OBJECT('trial_copy', 'Free first month', 'target_segment', 'independent_agents')
WHERE `name` = 'agent_starter';

INSERT INTO `plans` (
  `name`,
  `displayName`,
  `description`,
  `segment`,
  `price`,
  `price_monthly`,
  `trial_days`,
  `currency`,
  `interval`,
  `features`,
  `limits`,
  `isActive`,
  `isPopular`,
  `sortOrder`,
  `metadata`
)
SELECT
  'agent_starter',
  'Starter',
  'Microsite + seller and buyer funnels for independent agents.',
  'agent',
  49900,
  49900,
  30,
  'ZAR',
  'month',
  JSON_ARRAY(
    'Microsite',
    'Seller valuation funnel',
    'Buyer lead capture',
    'Basic pipeline',
    '5 active listings',
    'Basic analytics',
    'Free first month'
  ),
  JSON_OBJECT('active_listings', 5),
  1,
  0,
  10,
  JSON_OBJECT('trial_copy', 'Free first month', 'target_segment', 'independent_agents')
WHERE NOT EXISTS (SELECT 1 FROM `plans` WHERE `name` = 'agent_starter');

UPDATE `plans`
SET
  `displayName` = 'Pro',
  `description` = 'Core Agent OS with CRM-lite, full pipeline, and revenue controls.',
  `segment` = 'agent',
  `price` = 129900,
  `price_monthly` = 129900,
  `trial_days` = 30,
  `currency` = 'ZAR',
  `interval` = 'month',
  `isActive` = 1,
  `isPopular` = 1,
  `sortOrder` = 20,
  `features` = JSON_ARRAY(
    'Full CRM-lite',
    'Unlimited listings',
    'Commission tracking',
    'Area intelligence',
    'WhatsApp lead tracking',
    'Revenue dashboard',
    'Free first month'
  ),
  `limits` = JSON_OBJECT('active_listings', -1),
  `metadata` = JSON_OBJECT('recommended', TRUE, 'target_segment', 'core_agents')
WHERE `name` = 'agent_pro';

INSERT INTO `plans` (
  `name`,
  `displayName`,
  `description`,
  `segment`,
  `price`,
  `price_monthly`,
  `trial_days`,
  `currency`,
  `interval`,
  `features`,
  `limits`,
  `isActive`,
  `isPopular`,
  `sortOrder`,
  `metadata`
)
SELECT
  'agent_pro',
  'Pro',
  'Core Agent OS with CRM-lite, full pipeline, and revenue controls.',
  'agent',
  129900,
  129900,
  30,
  'ZAR',
  'month',
  JSON_ARRAY(
    'Full CRM-lite',
    'Unlimited listings',
    'Commission tracking',
    'Area intelligence',
    'WhatsApp lead tracking',
    'Revenue dashboard',
    'Free first month'
  ),
  JSON_OBJECT('active_listings', -1),
  1,
  1,
  20,
  JSON_OBJECT('recommended', TRUE, 'target_segment', 'core_agents')
WHERE NOT EXISTS (SELECT 1 FROM `plans` WHERE `name` = 'agent_pro');

UPDATE `plans`
SET
  `displayName` = 'Elite',
  `description` = 'Advanced Agent OS with AI insights, benchmarking, and premium exposure.',
  `segment` = 'agent',
  `price` = 249900,
  `price_monthly` = 249900,
  `trial_days` = 30,
  `currency` = 'ZAR',
  `interval` = 'month',
  `isActive` = 1,
  `isPopular` = 0,
  `sortOrder` = 30,
  `features` = JSON_ARRAY(
    'AI insights',
    'Advanced reporting',
    'Performance benchmarking',
    'Boost credits',
    'Priority listing exposure',
    'Revenue forecasting',
    'Free first month'
  ),
  `limits` = JSON_OBJECT('active_listings', -1),
  `metadata` = JSON_OBJECT('target_segment', 'top_agents')
WHERE `name` = 'agent_elite';

INSERT INTO `plans` (
  `name`,
  `displayName`,
  `description`,
  `segment`,
  `price`,
  `price_monthly`,
  `trial_days`,
  `currency`,
  `interval`,
  `features`,
  `limits`,
  `isActive`,
  `isPopular`,
  `sortOrder`,
  `metadata`
)
SELECT
  'agent_elite',
  'Elite',
  'Advanced Agent OS with AI insights, benchmarking, and premium exposure.',
  'agent',
  249900,
  249900,
  30,
  'ZAR',
  'month',
  JSON_ARRAY(
    'AI insights',
    'Advanced reporting',
    'Performance benchmarking',
    'Boost credits',
    'Priority listing exposure',
    'Revenue forecasting',
    'Free first month'
  ),
  JSON_OBJECT('active_listings', -1),
  1,
  0,
  30,
  JSON_OBJECT('target_segment', 'top_agents')
WHERE NOT EXISTS (SELECT 1 FROM `plans` WHERE `name` = 'agent_elite');

UPDATE `plans`
SET
  `displayName` = 'Agency Growth',
  `description` = 'Agency OS for up to 5 agents with lead routing and team dashboard.',
  `segment` = 'agency',
  `price` = 499900,
  `price_monthly` = 499900,
  `trial_days` = 30,
  `currency` = 'ZAR',
  `interval` = 'month',
  `isActive` = 1,
  `isPopular` = 0,
  `sortOrder` = 40,
  `features` = JSON_ARRAY(
    'Up to 5 agents',
    'Shared agency dashboard',
    'Lead routing rules',
    'Team performance tracking',
    'Seller funnel analytics',
    'Recruitment landing page',
    'Additional seat R599',
    'Free first month'
  ),
  `limits` = JSON_OBJECT('seats_included', 5),
  `metadata` = JSON_OBJECT('additional_seat_price', 59900)
WHERE `name` = 'agency_growth';

INSERT INTO `plans` (
  `name`,
  `displayName`,
  `description`,
  `segment`,
  `price`,
  `price_monthly`,
  `trial_days`,
  `currency`,
  `interval`,
  `features`,
  `limits`,
  `isActive`,
  `isPopular`,
  `sortOrder`,
  `metadata`
)
SELECT
  'agency_growth',
  'Agency Growth',
  'Agency OS for up to 5 agents with lead routing and team dashboard.',
  'agency',
  499900,
  499900,
  30,
  'ZAR',
  'month',
  JSON_ARRAY(
    'Up to 5 agents',
    'Shared agency dashboard',
    'Lead routing rules',
    'Team performance tracking',
    'Seller funnel analytics',
    'Recruitment landing page',
    'Additional seat R599',
    'Free first month'
  ),
  JSON_OBJECT('seats_included', 5),
  1,
  0,
  40,
  JSON_OBJECT('additional_seat_price', 59900)
WHERE NOT EXISTS (SELECT 1 FROM `plans` WHERE `name` = 'agency_growth');

UPDATE `plans`
SET
  `displayName` = 'Agency Pro',
  `description` = 'Agency OS with managed controls, leaderboards, and commission splits.',
  `segment` = 'agency',
  `price` = 999900,
  `price_monthly` = 999900,
  `trial_days` = 30,
  `currency` = 'ZAR',
  `interval` = 'month',
  `isActive` = 1,
  `isPopular` = 1,
  `sortOrder` = 50,
  `features` = JSON_ARRAY(
    'Up to 15 agents',
    'Commission splits tracking',
    'Leaderboards',
    'Talent acquisition funnel',
    'Agency valuation branding',
    'Internal KPI dashboard',
    'Additional seat R499',
    'Free first month'
  ),
  `limits` = JSON_OBJECT('seats_included', 15),
  `metadata` = JSON_OBJECT('additional_seat_price', 49900)
WHERE `name` = 'agency_pro';

INSERT INTO `plans` (
  `name`,
  `displayName`,
  `description`,
  `segment`,
  `price`,
  `price_monthly`,
  `trial_days`,
  `currency`,
  `interval`,
  `features`,
  `limits`,
  `isActive`,
  `isPopular`,
  `sortOrder`,
  `metadata`
)
SELECT
  'agency_pro',
  'Agency Pro',
  'Agency OS with managed controls, leaderboards, and commission splits.',
  'agency',
  999900,
  999900,
  30,
  'ZAR',
  'month',
  JSON_ARRAY(
    'Up to 15 agents',
    'Commission splits tracking',
    'Leaderboards',
    'Talent acquisition funnel',
    'Agency valuation branding',
    'Internal KPI dashboard',
    'Additional seat R499',
    'Free first month'
  ),
  JSON_OBJECT('seats_included', 15),
  1,
  1,
  50,
  JSON_OBJECT('additional_seat_price', 49900)
WHERE NOT EXISTS (SELECT 1 FROM `plans` WHERE `name` = 'agency_pro');

UPDATE `plans`
SET
  `displayName` = 'Enterprise',
  `description` = 'Enterprise OS for market dominance, branch dashboards, and deep integrations.',
  `segment` = 'enterprise',
  `price` = 2499900,
  `price_monthly` = 2499900,
  `trial_days` = 30,
  `currency` = 'ZAR',
  `interval` = 'month',
  `isActive` = 1,
  `isPopular` = 0,
  `sortOrder` = 60,
  `features` = JSON_ARRAY(
    'Unlimited agents',
    'Branch dashboards',
    'Market share analytics',
    'Area sponsorship rights',
    'Developer integrations',
    'Dedicated support',
    'Custom contract'
  ),
  `limits` = JSON_OBJECT('seats_included', -1),
  `metadata` = JSON_OBJECT('custom_contract', TRUE)
WHERE `name` = 'enterprise';

INSERT INTO `plans` (
  `name`,
  `displayName`,
  `description`,
  `segment`,
  `price`,
  `price_monthly`,
  `trial_days`,
  `currency`,
  `interval`,
  `features`,
  `limits`,
  `isActive`,
  `isPopular`,
  `sortOrder`,
  `metadata`
)
SELECT
  'enterprise',
  'Enterprise',
  'Enterprise OS for market dominance, branch dashboards, and deep integrations.',
  'enterprise',
  2499900,
  2499900,
  30,
  'ZAR',
  'month',
  JSON_ARRAY(
    'Unlimited agents',
    'Branch dashboards',
    'Market share analytics',
    'Area sponsorship rights',
    'Developer integrations',
    'Dedicated support',
    'Custom contract'
  ),
  JSON_OBJECT('seats_included', -1),
  1,
  0,
  60,
  JSON_OBJECT('custom_contract', TRUE)
WHERE NOT EXISTS (SELECT 1 FROM `plans` WHERE `name` = 'enterprise');

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'max_active_listings', CAST('5' AS JSON) FROM `plans` p WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_ai_insights', CAST('false' AS JSON) FROM `plans` p WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_area_intelligence', CAST('false' AS JSON) FROM `plans` p WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_commission_tracking', CAST('false' AS JSON) FROM `plans` p WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_whatsapp_lead_tracking', CAST('false' AS JSON) FROM `plans` p WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_revenue_dashboard', CAST('false' AS JSON) FROM `plans` p WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'max_active_listings', CAST('-1' AS JSON) FROM `plans` p WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_ai_insights', CAST('false' AS JSON) FROM `plans` p WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_area_intelligence', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_commission_tracking', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_whatsapp_lead_tracking', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_revenue_dashboard', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_automation', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'max_active_listings', CAST('-1' AS JSON) FROM `plans` p WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_ai_insights', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_area_intelligence', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_commission_tracking', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_benchmarking', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_priority_exposure', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_revenue_forecasting', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_team_dashboard', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_lead_routing', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_managed_mode', CAST('false' AS JSON) FROM `plans` p WHERE p.name = 'agency_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_recruitment_funnel', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'seats_included', CAST('5' AS JSON) FROM `plans` p WHERE p.name = 'agency_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'additional_seat_price', CAST('59900' AS JSON) FROM `plans` p WHERE p.name = 'agency_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_team_dashboard', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_lead_routing', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_managed_mode', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_commission_splits', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_leaderboards', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_recruitment_funnel', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'agency_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'seats_included', CAST('15' AS JSON) FROM `plans` p WHERE p.name = 'agency_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'additional_seat_price', CAST('49900' AS JSON) FROM `plans` p WHERE p.name = 'agency_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_team_dashboard', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'enterprise'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_managed_mode', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'enterprise'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_branch_dashboards', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'enterprise'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_market_share_analytics', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'enterprise'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_area_sponsorship_rights', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'enterprise'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'has_dedicated_support', CAST('true' AS JSON) FROM `plans` p WHERE p.name = 'enterprise'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'seats_included', CAST('-1' AS JSON) FROM `plans` p WHERE p.name = 'enterprise'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;
INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'max_active_listings', CAST('-1' AS JSON) FROM `plans` p WHERE p.name = 'enterprise'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`), `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `subscriptions` (
  `owner_type`,
  `owner_id`,
  `plan_id`,
  `status`,
  `trial_ends_at`,
  `billing_cycle_anchor`,
  `metadata`
)
SELECT
  'agent',
  u.id,
  p.id,
  CASE
    WHEN u.`trialEndsAt` IS NOT NULL AND u.`trialEndsAt` > NOW() THEN 'trial'
    WHEN u.`trialStatus` = 'active' THEN 'trial'
    WHEN u.`plan` = 'paid' THEN 'active'
    ELSE 'expired'
  END AS subscription_status,
  COALESCE(u.`trialEndsAt`, DATE_ADD(NOW(), INTERVAL 30 DAY)),
  COALESCE(u.`trialEndsAt`, DATE_ADD(NOW(), INTERVAL 30 DAY)),
  JSON_OBJECT('source', 'migration_0030', 'default_plan', 'agent_starter')
FROM `users` u
JOIN `plans` p ON p.name = 'agent_starter'
WHERE u.role = 'agent'
  AND NOT EXISTS (
    SELECT 1 FROM `subscriptions` s WHERE s.owner_type = 'agent' AND s.owner_id = u.id
  );

INSERT INTO `subscriptions` (
  `owner_type`,
  `owner_id`,
  `plan_id`,
  `status`,
  `trial_ends_at`,
  `billing_cycle_anchor`,
  `metadata`
)
SELECT
  'agency',
  a.id,
  p.id,
  CASE
    WHEN a.subscriptionStatus IN ('trial', 'trialing', 'pending_payment', 'incomplete') THEN 'trial'
    WHEN a.subscriptionStatus IN ('active') THEN 'active'
    WHEN a.subscriptionStatus IN ('expired', 'canceled', 'cancelled', 'unpaid', 'past_due') THEN 'expired'
    ELSE 'trial'
  END AS subscription_status,
  COALESCE(a.subscriptionExpiry, DATE_ADD(NOW(), INTERVAL 30 DAY)),
  COALESCE(a.subscriptionExpiry, DATE_ADD(NOW(), INTERVAL 30 DAY)),
  JSON_OBJECT('source', 'migration_0030', 'legacy_plan', a.subscriptionPlan)
FROM `agencies` a
JOIN `plans` p ON p.name = CASE
  WHEN a.subscriptionPlan = 'enterprise' THEN 'enterprise'
  WHEN a.subscriptionPlan = 'premium' THEN 'agency_pro'
  ELSE 'agency_growth'
END
WHERE NOT EXISTS (
  SELECT 1 FROM `subscriptions` s WHERE s.owner_type = 'agency' AND s.owner_id = a.id
);
