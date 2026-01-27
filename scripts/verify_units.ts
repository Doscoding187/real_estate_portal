
import 'dotenv/config'; 
// If .env is in root (parent of scripts), we might need path spec if cwd is not root. 
// But commonly this works if run from root. 
// Let's try specifying path again but cleaner.
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Now import db
import { getDb } from '../server/db';
import { developments, unitTypes } from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

async function verify() {
  const db = await getDb();
  
  if (!db) {
      console.error('DB not found - connection failed');
      return;
  }

  const devId = 1300001; 
  console.log(`Verifying Development ID: ${devId}`);

  try {
      const dev = await db.select({ id: developments.id, name: developments.name }).from(developments).where(eq(developments.id, devId));
      console.log('Development:', dev);

      const unitsCount = await db.select({ count: sql`count(*)` }).from(unitTypes).where(eq(unitTypes.developmentId, devId));
      console.log('Units Count:', unitsCount);

      // Match the service implementation exactly
      console.log('Testing exact service query...');
      const unitTypesRes = await db.select().from(unitTypes).where(eq(unitTypes.developmentId, devId));
      console.log('Service Query Result Count:', unitTypesRes.length);
      console.log('first unit keys:', Object.keys(unitTypesRes[0] || {}));

      const units = await db.select({ id: unitTypes.id, devId: unitTypes.developmentId, name: unitTypes.name, isActive: unitTypes.isActive, createdAt: unitTypes.createdAt }).from(unitTypes).where(eq(unitTypes.developmentId, devId)).limit(20);
      console.log('Units Sample:', units);

  } catch (e) {
      console.error(e);
  }
  process.exit(0);
}

verify();
