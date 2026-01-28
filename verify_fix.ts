import 'dotenv/config';
import { getDb } from './server/db-connection';
import { locations, developments } from './drizzle/schema';
import { sql } from 'drizzle-orm';

function generateUniqueSlug(base: string) {
    return base.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
}

async function verifyFix() {
  const db = await getDb();
  if (!db) return;

  try {
    console.log('Verifying locations table...');
    // Try to insert a location
    const res = await db.insert(locations).values({
        name: 'Test Location',
        slug: 'test-location-' + Date.now(),
        type: 'suburb',
        placeId: 'ChIJ' + Math.random(),
        seoTitle: 'Test SEO',
        seoDescription: 'Test Desc',
        latitude: '-26.0',
        longitude: '28.0'
    });
    console.log('Location insert result:', res);
    
    // For MySQL, res usually contains insertId in result header
    // With drizzle-orm/mysql2, result is [ResultSetHeader, undefined]
    // We need to extract insertId manually if $returningId is acting up
    const insertId = (res as any)[0].insertId;
    console.log('Location inserted ID:', insertId);
    if (!insertId) throw new Error('Insert failed');

    // Try to insert a development
    console.log('Verifying developments table...');
    const slug = await generateUniqueSlug('Test Dev ' + Date.now());
    
    const [devRes] = await db.insert(developments).values({
        name: 'Test Dev ' + Date.now(),
        slug: slug,
        developerId: 1, // Valid ID
        locationId: insertId, // Valid FK
        isFeatured: 0,
        isPublished: 0,
        status: 'launching-soon',
        developmentType: 'residential',
        city: 'Test City',
        province: 'Test Province',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    const devId = (devRes as any).insertId; // Adjust based on observed behavior
    console.log('Development inserted ID:', devId);

    console.log('SUCCESS: Components inserted successfully.');
    
    // Cleanup
    // await db.delete(developments).where(sql`id = ${dev.id}`);
    // await db.delete(locations).where(sql`id = ${loc.id}`);

  } catch (e) {
    console.error('VERIFICATION FAILED:', e);
  }
  process.exit(0);
}

verifyFix();
