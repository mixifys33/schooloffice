/**
 * Test Classes API - Simpler endpoint to diagnose issues
 */

const BASE_URL = 'http://localhost:3000'

async function testClassesAPI() {
  console.log('🧪 Testing Classes API (simpler than overview)...\n')

  try {
    console.log('Testing: GET /api/class-teacher/assessments/classes')
    console.log('This should work if you have staff profile and assignments\n')

    const response = await fetch(`${BASE_URL}/api/class-teacher/assessments/classes`, {
      method: 'GET',
      credentials: 'include', // Include cookies
    })

    console.log('Status:', response.status, response.statusText)

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ API Error:')
      console.error('Error:', data.error)
      console.error('Details:', data.details)
      return
    }

    console.log('✅ API Success!')
    console.log('\n📚 Your Assigned Classes:')
    console.log(JSON.stringify(data, null, 2))

    if (data.classes && data.classes.length > 0) {
      console.log('\n✨ You can now access CA entry page with:')
      data.classes.forEach((cls, index) => {
        console.log(`\n${index + 1}. ${cls.className} - ${cls.subjectName}`)
        console.log(`   URL: /class-teacher/assessments/ca?classId=${cls.classId}&subjectId=${cls.subjectId}`)
      })
    } else {
      console.log('\n⚠️  No classes assigned. Contact admin to assign you to classes.')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('\n💡 Make sure:')
    console.error('1. Dev server is running (npm run dev)')
    console.error('2. You are logged in')
    console.error('3. You have a staff profile')
  }
}

// Run the test
testClassesAPI()
