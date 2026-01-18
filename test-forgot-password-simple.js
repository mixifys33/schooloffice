/**
 * Simple test for forgot password that works even with database issues
 * This will help us see if the email sending is working
 */
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testForgotPasswordSimple() {
  console.log('🧪 Testing forgot password with enhanced logging...\n');

  try {
    // Test the send-code endpoint directly
    console.log('📧 Testing send-code endpoint...');
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schoolCode: 'TESTSCHOOL',
        identifier: 'p4147176@gmail.com', // Your actual email
        method: 'email'
      })
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ API call successful!');
      console.log('📋 What to check now:');
      console.log('1. Look at the server console logs above for:');
      console.log('   - 🔧 [FORGOT PASSWORD DEBUG] Code for p4147176@gmail.com');
      console.log('   - ✅ [Password Reset] Email sent successfully');
      console.log('   - Any error messages');
      console.log('2. Check your email inbox (p4147176@gmail.com)');
      console.log('3. If you see the debug code in logs, the system is working');
      console.log('4. If email fails, the code will still be logged for testing');
    } else {
      console.log('\n❌ API call failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🔍 Next steps:');
  console.log('1. Check the server terminal for detailed logs');
  console.log('2. Look for the verification code in the logs');
  console.log('3. Use that code to test the verify endpoint');
  console.log('4. If emails are not being sent, check Gmail App Password');
}

testForgotPasswordSimple();