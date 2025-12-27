import 'dotenv/config';
import {
  eq,
  desc,
  getTableColumns,
  and,
  sql,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import {
  users,
  agents,
  listings,
  listingMedia, // Added to match db.ts imports context
} from '../drizzle/schema.js';
import * as schema from '../drizzle/schema.js';

async function reproduceError() {
  console.log('Connecting to DB...');
  const poolConnection = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(poolConnection, { schema, mode: 'default' });

  console.log('Checking table objects:');
  console.log('listings:', !!listings);
  console.log('users:', !!users);
  console.log('agents:', !!agents);
  console.log('schema.users:', !!schema.users);
  console.log('schema.agents:', !!schema.agents);

  console.log('Checking columns:');
  console.log('users.name:', !!users.name);
  console.log('users.image:', !!users.image);
  // console.log('Checking columns:', ...);
  // process.exit(0);

  try {
    console.log('Building query...');
    
    // Updated query matching fix in db.ts
    let query = db.select({
      ...getTableColumns(listings),
      ownerName: users.name,
      ownerEmail: users.email,
      agentName: agents.displayName, // Corrected
      agentImage: agents.profileImage, // Corrected
      agentEmail: agents.email,
      agentPhone: agents.phone,
    })
    .from(listings)
    .leftJoin(users, eq(listings.ownerId, users.id)) // Use direct import
    .leftJoin(agents, eq(listings.agentId, agents.id)) // Use direct import
    .limit(1);

    console.log('Executing query...');
    const results = await query;
    console.log('Results (Success):', results.length > 0 ? 'Found 1 listing' : 'No listings found');
    if (results.length > 0) {
      console.log('Sample Agent Name:', results[0].agentName);
      console.log('Sample Owner Name:', results[0].ownerName);
    }

  } catch (error) {

  } catch (error) {
    console.error('CRASHED:', error);
  } finally {
    poolConnection.end();
  }
}

reproduceError().catch(console.error);
