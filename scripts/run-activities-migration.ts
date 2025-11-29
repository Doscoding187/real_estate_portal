/**
 * Script to create activities table
 * Run with: pnpm exec tsx scripts/run-activities-migration.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runActivitiesMigration() {
  console.log('🚀 Creating activities table...\n');

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

    // Check if table already exists
    const [existingTables]: any = await connection.execute("SHOW TABLES LIKE 'activities'");
    
    if (existingTables.length > 0) {
      console.log('⚠️  Activities table already exists');
      const [columns]: any = await connection.execute('DESCRIBE activities');
      console.log('📋 Current table structure:');
      columns.forEach((col: any) => {
        console.log(`   ${col.Field} (${col.Type})`);
      });
      return;
    }

    console.log('📝 Creating activities table...\n');

    // Create table
    await connection.execute(`
      CREATE TABLE \`activities\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        \`developer_id\` int NOT NULL,
        \`activity_type\` varchar(50) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`description\` text,
        \`metadata\` json COMMENT 'Flexible data storage for activity-specific information',
        \`related_entity_type\` enum('development', 'unit', 'lead', 'campaign', 'team_member'),
        \`related_entity_id\` int,
        \`user_id\` int COMMENT 'User who triggered the activity',
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (\`developer_id\`) REFERENCES \`developers\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created activities table');

    // Create indexes
    console.log('📊 Creating indexes...');
    
    await connection.execute('CREATE INDEX `idx_activities_developer_id` ON `activities`(`developer_id`)');
    console.log('   ✅ Created idx_activities_developer_id');
    
    await connection.execute('CREATE INDEX `idx_activities_activity_type` ON `activities`(`activity_type`)');
    console.log('   ✅ Created idx_activities_activity_type');
    
    await connection.execute('CREATE INDEX `idx_activities_created_at` ON `activities`(`created_at`)');
    console.log('   ✅ Created idx_activities_created_at');
    
    await connection.execute('CREATE INDEX `idx_activities_related_entity` ON `activities`(`related_entity_type`, `related_entity_id`)');
    console.log('   ✅ Created idx_activities_related_entity');

    console.log('\n✅ Activities table created successfully!\n');
    
    // Show table structure
    const [columns]: any = await connection.execute('DESCRIBE activities');
    console.log('📋 Table structure:');
    columns.forEach((col: any) => {
      console.log(`   ${col.Field} (${col.Type})`);
    });

  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Activities table already exists');
    } else {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    }
  } finally {
    if (connection) await connection.end();
  }
}

runActivitiesMigration();
