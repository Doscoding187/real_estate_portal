import 'dotenv/config';
import { searchProperties } from '../server/db';

async function main() {
  const properties = await searchProperties({});
  
  // Find our test house by title
  const testHouse = properties.find((p: any) => p.title === '4 Bedroom Family House with Large Garden');
  
  if (!testHouse) {
    console.log('❌ Test house not found');
    process.exit(1);
  }

  console.log('=== RAW API DATA FOR TEST HOUSE ===\n');
  console.log('ID:', testHouse.id);
  console.log('Title:', testHouse.title);
  console.log('Property Type:', testHouse.propertyType);
  console.log('Price:', testHouse.price);
  console.log('Area:', testHouse.area);
  console.log('Bedrooms:', testHouse.bedrooms);
  console.log('Bathrooms:', testHouse.bathrooms);
  console.log('\n=== Property Settings (raw) ===');
  console.log(testHouse.propertySettings);
  
  // Now test with normalizer
  console.log('\n=== TESTING NORMALIZER ===');
  const { normalizePropertyForUI } = await import('../client/src/lib/normalizers');
  const normalized = normalizePropertyForUI(testHouse);
  
  console.log('\nNormalized result:');
  console.log('bedrooms:', normalized?.bedrooms);
  console.log('bathrooms:', normalized?.bathrooms);
  console.log('area:', normalized?.area);
  console.log('yardSize:', normalized?.yardSize);
  console.log('propertyType:', normalized?.propertyType);
  console.log('price:', normalized?.price);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
