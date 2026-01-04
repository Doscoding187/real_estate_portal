
import mysql from 'mysql2/promise';

async function checkSlug() {
  const connection = await mysql.createConnection({
    host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "292qWmvn2YGy2jW.root",
    password: "TOdjCJY1bepCcJg1",
    database: "listify_property_sa",
    ssl: {},
  });

  console.log('Connected to DB');

  try {
    const slug = 'sky-city-housing-development-ext-50';
    console.log(`Searching for exact slug: "${slug}"`);

    const [rows]: any = await connection.execute(
      'SELECT id, name, slug, isPublished, developerId FROM developments WHERE slug = ?',
      [slug]
    );

    if (rows.length > 0) {
      console.log('FOUND MATCHING ROW:', rows[0]);
    } else {
      console.log('NO EXACT MATCH FOUND.');
      
      // Try partial match
      console.log('Searching for partial matches...');
      const [partialRows]: any = await connection.execute(
        'SELECT id, name, slug, isPublished FROM developments WHERE slug LIKE ?',
        ['%sky-city%']
      );
      
      console.log('Partial matches:', partialRows);
    }

  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await connection.end();
  }
}

checkSlug();
