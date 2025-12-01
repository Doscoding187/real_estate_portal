import { db } from "../server/db";
import { exploreHighlightTags } from "../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Seed Explore Shorts Highlight Tags
 * 
 * This script populates the explore_highlight_tags table with predefined tags
 * that agents and developers can use to highlight key property features.
 */

const highlightTags = [
  // Status tags
  {
    tagKey: "ready_to_move",
    label: "Ready to Move",
    icon: "home-check",
    color: "#10b981",
    category: "status",
    displayOrder: 1,
  },
  {
    tagKey: "under_construction",
    label: "Under Construction",
    icon: "construction",
    color: "#f59e0b",
    category: "status",
    displayOrder: 2,
  },
  {
    tagKey: "new_development",
    label: "New Development",
    icon: "sparkles",
    color: "#3b82f6",
    category: "status",
    displayOrder: 3,
  },
  {
    tagKey: "move_in_ready",
    label: "Move-in Ready",
    icon: "key",
    color: "#10b981",
    category: "status",
    displayOrder: 4,
  },

  // Financial tags
  {
    tagKey: "no_transfer_duty",
    label: "No Transfer Duty",
    icon: "receipt-tax",
    color: "#8b5cf6",
    category: "financial",
    displayOrder: 10,
  },
  {
    tagKey: "negotiable",
    label: "Negotiable",
    icon: "currency-dollar",
    color: "#06b6d4",
    category: "financial",
    displayOrder: 11,
  },
  {
    tagKey: "bond_approved",
    label: "Bond Approved",
    icon: "shield-check",
    color: "#10b981",
    category: "financial",
    displayOrder: 12,
  },

  // Feature tags
  {
    tagKey: "large_yard",
    label: "Large Yard",
    icon: "tree",
    color: "#22c55e",
    category: "feature",
    displayOrder: 20,
  },
  {
    tagKey: "pet_friendly",
    label: "Pet Friendly",
    icon: "paw",
    color: "#f97316",
    category: "feature",
    displayOrder: 21,
  },
  {
    tagKey: "secure_estate",
    label: "Secure Estate",
    icon: "shield",
    color: "#ef4444",
    category: "feature",
    displayOrder: 22,
  },
  {
    tagKey: "facebrick",
    label: "Facebrick",
    icon: "building",
    color: "#a16207",
    category: "feature",
    displayOrder: 23,
  },
  {
    tagKey: "off_grid_ready",
    label: "Off-Grid Ready",
    icon: "bolt",
    color: "#eab308",
    category: "feature",
    displayOrder: 24,
  },
  {
    tagKey: "pool",
    label: "Pool",
    icon: "water",
    color: "#0ea5e9",
    category: "feature",
    displayOrder: 25,
  },
  {
    tagKey: "garden",
    label: "Garden",
    icon: "flower",
    color: "#84cc16",
    category: "feature",
    displayOrder: 26,
  },
  {
    tagKey: "garage",
    label: "Garage",
    icon: "car",
    color: "#64748b",
    category: "feature",
    displayOrder: 27,
  },
  {
    tagKey: "modern_finishes",
    label: "Modern Finishes",
    icon: "sparkles",
    color: "#a855f7",
    category: "feature",
    displayOrder: 28,
  },
  {
    tagKey: "open_plan",
    label: "Open Plan",
    icon: "layout",
    color: "#6366f1",
    category: "feature",
    displayOrder: 29,
  },
  {
    tagKey: "sea_view",
    label: "Sea View",
    icon: "waves",
    color: "#0284c7",
    category: "feature",
    displayOrder: 30,
  },
  {
    tagKey: "mountain_view",
    label: "Mountain View",
    icon: "mountain",
    color: "#78716c",
    category: "feature",
    displayOrder: 31,
  },
  {
    tagKey: "close_to_schools",
    label: "Close to Schools",
    icon: "academic-cap",
    color: "#f59e0b",
    category: "feature",
    displayOrder: 32,
  },
  {
    tagKey: "close_to_shops",
    label: "Close to Shops",
    icon: "shopping-bag",
    color: "#ec4899",
    category: "feature",
    displayOrder: 33,
  },
];

async function seedHighlightTags() {
  console.log("🌱 Seeding Explore Shorts highlight tags...");

  try {
    // Initialize database connection
    const { getDb } = await import("../server/db");
    const database = await getDb();
    
    // Check if tags already exist
    const existingTags = await database
      .select()
      .from(exploreHighlightTags)
      .limit(1);

    if (existingTags.length > 0) {
      console.log("⚠️  Tags already exist. Clearing existing tags...");
      await database.execute(sql`DELETE FROM explore_highlight_tags`);
    }

    // Insert all tags
    for (const tag of highlightTags) {
      await database.insert(exploreHighlightTags).values({
        tagKey: tag.tagKey,
        label: tag.label,
        icon: tag.icon,
        color: tag.color,
        category: tag.category,
        displayOrder: tag.displayOrder,
        isActive: 1,
      });
      console.log(`  ✓ Added tag: ${tag.label}`);
    }

    console.log(`\n✅ Successfully seeded ${highlightTags.length} highlight tags!`);
    console.log("\nTag categories:");
    console.log("  - Status: 4 tags");
    console.log("  - Financial: 3 tags");
    console.log("  - Feature: 15 tags");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedHighlightTags();
