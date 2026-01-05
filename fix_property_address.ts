
import 'dotenv/config';
import { db, getDb } from './server/db';
import { properties } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function updateProperty() {
  try {
    const database = await getDb();
    if (!database) throw new Error('DB not connected');

    const result = await database.update(properties)
        .set({ 
            address: '2657 Firefish Street, Sky City'  // Adding Suburb name for text search
        })
        .where(eq(properties.id, 180001));

    console.log('Update result:', result);
    console.log('Property 180001 updated!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating property:', error);
    process.exit(1);
  }
}

updateProperty();
