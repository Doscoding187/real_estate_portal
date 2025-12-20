
import * as db from '../server/db';
import { calculateListingReadiness } from '../server/lib/readiness';
import { listings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function testReadiness() {
    console.log('--- Testing Readiness Logic ---');

    // 1. Mock Listing Object (Incomplete)
    const incompleteListing = {
        title: 'Incomplete Listing',
        // address: 'missing',
        // askingPrice: 0,
        images: []
    };

    const r1 = calculateListingReadiness(incompleteListing);
    console.log('Incomplete Listing Score:', r1.score);
    console.log('Missing:', r1.missing);

    if (r1.score > 50) console.error('FAIL: Score too high for incomplete listing');
    else console.log('PASS: Low score verified');

    // 2. Mock Listing Object (Complete)
    const completeListing = {
        title: 'Complete Listing',
        address: '123 Main St',
        latitude: -26.1,
        longitude: 28.0,
        askingPrice: 1000000,
        images: Array(10).fill('img.jpg'),
        description: 'This is a very long description that is definitely more than 100 characters long because it needs to be for the readiness check to pass verify verification.',
        propertyType: 'house',
        propertyDetails: { bedrooms: 3 }
    };

    const r2 = calculateListingReadiness(completeListing);
    console.log('Complete Listing Score:', r2.score);
    console.log('Missing:', r2.missing);

    if (r2.score < 100) console.error('FAIL: Score too low for complete listing');
    else console.log('PASS: High score verified');
}

testReadiness().then(()=>process.exit(0)).catch(console.error);
