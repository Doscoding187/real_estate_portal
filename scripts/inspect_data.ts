
import 'dotenv/config';
import { getDb } from '../server/db-connection';
import { developments, unitTypes } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkData() {
  const db = await getDb();
  if (!db) {
    console.error('No DB connection');
    return;
  }

  // Check the development (assuming ID 300001 based on logs or standard dev ID)
  // or list all enabled developments
  const devList = await db.select().from(developments).limit(5);
  
  console.log('--- Developments ---');
  devList.forEach(d => {
    console.log(`ID: ${d.id}, Name: ${d.name}, Images Length: ${d.images ? d.images.length : 0}`);
    console.log('Images Raw:', d.images);
  });

  const units = await db.select().from(unitTypes);
  console.log('\n--- Unit Types ---');
  console.log(`Total Units Found: ${units.length}`);
  units.forEach(u => {
    console.log(`ID: ${u.id}, DevID: ${u.developmentId}, Name: ${u.name}`);
  });
}

checkData().then(() => process.exit(0)).catch(console.error);
