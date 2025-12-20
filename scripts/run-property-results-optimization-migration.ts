import { getDb } from "../server/db";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Migration: Property Results Optimization
 * 
 * This migration adds:
 * - SA-specific columns to properties table (title_type, levy, rates_estimate, etc.)
 * - Indexes for common filter queries
 * - saved_searches table for user search preferences
 * - search_analytics table for tracking search behavior
 * - property_clicks table for click-through analytics
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 4.1, 11.1, 11.3
 */

async function runMigration() {
  console.log("🚀 Starting Property Results Optimization migration...");

  try {
    // Initialize database connection
    const database = await getDb();
    if (!database) {
      throw new Error("Failed to initialize database connection");
    }
    console.log("✅ Database connection established\n");

    // Read the migration SQL file
    const migrationPath = join(
      process.cwd(),
      "drizzle",
      "migrations",
      "add-property-results-optimization-fields.sql"
    );
    
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith("--")) continue;

      try {
        console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // Show first 100 chars of statement for context
        const preview = statement.substring(0, 100).replace(/\s+/g, " ");
        console.log(`   ${preview}${statement.length > 100 ? "..." : ""}`);
        
        await database.execute(statement);
        console.log(`✅ Statement ${i + 1} completed successfully`);
      } catch (error: any) {
        // Check if error is about column/table already existing
        if (
          error.message?.includes("Duplicate column") ||
          error.message?.includes("already exists") ||
          error.message?.includes("Duplicate key")
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log("   - Added SA-specific columns to properties table");
    console.log("   - Created indexes for filter optimization");
    console.log("   - Created saved_searches table");
    console.log("   - Created search_analytics table");
    console.log("   - Created property_clicks table");

  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("\n🎉 All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed with error:", error);
    process.exit(1);
  });
