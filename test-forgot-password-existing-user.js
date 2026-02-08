/**
 * Test Forgot Password with Existing User
 * This script tests the forgot password functionality with a real user from the database
 */

const BASE_URL = 'http://localhost:3000'

async function testForgotPasswordFlow() {
  console.log('🧪 Testing Forgot Password Flow with Existing User')
  console.log('=' .repeat(60))
  
  // Use an existing user from the VALLEY school
  const testData = {
    schoolCode: 'VALLEY',
    identifier: 'admin@valley.com', // This user exists in the database
    method: 'email'
  }
  
  console.log('📋 Test Data:', testData)
  console.log('')
  
  try {
    // Step 1: Initiate password reset
    console.log('🔄 Step 1: Initiating password reset...')
    const initiateResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: testData.schoolCode,
        identifier: testData.identifier
      })
    })
    
    const initiateData = await initiateResponse.json()
    console.log('✅ Initiate Response:', {
      status: initiateResponse.status,
      data: initiateData
    })
    console.log('')
    
    // Step 2: Send verification code
    console.log('🔄 Step 2: Sending verification code...')
    const sendCodeResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: testData.schoolCode,
        identifier: testData.identifier,
        method: testData.method
      })
    })
    
    const sendCodeData = await sendCodeResponse.json()
    console.log('✅ Send Code Response:', {
      status: sendCodeResponse.status,
      data: sendCodeData
    })
    
    if (sendCodeData.debugInfo) {
      console.log('')
      console.log('🔍 Debug Information:')
      console.log('- Email:', sendCodeData.debugInfo.email)
      console.log('- Verification Code:', sendCodeData.debugInfo.verificationCode)
      console.log('- Send Success:', sendCodeData.debugInfo.sendResult?.success)
      console.log('- Send Error:', sendCodeData.debugInfo.sendResult?.error || 'None')
    }
    
    console.log('')
    console.log('📊 Test Summary:')
    console.log('- User Found:', sendCodeData.sent ? 'Yes' : 'Unknown (security)')
    console.log('- Code Sent:', sendCodeData.sent ? 'Yes' : 'No')
    console.log('- Masked Contact:', sendCodeData.maskedContact || 'N/A')
    
  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

// Test with SMS as well
async function testSMSFlow() {
  console.log('')
  console.log('🧪 Testing SMS Flow with Existing User')
  console.log('=' .repeat(60))
  
  const testData = {
    schoolCode: 'VALLEY',
    identifier: 'admin@valley.com', // This user exists and has phone: +256761819885
    method: 'phone'
  }
  
  console.log('📋 Test Data:', testData)
  console.log('')
  
  try {
    const sendCodeResponse = await fetch(`${BASE_URL}/api/auth/forgot-password/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolCode: testData.schoolCode,
        identifier: testData.identifier,
        method: testData.method
      })
    })
    
    const sendCodeData = await sendCodeResponse.json()
    console.log('✅ SMS Send Code Response:', {
      status: sendCodeResponse.status,
      data: sendCodeData
    })
    
    if (sendCodeData.debugInfo) {
      console.log('')
      console.log('🔍 SMS Debug Information:')
      console.log('- Phone Number:', sendCodeData.debugInfo.email) // This might contain phone in debug
      console.log('- Verification Code:', sendCodeData.debugInfo.verificationCode)
      console.log('- Send Success:', sendCodeData.debugInfo.sendResult?.success)
      console.log('- Send Error:', sendCodeData.debugInfo.sendResult?.error || 'None')
    }
    
  } catch (error) {
    console.error('❌ SMS Test Error:', error.message)
  }
}

// Run tests
testForgotPasswordFlow().then(() => {
  return testSMSFlow()
}).then(() => {
  console.log('')
  console.log('🎉 All tests completed!')
})