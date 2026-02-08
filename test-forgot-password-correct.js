// Test forgot password with correct email
async function testForgotPassword() {
  try {
    console.log('🧪 Testing forgot password with correct email: mixifys33@gmail.com');
    
    const response = await fetch('http://localhost:3000/api/auth/forgot-password/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: 'VALLEY',
        identifier: 'mixifys33@gmail.com',
        method: 'email'
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.sent) {
      console.log('✅ SUCCESS: Email should be sent to mixifys33@gmail.com');
      console.log('📧 Masked contact:', data.maskedContact);
      
      if (data.debugInfo) {
        console.log('🔧 Debug info:');
        console.log('  - Email:', data.debugInfo.email);
        console.log('  - Code:', data.debugInfo.verificationCode);
        console.log('  - Send result:', data.debugInfo.sendResult);
        if (data.debugInfo.error) {
          console.log('  - Error:', data.debugInfo.error);
        }
      }
    } else {
      console.log('⚠️ Response indicates potential issue:');
      console.log('  - Success:', data.success);
      console.log('  - Sent:', data.sent);
      console.log('  - Error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testForgotPassword();