/**
 * Test Railway Login
 * Run with: pnpm tsx test-railway-login.ts
 */

import axios from 'axios';

async function testLogin() {
  console.log('🔍 Testing Railway login...\n');
  
  try {
    // Test the Railway backend URL
    const response = await axios.post('https://realestateportal-production-8e32.up.railway.app/api/auth/login', {
      email: 'enetechsa@gmail.com',
      password: 'Edmaritinados187#'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testLogin().catch(console.error);