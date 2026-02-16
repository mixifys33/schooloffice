const https = require('http');

async function testCurrentTermAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/terms/current',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));
        console.log('Response Body:', data);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('Failed to parse JSON:', e.message);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.end();
  });
}

console.log('Testing /api/terms/current endpoint...');
testCurrentTermAPI().catch(console.error);