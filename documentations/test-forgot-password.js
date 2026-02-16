/**
 * Test script to simulate the forgot password flow
 */
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testForgotPasswordFlow() {
  console.log('Testing forgot password flow...\n');

  try {
    // Step 1: Initiate password reset
    console.log('Step 1: Initiating password reset...');
    const initiateResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schoolCode: 'VALLEY', // Replace with a valid school code
        identifier: 'mixifys33@gmail.com' // Replace with a valid user email
      })
    });

    const initiateData = await initiateResponse.json();
    console.log('Initiate response:', initiateData);

    if (!initiateResponse.ok) {
      console.error('❌ Initiate step failed');
      return;
    }

    // Step 2: Send verification code
    console.log('\nStep 2: Sending verification code...');
    const sendCodeResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schoolCode: 'TEST001',
        identifier: 'p4147176@gmail.com',
        method: 'email'
      })
    });

    const sendCodeData = await sendCodeResponse.json();
    console.log('Send code response:', sendCodeData);

    if (!sendCodeResponse.ok) {
      console.error('❌ Send code step failed');
    n;
    }

    console.log('\n✅ Test completed successfully!');
    console.log('📧 Check your email for the verification code.');
    console.log('🔍 Also check the server console logs for the code if email fails.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('⚠️  Server is not running at', BASE_URL);
    console.log('Please start the development server with: npm run dev');
    return;
  }

  await testForgotPasswordFlow();
}

main();