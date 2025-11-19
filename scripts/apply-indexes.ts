import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function applyIndexes() {
  console.log('Starting index application...');
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  const indexes = [
    "CREATE INDEX `price_idx` ON `properties` (`price`)",
    "CREATE INDEX `status_idx` ON `properties` (`status`)",
    "CREATE INDEX `city_idx` ON `properties` (`city`)",
    "CREATE INDEX `province_idx` ON `properties` (`province`)",
    "CREATE INDEX `property_type_idx` ON `properties` (`propertyType`)",
    "CREATE INDEX `listing_type_idx` ON `properties` (`listingType`)",
    "CREATE INDEX `bedrooms_idx` ON `properties` (`bedrooms`)",
    "CREATE INDEX `bathrooms_idx` ON `properties` (`bathrooms`)",
    "CREATE INDEX `email_idx` ON `users` (`email`)",
    "CREATE INDEX `role_idx` ON `users` (`role`)"
  ];

  for (const indexSql of indexes) {
    try {
      await db.execute(sql.raw(indexSql));
      console.log(`Successfully executed: ${indexSql}`);
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`Index already exists (skipping): ${indexSql}`);
      } else {
        console.error(`Failed to execute: ${indexSql}`, error);
      }
    }
  }

  console.log('Index application complete.');
  process.exit(0);
}

applyIndexes();
