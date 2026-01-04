
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables BEFORE importing db or other modules
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const slug = 'sky-city-housing-development-ext-50';
  console.log(`Testing getPublicDevelopmentBySlug with slug: "${slug}"`);
  
  if (!process.env.DATABASE_URL) {
      console.error('ERROR: DATABASE_URL is missing from environment.');
      process.exit(1);
  }

  try {
    // Dynamic import to ensure env vars are loaded
    const { getPublicDevelopmentBySlug } = await import('../server/db');
    
    // Explicitly check DATABASE_URL again in context of the imported module if needed, 
    // but the lazy getDb() should handle it now.

    const dev = await getPublicDevelopmentBySlug(slug);
    if (dev) {
      console.log('SUCCESS: Development found!');
      console.log('ID:', dev.id);
      console.log('Name:', dev.name);
      console.log('Slug:', dev.slug);
      console.log('Published:', dev.status); 
      console.log('IsPublished (Raw):', dev.isPublished); // Check raw field
    } else {
      console.log('FAILURE: Development NOT found (returned null).');
    }
  } catch (error) {
    console.error('ERROR during query:', error);
  }
  process.exit(0);
}

main();
