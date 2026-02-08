/**
 * Debug script to check SMS templates API
 */

const testTemplatesAPI = async () => {
  try {
    console.log('Testing SMS Templates API...')
    
    // This would normally require authentication, but let's see what happens
    const response = await fetch('http://localhost:3000/api/sms/templates')
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('Templates data:', JSON.stringify(data, null, 2))
    } else {
      const errorData = await response.text()
      console.log('Error response:', errorData)
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Run the test
testTemplatesAPI()