/**
 * Test NextAuth Setup
 * This script tests the NextAuth configuration and endpoints
 */

const BASE_URL = 'http://localhost:3000'

async function testNextAuthSetup() {
  try {
    console.log('🧪 Testing NextAuth setup...')
    console.log('='.repeat(60))
    
    // Test 1: Check if NextAuth endpoints are accessible
    console.log('🔄 Test 1: Checking NextAuth endpoints...')
    
    const endpoints = [
      '/api/auth/providers',
      '/api/auth/session',
      '/api/auth/csrf'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`)
        console.log(`  ${endpoint}: ${response.status} ${response.statusText}`)
        
        if (endpoint === '/api/auth/csrf') {
          const csrfData = await response.json()
          console.log(`    CSRF Token: ${csrfData.csrfToken ? 'Present' : 'Missing'}`)
        }
        
        if (endpoint === '/api/auth/providers') {
          const providersData = await response.json()
          console.log(`    Providers: ${Object.keys(providersData).join(', ')}`)
        }
        
      } catch (error) {
        console.log(`  ${endpoint}: ERROR - ${error.message}`)
      }
    }
    
    console.log('')
    
    // Test 2: Check NextAuth configuration
    console.log('🔄 Test 2: Testing credentials provider...')
    
    try {
      const providersResponse = await fetch(`${BASE_URL}/api/auth/providers`)
      const providers = await providersResponse.json()
      
      if (providers.credentials) {
        console.log('  ✅ Credentials provider found')
        console.log('  - ID:', providers.credentials.id)
        console.log('  - Name:', providers.credentials.name)
        console.log('  - Type:', providers.credentials.type)
      } else {
        console.log('  ❌ Credentials provider not found')
        console.log('  Available providers:', Object.keys(providers))
      }
    } catch (error) {
      console.log('  ❌ Error checking providers:', error.message)
    }
    
    console.log('')
    
    // Test 3: Test CSRF token generation
    console.log('🔄 Test 3: Testing CSRF token...')
    
    try {
      const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
      const csrfData = await csrfResponse.json()
      
      if (csrfData.csrfToken) {
        console.log('  ✅ CSRF token generated successfully')
        console.log('  - Token length:', csrfData.csrfToken.length)
        console.log('  - Token preview:', csrfData.csrfToken.substring(0, 20) + '...')
      } else {
        console.log('  ❌ CSRF token not generated')
        console.log('  Response:', csrfData)
      }
    } catch (error) {
      console.log('  ❌ Error getting CSRF token:', error.message)
    }
    
    console.log('')
    
    // Test 4: Test signin endpoint directly
    console.log('🔄 Test 4: Testing signin endpoint...')
    
    try {
      // First get CSRF token
      const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
      const csrfData = await csrfResponse.json()
      
      if (!csrfData.csrfToken) {
        console.log('  ❌ Cannot test signin - no CSRF token')
        return
      }
      
      // Test signin with invalid credentials (should fail gracefully)
      const signinResponse = await fetch(`${BASE_URL}/api/auth/signin/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          csrfToken: csrfData.csrfToken,
          schoolCode: 'TEST',
          identifier: 'test@test.com',
          password: 'wrongpassword',
          callbackUrl: '/dashboard'
        }).toString()
      })
      
      console.log('  Signin endpoint status:', signinResponse.status)
      console.log('  Signin endpoint headers:', Object.fromEntries(signinResponse.headers.entries()))
      
      const signinText = await signinResponse.text()
      console.log('  Response preview:', signinText.substring(0, 200) + '...')
      
    } catch (error) {
      console.log('  ❌ Error testing signin:', error.message)
    }
    
    console.log('')
    console.log('🎉 NextAuth setup test completed!')
    
  } catch (error) {
    console.error('❌ Test error:', error.message)
  }
}

testNextAuthSetup()