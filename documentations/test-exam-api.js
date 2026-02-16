/**
 * Test the exam API endpoint
 */

async function testExamAPI() {
  try {
    // Test with sample IDs (you'll need to use real IDs from your database)
    const classId = '695e2248c20bc8e1ef527a05' // S2 class
    const subjectId = '696e52225fea8ffeb3bbc97e' // Biology
    
    const url = `http://localhost:3000/api/class-teacher/assessments/exam?classId=${classId}&subjectId=${subjectId}`
    
    console.log('Testing URL:', url)
    console.log('Note: This will fail with 401 if not authenticated')
    console.log('You need to test this in the browser while logged in')
    
    const response = await fetch(url)
    console.log('Status:', response.status)
    console.log('Content-Type:', response.headers.get('content-type'))
    
    const text = await response.text()
    console.log('Response (first 500 chars):', text.substring(0, 500))
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      console.log('✅ Response is JSON')
      const data = JSON.parse(text)
      console.log('Data:', JSON.stringify(data, null, 2))
    } else {
      console.log('❌ Response is NOT JSON (probably HTML)')
      console.log('This means the API endpoint is not being reached')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testExamAPI()
