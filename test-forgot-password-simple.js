/**
 * Simple test for forgot password functionality
 */
require('dotenv').config();

async function testForgotPassword() {
  console.log('🔍 Testing Forgot Password Flow\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test data
  const testData = {
    schoolCode: 'VALLEY',
    identifier: 'admin@valley.com', // Change this to a real email in your database
    method: 'email'
  };
  
  console.log('📋 Test data:', testData);
  console.log('');
  
  try {
    // Step 1: Initiate forgot password
    console.log('1️⃣ Initiating forgot password...');
    const initiateResponse = await fetch(`${baseUrl}/api/auth/forgot-password/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: testData.schoolCode,
        identifier: testData.identifier
      })
    });
    
    const initiateResult = await initiateResponse.json();
    console.log('   Status:', initiateResponse.status);
    console.log('   Response:', initiateResult);
    console.log('');
    
    if (!initiateResponse.ok) {
      console.error('❌ Initiate failed');
      return;
    }
    
    // Step 2: Send verification code
    console.log('2️⃣ Sending verification code...');
    const sendCodeResponse = await fetch(`${baseUrl}/api/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const sendCodeResult = await sendCodeResponse.json();
    console.log('   Status:', sendCodeResponse.status);
    console.log('   Response:', sendCodeResult);
    console.log('');
    
    if (sendCodeResult.success) {
      console.log('✅ API returned success');
      if (sendCodeResult.sent) {
        console.log('✅ Email was reportedly sent');
        console.log('📧 Check your email inbox and spam folder');
        console.log('🔍 Also check the server console logs for the verification code');
      } else {
        console.log('⚠️ API succeeded but email was not sent');
        if (sendCodeResult.error) {
          console.log('❌ Error:', sendCodeResult.error);
        }
      }
    } else {
      console.log('❌ API returned failure');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('💡 Make sure:');
    console.log('   - Next.js server is running (npm run dev)');
    console.log('   - Database is connected');
    console.log('   - Test user exists in database');
  }
}

testForgotPassword().catch(console.error);