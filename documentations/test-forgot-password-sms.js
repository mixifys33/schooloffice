/**
 * Test forgot password SMS functionality
 */
require('dotenv').config();

async function testForgotPasswordSMS() {
  console.log('🔍 Testing Forgot Password SMS Flow\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test data - using phone method
  const testData = {
    schoolCode: 'VALLEY',
    identifier: '+256761819885', // Use the phone number from your logs
    method: 'phone'
  };
  
  console.log('📋 Test data:', testData);
  console.log('📋 Environment:', process.env.AFRICASTALKING_ENVIRONMENT);
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
    
    // Step 2: Send SMS verification code
    console.log('2️⃣ Sending SMS verification code...');
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
        console.log('✅ SMS was reportedly sent');
        
        if (process.env.AFRICASTALKING_ENVIRONMENT === 'sandbox') {
          console.log('⚠️ SANDBOX MODE: No actual SMS delivered');
          console.log('🔍 Check the server console logs for the verification code');
          console.log('💡 To send real SMS, switch to production mode in .env');
        } else {
          console.log('📱 Check your phone for the SMS');
        }
      } else {
        console.log('⚠️ API succeeded but SMS was not sent');
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
    console.log('   - Test user exists in database with phone number');
  }
}

testForgotPasswordSMS().catch(console.error);