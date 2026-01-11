import 'dotenv/config';
import { getDb } from '../server/db-connection';
import { developments, developers, developerBrandProfiles } from '../drizzle/schema';
import { like, or, eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  
  console.log('--- Searching for developments matching "leopard" ---');
  
  const results = await db
    .select({
      id: developments.id,
      name: developments.name,
      slug: developments.slug,
      developerId: developments.developerId,
      developerName: developers.name,
      brandProfileId: developments.developerBrandProfileId,
      brandName: developerBrandProfiles.brandName,
      isPublished: developments.isPublished,
      updatedStatus: developments.status,
      approvalStatus: developments.approvalStatus,
      createdAt: developments.createdAt,
      publishedAt: developments.publishedAt,
    })
    .from(developments)
    .leftJoin(developers, eq(developments.developerId, developers.id))
    .leftJoin(developerBrandProfiles, eq(developments.developerBrandProfileId, developerBrandProfiles.id))
    .where(
      or(
        like(developments.slug, '%leopard%'),
        like(developments.name, '%Leopard%')
      )
    );

  console.table(results);
  
  console.log('\n--- Checking Cosmopolitan Projects ID ---');
  const cosmo = await db.select().from(developerBrandProfiles).where(like(developerBrandProfiles.brandName, '%Cosmopolitan%')).limit(1);
  console.log('Cosmopolitan Brand Profile:', cosmo);
  
  process.exit(0);
}

main().catch(console.error);
