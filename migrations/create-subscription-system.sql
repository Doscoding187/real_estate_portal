-- =====================================================
-- SUBSCRIPTION PLANS & BILLING MODULE
-- South African Real Estate Platform
-- =====================================================

-- Note: Database is already selected via connection, no USE statement needed

-- =====================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(100) UNIQUE NOT NULL,
  category ENUM('agent', 'agency', 'developer') NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  price_zar INT NOT NULL COMMENT 'Price in cents (R299 = 29900)',
  billing_interval ENUM('monthly', 'yearly') DEFAULT 'monthly' NOT NULL,
  trial_days INT DEFAULT 14,
  is_trial_plan TINYINT(1) DEFAULT 0 COMMENT 'Is this the trial tier?',
  is_free_plan TINYINT(1) DEFAULT 0 COMMENT 'Is this free tier?',
  priority_level INT DEFAULT 0 COMMENT 'Higher = better placement',
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  
  -- Features (JSON)
  features JSON COMMENT 'Array of feature strings',
  
  -- Limits (JSON)
  limits JSON COMMENT '{listings, projects, agents, boosts, crm_contacts, etc}',
  
  -- Permissions (JSON)
  permissions JSON COMMENT '{can_create_listings, analytics_level, etc}',
  
  -- Upgrade/Downgrade paths
  upgrade_to_plan_id VARCHAR(100),
  downgrade_to_plan_id VARCHAR(100),
  
  -- Payment gateway IDs
  stripe_price_id VARCHAR(255),
  paystack_plan_code VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_active (is_active),
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. USER SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id VARCHAR(100) NOT NULL,
  
  -- Subscription state
  status ENUM(
    'trial_active',
    'trial_expired', 
    'active_paid',
    'past_due',
    'cancelled',
    'downgraded',
    'grace_period'
  ) DEFAULT 'trial_active' NOT NULL,
  
  -- Trial tracking
  trial_started_at TIMESTAMP NULL,
  trial_ends_at TIMESTAMP NULL,
  trial_used TINYINT(1) DEFAULT 0 COMMENT 'Has user used their one-time trial?',
  
  -- Subscription dates
  current_period_start TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  ends_at TIMESTAMP NULL COMMENT 'When subscription actually ends',
  
  -- Payment tracking
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  paystack_subscription_code VARCHAR(255),
  paystack_customer_code VARCHAR(255),
  
  -- Billing
  amount_zar INT COMMENT 'Amount in cents',
  billing_interval ENUM('monthly', 'yearly'),
  next_billing_date TIMESTAMP NULL,
  payment_method_last4 VARCHAR(4),
  payment_method_type VARCHAR(50),
  
  -- Metadata
  previous_plan_id VARCHAR(100) COMMENT 'For upgrade/downgrade tracking',
  downgrade_scheduled TINYINT(1) DEFAULT 0,
  downgrade_to_plan_id VARCHAR(100),
  downgrade_effective_date TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id) ON DELETE RESTRICT,
  
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_trial_ends (trial_ends_at),
  INDEX idx_next_billing (next_billing_date),
  UNIQUE KEY unique_user_subscription (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id INT NOT NULL,
  
  -- Usage metrics
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Counts
  listings_created INT DEFAULT 0,
  projects_created INT DEFAULT 0,
  agents_added INT DEFAULT 0,
  boosts_used INT DEFAULT 0,
  api_calls INT DEFAULT 0,
  storage_mb INT DEFAULT 0,
  crm_contacts INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  
  INDEX idx_user_period (user_id, period_start, period_end),
  INDEX idx_period (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. BILLING TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id INT,
  
  -- Transaction details
  transaction_type ENUM(
    'subscription_create',
    'subscription_renew',
    'upgrade',
    'downgrade',
    'addon_purchase',
    'refund',
    'failed_payment',
    'trial_conversion'
  ) NOT NULL,
  
  amount_zar INT NOT NULL COMMENT 'Amount in cents',
  currency VARCHAR(3) DEFAULT 'ZAR',
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  
  -- Payment gateway
  payment_gateway ENUM('stripe', 'paystack', 'manual') NOT NULL,
  gateway_transaction_id VARCHAR(255),
  gateway_invoice_id VARCHAR(255),
  
  -- Metadata
  description TEXT,
  metadata JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_gateway_transaction (gateway_transaction_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. SUBSCRIPTION EVENTS LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id INT,
  
  event_type ENUM(
    'trial_started',
    'trial_expiring_soon',
    'trial_expired',
    'subscription_created',
    'subscription_renewed',
    'subscription_upgraded',
    'subscription_downgraded',
    'subscription_cancelled',
    'payment_succeeded',
    'payment_failed',
    'feature_locked',
    'limit_reached'
  ) NOT NULL,
  
  event_data JSON,
  metadata JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  
  INDEX idx_user (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. BOOST CREDITS TABLE (for Elite/Pro plans)
-- =====================================================
CREATE TABLE IF NOT EXISTS boost_credits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  
  total_credits INT DEFAULT 0,
  used_credits INT DEFAULT 0,
  remaining_credits INT AS (total_credits - used_credits) STORED,
  
  reset_at TIMESTAMP NULL COMMENT 'When monthly credits reset',
  expires_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user (user_id),
  UNIQUE KEY unique_user_credits (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. SEED DEFAULT PLANS
-- =====================================================

-- AGENT PLANS
INSERT INTO subscription_plans (plan_id, category, name, display_name, price_zar, billing_interval, trial_days, is_trial_plan, is_free_plan, priority_level, sort_order, features, limits, permissions, upgrade_to_plan_id, downgrade_to_plan_id) VALUES
-- Agent Free (post-trial)
('agent_free', 'agent', 'Free', 'Agent Free', 0, 'monthly', 0, 0, 1, 0, 1, 
  JSON_ARRAY('3 active listings', 'Basic profile', 'Read-only CRM', 'Limited leads'),
  JSON_OBJECT('listings', 3, 'boosts', 0, 'crm_contacts', 100, 'analytics_level', 'basic'),
  JSON_OBJECT('can_create_listings', true, 'crm_access_level', 'read_only', 'analytics_level', 'basic', 'boost_credits', 0, 'priority_explore', false, 'automation_access', false),
  'agent_pro', NULL),

-- Agent Pro
('agent_pro', 'agent', 'Pro', 'Agent Pro', 29900, 'monthly', 14, 0, 0, 5, 2,
  JSON_ARRAY('Unlimited listings', 'Full CRM', 'Branding tools', 'Standard Explore placement', 'Analytics dashboard'),
  JSON_OBJECT('listings', -1, 'boosts', 0, 'crm_contacts', -1, 'analytics_level', 'standard'),
  JSON_OBJECT('can_create_listings', true, 'crm_access_level', 'full', 'analytics_level', 'standard', 'boost_credits', 0, 'priority_explore', false, 'automation_access', false, 'branding_tools', true),
  'agent_elite', 'agent_free'),

-- Agent Elite (Trial tier)
('agent_elite', 'agent', 'Elite', 'Agent Elite', 69900, 'monthly', 14, 1, 0, 10, 3,
  JSON_ARRAY('All Pro features', 'Priority Explore placement', '10 boost credits/month', 'Automation tools', 'Advanced reporting', 'Premium badge'),
  JSON_OBJECT('listings', -1, 'boosts', 10, 'crm_contacts', -1, 'analytics_level', 'advanced'),
  JSON_OBJECT('can_create_listings', true, 'crm_access_level', 'full', 'analytics_level', 'advanced', 'boost_credits', 10, 'priority_explore', true, 'automation_access', true, 'branding_tools', true, 'premium_badge', true),
  NULL, 'agent_pro'),

-- AGENCY PLANS
-- Agency Starter (post-trial)
('agency_starter', 'agency', 'Starter', 'Agency Starter', 149900, 'monthly', 0, 0, 0, 3, 4,
  JSON_ARRAY('Up to 5 agents', 'Team CRM', 'Brand page', 'Lead routing', 'Basic analytics'),
  JSON_OBJECT('agents', 5, 'listings', -1, 'boosts', 0, 'crm_contacts', 500, 'analytics_level', 'standard'),
  JSON_OBJECT('agent_seat_limit', 5, 'crm_access_level', 'full', 'analytics_level', 'standard', 'lead_routing', true, 'brand_page', true, 'automation_access', false),
  'agency_growth', NULL),

-- Agency Growth (Trial tier)
('agency_growth', 'agency', 'Growth', 'Agency Growth', 349900, 'monthly', 14, 1, 0, 8, 5,
  JSON_ARRAY('Up to 20 agents', 'Full automation suite', 'Advanced reporting', 'Team analytics', 'Bulk boosts discount', 'Priority support'),
  JSON_OBJECT('agents', 20, 'listings', -1, 'boosts', 20, 'crm_contacts', -1, 'analytics_level', 'advanced'),
  JSON_OBJECT('agent_seat_limit', 20, 'crm_access_level', 'full', 'analytics_level', 'advanced', 'lead_routing', true, 'brand_page', true, 'automation_access', true, 'bulk_boost_discount', true, 'priority_support', true),
  'agency_enterprise', 'agency_starter'),

-- Agency Enterprise
('agency_enterprise', 'agency', 'Enterprise', 'Agency Enterprise', 899900, 'monthly', 14, 0, 0, 15, 6,
  JSON_ARRAY('Unlimited agents', 'API integrations', 'Migration support', 'Dedicated manager', 'SLA-level support', 'White-label options'),
  JSON_OBJECT('agents', -1, 'listings', -1, 'boosts', 50, 'crm_contacts', -1, 'analytics_level', 'enterprise', 'api_calls', 100000),
  JSON_OBJECT('agent_seat_limit', -1, 'crm_access_level', 'full', 'analytics_level', 'enterprise', 'lead_routing', true, 'brand_page', true, 'automation_access', true, 'api_access', true, 'migration_support', true, 'dedicated_manager', true, 'sla_support', true, 'white_label', true),
  NULL, 'agency_growth'),

-- DEVELOPER PLANS
-- Developer Basic (post-trial)
('developer_basic', 'developer', 'Basic', 'Developer Basic', 599900, 'monthly', 0, 0, 0, 4, 7,
  JSON_ARRAY('1 active project', 'Lead management funnel', 'Inventory tracker', 'Basic analytics', 'Project website'),
  JSON_OBJECT('projects', 1, 'listings_per_project', 50, 'boosts', 5, 'analytics_level', 'standard'),
  JSON_OBJECT('project_limit', 1, 'crm_access_level', 'full', 'analytics_level', 'standard', 'inventory_tracker', true, 'project_website', true, 'lead_funnel', true),
  'developer_pro', NULL),

-- Developer Pro (Trial tier)
('developer_pro', 'developer', 'Pro', 'Developer Pro', 1499900, 'monthly', 14, 1, 0, 9, 8,
  JSON_ARRAY('Up to 5 projects', 'Explore promotions', 'Launch toolkit', 'Project-level analytics', 'Priority placement', 'Bulk upload tools'),
  JSON_OBJECT('projects', 5, 'listings_per_project', -1, 'boosts', 25, 'analytics_level', 'advanced'),
  JSON_OBJECT('project_limit', 5, 'crm_access_level', 'full', 'analytics_level', 'advanced', 'inventory_tracker', true, 'project_website', true, 'lead_funnel', true, 'explore_promotions', true, 'launch_toolkit', true, 'priority_placement', true, 'bulk_upload', true),
  'developer_enterprise', 'developer_basic'),

-- Developer Enterprise
('developer_enterprise', 'developer', 'Enterprise', 'Developer Enterprise', 2999900, 'monthly', 14, 0, 0, 20, 9,
  JSON_ARRAY('Unlimited projects', 'API integrations', 'Priority Explore placement', 'Dedicated onboarding', 'Quarterly data reports', 'White-label microsites'),
  JSON_OBJECT('projects', -1, 'listings_per_project', -1, 'boosts', 100, 'analytics_level', 'enterprise', 'api_calls', 500000),
  JSON_OBJECT('project_limit', -1, 'crm_access_level', 'full', 'analytics_level', 'enterprise', 'inventory_tracker', true, 'project_website', true, 'lead_funnel', true, 'explore_promotions', true, 'launch_toolkit', true, 'priority_placement', true, 'api_access', true, 'dedicated_onboarding', true, 'quarterly_reports', true, 'white_label_sites', true, 'bulk_upload', true),
  NULL, 'developer_pro');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Subscription system schema created successfully!' AS status;
