import { getDb } from "../server/db";
import { developments } from "../drizzle/schema";
import { desc, and, eq } from "drizzle-orm";
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Could not connect to database");
  
  console.log("Checking published developments...\n");
  
  // Get all developments with their status
  const allDevs = await db
    .select({
      id: developments.id,
      name: developments.name,
      province: developments.province,
      city: developments.city,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
      createdAt: developments.createdAt,
    })
    .from(developments)
    .orderBy(desc(developments.createdAt))
    .limit(10);
  
  console.log("=== All Recent Developments ===");
  console.table(allDevs);
  
  console.log("\n=== Published & Approved Developments (What Homepage Shows) ===");
  const published = await db
    .select({
      id: developments.id,
      name: developments.name,
      province: developments.province,
      city: developments.city,
      priceFrom: developments.priceFrom,
      priceTo: developments.priceTo,
    })
    .from(developments)
    .where(
      and(
        eq(developments.isPublished, 1),
        eq(developments.approvalStatus, 'approved')
      )
    )
    .orderBy(developments.province, developments.city);
  
  if (published.length === 0) {
    console.log("❌ NO PUBLISHED DEVELOPMENTS FOUND!");
    console.log("\nTo fix: Update your developments to:");
    console.log("  - isPublished = 1");
    console.log("  - approvalStatus = 'approved'");
  } else {
    console.table(published);
  }
  
  process.exit(0);
}

main().catch(console.error);

