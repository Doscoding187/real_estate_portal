/**
 * Script to run developer approval workflow migration step by step
 * Run with: pnpm exec tsx scripts/run-developer-migration-step-by-step.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runDeveloperMigrationStepByStep() {
  console.log('🚀 Running developer approval workflow migration (step by step)...\n');

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

    // Check current columns
    console.log('🔍 Current table structure:');
    const [columns]: any = await connection.execute('DESCRIBE developers');
    columns.forEach((col: any) => {
      console.log(`   ${col.Field} (${col.Type})`);
    });
    console.log('');

    // Add columns one by one
    const columnsToAdd = [
      { name: 'userId', sql: 'ADD COLUMN `userId` int NOT NULL' },
      { name: 'status', sql: "ADD COLUMN `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL" },
      { name: 'rejectionReason', sql: 'ADD COLUMN `rejectionReason` text NULL' },
      { name: 'approvedBy', sql: 'ADD COLUMN `approvedBy` int NULL' },
      { name: 'approvedAt', sql: 'ADD COLUMN `approvedAt` timestamp NULL' },
      { name: 'rejectedBy', sql: 'ADD COLUMN `rejectedBy` int NULL' },
      { name: 'rejectedAt', sql: 'ADD COLUMN `rejectedAt` timestamp NULL' },
    ];

    for (const column of columnsToAdd) {
      try {
        console.log(`Adding column: ${column.name}...`);
        await connection.execute(`ALTER TABLE \`developers\` ${column.sql}`);
        console.log(`✅ Added ${column.name}\n`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column ${column.name} already exists\n`);
        } else {
          console.error(`❌ Failed to add ${column.name}:`, error.message);
          throw error;
        }
      }
    }

    // Add foreign keys
    console.log('\n🔗 Adding foreign key constraints...');
    
    const foreignKeys = [
      { name: 'fk_developers_userId', sql: 'ADD CONSTRAINT `fk_developers_userId` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE' },
      { name: 'fk_developers_approvedBy', sql: 'ADD CONSTRAINT `fk_developers_approvedBy` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL' },
      { name: 'fk_developers_rejectedBy', sql: 'ADD CONSTRAINT `fk_developers_rejectedBy` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL' },
    ];

    for (const fk of foreignKeys) {
      try {
        console.log(`Adding foreign key: ${fk.name}...`);
        await connection.execute(`ALTER TABLE \`developers\` ${fk.sql}`);
        console.log(`✅ Added ${fk.name}\n`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Foreign key ${fk.name} already exists\n`);
        } else {
          console.error(`❌ Failed to add ${fk.name}:`, error.message);
          // Don't throw - continue with other foreign keys
        }
      }
    }

    // Add indexes
    console.log('\n📊 Adding indexes...');
    
    const indexes = [
      { name: 'idx_developers_userId', sql: 'CREATE INDEX `idx_developers_userId` ON `developers`(`userId`)' },
      { name: 'idx_developers_status', sql: 'CREATE INDEX `idx_developers_status` ON `developers`(`status`)' },
    ];

    for (const idx of indexes) {
      try {
        console.log(`Adding index: ${idx.name}...`);
        await connection.execute(idx.sql);
        console.log(`✅ Added ${idx.name}\n`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Index ${idx.name} already exists\n`);
        } else {
          console.error(`❌ Failed to add ${idx.name}:`, error.message);
          // Don't throw - continue
        }
      }
    }

    // Verify final structure
    console.log('\n✅ Migration complete!\n');
    console.log('📋 Final table structure:');
    const [finalColumns]: any = await connection.execute('DESCRIBE developers');
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

runDeveloperMigrationStepByStep();
