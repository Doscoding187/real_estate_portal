/**
 * Read-only helper to inspect image payloads for a sample development.
 * Run: npx tsx server/scripts/debug-images.ts
 */
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getDb } from '../db-connection';
import { developments } from '../../drizzle/schema';
import { sql } from 'drizzle-orm';

async function debugImages() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  // Find ANY development with images using a loose check
  // Note: TiDB/MySQL specific syntax for JSON check
  const [devWithImages] = await db
    .select()
    .from(developments)
    .where(sql`json_length(images) > 0`)
    .limit(1);

  if (devWithImages) {
    console.log('Found Development ID:', devWithImages.id);

    let images = devWithImages.images;
    // Simulate what the service does (parseJsonField)
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
      } catch (e) {
        console.log('JSON Parse Failed:', e);
      }
    }

    console.log('Images Type (Parsed):', typeof images);
    console.log('Is Array:', Array.isArray(images));
    if (Array.isArray(images) && images.length > 0) {
      console.log('First Image Sample:', JSON.stringify(images[0], null, 2));
    } else {
      console.log('Images Value:', images);
    }
  } else {
    console.log('No developments with images found in the entire DB.');
  }

  process.exit(0);
}

debugImages().catch(console.error);
