
import 'dotenv/config'; // Load env vars
import { getDb } from '../server/db';
import { provinces } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const SA_PROVINCES = [
  { name: 'Eastern Cape', slug: 'eastern-cape', code: 'EC' },
  { name: 'Free State', slug: 'free-state', code: 'FS' },
  { name: 'Gauteng', slug: 'gauteng', code: 'GP' },
  { name: 'KwaZulu-Natal', slug: 'kwazulu-natal', code: 'KZN' },
  { name: 'Limpopo', slug: 'limpopo', code: 'LP' },
  { name: 'Mpumalanga', slug: 'mpumalanga', code: 'MP' },
  { name: 'Northern Cape', slug: 'northern-cape', code: 'NC' },
  { name: 'North West', slug: 'north-west', code: 'NW' },
  { name: 'Western Cape', slug: 'western-cape', code: 'WC' },
];

async function seedProvinces() {
  console.log('Starting province seed...');
  const db = await getDb();
  
  for (const prov of SA_PROVINCES) {
    const existing = await db.select().from(provinces).where(eq(provinces.slug, prov.slug));
    
    if (existing.length === 0) {
      console.log(`Inserting ${prov.name}...`);
      await db.insert(provinces).values({
        name: prov.name,
        slug: prov.slug,
        code: prov.code,
        countryId: 1 // Assuming 1 is SA, or nullable
      });
    } else {
      console.log(`Skipping ${prov.name} (exists)`);
    }
  }
  
  console.log('Seeding complete.');
  process.exit(0);
}

seedProvinces();
