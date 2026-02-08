/**
 * Test the fixed DoS dashboard API
 */
const fetch = require('node-fetch');

async function testDoSDashboard() {
  try {
    console.log('🧪 Testing DoS Dashboard API...\n');

    const response = await fetch('http://localhost:3000/api/dos/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any required auth headers here if needed
      }
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ DoS Dashboard Data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('\n❌ Error response:');
      console.log(errorText);
    }

  } catch (error) {
    console.error('❌ Error testing DoS dashboard:', error.message);
  }
}

testDoSDashboard();