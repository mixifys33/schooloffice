/**
 * Debug script for forgot password flow
 * This will help identify where the issue is occurring
 */
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function debugForgotPassword() {
  console.log('🔍 Debugging forgot password flow...\n');

  // Test 1: Check if server is responding
  console.log('1. Testing server connectivity...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schoolCode: 'TESTSCHOOL',
        identifier: 'test@example.com'
      })
    });

    console.log('   Status:', response.status);
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('   ✅ Server is responding correctly');
      
      // Test 2: Try to send code
      console.log('\n2. Testing send code endpoint...');
      const sendResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolCode: 'TESTSCHOOL',
          identifier: 'test@example.com',
          method: 'email'
        })
      });

      console.log('   Status:', sendResponse.status);
      const sendData = await sendResponse.json();
      console.log('   Response:', JSON.stringify(sendData, null, 2));

      if (sendData.success) {
        console.log('   ✅ Send code endpoint is working');
        console.log('   📧 Check server logs for the actual verification code');
      } else {
        console.log('   ❌ Send code failed');
      }
    } else {
      console.log('   ❌ Server error');
    }

  } catch (error) {
    console.error('   ❌ Connection failed:', error.message);
  }

  // Test 3: Test email service directly
  console.log('\n3. Testing email service configuration...');
  try {
    const emailTestResponse = await fetch(`${BASE_URL}/api/communication/email-settings/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testEmail: process.env.SMTP_USER || 'p4147176@gmail.com'
      })
    });

    if (emailTestResponse.ok) {
      const emailData = await emailTestResponse.json();
      console.log('   ✅ Email service test:', emailData);
    } else {
      console.log('   ❌ Email service test failed');
    }
  } catch (error) {
    console.log('   ⚠️  Email service test endpoint not available');
  }

  // Test 4: Check environment variables
  console.log('\n4. Checking email configuration...');
  console.log('   SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Not set');
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Not set');
  console.log('   EMAIL_FROM:', process.env.EMAIL_FROM ? '✅ Set' : '❌ Not set');
  console.log('   EMAIL_ACTIVE_PROVIDER:', process.env.EMAIL_ACTIVE_PROVIDER || 'gmail (default)');

  console.log('\n🔍 Debug complete!');
  console.log('\n💡 Next steps:');
  console.log('1. Check the server console logs for any error messages');
  console.log('2. Look for verification codes printed to console (fallback behavior)');
  console.log('3. Check your email inbox for test messages');
  console.log('4. Verify that a school and user exist in the database');
}

debugForgotPassword().catch(console.error);