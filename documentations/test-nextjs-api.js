/**
 * Test Next.js API routes
 * This script tests the API endpoints by making HTTP requests
 * Run with: node test-nextjs-api.js
 * 
 * Make sure your Next.js dev server is running on localhost:3000
 */

const http = require('http');

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testAPIs() {
  console.log('🧪 Testing Next.js API routes...\n');
  console.log('⚠️  Make sure your Next.js dev server is running on localhost:3000\n');

  try {
    // Test super admin dashboard API
    console.log('1. Testing Super Admin Dashboard API...');
    const dashboardResponse = await makeRequest('/api/super-admin/dashboard?page=1&pageSize=10');
    
    console.log(`   Status: ${dashboardResponse.statusCode}`);
    console.log(`   Content-Type: ${dashboardResponse.headers['content-type']}`);
    
    if (dashboardResponse.statusCode === 200) {
      try {
        const data = JSON.parse(dashboardResponse.body);
        console.log('   ✅ API responded successfully');
        console.log(`   Success: ${data.success}`);
        if (data.data) {
          console.log(`   Schools: ${data.data.schools?.length || 0}`);
          console.log(`   Global Stats: ${JSON.stringify(data.data.globalStats || {})}`);
        }
      } catch (parseError) {
        console.log('   ❌ Failed to parse JSON response');
        console.log('   Response body:', dashboardResponse.body.substring(0, 200) + '...');
      }
    } else {
      console.log('   ❌ API failed');
      console.log('   Response:', dashboardResponse.body.substring(0, 500));
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test super admin schools API
    console.log('2. Testing Super Admin Schools API...');
    const schoolsResponse = await makeRequest('/api/super-admin/schools?page=1&pageSize=10');
    
    console.log(`   Status: ${schoolsResponse.statusCode}`);
    console.log(`   Content-Type: ${schoolsResponse.headers['content-type']}`);
    
    if (schoolsResponse.statusCode === 200) {
      try {
        const data = JSON.parse(schoolsResponse.body);
        console.log('   ✅ API responded successfully');
        console.log(`   Success: ${data.success}`);
        if (data.data) {
          console.log(`   Schools: ${data.data.schools?.length || 0}`);
          console.log(`   Total: ${data.data.pagination?.totalSchools || 0}`);
        }
      } catch (parseError) {
        console.log('   ❌ Failed to parse JSON response');
        console.log('   Response body:', schoolsResponse.body.substring(0, 200) + '...');
      }
    } else {
      console.log('   ❌ API failed');
      console.log('   Response:', schoolsResponse.body.substring(0, 500));
    }

    console.log('\n✅ API testing completed!');
    console.log('\n💡 Common issues if APIs are failing:');
    console.log('   - Next.js dev server not running');
    console.log('   - Authentication required (401/403 errors)');
    console.log('   - Database connection issues');
    console.log('   - Missing environment variables');

  } catch (error) {
    console.error('🚨 Test failed:', error.message);
    console.log('\n💡 Make sure Next.js dev server is running:');
    console.log('   npm run dev');
  }
}

// Run the test
testAPIs();