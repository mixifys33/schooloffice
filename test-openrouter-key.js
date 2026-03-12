/**
 * OpenRouter API Key Test Script
 * Tests the provided API key against OpenRouter's API
 */

const API_KEY = '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'

async function testOpenRouterKey() {
  console.log('🔍 Testing OpenRouter API Key...')
  console.log('🔑 Key prefix:', API_KEY.substring(0, 20) + '...')
  console.log('')
  
  try {
    // Test with a simple request
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://schooloffice.vercel.app',
        'X-Title': 'SchoolOffice API Test'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [{ 
          role: 'user', 
          content: 'Hello, just testing the API key.' 
        }],
        max_tokens: 10
      })
    })
    
    console.log('📡 Response Status:', response.status, response.statusText)
    
    const responseText = await response.text()
    console.log('📄 Response Body:', responseText)
    console.log('')
    
    if (response.ok) {
      console.log('✅ SUCCESS: API Key is VALID and working!')
      console.log('🎉 Your OpenRouter API key is properly configured.')
      return true
    } else {
      console.log('❌ FAILED: API Key has issues')
      
      try {
        const errorData = JSON.parse(responseText)
        const errorMessage = errorData.error?.message || errorData.message || 'Unknown error'
        console.log('🚨 Error Message:', errorMessage)
        
        if (errorMessage.includes('User not found')) {
          console.log('')
          console.log('💡 SOLUTION:')
          console.log('   The API key does not exist in OpenRouter\'s system.')
          console.log('   You need to get a new valid API key from:')
          console.log('   👉 https://openrouter.ai/keys')
          console.log('')
          console.log('📋 Steps to fix:')
          console.log('   1. Go to https://openrouter.ai/keys')
          console.log('   2. Sign up or log in to your account')
          console.log('   3. Create a new API key')
          console.log('   4. Replace the key in your .env file')
          console.log('   5. Restart your development server')
        } else if (errorMessage.includes('insufficient credits') || errorMessage.includes('balance')) {
          console.log('')
          console.log('💡 SOLUTION:')
          console.log('   Your OpenRouter account needs credits.')
          console.log('   👉 Add credits at: https://openrouter.ai/credits')
        } else {
          console.log('')
          console.log('💡 SOLUTION:')
          console.log('   Check your OpenRouter account at: https://openrouter.ai/keys')
          console.log('   Make sure the API key is active and has proper permissions.')
        }
      } catch (parseError) {
        console.log('🚨 Raw Error:', responseText)
      }
      
      return false
    }
    
  } catch (networkError) {
    console.log('❌ NETWORK ERROR:', networkError.message)
    console.log('')
    console.log('💡 SOLUTION:')
    console.log('   Check your internet connection and try again.')
    return false
  }
}

// Also test the key format
function validateKeyFormat() {
  console.log('🔍 Validating API Key Format...')
  
  if (!API_KEY) {
    console.log('❌ No API key provided')
    return false
  }
  
  if (!API_KEY.startsWith('sk-or-v1-')) {
    console.log('❌ Invalid key format. OpenRouter keys should start with "sk-or-v1-"')
    return false
  }
  
  if (API_KEY.length < 50) {
    console.log('❌ Key seems too short. OpenRouter keys are typically longer.')
    return false
  }
  
  console.log('✅ Key format looks correct')
  return true
}

async function main() {
  console.log('🚀 OpenRouter API Key Validation')
  console.log('================================')
  console.log('')
  
  // First check format
  const formatValid = validateKeyFormat()
  console.log('')
  
  if (!formatValid) {
    console.log('❌ Key format is invalid. Please get a new key from https://openrouter.ai/keys')
    return
  }
  
  // Then test the actual API
  const apiValid = await testOpenRouterKey()
  
  console.log('')
  console.log('📊 SUMMARY:')
  console.log('===========')
  console.log('Format Valid:', formatValid ? '✅' : '❌')
  console.log('API Valid:', apiValid ? '✅' : '❌')
  
  if (formatValid && apiValid) {
    console.log('')
    console.log('🎉 ALL GOOD! Your API key is working perfectly.')
    console.log('   You can now use the AI assistant in your application.')
  } else {
    console.log('')
    console.log('🔧 ACTION NEEDED: Get a new API key from https://openrouter.ai/keys')
  }
}

main().catch(console.error)