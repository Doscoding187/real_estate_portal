
import 'dotenv/config';
import { locationPagesService } from '../services/locationPagesService.improved';

async function main() {
  console.log('Verifying Hybrid Authority Model...');
  
  try {
    const data = await locationPagesService.getProvinceData('gauteng');
    
    if (!data) {
        console.error('No data returned for Gauteng');
        process.exit(1);
    }
    
    console.log('Top Localities found:', data.topLocalities.length);
    data.topLocalities.forEach(loc => {
        // Safe access (in case types mismatch slightly in compilation)
        const source = (loc as any).dataSource || 'N/A';
        console.log(`- ${loc.name}: Price R${loc.avgSalePrice}, Listings: ${loc.propertiesForSale}, Source: ${source}`);
    });

    // Check specifically for Sandton
    const sandton = data.topLocalities.find((l: any) => l.name === 'Sandton');
    if (sandton) {
        console.log('\n[SUCCESS] Sandton found!');
        const source = (sandton as any).dataSource;
        if (source === 'market_intelligence') {
             console.log('[INFO] Using Market Intelligence (Fallback successful)');
        } else if (source === 'database') {
             console.log('[INFO] Using Database Data (Live data active)');
        } else {
             console.log(`[WARN] Unknown source: ${source}`);
        }
    } else {
        console.error('\n[FAIL] Sandton not found in top localities');
    }

    console.log('\n----------------------------------------');
    console.log('Verifying City Data (Sandton)...');
    const cityData = await locationPagesService.getCityData('gauteng', 'sandton');
    if (cityData) {
        console.log(`[SUCCESS] City Data returned for Sandton`);
        console.log(`- Total Listings: ${cityData.stats.totalListings}`);
        console.log(`- Avg Sale Price: R${cityData.stats.avgSalePrice}`);
        console.log(`- Sentinel Source check: ${cityData.stats.totalListings === 0 && cityData.stats.avgSalePrice > 0 ? 'Hybrid (Intel Pricing)' : 'Database'}`);
    } else {
        console.error('[FAIL] No City Data for Sandton');
    }

    console.log('\n----------------------------------------');
    console.log('Verifying Suburb Data (Sandton - context suburb)...');
    // Sandton is also a suburb slug in our mock data or maybe 'morningside' inside sandton
    const suburbData = await locationPagesService.getSuburbData('gauteng', 'sandton', 'morningside');
    if (suburbData) {
        console.log(`[SUCCESS] Suburb Data returned for Morningside`);
        console.log(`- Price: R${suburbData.enhancedData?.avgSalePrice}`);
        console.log(`- Source: ${suburbData.enhancedData?.dataSource}`);
    } else {
        console.log('[INFO] Morningside not found or no data (Expected if not in Intel/DB)');
    }
    
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
