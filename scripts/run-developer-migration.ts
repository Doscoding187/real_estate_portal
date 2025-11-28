/**
 * Script to run developer approval workflow migration
 * Run with: pnpm exec tsx scripts/run-developer-migration.ts
 */

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runDeveloperMigration() {
  console.log('🚀 Running developer approval workflow migration...\n');

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

    // Check if columns already exist
    console.log('🔍 Checking if migration is needed...');
    const [columns]: any = await connection.execute('DESCRIBE developers');
    const columnNames = columns.map((col: any) => col.Field);
    
    if (columnNames.includes('userId')) {
      console.log('✅ Migration already applied - userId column exists');
      console.log('📋 Current developers table columns:', columnNames.join(', '));
      return;
    }

    console.log('📝 Migration needed - adding columns...\n');

    // Step 1: Add columns
    console.log('1️⃣ Adding developer approval workflow columns...');
    await connection.execute(`
      ALTER TABLE \`developers\` 
      ADD COLUMN \`userId\` int NOT NULL AFTER \`isVerified\`,
      ADD COLUMN \`status\` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL AFTER \`userId\`,
      ADD COLUMN \`rejectionReason\` text NULL AFTER \`status\`,
      ADD COLUMN \`approvedBy\` int NULL AFTER \`rejectionReason\`,
      ADD COLUMN \`approvedAt\` timestamp NULL AFTER \`approvedBy\`,
      ADD COLUMN \`rejectedBy\` int NULL AFTER \`approvedAt\`,
      ADD COLUMN \`rejectedAt\` timestamp NULL AFTER \`rejectedBy\`
    `);
    console.log('✅ Columns added successfully\n');

    // Step 2: Add foreign key constraints
    console.log('2️⃣ Adding foreign key constraints...');
    try {
      await connection.execute(`
        ALTER TABLE \`developers\`
        ADD CONSTRAINT \`fk_developers_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      `);
      console.log('   ✅ Added fk_developers_userId');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  fk_developers_userId already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE \`developers\`
        ADD CONSTRAINT \`fk_developers_approvedBy\` FOREIGN KEY (\`approvedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      `);
      console.log('   ✅ Added fk_developers_approvedBy');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  fk_developers_approvedBy already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE \`developers\`
        ADD CONSTRAINT \`fk_developers_rejectedBy\` FOREIGN KEY (\`rejectedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      `);
      console.log('   ✅ Added fk_developers_rejectedBy');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  fk_developers_rejectedBy already exists');
      } else {
        throw error;
      }
    }
    console.log('✅ Foreign keys added successfully\n');

    // Step 3: Add indexes
    console.log('3️⃣ Adding indexes...');
    try {
      await connection.execute('CREATE INDEX `idx_developers_userId` ON `developers`(`userId`)');
      console.log('   ✅ Added idx_developers_userId');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  idx_developers_userId already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute('CREATE INDEX `idx_developers_status` ON `developers`(`status`)');
      console.log('   ✅ Added idx_developers_status');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  idx_developers_status already exists');
      } else {
        throw error;
      }
    }
    console.log('✅ Indexes added successfully\n');

    // Verify migration
    console.log('4️⃣ Verifying migration...');
    const [newColumns]: any = await connection.execute('DESCRIBE developers');
    const newColumnNames = newColumns.map((col: any) => col.Field);
    
    console.log('✅ Migration complete!\n');
    console.log('📋 Updated developers table columns:');
    newColumns.forEach((col: any) => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runDeveloperMigration();
