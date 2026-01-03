import { getDb } from "../server/db";
import { developments } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Could not connect to database");
  
  console.log("Checking development images storage...\n");
  
  // Get a few Gauteng developments with their images
  const devs = await db
    .select({
      id: developments.id,
      name: developments.name,
      images: developments.images,
      imagesType: developments.images, // Will check the type
    })
    .from(developments)
    .where(eq(developments.province, 'Gauteng'))
    .limit(5);
  
  devs.forEach((dev: any) => {
    console.log(`\n=== ${dev.name} ===`);
    console.log('ID:', dev.id);
    console.log('Images Type:', typeof dev.images);
    console.log('Images Value:', dev.images);
    console.log('Is Array?:', Array.isArray(dev.images));
    console.log('First Image:', dev.images?.[0] || 'NONE');
  });
  
  process.exit(0);
}

main().catch(console.error);
