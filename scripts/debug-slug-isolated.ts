
import { getDb } from '../server/db';
import * as schema from '../drizzle/schema'; // Import schema directly
import { eq, or, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('Testing isolated query...');
  const slug = 'sky-city-housing-development-ext-50';
  
  try {
      const db = await getDb();
      if (!db) {
          console.error('Failed to get DB instance via getDb()');
          return;
      }
      
      const { developments } = schema;
      // Also checking if developments is defined
      if (!developments) {
          console.error('Schema.developments is undefined!');
          // Try dynamic import fallback
          const dynamicSchema = await import('../drizzle/schema');
          if (!dynamicSchema.developments) {
               console.error('Dynamic Schema.developments is ALSO undefined!');
               return;
          }
      }

      const devTable = developments || (await import('../drizzle/schema')).developments;

      console.log(`Querying for slug: ${slug}`);
      const results = await db
        .select()
        .from(devTable)
        .where(eq(devTable.slug, slug))
        .limit(1);

      if (results.length > 0) {
          console.log('SUCCESS: Found development:', results[0].name, results[0].slug);
      } else {
          console.log('FAILURE: Not found in DB.');
      }

  } catch (error) {
      console.error('Error:', error);
  }
  process.exit(0);
}

main();
