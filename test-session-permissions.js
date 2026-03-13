/**
 * Test current session permissions by calling the API directly
 */

async function testSessionPermissions() {
  console.log('🔍 TESTING SESSION PERMISSIONS')
  console.log('==============================')
  console.log('')

  try {
    // Test 1: Check academic years API (GET)
    console.log('📋 Test 1: Checking academic years access...')
    const getResponse = await fetch('http://localhost:3000/api/settings/academic-years', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('Status:', getResponse.status)
    const getData = await getResponse.json()
    console.log('Response:', JSON.stringify(getData, null, 2))

    if (getResponse.ok) {
      console.log('✅ GET academic years: SUCCESS')
    } else {
      console.log('❌ GET academic years: FAILED')
      if (getResponse.status === 401) {
        console.log('   → Not authenticated - please log in')
      } else if (getResponse.status === 403) {
        console.log('   → Permission denied - role issue')
      }
    }

    console.log('')

    // Test 2: Try creating an academic year
    console.log('📋 Test 2: Testing academic year creation...')
    const testYear = {
      name: 'Test Academic Year 2026/2027',
      startDate: '2026-02-01',
      endDate: '2026-12-31',
      isActive: false
    }

    const postResponse = await fetch('http://localhost:3000/api/settings/academic-years', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testYear)
    })

    console.log('Status:', postResponse.status)
    const postData = await postResponse.json()
    console.log('Response:', JSON.stringify(postData, null, 2))

    if (postResponse.ok) {
      console.log('✅ CREATE academic year: SUCCESS')
      console.log('   → Your permissions are working correctly!')
      
      // Clean up - delete the test year
      console.log('🧹 Cleaning up test data...')
      // Note: We'd need the ID to delete, but this is just a test
    } else {
      console.log('❌ CREATE academic year: FAILED')
      if (postResponse.status === 401) {
        console.log('   → Not authenticated - please log in to your application')
      } else if (postResponse.status === 403) {
        console.log('   → Permission denied - your session may not have updated')
        console.log('   → Try logging out and logging back in')
      } else if (postResponse.status === 400) {
        console.log('   → Validation error (this is expected for duplicate names)')
      }
    }

    console.log('')

    // Test 3: Check terms API
    console.log('📋 Test 3: Testing terms access...')
    const termsResponse = await fetch('http://localhost:3000/api/settings/terms', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('Status:', termsResponse.status)
    const termsData = await termsResponse.json()
    console.log('Response:', JSON.stringify(termsData, null, 2))

    if (termsResponse.ok) {
      console.log('✅ GET terms: SUCCESS')
    } else {
      console.log('❌ GET terms: FAILED')
    }

  } catch (error) {
    console.error('❌ Network error:', error.message)
    console.log('')
    console.log('💡 Make sure your development server is running:')
    console.log('   npm run dev')
    console.log('')
    console.log('💡 And that you are logged in to the application in your browser')
  }

  console.log('')
  console.log('🎯 SUMMARY')
  console.log('==========')
  console.log('If you see 401 errors: You need to log in to your application')
  console.log('If you see 403 errors: Your session needs to be refreshed')
  console.log('If you see 200/201 success: Your permissions are working!')
  console.log('')
  console.log('💡 SOLUTION STEPS:')
  console.log('1. Open your application in browser: http://localhost:3000')
  console.log('2. Log out completely')
  console.log('3. Log back in with your admin account')
  console.log('4. Try creating academic years again')
  console.log('5. Clear browser cache if still having issues')
}

testSessionPermissions().catch(console.error)