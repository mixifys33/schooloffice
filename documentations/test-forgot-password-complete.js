/**
 * Complete test for forgot password email flow
 * This will test the actual API and show detailed logs
 */
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Replace these with actual values from your database
const TEST_SCHOOL_CODE = 'VALLEY'; // Real school code from database
const TEST_USER_EMAIL = 'admin@valley.com'; // Real user email from database

async function waitForServer(maxAttempts = 10) {
  console.log('⏳ Waiting for server to start...');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Try to hit the initiate endpoint as a health check
      const response = await fetch(`${BASE_URL}/api/auth/forgot-password/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolCode: 'TEST', identifier: 'test' })
      }).catch(() => null);
      if (response) {
        console.log('✅ Server is ready!\n');
        return true;
      }
    } catch (e) {
      // Ignore
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write('.');
  }
  console.log('\n❌ Server did not start in time');
  return false;
}

async function testForgotPasswordFlow() {
  console.log('🧪 Testing Forgot Password Email Flow\n');
  console.log('Configuration:');
  console.log('  School Code:', TEST_SCHOOL_CODE);
  console.log('  User Email:', TEST_USER_EMAIL);
  console.log('  Base URL:', BASE_URL);
  console.log('');

  try {
    // Step 1: Initiate
    console.log('📋 Step 1: Initiating password reset...');
    const initiateResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: TEST_SCHOOL_CODE,
        identifier: TEST_USER_EMAIL
      })
    });

    const initiateData = await initiateResponse.json();
    console.log('   Status:', initiateResponse.status);
    console.log('   Response:', JSON.stringify(initiateData, null, 2));

    if (!initiateResponse.ok) {
      console.log('❌ Initiate step failed\n');
      return;
    }
    console.log('✅ Initiate step passed\n');

    // Step 2: Send code via email
    console.log('📧 Step 2: Sending verification code via email...');
    console.log('   This should trigger the email service');
    console.log('   Check the server console for detailed logs\n');
    
    const sendCodeResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: TEST_SCHOOL_CODE,
        identifier: TEST_USER_EMAIL,
        method: 'email'
      })
    });

    const sendCodeData = await sendCodeResponse.json();
    console.log('   Status:', sendCodeResponse.status);
    console.log('   Response:', JSON.stringify(sendCodeData, null, 2));

    if (!sendCodeResponse.ok) {
      console.log('❌ Send code step failed\n');
      return;
    }

    console.log('\n✅ Send code API call completed');
    console.log('');
    console.log('📊 Results:');
    console.log('   Email sent:', sendCodeData.sent ? '✅ YES' : '❌ NO');
    console.log('   Masked contact:', sendCodeData.maskedContact || 'N/A');
    console.log('');
    console.log('🔍 Next steps:');
    console.log('   1. Check the server console logs above for detailed email sending logs');
    console.log('   2. Look for lines starting with 🔧 [Email Service] or 🔧 [Password Reset]');
    console.log('   3. Check your email inbox (and spam folder) for the verification code');
    console.log('   4. The verification code should also be logged in the server console');
    console.log('');

    if (!sendCodeData.sent) {
      console.log('⚠️  Email was NOT sent successfully');
      console.log('   Check the server logs for error messages');
      console.log('   The verification code should still be logged in the console');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

async function main() {
  const serverReady = await waitForServer();
  if (!serverReady) {
    console.log('\n⚠️  Please start the server with: npm run dev');
    console.log('   Then run this test again');
    return;
  }

  await testForgotPasswordFlow();
}

main();