import 'dotenv/config';
import { getPublicDevelopmentBySlug } from '../server/services/developmentService';

async function testQuery() {
  console.log('\n--- Testing getPublicDevelopmentBySlug ---');
  
  const slug = 'leopards-rest-lifestyle-estate';
  console.log('Querying with slug:', slug);
  
  try {
    const result = await getPublicDevelopmentBySlug(slug);
    
    if (result) {
      console.log('\n✅ Development found!');
      console.log('  ID:', result.id);
      console.log('  Name:', result.name);
      console.log('  Slug:', result.slug);
    } else {
      console.log('\n❌ Development not found (returned null)');
      console.log('\nThis means the WHERE clause filtered it out.');
      console.log('Checking likely causes:');
      console.log('  1. isPublished != 1');
      console.log('  2. Missing/incorrect slug');
      console.log('  3. SQL error (check logs above)');
    }
  } catch (error) {
    console.error('\n❌ Query error:', error);
  }

  process.exit(0);
}

testQuery().catch(console.error);
