import { db } from "../server/db";
import { exploreShorts, agents, developers, listings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Seed Sample Explore Shorts
 * 
 * This script creates sample explore shorts for testing the feed
 */

const sampleShorts = [
  {
    title: "Stunning 3BR Apartment in Sandton",
    caption: "Modern living at its finest! This beautiful apartment features open-plan living, contemporary finishes, and breathtaking city views. Perfect for professionals and families alike.",
    highlights: ["Modern Finishes", "City Views", "Secure Estate", "Pool"],
    mediaUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
  },
  {
    title: "Luxury Penthouse with Ocean Views",
    caption: "Wake up to stunning ocean views every morning! This exclusive penthouse offers the ultimate coastal lifestyle with premium finishes throughout.",
    highlights: ["Sea View", "Penthouse", "Modern Finishes", "Garage"],
    mediaUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
  },
  {
    title: "Family Home in Secure Estate",
    caption: "Perfect family home with spacious rooms, beautiful garden, and top-notch security. Close to excellent schools and shopping centers.",
    highlights: ["Secure Estate", "Large Yard", "Close to Schools", "Pet Friendly"],
    mediaUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
  },
  {
    title: "Modern Townhouse - Ready to Move",
    caption: "Brand new townhouse ready for immediate occupation! Contemporary design with all the modern conveniences you need.",
    highlights: ["Ready to Move", "Modern Finishes", "Open Plan", "Garage"],
    mediaUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  },
  {
    title: "Investment Opportunity - New Development",
    caption: "Get in early on this exciting new development! Prime location with excellent growth potential. No transfer duty applicable.",
    highlights: ["New Development", "No Transfer Duty", "Investment", "Secure Estate"],
    mediaUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  },
];

async function seedExploreShorts() {
  console.log("🌱 Seeding sample Explore Shorts...");

  try {
    // Get first agent or developer
    const agentsList = await db.select().from(agents).limit(1);
    const developersList = await db.select().from(developers).limit(1);

    const agentId = agentsList[0]?.id || null;
    const developerId = developersList[0]?.id || null;

    if (!agentId && !developerId) {
      console.log("⚠️  No agents or developers found. Creating sample shorts without user association...");
    }

    // Get some listings if available
    const listingsList = await db.select().from(listings).limit(5);

    // Insert sample shorts
    for (let i = 0; i < sampleShorts.length; i++) {
      const short = sampleShorts[i];
      const listing = listingsList[i] || null;

      await db.insert(exploreShorts).values({
        listingId: listing?.id || null,
        developmentId: null,
        agentId: i % 2 === 0 ? agentId : null,
        developerId: i % 2 === 1 ? developerId : null,
        title: short.title,
        caption: short.caption,
        primaryMediaId: 1,
        mediaIds: JSON.stringify([short.mediaUrl]),
        highlights: JSON.stringify(short.highlights),
        performanceScore: Math.random() * 100,
        boostPriority: 0,
        viewCount: Math.floor(Math.random() * 1000),
        uniqueViewCount: Math.floor(Math.random() * 500),
        saveCount: Math.floor(Math.random() * 50),
        shareCount: Math.floor(Math.random() * 20),
        skipCount: Math.floor(Math.random() * 100),
        averageWatchTime: Math.floor(Math.random() * 30) + 10,
        isPublished: 1,
        isFeatured: i === 0 ? 1 : 0,
        publishedAt: new Date(),
      });

      console.log(`  ✓ Added short: ${short.title}`);
    }

    console.log(`\n✅ Successfully seeded ${sampleShorts.length} sample explore shorts!`);
    console.log("\nYou can now view them in the Explore feed.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedExploreShorts();
