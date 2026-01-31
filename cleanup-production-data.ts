import { execSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { hash } from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

interface CleanupConfig {
  dryRun: boolean;
  createBackup: boolean;
  preserveSuperAdmins: boolean;
  preserveReferenceData: boolean;
  backupPath: string;
  databaseUrl: string;
}

interface CleanupStats {
  totalTables: number;
  tablesProcessed: number;
  rowsDeleted: { [table: string]: number };
  errors: string[];
  warnings: string[];
  backupFile?: string;
  preservedAdmins: string[];
  preservedReferenceData: string[];
}

class ProductionDataCleanup {
  private config: CleanupConfig;
  private connection: mysql.Connection | null = null;
  private stats: CleanupStats = {
    totalTables: 0,
    tablesProcessed: 0,
    rowsDeleted: {},
    errors: [],
    warnings: [],
    preservedAdmins: [],
    preservedReferenceData: [],
  };

  constructor(config: Partial<CleanupConfig> = {}) {
    this.config = {
      dryRun: true,
      createBackup: true,
      preserveSuperAdmins: true,
      preserveReferenceData: true,
      backupPath: './backups',
      databaseUrl: process.env.DATABASE_URL || '',
      ...config,
    };
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing production data cleanup...');

    // Validate environment
    if (!this.config.databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    // Create backup directory
    if (this.config.createBackup && !existsSync(this.config.backupPath)) {
      mkdirSync(this.config.backupPath, { recursive: true });
    }

    // Connect to database
    await this.connectToDatabase();

    console.log('✅ Initialization complete');
  }

  private async connectToDatabase(): Promise<void> {
    try {
      // Parse DATABASE_URL to get connection details
      const dbUrl = new URL(this.config.databaseUrl);
      this.connection = await mysql.createConnection({
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port) || 3306,
        user: dbUrl.username,
        password: dbUrl.password,
        database: dbUrl.pathname.slice(1),
        multipleStatements: true,
      });
      console.log('✅ Connected to database');
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  async generatePreCleanupReport(): Promise<void> {
    console.log('\n📊 Generating pre-cleanup analysis report...');

    try {
      const [tables] = await this.connection!.execute('SHOW TABLES');
      this.stats.totalTables = Array.isArray(tables) ? tables.length : 0;

      // Get row counts for all tables
      const tableRows = await Promise.all(
        (tables as any[]).map(async (table: any) => {
          const tableName = Object.values(table)[0] as string;
          const [rows] = await this.connection!.execute(
            `SELECT COUNT(*) as count FROM \`${tableName}\``,
          );
          return { table: tableName, count: (rows as any[])[0].count };
        }),
      );

      console.log('\n📈 Database Statistics:');
      console.log(`Total Tables: ${this.stats.totalTables}`);
      console.log('\nTable Row Counts:');
      tableRows
        .filter(t => t.count > 0)
        .sort((a, b) => b.count - a.count)
        .forEach(({ table, count }) => {
          console.log(`  ${table}: ${Number(count).toLocaleString()} rows`);
        });

      // Identify super admins
      if (this.config.preserveSuperAdmins) {
        await this.identifySuperAdmins();
      }

      // Identify reference data
      if (this.config.preserveReferenceData) {
        await this.identifyReferenceData();
      }
    } catch (error) {
      this.stats.errors.push(`Report generation failed: ${error}`);
      throw error;
    }
  }

  private async identifySuperAdmins(): Promise<void> {
    try {
      const [adminRows] = await this.connection!.execute(
        'SELECT id, email, firstName, lastName FROM users WHERE role = "super_admin"',
      );

      this.stats.preservedAdmins = (adminRows as any[]).map(
        admin => `${admin.email} (${admin.firstName} ${admin.lastName})`,
      );

      console.log('\n👑 Super Admins to Preserve:');
      this.stats.preservedAdmins.forEach(admin => console.log(`  ✅ ${admin}`));
    } catch (error) {
      this.stats.warnings.push(`Could not identify super admins: ${error}`);
    }
  }

  private async identifyReferenceData(): Promise<void> {
    const referenceTables = [
      'locations',
      'provinces',
      'unit_types',
      'platform_settings',
      'service_categories',
    ];

    for (const table of referenceTables) {
      try {
        const [exists] = await this.connection!.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}'`,
        );

        if ((exists as any[])[0].count > 0) {
          const [rows] = await this.connection!.execute(
            `SELECT COUNT(*) as count FROM \`${table}\``,
          );
          const count = (rows as any[])[0].count;
          this.stats.preservedReferenceData.push(
            `${table}: ${Number(count).toLocaleString()} rows`,
          );
        }
      } catch (error) {
        this.stats.warnings.push(`Could not check reference table ${table}: ${error}`);
      }
    }

    console.log('\n📚 Reference Data to Preserve:');
    this.stats.preservedReferenceData.forEach(data => console.log(`  📋 ${data}`));
  }

  async createBackup(): Promise<string> {
    if (!this.config.createBackup) {
      this.stats.warnings.push('Backup creation skipped by configuration');
      return '';
    }

    console.log('\n💾 Creating database backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(this.config.backupPath, `cleanup-backup-${timestamp}.sql`);

    try {
      // Parse DATABASE_URL for mysqldump
      const dbUrl = new URL(this.config.databaseUrl);
      const dumpCmd = [
        'mysqldump',
        `--host=${dbUrl.hostname}`,
        `--port=${dbUrl.port || 3306}`,
        `--user=${dbUrl.username}`,
        `--password=${dbUrl.password}`,
        `--single-transaction`,
        `--routines`,
        `--triggers`,
        dbUrl.pathname.slice(1),
      ].join(' ');

      execSync(`${dumpCmd} > "${backupFile}"`, { stdio: 'pipe' });

      // Verify backup was created
      if (!existsSync(backupFile)) {
        throw new Error('Backup file was not created');
      }

      const stats = require('fs').statSync(backupFile);
      this.stats.backupFile = backupFile;
      console.log(`✅ Backup created: ${backupFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      return backupFile;
    } catch (error) {
      this.stats.errors.push(`Backup creation failed: ${error}`);
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  async executeCleanup(): Promise<void> {
    if (this.config.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      return;
    }

    console.log('\n🧹 Executing production data cleanup...');

    const tablesToClean = [
      // User-generated content (preserve structure)
      'favorites',
      'recently_viewed',
      'prospect_favorites',
      'scheduled_viewings',
      'leads',
      'reviews',
      'activities',
      'audit_logs',

      // Business data (preserve super admins and reference data)
      'properties',
      'developments',
      'agencies',
      'agents',
      'prospects',

      // Transaction data
      'commissions',
      'invoices',
      'payments',
      'subscriptions',
      'payment_methods',

      // Temporary/cache data
      'sessions',
      'password_resets',
      'email_verifications',
    ];

    // Start transaction
    await this.connection!.beginTransaction();

    try {
      for (const tableName of tablesToClean) {
        await this.cleanTable(tableName);
      }

      // Clean specific user data (preserve super admins)
      await this.cleanUserData();

      // Commit transaction
      await this.connection!.commit();
      console.log('✅ Cleanup transaction committed successfully');
    } catch (error) {
      // Rollback on error
      await this.connection!.rollback();
      this.stats.errors.push(`Cleanup failed, transaction rolled back: ${error}`);
      throw error;
    }
  }

  private async cleanTable(tableName: string): Promise<void> {
    try {
      // Check if table exists
      const [exists] = await this.connection!.execute(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${tableName}'`,
      );

      if ((exists as any[])[0].count === 0) {
        this.stats.warnings.push(`Table ${tableName} does not exist, skipping`);
        return;
      }

      // Get row count before deletion
      const [before] = await this.connection!.execute(
        `SELECT COUNT(*) as count FROM \`${tableName}\``,
      );
      const beforeCount = (before as any[])[0].count;

      if (beforeCount === 0) {
        this.stats.warnings.push(`Table ${tableName} is already empty`);
        return;
      }

      let deleteQuery = `DELETE FROM \`${tableName}\``;
      const params: any[] = [];

      // Special handling for users table
      if (tableName === 'users' && this.config.preserveSuperAdmins) {
        deleteQuery = `DELETE FROM \`${tableName}\` WHERE role != 'super_admin'`;
      }

      // Special handling for reference data
      if (this.config.preserveReferenceData && ['locations', 'unit_types'].includes(tableName)) {
        console.log(`⚠️  Skipping reference table: ${tableName}`);
        return;
      }

      if (this.config.dryRun) {
        console.log(
          `🔍 Would delete ${Number(beforeCount).toLocaleString()} rows from ${tableName}`,
        );
        this.stats.rowsDeleted[tableName] = 0;
      } else {
        // Execute deletion
        const [result] = await this.connection!.execute(deleteQuery, params);
        const deletedCount = (result as any).affectedRows;

        this.stats.rowsDeleted[tableName] = deletedCount;
        console.log(`🗑️  Deleted ${Number(deletedCount).toLocaleString()} rows from ${tableName}`);
      }

      this.stats.tablesProcessed++;
    } catch (error) {
      this.stats.errors.push(`Failed to clean table ${tableName}: ${error}`);
      throw error;
    }
  }

  private async cleanUserData(): Promise<void> {
    // Clean user-related data while preserving super admins
    const userRelatedQueries = [
      'DELETE FROM favorites WHERE userId NOT IN (SELECT id FROM users WHERE role = "super_admin")',
      'DELETE FROM recently_viewed WHERE userId NOT IN (SELECT id FROM users WHERE role = "super_admin")',
      'DELETE FROM agent_profiles WHERE userId NOT IN (SELECT id FROM users WHERE role = "super_admin")',
    ];

    for (const query of userRelatedQueries) {
      try {
        if (this.config.dryRun) {
          console.log(`🔍 Would execute: ${query.substring(0, 100)}...`);
        } else {
          const [result] = await this.connection!.execute(query);
          const affectedRows = (result as any).affectedRows;
          if (affectedRows > 0) {
            console.log(
              `🗑️  Cleaned ${Number(affectedRows).toLocaleString()} user-related records`,
            );
          }
        }
      } catch (error) {
        this.stats.warnings.push(`User data cleanup query failed: ${error}`);
      }
    }
  }

  async generatePostCleanupReport(): Promise<void> {
    console.log('\n📊 Post-Cleanup Report:');
    console.log(`Tables Processed: ${this.stats.tablesProcessed}/${this.stats.totalTables}`);

    console.log('\n🗑️  Rows Deleted:');
    Object.entries(this.stats.rowsDeleted).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`  ${table}: ${Number(count).toLocaleString()}`);
      }
    });

    if (this.stats.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.stats.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(error => console.log(`  ${error}`));
    }

    if (this.stats.backupFile) {
      console.log(`\n💾 Backup saved to: ${this.stats.backupFile}`);
    }
  }

  async verifySystemIntegrity(): Promise<boolean> {
    console.log('\n🔍 Verifying system integrity...');

    try {
      // Test super admin can still login (check table exists)
      if (this.config.preserveSuperAdmins) {
        const [adminCount] = await this.connection!.execute(
          'SELECT COUNT(*) as count FROM users WHERE role = "super_admin"',
        );
        const count = (adminCount as any[])[0].count;
        console.log(`✅ Super admin users preserved: ${count}`);
      }

      // Test reference data integrity
      if (this.config.preserveReferenceData) {
        const referenceTables = ['locations', 'unit_types'];
        for (const table of referenceTables) {
          const [exists] = await this.connection!.execute(
            `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}'`,
          );
          if ((exists as any[])[0].count > 0) {
            const [rows] = await this.connection!.execute(
              `SELECT COUNT(*) as count FROM \`${table}\``,
            );
            const count = (rows as any[])[0].count;
            console.log(`✅ Reference data ${table}: ${Number(count).toLocaleString()} rows`);
          }
        }
      }

      // Test database connectivity
      await this.connection!.execute('SELECT 1');
      console.log('✅ Database connectivity verified');

      return true;
    } catch (error) {
      this.stats.errors.push(`System integrity verification failed: ${error}`);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
    }
  }

  getStats(): CleanupStats {
    return { ...this.stats };
  }
}

// CLI interface
async function main() {
  console.log('🚀 Starting production data cleanup script...');
  const args = process.argv.slice(2);
  console.log('📝 Arguments:', args);
  const dryRun = !args.includes('--execute');
  const createBackup = !args.includes('--no-backup');
  console.log('🔧 Configuration:', { dryRun, createBackup });

  const cleanup = new ProductionDataCleanup({
    dryRun,
    createBackup,
  });

  try {
    await cleanup.initialize();
    await cleanup.generatePreCleanupReport();

    if (createBackup && !dryRun) {
      await cleanup.createBackup();
    }

    if (!dryRun) {
      const confirm = '\n⚠️  This will permanently delete production data. Continue? (y/N): ';
      process.stdout.write(confirm);

      const answer = await new Promise<string>(resolve => {
        process.stdin.once('data', data => resolve(data.toString().trim()));
      });

      if (answer.toLowerCase() !== 'y') {
        console.log('🛑 Cleanup cancelled by user');
        return;
      }
    }

    await cleanup.executeCleanup();
    await cleanup.generatePostCleanupReport();

    const integrityOk = await cleanup.verifySystemIntegrity();

    if (integrityOk && !dryRun) {
      console.log('\n🎉 Production data cleanup completed successfully!');
    } else if (dryRun) {
      console.log('\n🔍 Dry run completed. Use --execute flag to perform actual cleanup.');
    } else {
      console.log('\n⚠️  Cleanup completed with warnings. Check the report above.');
    }
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await cleanup.cleanup();
  }
}

// Export for programmatic use
export { ProductionDataCleanup, type CleanupConfig, type CleanupStats };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
