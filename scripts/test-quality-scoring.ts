
import { calculateListingQualityScore } from '../server/lib/quality';

const runTests = () => {
  console.log('--- Testing Listing Quality Scoring ---');

  // Case 1: Minimal Listing
  const minimalListing = {
    title: "Minimal Listing",
    description: "Short desc",
    price: 1000000,
  };
  const minimalScore = calculateListingQualityScore(minimalListing);
  console.log(`Minimal Listing Score: ${minimalScore.score}/100`);
  console.log('Tips:', minimalScore.tips);

  // Case 2: Good Listing
  const goodListing = {
    title: "Good Listing",
    description: "A very nice listing with a decent description that is hopefully long enough to get some points.",
    price: 1500000,
    images: Array(6).fill({ type: 'image' }), // 6 images
    latitude: -26.1,
    longitude: 28.1,
    floorSize: 120,
    features: ['Pool', 'Garden', 'Security', 'Garage', 'View'], // 5 features
  };
   // Add length to description
   goodListing.description = goodListing.description.repeat(5); // ~300 chars
  
  const goodScore = calculateListingQualityScore(goodListing);
  console.log(`\nGood Listing Score: ${goodScore.score}/100`);
  console.log('Tips:', goodScore.tips);

  // Case 3: Excellent Listing
  const excellentListing = {
    title: "Excellent Listing",
    description: "This is a premium listing description.".repeat(20), // > 500 chars
    price: 5000000,
    images: Array(15).fill({ type: 'image' }), // 15 images
    videos: [{ type: 'video' }],
    latitude: -26.1,
    longitude: 28.1,
    floorSize: 350,
    features: ['Pool', 'Garden', 'Security', 'Garage', 'View', 'Staff Quarters', 'Inverter'],
    virtualTourUrl: 'http://example.com/tour',
    isVerifiedAgent: true,
    isExclusive: true
  };
  const excellentScore = calculateListingQualityScore(excellentListing);
  console.log(`\nExcellent Listing Score: ${excellentScore.score}/100`);
  console.log('Tips:', excellentScore.tips);

  // Validation
  const passed = 
      minimalScore.score < 50 && 
      goodScore.score > 50 && goodScore.score < 90 &&
      excellentScore.score > 90;

  if (passed) {
      console.log('\n\x1b[32m✅ Quality Scoring Logic Verified\x1b[0m');
  } else {
      console.log('\n\x1b[31m❌ Quality Scoring Logic Logic Verification Failed\x1b[0m');
  }
};

runTests();
