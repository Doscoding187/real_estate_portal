import 'dotenv/config';
import { searchProperties } from '../server/db';

async function main() {
  console.log('Fetching ALL properties from searchProperties...\n');
  
  const results = await searchProperties({});
  
  if (!results || results.length === 0) {
    console.error('No properties found');
    process.exit(1);
  }

  console.log(`Found ${results.length} properties\n`);

  // Check all properties
  results.forEach((property, index) => {
    console.log(`\n=== PROPERTY ${index + 1} ===`);
    console.log('ID:', property.id);
    console.log('Title:', property.title);
    console.log('Property Type:', property.propertyType);
    console.log('Area:', property.area);
    
    // Try to parse propertySettings
    if (property.propertySettings) {
      try {
        const parsed = typeof property.propertySettings === 'string' 
          ? JSON.parse(property.propertySettings) 
          : property.propertySettings;
        
        console.log('Building Size (houseAreaM2/unitSizeM2/floorAreaM2):', 
          parsed.houseAreaM2 || parsed.unitSizeM2 || parsed.floorAreaM2 || 'N/A');
        console.log('Yard/Land Size (erfSizeM2):', parsed.erfSizeM2 || 'N/A');
        console.log('Bedrooms:', parsed.bedrooms || 'N/A');
        console.log('Bathrooms:', parsed.bathrooms || 'N/A');
      } catch (e) {
        console.error('Failed to parse propertySettings');
      }
    }
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
