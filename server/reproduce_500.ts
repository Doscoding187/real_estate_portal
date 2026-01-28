import 'dotenv/config';
import { developerRouter } from './developerRouter';
import { createContext } from './_core/context';
import { getDb, createUser, createDeveloper, deleteProperty, deletePropertyImage } from './db';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('--- REPRODUCTION SCRIPT START ---');

  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    process.exit(1);
  }

  // 1. Create a dummy user
  const uniqueId = Date.now().toString();
  const openId = `test_user_${uniqueId}`;
  const email = `failtest_${uniqueId}@example.com`;

  console.log(`Creating test user: ${email}`);

  try {
    const userId = await createUser({
      openId,
      email,
      name: 'Failure Bundle Tester',
      role: 'property_developer',
      loginMethod: 'email',
      emailVerified: 0,
      isSubaccount: 0,
    } as any); // Cast as any because createUser signature in db.ts might not match actual DB constraints perfectly or types are strict

    // 2. Create developer profile
    console.log('Creating developer profile...');
    const [devResult] = await db.insert(schema.developers).values({
      userId,
      name: 'Failure Bundle Dev',
      slug: `failure-bundle-dev-${uniqueId}`,
      email,
      status: 'approved',
      isVerified: 1,
      city: 'Test City',
      province: 'Gauteng',
    });
    const developerId = devResult.insertId;

    // 3. Mock Context
    const mockCtx = {
      user: {
        id: userId,
        openId,
        email,
        role: 'property_developer',
        name: 'Failure Bundle Tester',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        emailVerified: 0,
        loginMethod: 'email',
        // Add other required user fields with defaults if strict
      },
    };

    // 4. Construct Payload
    // Based on "Repro Steps": Fill wizard inputs.
    const input = {
      name: 'Failure Bundle Development',
      city: 'Johannesburg',
      province: 'Gauteng', // valid province
      developmentType: 'residential' as const,
      marketingRole: 'open' as const,
      showHouseAddress: true,
      // Minimal required fields based on router analysis
      // Note: check if unitTypes are required. Code says: if (!isLand) check unitTypes.
      // We will provide empty unitTypes to see if that triggers logic or validation error first.
      // But we want the 500. 500 usually implies valid input but server crash.
      // So let's provide a valid-looking payload.
      unitTypes: [
        {
          name: 'Type A',
          bedrooms: 2,
          bathrooms: 2,
          parking: 1,
          parkingType: 'covered',
          priceFrom: 1000000,
        },
      ],
      images: [{ url: 'https://example.com/image.jpg', category: 'hero' }],
    };

    console.log('Invoking createDevelopment with input:', JSON.stringify(input, null, 2));

    const caller = developerRouter.createCaller(mockCtx as any);

    try {
      const result = await caller.createDevelopment(input);
      console.log('SUCCESS (Unexpected):', result);
    } catch (err: any) {
      console.log('--- CAUGHT ERROR ---');
      console.error(err);
      if (err instanceof Error) {
        console.log('Stack:', err.stack);
        if ('cause' in err) {
          console.log('Cause:', (err as any).cause);
        }
      }

      // Log full object for inspection
      console.log('Full JSON Error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    }
  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    console.log('--- REPRODUCTION SCRIPT END ---');
    process.exit(0);
  }
}

main();
