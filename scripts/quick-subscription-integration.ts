#!/usr/bin/env tsx
/**
 * Quick Subscription Integration
 * Directly creates tables using Drizzle connection
 */

import 'dotenv/config';
import { getDb } from '../server/db';

async function quickIntegration() {
  console.log('🚀 Quick Subscription Integration\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  console.log('✅ Connected to database\n');

  try {
    // Check existing tables
    const [tables] = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
        AND table_name = 'subscription_plans'
    `);

    if ((tables as any[]).length > 0) {
      console.log('✅ Subscription tables already exist!');
      const [plans] = await db.execute('SELECT COUNT(*) as count FROM subscription_plans');
      console.log(`📊 Found ${(plans as any[])[0].count} plans\n`);
      
      console.log('🎉 System is ready!');
      console.log('📍 Visit: http://localhost:5173/plans\n');
      return;
    }

    console.log('📝 Creating subscription tables...\n');

    // Create tables one by one
    console.log('1. Creating subscription_plans table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id VARCHAR(100) UNIQUE NOT NULL,
        category ENUM('agent', 'agency', 'developer') NOT NULL,
        name VARCHAR(100) NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        description TEXT,
        price_zar INT NOT NULL COMMENT 'Price in cents',
        billing_interval ENUM('monthly', 'yearly') DEFAULT 'monthly' NOT NULL,
        trial_days INT DEFAULT 14,
        is_trial_plan TINYINT(1) DEFAULT 0,
        is_free_plan TINYINT(1) DEFAULT 0,
        priority_level INT DEFAULT 0,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        features JSON,
        limits JSON,
        permissions JSON,
        upgrade_to_plan_id VARCHAR(100),
        downgrade_to_plan_id VARCHAR(100),
        stripe_price_id VARCHAR(255),
        paystack_plan_code VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);
    console.log('✅ subscription_plans created');

    console.log('2. Creating user_subscriptions table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id VARCHAR(100) NOT NULL,
        status ENUM(
          'trial_active',
          'trial_expired',
          'active_paid',
          'past_due',
          'cancelled',
          'downgraded',
          'grace_period'
        ) DEFAULT 'trial_active' NOT NULL,
        trial_started_at TIMESTAMP NULL,
        trial_ends_at TIMESTAMP NULL,
        trial_used TINYINT(1) DEFAULT 0,
        current_period_start TIMESTAMP NULL,
        current_period_end TIMESTAMP NULL,
        cancelled_at TIMESTAMP NULL,
        ends_at TIMESTAMP NULL,
        stripe_subscription_id VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        paystack_subscription_code VARCHAR(255),
        paystack_customer_code VARCHAR(255),
        amount_zar INT,
        billing_interval ENUM('monthly', 'yearly'),
        next_billing_date TIMESTAMP NULL,
        payment_method_last4 VARCHAR(4),
        payment_method_type VARCHAR(50),
        previous_plan_id VARCHAR(100),
        downgrade_scheduled TINYINT(1) DEFAULT 0,
        downgrade_to_plan_id VARCHAR(100),
        downgrade_effective_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_status (status),
        UNIQUE KEY unique_user_subscription (user_id)
      )
    `);
    console.log('✅ user_subscriptions created');

    console.log('3. Creating subscription_usage table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subscription_id INT NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        listings_created INT DEFAULT 0,
        projects_created INT DEFAULT 0,
        agents_added INT DEFAULT 0,
        boosts_used INT DEFAULT 0,
        api_calls INT DEFAULT 0,
        storage_mb INT DEFAULT 0,
        crm_contacts INT DEFAULT 0,
        emails_sent INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_period (user_id, period_start, period_end)
      )
    `);
    console.log('✅ subscription_usage created');

    console.log('4. Creating billing_transactions table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS billing_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subscription_id INT,
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
        amount_zar INT NOT NULL,
        currency VARCHAR(3) DEFAULT 'ZAR',
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        payment_gateway ENUM('stripe', 'paystack', 'manual') NOT NULL,
        gateway_transaction_id VARCHAR(255),
        gateway_invoice_id VARCHAR(255),
        description TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ billing_transactions created');

    console.log('5. Creating subscription_events table...');
    await db.execute(`
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
        INDEX idx_user (user_id),
        INDEX idx_event_type (event_type)
      )
    `);
    console.log('✅ subscription_events created');

    console.log('6. Creating boost_credits table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS boost_credits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        total_credits INT DEFAULT 0,
        used_credits INT DEFAULT 0,
        reset_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        UNIQUE KEY unique_user_credits (user_id)
      )
    `);
    console.log('✅ boost_credits created\n');

    console.log('📊 Seeding plans...');
    
    // Seed Agent Plans
    await db.execute(`
      INSERT INTO subscription_plans (plan_id, category, name, display_name, price_zar, billing_interval, trial_days, is_trial_plan, is_free_plan, priority_level, sort_order, features, limits, permissions, upgrade_to_plan_id, downgrade_to_plan_id) VALUES
      ('agent_free', 'agent', 'Free', 'Agent Free', 0, 'monthly', 0, 0, 1, 0, 1, 
        JSON_ARRAY('3 active listings', 'Basic profile', 'Read-only CRM', 'Limited leads'),
        JSON_OBJECT('listings', 3, 'boosts', 0, 'crm_contacts', 100, 'analytics_level', 'basic'),
        JSON_OBJECT('can_create_listings', true, 'crm_access_level', 'read_only', 'analytics_level', 'basic', 'boost_credits', 0, 'priority_explore', false, 'automation_access', false),
        'agent_pro', NULL)
    `);
    
    await db.execute(`
      INSERT INTO subscription_plans (plan_id, category, name, display_name, price_zar, billing_interval, trial_days, is_trial_plan, is_free_plan, priority_level, sort_order, features, limits, permissions, upgrade_to_plan_id, downgrade_to_plan_id) VALUES
      ('agent_pro', 'agent', 'Pro', 'Agent Pro', 29900, 'monthly', 14, 0, 0, 5, 2,
        JSON_ARRAY('Unlimited listings', 'Full CRM', 'Branding tools', 'Standard Explore placement', 'Analytics dashboard'),
        JSON_OBJECT('listings', -1, 'boosts', 0, 'crm_contacts', -1, 'analytics_level', 'standard'),
        JSON_OBJECT('can_create_listings', true, 'crm_access_level', 'full', 'analytics_level', 'standard', 'boost_credits', 0, 'priority_explore', false, 'automation_access', false, 'branding_tools', true),
        'agent_elite', 'agent_free')
    `);
    
    await db.execute(`
      INSERT INTO subscription_plans (plan_id, category, name, display_name, price_zar, billing_interval, trial_days, is_trial_plan, is_free_plan, priority_level, sort_order, features, limits, permissions, upgrade_to_plan_id, downgrade_to_plan_id) VALUES
      ('agent_elite', 'agent', 'Elite', 'Agent Elite', 69900, 'monthly', 14, 1, 0, 10, 3,
        JSON_ARRAY('All Pro features', 'Priority Explore placement', '10 boost credits/month', 'Automation tools', 'Advanced reporting', 'Premium badge'),
        JSON_OBJECT('listings', -1, 'boosts', 10, 'crm_contacts', -1, 'analytics_level', 'advanced'),
        JSON_OBJECT('can_create_listings', true, 'crm_access_level', 'full', 'analytics_level', 'advanced', 'boost_credits', 10, 'priority_explore', true, 'automation_access', true, 'branding_tools', true, 'premium_badge', true),
        NULL, 'agent_pro')
    `);
    
    console.log('✅ Agent plans seeded');
    
    // Seed Agency Plans
    await db.execute(`
      INSERT INTO subscription_plans (plan_id, category, name, display_name, price_zar, billing_interval, trial_days, is_trial_plan, is_free_plan, priority_level, sort_order, features, limits, permissions, upgrade_to_plan_id, downgrade_to_plan_id) VALUES
      ('agency_starter', 'agency', 'Starter', 'Agency Starter', 149900, 'monthly', 0, 0, 0, 3, 4,
        JSON_ARRAY('Up to 5 agents', 'Team CRM', 'Brand page', 'Lead routing', 'Basic analytics'),
        JSON_OBJECT('agents', 5, 'listings', -1, 'boosts', 0, 'crm_contacts', 500, 'analytics_level', 'standard'),
        JSON_OBJECT('agent_seat_limit', 5, 'crm_access_level', 'full', 'analytics_level', 'standard', 'lead_routing', true, 'brand_page', true, 'automation_access', false),
        'agency_growth', NULL),
      ('agency_growth', 'agency', 'Growth', 'Agency Growth', 349900, 'monthly', 14, 1, 0, 8, 5,
        JSON_ARRAY('Up to 20 agents', 'Full automation suite', 'Advanced reporting', 'Team analytics', 'Bulk boosts discount', 'Priority support'),
        JSON_OBJECT('agents', 20, 'listings', -1, 'boosts', 20, 'crm_contacts', -1, 'analytics_level', 'advanced'),
        JSON_OBJECT('agent_seat_limit', 20, 'crm_access_level', 'full', 'analytics_level', 'advanced', 'lead_routing', true, 'brand_page', true, 'automation_access', true, 'bulk_boost_discount', true, 'priority_support', true),
        'agency_enterprise', 'agency_starter'),
      ('agency_enterprise', 'agency', 'Enterprise', 'Agency Enterprise', 899900, 'monthly', 14, 0, 0, 15, 6,
        JSON_ARRAY('Unlimited agents', 'API integrations', 'Migration support', 'Dedicated manager', 'SLA-level support', 'White-label options'),
        JSON_OBJECT('agents', -1, 'listings', -1, 'boosts', 50, 'crm_contacts', -1, 'analytics_level', 'enterprise', 'api_calls', 100000),
        JSON_OBJECT('agent_seat_limit', -1, 'crm_access_level', 'full', 'analytics_level', 'enterprise', 'lead_routing', true, 'brand_page', true, 'automation_access', true, 'api_access', true, 'migration_support', true, 'dedicated_manager', true, 'sla_support', true, 'white_label', true),
        NULL, 'agency_growth')
    `);
    
    console.log('✅ Agency plans seeded');
    
    // Seed Developer Plans
    await db.execute(`
      INSERT INTO subscription_plans (plan_id, category, name, display_name, price_zar, billing_interval, trial_days, is_trial_plan, is_free_plan, priority_level, sort_order, features, limits, permissions, upgrade_to_plan_id, downgrade_to_plan_id) VALUES
      ('developer_basic', 'developer', 'Basic', 'Developer Basic', 599900, 'monthly', 0, 0, 0, 4, 7,
        JSON_ARRAY('1 active project', 'Lead management funnel', 'Inventory tracker', 'Basic analytics', 'Project website'),
        JSON_OBJECT('projects', 1, 'listings_per_project', 50, 'boosts', 5, 'analytics_level', 'standard'),
        JSON_OBJECT('project_limit', 1, 'crm_access_level', 'full', 'analytics_level', 'standard', 'inventory_tracker', true, 'project_website', true, 'lead_funnel', true),
        'developer_pro', NULL),
      ('developer_pro', 'developer', 'Pro', 'Developer Pro', 1499900, 'monthly', 14, 1, 0, 9, 8,
        JSON_ARRAY('Up to 5 projects', 'Explore promotions', 'Launch toolkit', 'Project-level analytics', 'Priority placement', 'Bulk upload tools'),
        JSON_OBJECT('projects', 5, 'listings_per_project', -1, 'boosts', 25, 'analytics_level', 'advanced'),
        JSON_OBJECT('project_limit', 5, 'crm_access_level', 'full', 'analytics_level', 'advanced', 'inventory_tracker', true, 'project_website', true, 'lead_funnel', true, 'explore_promotions', true, 'launch_toolkit', true, 'priority_placement', true, 'bulk_upload', true),
        'developer_enterprise', 'developer_basic'),
      ('developer_enterprise', 'developer', 'Enterprise', 'Developer Enterprise', 2999900, 'monthly', 14, 0, 0, 20, 9,
        JSON_ARRAY('Unlimited projects', 'API integrations', 'Priority Explore placement', 'Dedicated onboarding', 'Quarterly data reports', 'White-label microsites'),
        JSON_OBJECT('projects', -1, 'listings_per_project', -1, 'boosts', 100, 'analytics_level', 'enterprise', 'api_calls', 500000),
        JSON_OBJECT('project_limit', -1, 'crm_access_level', 'full', 'analytics_level', 'enterprise', 'inventory_tracker', true, 'project_website', true, 'lead_funnel', true, 'explore_promotions', true, 'launch_toolkit', true, 'priority_placement', true, 'api_access', true, 'dedicated_onboarding', true, 'quarterly_reports', true, 'white_label_sites', true, 'bulk_upload', true),
        NULL, 'developer_pro')
    `);
    
    console.log('✅ Developer plans seeded\n');
    
    const [plans] = await db.execute('SELECT COUNT(*) as count FROM subscription_plans');
    console.log(`📊 Total plans: ${(plans as any[])[0].count}/9\n`);
    
    console.log('🎉 Integration Complete!\n');
    console.log('📍 Next steps:');
    console.log('1. Start dev: pnpm dev');
    console.log('2. Visit: http://localhost:5173/plans');
    console.log('3. Test trial: Login and click "Start Free Trial"\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

quickIntegration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
