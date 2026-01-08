import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run Partner Marketplace Schema Migration
 * 
 * This script applies the partner marketplace schema migration which includes:
 * - Partner tiers configuration
 * - Explore partners table
 * - Topics for intent-based navigation
 * - Content-to-topic mapping
 * - Content approval queue
 * - Extensions to explore_content and explore_shorts tables
 * - Partner subscriptions
 * - Content quality scores
 * - Boost campaigns
 * - Partner leads
 * - Marketplace bundles
 * - Cold start infrastructure
 */

async function runMigration() {
  console.log("🚀 Starting Partner Marketplace Schema Migration...\n");

  try {
    // Initialize database connection
    const db = await getDb();
    
    // Read the migration SQL file
    const migrationPath = path.join(
      __dirname,
      "../drizzle/migrations/add-partner-marketplace-schema.sql"
    );
    
    console.log(`📖 Reading migration file: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Remove SQL comments (both single line and block if needed, but primarily single line --)
    // This regex matches -- until end of line, and replaces with empty string
    const cleanSQL = migrationSQL
      .replace(/--.*$/gm, "")
      .replace(/\r\n/g, "\n"); // Normalize line endings

    const statements = cleanSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Extract table/operation name for logging
      const match = statement.match(/(?:CREATE TABLE|ALTER TABLE|INSERT INTO)\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
      const tableName = match ? match[1] : `Statement ${i + 1}`;
      
      try {
        console.log(`⏳ Executing: ${tableName}...`);
        await db.execute(sql.raw(statement));
        successCount++;
        console.log(`✅ Success: ${tableName}\n`);
      } catch (error: any) {
        // Check if error is due to table/column already existing
        if (
          error.message?.includes("already exists") ||
          error.message?.includes("Duplicate column") ||
          error.message?.includes("Duplicate key")
        ) {
          skipCount++;
          console.log(`⏭️  Skipped (already exists): ${tableName}\n`);
        } else {
          errorCount++;
          console.error(`❌ Error executing ${tableName}:`, error.message);
          console.error(`   Statement: ${statement.substring(0, 100)}...\n`);
        }
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total: ${statements.length}`);
    console.log("=".repeat(60));

    if (errorCount > 0) {
      console.log("\n⚠️  Migration completed with errors. Please review the errors above.");
      process.exit(1);
    } else {
      console.log("\n✨ Migration completed successfully!");
      
      // Verify key tables
      console.log("\n🔍 Verifying key tables...");
      await verifyTables();
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

async function verifyTables() {
  const db = await getDb();
  
  const tablesToVerify = [
    "partner_tiers",
    "explore_partners",
    "topics",
    "content_topics",
    "content_approval_queue",
    "partner_subscriptions",
    "content_quality_scores",
    "boost_campaigns",
    "partner_leads",
    "marketplace_bundles",
    "bundle_partners",
    "launch_phases",
    "launch_content_quotas",
    "launch_metrics",
    "user_onboarding_state",
    "founding_partners"
  ];

  for (const table of tablesToVerify) {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
      const count = (result as any)[0]?.count ?? 0;
      console.log(`  ✅ ${table}: ${count} rows`);
    } catch (error: any) {
      console.log(`  ❌ ${table}: ${error.message}`);
    }
  }

  // Verify explore table extensions
  console.log("\n🔍 Verifying explore table extensions...");
  
  try {
    const contentColumns = await db.execute(sql.raw(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'explore_content' 
        AND COLUMN_NAME IN ('partner_id', 'content_category', 'badge_type', 'is_launch_content')
    `));
    console.log(`  ✅ explore_content: ${(contentColumns as any).length}/4 new columns added`);
  } catch (error: any) {
    console.log(`  ❌ explore_content: ${error.message}`);
  }

  try {
    const shortsColumns = await db.execute(sql.raw(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'explore_shorts' 
        AND COLUMN_NAME IN ('partner_id', 'content_category', 'badge_type', 'is_launch_content')
    `));
    console.log(`  ✅ explore_shorts: ${(shortsColumns as any).length}/4 new columns added`);
  } catch (error: any) {
    console.log(`  ❌ explore_shorts: ${error.message}`);
  }

  // Verify seed data
  console.log("\n🔍 Verifying seed data...");
  
  try {
    const tiers = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM partner_tiers`));
    const tierCount = (tiers as any)[0]?.count ?? 0;
    console.log(`  ✅ Partner tiers: ${tierCount}/4 tiers seeded`);
  } catch (error: any) {
    console.log(`  ❌ Partner tiers: ${error.message}`);
  }

  try {
    const topics = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM topics`));
    const topicCount = (topics as any)[0]?.count ?? 0;
    console.log(`  ✅ Topics: ${topicCount}/8 topics seeded`);
  } catch (error: any) {
    console.log(`  ❌ Topics: ${error.message}`);
  }

  try {
    const quotas = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM launch_content_quotas`));
    const quotaCount = (quotas as any)[0]?.count ?? 0;
    console.log(`  ✅ Launch content quotas: ${quotaCount}/6 quotas seeded`);
  } catch (error: any) {
    console.log(`  ❌ Launch content quotas: ${error.message}`);
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
