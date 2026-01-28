import { config } from 'dotenv';
config();
import { getDb } from '../server/db';
import { priceInsightsService } from '../server/services/priceInsightsService';

async function main() {
  try {
    await getDb(); // Initialize DB
    console.log('--- Verifying getAllCityInsights ---');
    const cityInsights = await priceInsightsService.getAllCityInsights();
    console.log('City Insights Keys:', Object.keys(cityInsights));
    if (Object.keys(cityInsights).length > 0) {
      const firstCity = Object.keys(cityInsights)[0];
      console.log(
        `First City (${firstCity}):`,
        JSON.stringify(cityInsights[firstCity].medianPrice, null, 2),
      );
    } else {
      console.log('No city insights found.');
    }

    console.log('\n--- Verifying getSuburbPriceHeatmap ---');
    // Try to find a valid city ID from the first result if available, else pick a likely one
    // We saw location 30002 in backfill logs.
    const cityId = 30002;
    console.log(`Fetching heatmap for City ID: ${cityId}`);

    const heatmap = await priceInsightsService.getSuburbPriceHeatmap({
      cityId: cityId,
      provinceId: undefined,
      propertyType: 'all',
      listingType: 'all',
    });

    console.log(`Heatmap Results: ${heatmap.length} items`);
    if (heatmap.length > 0) {
      console.log('First Heatmap Item:', heatmap[0]);
    } else {
      console.log('No heatmap data found. Check if cityId 30002 has data in price_facts.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Verification Error:', error);
    process.exit(1);
  }
}

main();
