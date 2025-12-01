import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * Check if Explore tables exist in the database
 */

async function checkExploreTables() {
  console.log("🔍 Checking for Explore tables...\n");

  try {
    // Check for explore_shorts table
    console.log("1. Checking explore_shorts table...");
    try {
      const shorts = await db.execute(sql`SELECT COUNT(*) as count FROM explore_shorts`);
      console.log(`   ✅ explore_shorts exists with ${shorts.rows[0].count} records`);
    } catch (error) {
      console.log(`   ❌ explore_shorts table does NOT exist`);
    }

    // Check for explore_interactions table
    console.log("\n2. Checking explore_interactions table...");
    try {
      const interactions = await db.execute(sql`SELECT COUNT(*) as count FROM explore_interactions`);
      console.log(`   ✅ explore_interactions exists with ${interactions.rows[0].count} records`);
    } catch (error) {
      console.log(`   ❌ explore_interactions table does NOT exist`);
    }

    // Check for explore_highlight_tags table
    console.log("\n3. Checking explore_highlight_tags table...");
    try {
      const tags = await db.execute(sql`SELECT COUNT(*) as count FROM explore_highlight_tags`);
      console.log(`   ✅ explore_highlight_tags exists with ${tags.rows[0].count} records`);
    } catch (error) {
      console.log(`   ❌ explore_highlight_tags table does NOT exist`);
    }

    // Check for explore_user_preferences table
    console.log("\n4. Checking explore_user_preferences table...");
    try {
      const prefs = await db.execute(sql`SELECT COUNT(*) as count FROM explore_user_preferences`);
      console.log(`   ✅ explore_user_preferences exists with ${prefs.rows[0].count} records`);
    } catch (error) {
      console.log(`   ❌ explore_user_preferences table does NOT exist`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n📋 Summary:");
    console.log("If any tables are missing, run:");
    console.log("  tsx scripts/run-explore-shorts-migration.ts");
    console.log("\nThen seed the data:");
    console.log("  tsx scripts/seed-explore-highlight-tags.ts");
    console.log("  tsx scripts/seed-explore-shorts-sample.ts");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error checking tables:", error);
    process.exit(1);
  }
}

checkExploreTables();
