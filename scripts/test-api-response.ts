import { getDeveloperByUserId } from '../server/db';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAPIResponse() {
  try {
    console.log('Testing what the API would return...\n');
    
    // This simulates what the API endpoint does
    const userId = 120001; // Your user ID
    const developer = await getDeveloperByUserId(userId);
    
    console.log('API Response:');
    console.log(JSON.stringify(developer, null, 2));
    
    if (!developer) {
      console.log('\n❌ API returns NULL - This is the problem!');
      console.log('   The frontend will show "Complete Profile Setup"');
    } else if (developer.status === 'pending') {
      console.log('\n⚠️  API returns status: pending');
      console.log('   The frontend will show "Profile Under Review"');
    } else if (developer.status === 'approved') {
      console.log('\n✅ API returns status: approved');
      console.log('   The frontend should show the full dashboard');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testAPIResponse();
