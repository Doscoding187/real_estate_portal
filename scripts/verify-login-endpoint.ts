import axios from 'axios';

async function testLogin() {
  console.log('🔍 Testing login endpoint at http://localhost:5000/api/auth/login...\n');

  try {
    // Attempt login with dummy credentials
    const response = await axios.post(
      'http://localhost:5000/api/auth/login',
      {
        email: 'test@example.com',
        password: 'test',
      },
      {
        headers: {
          'Content-Type': 'application/json', // Explicitly set incorrect content type first? No, use correct one.
        },
        validateStatus: () => true, // Resolve promise for all status codes
      },
    );

    console.log(`✅ Server responded with Status: ${response.status}`);
    console.log('Response Body:', JSON.stringify(response.data, null, 2));

    if (response.status === 401 || response.status === 400 || response.status === 200) {
      console.log('Endpoint is ACTIVE and responding correctly.');
    } else if (response.status === 405) {
      console.log('❌ Endpoint returned 405 Method Not Allowed - Issue Persists.');
    } else {
      console.log('⚠️ Unexpected status code.');
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection refused - Server is NOT running.');
    } else {
      console.error('❌ Request failed:', error.message);
    }
  }
}

testLogin().catch(console.error);
