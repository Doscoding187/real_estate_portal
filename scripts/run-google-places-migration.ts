import { db } from "../server/db";
import { readFileSync } from "fs";
import { join } from "path";

async function runGooglePlacesMigration() {
  console.log("🚀 Starting Google Places fields migration...");

  try {
    // Read the migration SQL file
    const migrationPath = join(
      process.cwd(),
      "drizzle",
      "migrations",
      "add-google-places-fields.sql"
    );
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith("--")) {
        continue;
      }

      console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await db.execute(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error: any) {
        // Check if error is about column already existing
        if (
          error.message?.includes("Duplicate column name") ||
          error.message?.includes("already exists")
        ) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    console.log("\n✅ Google Places fields migration completed successfully!");
    console.log("\n📊 Summary of changes:");
    console.log("  ✓ Added slug, place_id, seo_title, seo_description to provinces");
    console.log("  ✓ Added slug, place_id, seo_title, seo_description to cities");
    console.log("  ✓ Added slug, place_id, seo_title, seo_description to suburbs");
    console.log("  ✓ Added place_id, viewport bounds, seo fields, hero_image to locations");
    console.log("  ✓ Created location_searches table");
    console.log("  ✓ Created recent_searches table");
    console.log("  ✓ Added location_id to properties table");
    console.log("  ✓ Added location_id to developments table");
    console.log("  ✓ Created performance indexes");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
runGooglePlacesMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
