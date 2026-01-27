
import * as dotenv from 'dotenv';
dotenv.config();

import { createDevelopment } from '../server/services/developmentService';
import { getDb } from '../server/db';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

async function main() {
  const dbConn = await getDb();
  if (!dbConn) {
    console.error('No DB connection');
    return;
  }

  const developerId = 1;

  console.log('Testing createDevelopment with MINIMUM REQUIRED DATA...');

  try {
    // Only pass what is strictly required or non-nullable
    // developmentService fills in defaults for some (like status, devType if modified)
    // But I will pass them explicitly to be safe
    const result = await createDevelopment(developerId, {
      name: 'Repro Min',
      city: 'Johannesburg',
      province: 'Gauteng',
      developmentType: 'residential',
      status: 'launching-soon',
      
      // Explicitly nullify conflicting optionals that might be autoset
      marketingBrandProfileId: null,
      locationId: null,
      
    } as any, {
      marketingBrandProfileId: null
    });

    console.log('Success! Created development ID:', result.id);
    
    // Cleanup
    await dbConn.delete(require('../drizzle/schema').developments).where(eq(require('../drizzle/schema').developments.id, result.id));
    console.log('Cleanup done.');

  } catch (error: any) {
    console.error('CAUGHT ERROR');
    const errorLog = {
      message: error.message,
      code: error.code,
      details: error.details,
      cause: error.cause,
      stack: error.stack
    };
    fs.writeFileSync('repro-error.json', JSON.stringify(errorLog, null, 2));
    console.log('Error written to repro-error.json');
  }
  
  process.exit(0);
}

main().catch(console.error);
