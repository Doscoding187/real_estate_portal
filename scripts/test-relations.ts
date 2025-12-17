
import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../server/db.ts';

async function testRelations() {
  console.log('Testing Relations...');
  
  try {
    const _db = await getDb();
    if (!_db) {
        throw new Error('Could not connect to database.');
    }

    // Test 1: Simple development query without relations
    console.log('\n1. Testing simple development query...');
    const dev = await _db.query.developments.findFirst();
    console.log(`   Found: ${dev?.name || 'none'}`);

    // Test 2: Development with developer relation
    console.log('\n2. Testing development -> developer...');
    const dev2 = await _db.query.developments.findFirst({
      with: { developer: true }
    });
    console.log(`   Developer: ${dev2?.developer?.name || 'none'}`);

    // Test 3: Development with phases
    console.log('\n3. Testing development -> phases...');
    const dev3 = await _db.query.developments.findFirst({
      with: { phases: true }
    });
    console.log(`   Phases: ${dev3?.phases?.length || 0}`);

    // Test 4: Development with units
    console.log('\n4. Testing development -> units...');
    const dev4 = await _db.query.developments.findFirst({
      with: { units: true }
    });
    console.log(`   Units: ${dev4?.units?.length || 0}`);

    console.log('\n✅ Relations test complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

testRelations();
