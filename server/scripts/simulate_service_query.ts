import { config } from 'dotenv';
config({ path: '.env.local' });
import { getDb } from '../db-connection';
import {
  developments,
  developers,
  developerBrandProfiles,
  unitTypes,
  developmentPhases,
} from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
// import { parseSlugOrId } from '../utils/parseSlugOrId';

function parseSlugOrId(input: string) {
  const isId = /^\d+$/.test(input);
  return { isId, value: isId ? parseInt(input, 10) : input };
}

async function run() {
  const db = getDb(); // Assume synch or await if needed, but imported getDb is async usually? checking db-connection.ts
  // Actually getDb is likely async or returns connection. In the service it is awaited: const db = await getDb();

  const conn = await getDb();
  if (!conn) {
    console.log('No DB');
    return;
  }

  const slugOrId = 'test-development';
  console.log('Testing slug:', slugOrId);

  const { isId, value } = parseSlugOrId(slugOrId);
  console.log('Parsed:', { isId, value });

  const whereClause = isId
    ? and(eq(developments.id, value as number), eq(developments.isPublished, 1))
    : and(eq(developments.slug, value as string), eq(developments.isPublished, 1));

  try {
    const results = await conn
      .select({
        id: developments.id,
        name: developments.name,
        slug: developments.slug,
        isPublished: developments.isPublished,
        developer: {
          id: sql<number>`COALESCE(${developerBrandProfiles.id}, ${developers.id})`,
          name: sql<string>`COALESCE(${developerBrandProfiles.brandName}, ${developers.name})`,
          isBrand: sql<boolean>`CASE WHEN ${developerBrandProfiles.id} IS NOT NULL THEN 1 ELSE 0 END`,
        },
      })
      .from(developments)
      .leftJoin(developers, eq(developments.developerId, developers.id))
      .leftJoin(
        developerBrandProfiles,
        eq(developments.developerBrandProfileId, developerBrandProfiles.id),
      )
      .where(whereClause)
      .limit(1);

    console.log('Results length:', results.length);
    if (results.length > 0) {
      const dev = results[0];
      console.log('Result[0] ID:', dev.id);

      console.log('Querying units and phases...');
      const [units, phases] = await Promise.all([
        conn
          .select()
          .from(unitTypes)
          .where(and(eq(unitTypes.developmentId, dev.id), eq(unitTypes.isActive, 1)))
          .orderBy(unitTypes.basePriceFrom),

        conn
          .select({
            id: developmentPhases.id,
            name: developmentPhases.name,
          })
          .from(developmentPhases)
          .where(eq(developmentPhases.developmentId, dev.id))
          .orderBy(developmentPhases.phaseNumber),
      ]);
      console.log('Units found:', units.length);
      console.log('Phases found:', phases.length);
    } else {
      console.log('NO RESULTS FOUND with the service query logic');
    }
  } catch (err) {
    console.error('Error running query:', err);
  }
  process.exit(0);
}

run();
