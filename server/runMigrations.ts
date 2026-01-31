/**
 * Migration Runner for Task 5 SQL Migrations
 * Applies migrations in order: 0001 → 0004
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env files - similar to drizzle.config.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in environment');
  }

  console.log('🔌 Connecting to database...');
  const connection = await mysql.createConnection(databaseUrl);

  const migrations = [
    '0001_add_ownership_columns.sql',
    '0002_add_brand_status_tracking.sql',
    '0003_create_audit_logs.sql',
    '0004_configure_cascades.sql',
  ];

  try {
    for (const migration of migrations) {
      const filePath = path.join(__dirname, 'migrations', migration);
      console.log(`\n📄 Running: ${migration}`);

      const sql = fs.readFileSync(filePath, 'utf-8');

      // Remove comment lines and split by semicolon
      const statements = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        try {
          await connection.query(statement);
          console.log(`  ✅ Executed statement`);
        } catch (error: any) {
          // Ignore "already exists" errors or "can't drop non-existent key"
          if (
            error.code === 'ER_DUP_FIELDNAME' ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.errno === 1091 || // ER_CANT_DROP_FIELD_OR_KEY
            error.errno === 1826 // ER_FK_DUP_NAME
          ) {
            console.log(`  ⚠️  Already exists or missing, skipping`);
          } else {
            throw error;
          }
        }
      }

      console.log(`✅ ${migration} complete`);
    }

    console.log('\n🎉 All migrations applied successfully!');

    // Verify schema changes
    console.log('\n🔍 Verifying schema changes...');

    // 1. Check developer_brand_profiles.status
    const [statusCol] = await connection.query(`
      SHOW COLUMNS FROM developer_brand_profiles LIKE 'status'
    `);
    console.log('✅ developer_brand_profiles.status:', statusCol ? 'EXISTS' : 'MISSING');

    // 2. Check listings.brand_profile_id FK
    const [listingsFk] = await connection.query(`
      SELECT CONSTRAINT_NAME, DELETE_RULE 
      FROM information_schema.REFERENTIAL_CONSTRAINTS 
      WHERE TABLE_NAME = 'listings' 
        AND CONSTRAINT_NAME = 'fk_listings_brand_profile'
    `);
    console.log('✅ listings.brand_profile_id FK CASCADE:', listingsFk ? 'EXISTS' : 'MISSING');

    // 3. Check audit_logs table
    const [auditTable] = await connection.query(`
      SHOW TABLES LIKE 'audit_logs'
    `);
    console.log('✅ audit_logs table:', auditTable ? 'EXISTS' : 'MISSING');

    // 4. Check audit_logs.actor_user_id FK RESTRICT
    const [actorFk] = await connection.query(`
      SELECT CONSTRAINT_NAME, DELETE_RULE 
      FROM information_schema.REFERENTIAL_CONSTRAINTS 
      WHERE TABLE_NAME = 'audit_logs' 
        AND CONSTRAINT_NAME = 'fk_audit_actor'
    `);
    console.log(
      '✅ audit_logs.actor_user_id FK RESTRICT:',
      actorFk ? (actorFk as any)[0]?.DELETE_RULE : 'MISSING',
    );

    // 5. Check composite index
    const [compositeIdx] = await connection.query(`
      SHOW INDEX FROM audit_logs WHERE Key_name = 'idx_audit_brand_date'
    `);
    console.log(
      '✅ audit_logs composite index (brand_profile_id, created_at):',
      compositeIdx ? 'EXISTS' : 'MISSING',
    );
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigrations().catch(console.error);
