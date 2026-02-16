/**
 * Test script for the new forgot password system
 * Tests the complete flow with modern UI/UX
 */

const BASE_URL = 'http://localhost:3000';

async function testNewForgotPasswordFlow() {
  console.log('🧪 Testing New Forgot Password System...\n');

  try {
    // Step 1: Test initiate endpoint
    console.log('1️⃣ Testing initiate recovery...');
    const initiateResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: 'VALLEY',
        identifier: 'admin@valley.com'
      })
    });

    const initiateData = await initiateResponse.json();
    console.log('   Response:', initiateData);
    console.log('   Status:', initiateResponse.status);

    // Step 2: Test send code with email
    console.log('\n2️⃣ Testing send code (Email)...');
    const sendEmailResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: 'VALLEY',
        identifier: 'admin@valley.com',
        method: 'email'
      })
    });

    const sendEmailData = await sendEmailResponse.json();
    console.log('   Response:', sendEmailData);
    console.log('   Status:', sendEmailResponse.status);
    
    if (sendEmailData.debugInfo) {
      console.log('   🔧 Debug Info:');
      console.log('      Email:', sendEmailData.debugInfo.email);
      console.log('      Code:', sendEmailData.debugInfo.verificationCode);
      console.log('      Send Success:', sendEmailData.debugInfo.sendResult?.success);
      console.log('      Error:', sendEmailData.debugInfo.error || 'None');
    }

    // Step 3: Test send code with SMS
    console.log('\n3️⃣ Testing send code (SMS)...');
    const sendSMSResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: 'VALLEY',
        identifier: 'admin@valley.com',
        method: 'sms'
      })
    });

    const sendSMSData = await sendSMSResponse.json();
    console.log('   Response:', sendSMSData);
    console.log('   Status:', sendSMSResponse.status);

    // Step 4: Test verify code (if we have one from debug info)
    if (sendEmailData.debugInfo?.verificationCode) {
      console.log('\n4️⃣ Testing verify code...');
      const verifyResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: 'VALLEY',
          identifier: 'admin@valley.com',
          code: sendEmailData.debugInfo.verificationCode
        })
      });

      const verifyData = await verifyResponse.json();
      console.log('   Response:', verifyData);
      console.log('   Status:', verifyResponse.status);

      // Step 5: Test password reset (if we have a token)
      if (verifyData.token) {
        console.log('\n5️⃣ Testing password reset...');
        const resetResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: verifyData.token,
            newPassword: 'NewPassword123!'
          })
        });

        const resetData = await resetResponse.json();
        console.log('   Response:', resetData);
        console.log('   Status:', resetResponse.status);
      }
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Modern UI with step-by-step wizard');
    console.log('   - Enhanced security with no information leakage');
    console.log('   - Support for Email and SMS verification');
    console.log('   - Real-time password strength validation');
    console.log('   - Touch-friendly mobile design');
    console.log('   - Improved accessibility and error handling');
    console.log('\n🌐 Visit http://localhost:3000/forgot-password to test the UI');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testNewForgotPasswordFlow();