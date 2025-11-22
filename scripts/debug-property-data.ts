import 'dotenv/config';
import { searchProperties } from '../server/db';

async function main() {
  console.log('Fetching properties from searchProperties...\n');
  
  const results = await searchProperties({});
  
  if (!results || results.length === 0) {
    console.error('No properties found');
    process.exit(1);
  }

  // Check first property
  const property = results[0];
  
  console.log('=== FIRST PROPERTY RAW DATA ===');
  console.log('ID:', property.id);
  console.log('Title:', property.title);
  console.log('Property Type:', property.propertyType);
  console.log('Area:', property.area);
  console.log('\n=== Property Settings ===');
  console.log('Raw propertySettings:', property.propertySettings);
  
  // Try to parse it
  if (property.propertySettings) {
    try {
      const parsed = typeof property.propertySettings === 'string' 
        ? JSON.parse(property.propertySettings) 
        : property.propertySettings;
      
      console.log('\n=== Parsed Property Settings ===');
      console.log('erfSizeM2:', parsed.erfSizeM2);
      console.log('landSizeM2OrHa:', parsed.landSizeM2OrHa);
      console.log('landSizeHa:', parsed.landSizeHa);
      console.log('houseAreaM2:', parsed.houseAreaM2);
      console.log('unitSizeM2:', parsed.unitSizeM2);
      console.log('floorAreaM2:', parsed.floorAreaM2);
    } catch (e) {
      console.error('Failed to parse:', e);
    }
  }
  
  console.log('\n=== Property Details ===');
  console.log('Raw propertyDetails:', property.propertyDetails);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
