/**
 * Test Backend Login
 * Run with: pnpm tsx test-backend-login.ts
 */

import * as https from 'https';
import * as querystring from 'querystring';

// Test credentials
const TEST_EMAIL = 'admin@realestate.com';
const TEST_PASSWORD = 'Admin@123456';

// Railway backend URL
const BACKEND_URL = 'https://realestateportal-production-9bb8.up.railway.app';

async function testLogin() {
  console.log('🔍 Testing backend login...\n');
  
  try {
    // Test health endpoint first
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await makeRequest(`${BACKEND_URL}/api/health`, 'GET');
    console.log('✅ Health check:', healthResponse.status, healthResponse.data);
    
    // Test login endpoint
    console.log('\n2️⃣ Testing login endpoint...');
    const loginResponse = await makeRequest(`${BACKEND_URL}/api/auth/login`, 'POST', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    console.log('Login response status:', loginResponse.status);
    console.log('Login response data:', JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.status === 200) {
      console.log('✅ Login successful!');
      console.log('User:', loginResponse.data.user);
    } else {
      console.log('❌ Login failed');
      console.log('Error:', loginResponse.data?.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

function makeRequest(url: string, method: string, data?: any): Promise<{status: number, data: any}> {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode || 0,
            data: parsedData
          });
        } catch (error) {
          resolve({
            status: res.statusCode || 0,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

testLogin().catch(console.error);