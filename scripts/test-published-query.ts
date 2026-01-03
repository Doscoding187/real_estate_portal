import { getDb } from "../server/db";
import { developments, developerBrandProfiles } from "../drizzle/schema";
import { desc, and, eq } from "drizzle-orm";
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Could not connect to database");
  
  console.log("Testing getPublishedDevelopments query for Gauteng...\n");
  
  // Simulate the exact query from developerRouter
  const results = await db
    .select({
      id: developments.id,
      name: developments.name,
      city: developments.city,
      province: developments.province,
      slug: developments.slug,
      images: developments.images,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
      isFeatured: developments.isFeatured,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
      brandName: developerBrandProfiles.name,
    })
    .from(developments)
    .leftJoin(developerBrandProfiles, eq(developments.developerBrandProfileId, developerBrandProfiles.id))
    .where(
      and(
        eq(developments.isPublished, 1),
        eq(developments.approvalStatus, 'approved'),
        eq(developments.province, 'Gauteng')
      )
    )
    .orderBy(desc(developments.isFeatured), desc(developments.views))
    .limit(8);
  
  console.log(`Found ${results.length} developments\n`);
  
  if (results.length === 0) {
    console.log("❌ NO RESULTS - Query conditions not met!");
    console.log("\nTrying without province filter...");
    
    const allPublished = await db
      .select({
        id: developments.id,
        name: developments.name,
        province: developments.province,
        isPublished: developments.isPublished,
        approvalStatus: developments.approvalStatus,
      })
      .from(developments)
      .where(
        and(
          eq(developments.isPublished, 1),
          eq(developments.approvalStatus, 'approved')
        )
      )
      .limit(20);
    
    console.table(allPublished);
  } else {
    console.log("✅ RESULTS FOUND:");
    console.table(results.map(r => ({
      id: r.id,
      name: r.name,
      city: r.city,
      province: r.province,
      priceFrom: r.priceFrom,
      priceTo: r.priceTo,
      isFeatured: r.isFeatured,
      hasImages: r.images ? r.images.length : 0,
    })));
  }
  
  process.exit(0);
}

main().catch(console.error);
