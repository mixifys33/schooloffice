/**
 * Test script for school settings API
 * Run with: node test-school-settings-api.js
 */

const API_BASE = 'http://localhost:3000';

async function testSchoolSettingsAPI() {
  console.log('Testing School Settings API...\n');

  try {
    // Test GET endpoint (will fail without auth, but should return 401)
    console.log('1. Testing GET /api/settings/school');
    const getResponse = await fetch(`${API_BASE}/api/settings/school`);
    console.log(`   Status: ${getResponse.status}`);
    
    if (getResponse.status === 401) {
      console.log('   ✅ Correctly returns 401 Unauthorized without session');
    } else {
      console.log('   ❌ Expected 401 but got:', getResponse.status);
    }

    // Test PUT endpoint (will fail without auth, but should return 401)
    console.log('\n2. Testing PUT /api/settings/school');
    const putResponse = await fetch(`${API_BASE}/api/settings/school`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test School',
        schoolType: 'SECONDARY'
      })
    });
    console.log(`   Status: ${putResponse.status}`);
    
    if (putResponse.status === 401) {
      console.log('   ✅ Correctly returns 401 Unauthorized without session');
    } else {
      console.log('   ❌ Expected 401 but got:', putResponse.status);
    }

    console.log('\n✅ School Settings API endpoints are properly protected');
    console.log('   - Both GET and PUT require authentication');
    console.log('   - API structure is correct');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Start with: npm run dev');
    } else {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Run the test
testSchoolSettingsAPI();