/**
 * Mission Control Phase 1 - Complete Migration Runner
 * Runs all three migrations in order:
 * 1. Activities table
 * 2. Notifications table
 * 3. KPI caching fields
 * 
 * Run with: pnpm exec tsx scripts/run-mission-control-phase1-migrations.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function runMigration(connection: any, name: string, sqlFile: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running migration: ${name}`);
  console.log('='.repeat(60));
  
  try {
    const sqlPath = path.join(process.cwd(), 'drizzle', 'migrations', sqlFile);
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolons and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      console.log(`SQL: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      try {
        await connection.execute(statement);
        console.log('✅ Success\n');
      } catch (error: any) {
        // Check if error is about table/column/index already existing
        if (error.message?.includes('already exists') || 
            error.message?.includes('already exist') ||
            error.message?.includes('Duplicate column') ||
            error.message?.includes('Duplicate key') ||
            error.message?.includes('Duplicate entry')) {
          console.log('⚠️  Already exists, skipping\n');
        } else {
          throw error;
        }
      }
    }
    
    console.log(`✅ Migration "${name}" completed successfully!`);
    return true;
  } catch (error: any) {
    console.error(`❌ Migration "${name}" failed:`, error.message);
    return false;
  }
}

async function verifyMigrations(connection: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Verifying migrations...');
  console.log('='.repeat(60));
  
  try {
    // Check activities table
    console.log('\n1. Checking activities table...');
    const [activitiesCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'activities'
    `);
    const activitiesExists = (activitiesCheck as any)[0]?.count > 0;
    console.log(activitiesExists ? '✅ Activities table exists' : '❌ Activities table missing');
    
    // Check developer_notifications table
    console.log('\n2. Checking developer_notifications table...');
    const [notificationsCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'developer_notifications'
    `);
    const notificationsExists = (notificationsCheck as any)[0]?.count > 0;
    console.log(notificationsExists ? '✅ Notifications table exists' : '❌ Notifications table missing');
    
    // Check KPI caching columns
    console.log('\n3. Checking KPI caching columns in developers table...');
    const [kpiCachingCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'developers' 
      AND column_name IN ('kpi_cache', 'last_kpi_calculation')
    `);
    const kpiCachingExists = (kpiCachingCheck as any)[0]?.count === 2;
    console.log(kpiCachingExists ? '✅ KPI caching columns exist' : '❌ KPI caching columns missing');
    
    console.log('\n' + '='.repeat(60));
    if (activitiesExists && notificationsExists && kpiCachingExists) {
      console.log('✅ All migrations verified successfully!');
      return true;
    } else {
      console.log('⚠️  Some migrations are incomplete');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('MISSION CONTROL PHASE 1 - MIGRATION RUNNER');
  console.log('='.repeat(60));
  console.log('This script will run all Phase 1 migrations:');
  console.log('1. Activities table');
  console.log('2. Developer notifications table');
  console.log('3. KPI caching fields');
  console.log('='.repeat(60));
  
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL is not defined');
    console.error('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }
  
  let connection;
  try {
    // Create database connection
    console.log('\n📡 Connecting to database...');
    const dbUrl = new URL(process.env.DATABASE_URL);
    const sslParam = dbUrl.searchParams.get('ssl');
    dbUrl.searchParams.delete('ssl');
    
    connection = await createConnection({
      uri: dbUrl.toString(),
      ssl: sslParam === 'true' || sslParam === '{"rejectUnauthorized":true}' 
        ? { rejectUnauthorized: true } 
        : { rejectUnauthorized: false }
    });
    console.log('✅ Connected to database\n');
    
    // Run migrations in order
    const results = {
      activities: await runMigration(connection, 'Activities Table', 'create-activities-table.sql'),
      notifications: await runMigration(connection, 'Notifications Table', 'create-notifications-table.sql'),
      kpiCaching: await runMigration(connection, 'KPI Caching', 'add-kpi-caching-to-developers.sql'),
    };
    
    // Verify all migrations
    const verified = await verifyMigrations(connection);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Activities Table:    ${results.activities ? '✅ Success' : '❌ Failed'}`);
    console.log(`Notifications Table: ${results.notifications ? '✅ Success' : '❌ Failed'}`);
    console.log(`KPI Caching:         ${results.kpiCaching ? '✅ Success' : '❌ Failed'}`);
    console.log(`Verification:        ${verified ? '✅ Passed' : '❌ Failed'}`);
    console.log('='.repeat(60));
    
    if (results.activities && results.notifications && results.kpiCaching && verified) {
      console.log('\n🎉 All Phase 1 migrations completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Restart your development server');
      console.log('2. Test the Mission Control dashboard');
      console.log('3. Deploy to Railway when ready');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some migrations failed or could not be verified');
      console.log('Please check the errors above and try again');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 Database connection closed');
    }
  }
}

main();
