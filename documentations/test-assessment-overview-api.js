/**
 * Test Assessment Overview API
 * Tests the /api/class-teacher/assessments/overview endpoint
 */

const BASE_URL = 'http://localhost:3000'

async function testAssessmentOverviewAPI() {
  console.log('🧪 Testing Assessment Overview API...\n')

  try {
    // First, login to get session cookie
    console.log('1️⃣ Logging in...')
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'kimfa9717@gmail.com',
        password: 'David@2025',
        schoolCode: 'VALLEY',
        redirect: false,
      }),
    })

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText)
      const errorText = await loginResponse.text()
      console.error('Error details:', errorText)
      return
    }

    // Get session cookie
    const cookies = loginResponse.headers.get('set-cookie')
    console.log('✅ Login successful')
    console.log('Cookies:', cookies ? 'Present' : 'Missing')

    // Test assessment overview API
    console.log('\n2️⃣ Testing Assessment Overview API...')
    const overviewResponse = await fetch(`${BASE_URL}/api/class-teacher/assessments/overview`, {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
      },
    })

    console.log('Status:', overviewResponse.status, overviewResponse.statusText)

    if (!overviewResponse.ok) {
      const errorData = await overviewResponse.json().catch(() => ({}))
      console.error('❌ API Error:', errorData)
      return
    }

    const data = await overviewResponse.json()
    console.log('✅ API Success!')
    console.log('\n📊 Assessment Overview Data:')
    console.log('Classes:', data.classes?.length || 0)
    console.log('Pending Assessments:', data.pendingAssessments?.length || 0)
    console.log('Upcoming Deadlines:', data.upcomingDeadlines?.length || 0)
    console.log('Class Performance:', data.classPerformance)

    if (data.classes && data.classes.length > 0) {
      console.log('\n📚 First Class:')
      console.log(JSON.stringify(data.classes[0], null, 2))
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test
testAssessmentOverviewAPI()
