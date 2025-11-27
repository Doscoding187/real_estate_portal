const http = require('http');
console.log('Triggering fix endpoint...');
http.get('http://localhost:8081/api/auth/fix-agent', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { 
    console.log('Response status:', res.statusCode);
    console.log('Response body:', data); 
  });
}).on('error', (err) => { 
  console.error('Error:', err.message); 
});
