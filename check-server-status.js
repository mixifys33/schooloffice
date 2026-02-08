/**
 * Quick server status check
 */

const http = require('http');

function checkServer() {
  console.log('🔍 Checking if development server is running...\n');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/forgot-password/initiate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log('✅ Server is running!');
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('   Response:', response);
        console.log('\n🚀 Ready to test forgot password flow!');
        console.log('   Visit: http://localhost:3000/forgot-password');
      } catch (e) {
        console.log('   Raw response:', data);
      }
    });
  });

  req.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running');
      console.log('   Please start the development server with: npm run dev');
      console.log('   Then visit: http://localhost:3000/forgot-password');
    } else {
      console.log('❌ Error checking server:', err.message);
    }
  });

  req.on('timeout', () => {
    console.log('⏱️ Server request timed out');
    console.log('   Server might be starting up or overloaded');
    req.destroy();
  });

  // Send test request
  const testData = JSON.stringify({
    schoolCode: 'TEST',
    identifier: 'test@example.com'
  });

  req.write(testData);
  req.end();
}

checkServer();