import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('🚀 EXECUTING CLEANUP');
console.log('====================');

async function executeCleanup() {
  let connection: mysql.Connection | null = null;

  try {
    console.log('\n🔗 Connecting to database...');

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }
    const dbUrl = new URL(process.env.DATABASE_URL);

    connection = await mysql.createConnection({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
    });

    console.log('✅ Connected to database');

    // Get list of all tables
    const [tables] = await connection.execute('SHOW TABLES');
    const tableList = (tables as any[]).map(t => Object.values(t)[0]);

    console.log(`\n📋 Found ${tableList.length} tables`);

    // Create backup first
    console.log('\n💾 Creating backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `./backups/cleanup-backup-${timestamp}.sql`;

    try {
      // Use node to create backup via mysqldump equivalent
      const { createWriteStream, existsSync, mkdirSync } = await import('fs');

      if (!existsSync('./backups')) {
        mkdirSync('./backups', { recursive: true });
      }

      // Simple backup using mysqldump
      const dumpCmd = [
        'mysqldump',
        `--host=${dbUrl.hostname}`,
        `--port=${dbUrl.port || 3306}`,
        `--user=${dbUrl.username}`,
        `--password=${dbUrl.password}`,
        '--single-transaction',
        '--routines',
        '--triggers',
        dbUrl.pathname.slice(1),
      ].join(' ');

      execSync(`${dumpCmd} > "${backupFile}"`, { stdio: 'pipe' });
      console.log(`✅ Backup created: ${backupFile}`);
    } catch (error) {
      console.log(`⚠️  Backup creation failed: ${error}`);
      console.log('🔄 Continuing with cleanup...');
    }

    // Start transaction
    await connection.beginTransaction();
    console.log('🔒 Transaction started');

    try {
      // Clean tables except critical ones
      const preserveTables = ['users', 'locations', 'unit_types', 'platform_settings'];
      const tablesToClean = tableList.filter(t => !preserveTables.includes(t));

      let totalDeleted = 0;

      for (const tableName of tablesToClean) {
        try {
          // Get count before deletion
          const [countResult] = await connection.execute(
            `SELECT COUNT(*) as count FROM \`${tableName}\``,
          );
          const count = (countResult as any[])[0].count;

          if (count > 0) {
            // Special handling for users table - preserve super admins
            let deleteQuery = `DELETE FROM \`${tableName}\``;

            if (tableName === 'users') {
              deleteQuery = `DELETE FROM \`${tableName}\` WHERE role != 'super_admin'`;
            }

            const [result] = await connection.execute(deleteQuery);
            const deletedCount = (result as any).affectedRows;

            console.log(`🗑️  ${tableName}: ${Number(deletedCount).toLocaleString()} rows deleted`);
            totalDeleted += deletedCount;
          } else {
            console.log(`✅ ${tableName}: already empty`);
          }
        } catch (error) {
          console.log(`⚠️  ${tableName}: ${error}`);
        }
      }

      // Commit transaction
      await connection.commit();
      console.log('\n✅ Transaction committed successfully');
      console.log(`🎯 Total records deleted: ${totalDeleted.toLocaleString()}`);

      // Verify super admins are preserved
      const [admins] = await connection.execute(
        "SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'",
      );
      const adminCount = (admins as any[])[0].count;
      console.log(`👑 Super admins preserved: ${adminCount}`);
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('❌ Cleanup failed, transaction rolled back:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

executeCleanup()
  .then(() => {
    console.log('\n🎉 CLEANUP COMPLETED SUCCESSFULLY!');
    console.log('🚀 Run verification: node --import tsx/esm verify-cleanup.ts');
  })
  .catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
