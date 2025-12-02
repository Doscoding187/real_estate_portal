#!/usr/bin/env tsx
/**
 * Subscription System Integration Script
 * Integrates the subscription system into the database
 */

import 'dotenv/config';
import { createConnection } from 'mysql2/promise';

async function integrateSubscriptionSystem() {
  console.log('🚀 Starting Subscription System Integration...\n');

  // Database connection
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('📦 Connecting to database...');
  
  // Parse DATABASE_URL and handle SSL properly
  const url = new URL(dbUrl);
  const connectionConfig: any = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1).split('?')[0],
  };

  // Handle SSL parameter from URL
  const sslParam = url.searchParams.get('ssl');
  if (sslParam === 'true') {
    connectionConfig.ssl = { rejectUnauthorized: false };
  }

  const connection = await createConnection(connectionConfig);
  console.log('✅ Connected to database\n');

  try {
    // Check if tables exist
    console.log('🔍 Checking existing tables...');
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
        AND table_name IN (
          'subscription_plans',
          'user_subscriptions',
          'subscription_usage',
          'billing_transactions',
          'subscription_events',
          'boost_credits'
        )
    `);

    const existingTables = (tables as any[]).map((t) => t.table_name || t.TABLE_NAME);
    console.log(`Found ${existingTables.length}/6 subscription tables`);

    if (existingTables.length === 6) {
      console.log('✅ All subscription tables already exist!\n');
      
      // Check plans count
      const [plansCount] = await connection.execute('SELECT COUNT(*) as count FROM subscription_plans');
      const count = (plansCount as any[])[0].count;
      console.log(`📊 Found ${count} subscription plans in database\n`);
      
      if (count === 9) {
        console.log('✅ All 9 plans are already seeded!');
        console.log('\n🎉 Subscription system is already integrated!');
        console.log('\n📍 Next steps:');
        console.log('1. Start dev server: pnpm dev');
        console.log('2. Visit: http://localhost:5173/plans');
        console.log('3. View Super Admin subscriptions: http://localhost:5173/admin/subscriptions\n');
      } else {
        console.log('⚠️  Plans count mismatch. Expected 9, found', count);
        console.log('You may need to re-seed the plans table.\n');
      }
      
      await connection.end();
      return;
    }

    console.log('\n📝 Reading SQL migration file...');
    const fs = await import('fs');
    const path = await import('path');
    const sqlPath = path.join(process.cwd(), 'migrations', 'create-subscription-system.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ Migration file not found at:', sqlPath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Split SQL into individual statements
    console.log('🔧 Executing migration...');
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toLowerCase().includes('select') && statement.toLowerCase().includes('success')) {
        continue; // Skip success message
      }
      
      try {
        await connection.execute(statement);
        process.stdout.write('.');
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          // Table/index already exists, skip
          continue;
        }
        console.error(`\n❌ Error executing statement ${i + 1}:`, error.message);
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!\n');

    // Verify installation
    console.log('🔍 Verifying installation...');
    const [newTables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
        AND table_name IN (
          'subscription_plans',
          'user_subscriptions',
          'subscription_usage',
          'billing_transactions',
          'subscription_events',
          'boost_credits'
        )
    `);

    console.log(`✅ Created ${(newTables as any[]).length}/6 tables`);

    // Check seeded plans
    const [plans] = await connection.execute('SELECT plan_id, display_name, price_zar FROM subscription_plans ORDER BY sort_order');
    console.log(`\n📊 Seeded ${(plans as any[]).length} subscription plans:`);
    
    for (const plan of plans as any[]) {
      const price = plan.price_zar === 0 ? 'Free' : `R${(plan.price_zar / 100).toFixed(2)}`;
      console.log(`   - ${plan.display_name} (${plan.plan_id}): ${price}`);
    }

    console.log('\n🎉 Subscription System Integration Complete!\n');
    console.log('📍 Next steps:');
    console.log('1. Start dev server: pnpm dev');
    console.log('2. Visit: http://localhost:5173/plans');
    console.log('3. Test trial start: Login and click "Start Free Trial"');
    console.log('4. View admin dashboard: http://localhost:5173/admin/subscriptions\n');

  } catch (error) {
    console.error('\n❌ Integration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run integration
integrateSubscriptionSystem()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
