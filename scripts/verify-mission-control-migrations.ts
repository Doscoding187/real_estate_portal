/**
 * Script to verify all mission control migrations have been applied
 * Run with: pnpm exec tsx scripts/verify-mission-control-migrations.ts
 */
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyMissionControlMigrations() {
  console.log('🔍 Verifying Mission Control migrations...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined');
    process.exit(1);
  }

  let connection;
  try {
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

    let allPassed = true;

    // Check 1: Activities table
    console.log('📋 Checking activities table...');
    const [activitiesTables]: any = await connection.execute("SHOW TABLES LIKE 'activities'");
    if (activitiesTables.length === 0) {
      console.log('   ❌ Activities table does not exist');
      allPassed = false;
    } else {
      console.log('   ✅ Activities table exists');
      
      // Verify columns
      const [activitiesColumns]: any = await connection.execute('DESCRIBE activities');
      const requiredColumns = ['id', 'developer_id', 'activity_type', 'title', 'description', 'metadata', 'related_entity_type', 'related_entity_id', 'user_id', 'created_at'];
      const existingColumns = activitiesColumns.map((col: any) => col.Field);
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
        allPassed = false;
      } else {
        console.log('   ✅ All required columns present');
      }

      // Verify indexes
      const [activitiesIndexes]: any = await connection.execute('SHOW INDEX FROM activities');
      const indexNames = activitiesIndexes.map((idx: any) => idx.Key_name);
      const requiredIndexes = ['idx_activities_developer_id', 'idx_activities_type', 'idx_activities_created_at', 'idx_activities_feed'];
      const missingIndexes = requiredIndexes.filter(idx => !indexNames.includes(idx));
      
      if (missingIndexes.length > 0) {
        console.log(`   ⚠️  Missing indexes: ${missingIndexes.join(', ')}`);
      } else {
        console.log('   ✅ All required indexes present');
      }
    }

    // Check 2: Developer notifications table
    console.log('\n📋 Checking developer_notifications table...');
    const [notificationsTables]: any = await connection.execute("SHOW TABLES LIKE 'developer_notifications'");
    if (notificationsTables.length === 0) {
      console.log('   ❌ Developer notifications table does not exist');
      allPassed = false;
    } else {
      console.log('   ✅ Developer notifications table exists');
      
      // Verify columns
      const [notificationsColumns]: any = await connection.execute('DESCRIBE developer_notifications');
      const requiredColumns = ['id', 'developer_id', 'user_id', 'title', 'body', 'type', 'severity', 'read', 'action_url', 'metadata', 'created_at'];
      const existingColumns = notificationsColumns.map((col: any) => col.Field);
      
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
        allPassed = false;
      } else {
        console.log('   ✅ All required columns present');
      }

      // Verify indexes
      const [notificationsIndexes]: any = await connection.execute('SHOW INDEX FROM developer_notifications');
      const indexNames = notificationsIndexes.map((idx: any) => idx.Key_name);
      const requiredIndexes = ['idx_developer_notifications_developer_id', 'idx_developer_notifications_read', 'idx_developer_notifications_feed'];
      const missingIndexes = requiredIndexes.filter(idx => !indexNames.includes(idx));
      
      if (missingIndexes.length > 0) {
        console.log(`   ⚠️  Missing indexes: ${missingIndexes.join(', ')}`);
      } else {
        console.log('   ✅ All required indexes present');
      }
    }

    // Check 3: KPI caching fields in developers table
    console.log('\n📋 Checking KPI caching fields in developers table...');
    const [kpiColumns]: any = await connection.execute("SHOW COLUMNS FROM developers WHERE Field IN ('kpi_cache', 'last_kpi_calculation')");
    
    if (kpiColumns.length < 2) {
      console.log('   ❌ KPI caching fields missing from developers table');
      allPassed = false;
    } else {
      console.log('   ✅ KPI caching fields present');
      
      // Verify index
      const [kpiIndexes]: any = await connection.execute('SHOW INDEX FROM developers WHERE Key_name = "idx_developers_last_kpi_calculation"');
      if (kpiIndexes.length === 0) {
        console.log('   ⚠️  Missing index: idx_developers_last_kpi_calculation');
      } else {
        console.log('   ✅ KPI caching index present');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ All Mission Control migrations verified successfully!');
      console.log('🚀 Database is ready for Mission Control Phase 1');
    } else {
      console.log('❌ Some migrations are missing or incomplete');
      console.log('⚠️  Please run the missing migrations before proceeding');
      process.exit(1);
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

verifyMissionControlMigrations();
