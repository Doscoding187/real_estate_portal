/**
 * Script to run notifications table migration
 * Run with: pnpm exec tsx scripts/run-notifications-migration.ts
 */
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runNotificationsMigration() {
  console.log('🚀 Running developer_notifications table migration...\n');

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

    // Check if developer_notifications table already exists
    console.log('🔍 Checking if developer_notifications table exists...');
    const [tables]: any = await connection.execute("SHOW TABLES LIKE 'developer_notifications'");
    
    if (tables.length > 0) {
      console.log('⚠️  Developer notifications table already exists');
      console.log('📋 Current table structure:');
      const [columns]: any = await connection.execute('DESCRIBE developer_notifications');
      columns.forEach((col: any) => {
        console.log(`   ${col.Field} (${col.Type})`);
      });
      return;
    }

    console.log('📝 Creating developer_notifications table...\n');

    // Create developer_notifications table
    await connection.execute(`
      CREATE TABLE \`developer_notifications\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
        \`developer_id\` int NOT NULL,
        \`user_id\` int NULL,
        \`title\` varchar(255) NOT NULL,
        \`body\` text NOT NULL,
        \`type\` varchar(50) NOT NULL,
        \`severity\` enum('info', 'warning', 'error', 'success') NOT NULL DEFAULT 'info',
        \`read\` boolean NOT NULL DEFAULT false,
        \`action_url\` varchar(500) NULL,
        \`metadata\` json,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_notifications_developer_id\` FOREIGN KEY (\`developer_id\`) REFERENCES \`developers\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_notifications_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      )
    `);
    console.log('✅ Created developer_notifications table');

    // Create indexes
    console.log('📊 Creating indexes...');
    
    await connection.execute('CREATE INDEX `idx_developer_notifications_developer_id` ON `developer_notifications`(`developer_id`)');
    console.log('   ✅ Created idx_developer_notifications_developer_id');
    
    await connection.execute('CREATE INDEX `idx_developer_notifications_user_id` ON `developer_notifications`(`user_id`)');
    console.log('   ✅ Created idx_developer_notifications_user_id');
    
    await connection.execute('CREATE INDEX `idx_developer_notifications_read` ON `developer_notifications`(`read`)');
    console.log('   ✅ Created idx_developer_notifications_read');
    
    await connection.execute('CREATE INDEX `idx_developer_notifications_created_at` ON `developer_notifications`(`created_at`)');
    console.log('   ✅ Created idx_developer_notifications_created_at');
    
    await connection.execute('CREATE INDEX `idx_developer_notifications_type` ON `developer_notifications`(`type`)');
    console.log('   ✅ Created idx_developer_notifications_type');
    
    await connection.execute('CREATE INDEX `idx_developer_notifications_feed` ON `developer_notifications`(`developer_id`, `read`, `created_at` DESC)');
    console.log('   ✅ Created idx_developer_notifications_feed');

    console.log('\n✅ Developer notifications migration completed successfully!');

    // Verify table structure
    console.log('\n📋 Final table structure:');
    const [finalColumns]: any = await connection.execute('DESCRIBE developer_notifications');
    finalColumns.forEach((col: any) => {
      console.log(`   ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runNotificationsMigration();
