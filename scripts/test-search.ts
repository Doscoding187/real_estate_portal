import 'dotenv/config';
import { getDb } from '../server/db';
import { searchProperties } from '../server/db';

async function main() {
  console.log('Testing searchProperties function...\n');

  const results = await searchProperties({
    status: 'available',
    limit: 20,
    offset: 0,
  });

  console.log(`Found ${results.length} properties with status='available':\n`);
  
  results.forEach((prop, index) => {
    console.log(`${index + 1}. ID: ${prop.id} - ${prop.title}`);
    console.log(`   Status: ${prop.status}`);
    console.log(`   Price: R${prop.price}`);
    console.log(`   Type: ${prop.propertyType} / ${prop.listingType}`);
    console.log(`   Bedrooms: ${prop.bedrooms || 'N/A'}`);
    console.log(`   Image: ${prop.mainImage ? 'Yes' : 'No'}`);
    console.log('');
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
