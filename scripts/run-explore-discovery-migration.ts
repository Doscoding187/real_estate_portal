import { getDb } from "../server/db";
import { readFileSync } from "fs";
import { join } from "path";

async function runExploreMigration() {
  console.log("🚀 Starting Explore Discovery Engine migration...\n");
  
  const db = await getDb();

  try {
    // Read the migration file
    const migrationPath = join(
      process.cwd(),
      "drizzle",
      "migrations",
      "create-explore-discovery-engine.sql"
    );
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log(`📄 File size: ${migrationSQL.length} characters`);

    // Remove single-line comments but keep the SQL
    const lines = migrationSQL.split('\n');
    console.log(`📄 Total lines: ${lines.length}`);
    
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('--');
    });
    console.log(`📄 Lines after filtering comments: ${cleanedLines.length}`);
    
    const cleanedSQL = cleanedLines.join('\n');

    // Split by semicolon but keep multi-line statements together
    const statements = cleanedSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 10); // Filter out very short statements

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        // Show a preview of what we're executing
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
        console.log(`⏳ [${i + 1}/${statements.length}] ${preview}...`);
        
        await db.execute(statement);
        console.log(`✅ Statement ${i + 1} completed\n`);
      } catch (error: any) {
        // Check if error is about table already existing
        if (error.message?.includes("already exists")) {
          console.log(`⚠️  Table already exists, skipping...\n`);
          continue;
        }
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error(`Statement preview: ${statement.substring(0, 200)}...\n`);
        throw error;
      }
    }

    console.log("✅ Migration completed successfully!\n");
    console.log("📊 Created tables:");
    console.log("  - explore_content");
    console.log("  - explore_discovery_videos");
    console.log("  - explore_categories (seeded with 10 lifestyle categories)");
    console.log("  - explore_neighbourhoods");
    console.log("  - explore_user_preferences_new");
    console.log("  - explore_feed_sessions");
    console.log("  - explore_engagements");
    console.log("  - explore_boost_campaigns");
    console.log("  - explore_saved_properties");
    console.log("  - explore_neighbourhood_follows");
    console.log("  - explore_creator_follows");
    console.log("\n🎉 Explore Discovery Engine schema is ready!");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
runExploreMigration();
