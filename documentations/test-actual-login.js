/**
 * Test Actual Login API
 * This script tests the actual NextAuth login endpoint to see what's failing
 */

const BASE_URL = 'http://localhost:3000'

async function testActualLogin() {
  try {
    console.log('🧪 Testing actual login API...')
    console.log('='.repeat(60))
    
    // Test with the credentials we know should work
    const credentials = {
      schoolCode: 'VALLEY',
      identifier: 'mixifys33@gmail.com',
      password: 'TestPassword123!',
      csrfToken: '', // We'll get this first
      callbackUrl: '/dashboard',
      json: 'true'
    }
    
    console.log('📋 Login credentials:')
    console.log('- School Code:', credentials.schoolCode)
    console.log('- Identifier:', credentials.identifier)
    console.log('- Password: [HIDDEN]')
    console.log('')
    
    // Step 1: Get CSRF token
    console.log('🔄 Step 1: Getting CSRF token...')
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
    const csrfData = await csrfResponse.json()
    
    if (!csrfData.csrfToken) {
      console.log('❌ Failed to get CSRF token')
      return
    }
    
    console.log('✅ CSRF token obtained')
    credentials.csrfToken = csrfData.csrfToken
    console.log('')
    
    // Step 2: Attempt login
    console.log('🔄 Step 2: Attempting login...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(credentials).toString()
    })
    
    console.log('📊 Login response:')
    console.log('- Status:', loginResponse.status)
    console.log('- Status Text:', loginResponse.statusText)
    console.log('- Headers:', Object.fromEntries(loginResponse.headers.entries()))
    console.log('')
    
    const responseText = await loginResponse.text()
    console.log('📄 Response body:')
    console.log(responseText)
    console.log('')
    
    // Try to parse as JSON if possible
    try {
      const responseJson = JSON.parse(responseText)
      console.log('📋 Parsed JSON response:')
      console.log(JSON.stringify(responseJson, null, 2))
    } catch (e) {
      console.log('ℹ️  Response is not JSON')
    }
    
    // Step 3: Check session after login attempt
    console.log('')
    console.log('🔄 Step 3: Checking session...')
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      }
    })
    
    const sessionData = await sessionResponse.json()
    console.log('📊 Session data:')
    console.log(JSON.stringify(sessionData, null, 2))
    
    if (sessionData.user) {
      console.log('')
      console.log('✅ Login successful!')
      console.log('- User ID:', sessionData.user.id)
      console.log('- Email:', sessionData.user.email)
      console.log('- Role:', sessionData.user.role)
      console.log('- School:', sessionData.user.schoolName)
    } else {
      console.log('')
      console.log('❌ Login failed - no session created')
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Also test with different credentials
async function testWithDifferentCredentials() {
  console.log('')
  console.log('🧪 Testing with admin credentials...')
  console.log('='.repeat(60))
  
  try {
    const credentials = {
      schoolCode: 'VALLEY',
      identifier: 'admin@valley.com',
      password: 'admin123', // Common admin password
      csrfToken: '',
      callbackUrl: '/dashboard',
      json: 'true'
    }
    
    // Get CSRF token
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
    const csrfData = await csrfResponse.json()
    credentials.csrfToken = csrfData.csrfToken
    
    // Attempt login
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(credentials).toString()
    })
    
    console.log('Admin login status:', loginResponse.status)
    const responseText = await loginResponse.text()
    console.log('Admin response:', responseText.substring(0, 200) + '...')
    
  } catch (error) {
    console.error('Admin test error:', error.message)
  }
}

// Run tests
testActualLogin().then(() => {
  return testWithDifferentCredentials()
}).then(() => {
  console.log('')
  console.log('🎉 Login testing completed!')
})