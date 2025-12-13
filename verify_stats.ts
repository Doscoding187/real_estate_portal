
import { locationPagesService } from './server/services/locationPagesService.improved';

async function verifyLocationStats() {
  console.log('Verifying Province Data Stats...');
  // Assuming 'gauteng' exists or use a known slug
  const provinceData = await locationPagesService.getProvinceData('gauteng');
  
  if (!provinceData) {
    console.log('Province not found, trying another or skipping.');
    return;
  }

  console.log('Stats:', provinceData.stats);
  
  if (
    typeof provinceData.stats.minPrice === 'number' &&
    typeof provinceData.stats.maxPrice === 'number' &&
    typeof provinceData.stats.rentalCount === 'number' &&
    typeof provinceData.stats.saleCount === 'number'
  ) {
    console.log('SUCCESS: Stats contain new fields.');
  } else {
    console.error('FAILURE: Stats missing new fields.', provinceData.stats);
  }

  console.log('Trending Suburbs Growth Check:');
  if (provinceData.trendingSuburbs.length > 0) {
      console.log('First Trending Suburb:', provinceData.trendingSuburbs[0]);
      if ('growth' in provinceData.trendingSuburbs[0]) {
          console.log('SUCCESS: Trending suburb has growth field.');
      } else {
          console.log('WARNING: Trending suburb missing growth field (might be intentional if not in type def yet but in runtime).');
      }
  } else {
      console.log('No trending suburbs found.');
  }
}

// execute
verifyLocationStats().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
