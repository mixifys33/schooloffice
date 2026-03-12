/**
 * OpenRouter API Key Test Script
 * Tests if the provided API key is valid and working
 */

const API_KEY = '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'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

async function testOpenRouterAPI() {
  console.log('🔍 Testing OpenRouter API Key...')
  console.log('=====================================')
  console.log(`API Key: ${API_KEY.substring(0, 20)}...${API_KEY.substring(API_KEY.length - 10)}`)
  console.log(`API URL: ${API_URL}`)
  console.log('')

  try {
    console.log('📡 Making test request to OpenRouter...')
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'SchoolOffice Test'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message. Please respond with "API key is working!"'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    })

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`)
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log(`📊 Response Body: ${responseText}`)

    if (response.ok) {
      console.log('')
      console.log('✅ SUCCESS: API Key is valid and working!')
      console.log('🎉 Your OpenRouter API key is functioning correctly.')
      
      try {
        const data = JSON.parse(responseText)
        if (data.choices && data.choices[0] && data.choices[0].message) {
          console.log(`🤖 AI Response: "${data.choices[0].message.content}"`)
        }
      } catch (parseError) {
        console.log('⚠️  Could not parse response JSON, but API call was successful')
      }
      
      return true
    } else {
      console.log('')
      console.log('❌ FAILED: API Key test failed')
      
      try {
        const errorData = JSON.parse(responseText)
        console.log('📋 Error Details:')
        console.log(`   Code: ${errorData.error?.code || 'Unknown'}`)
        console.log(`   Message: ${errorData.error?.message || 'Unknown error'}`)
        console.log(`   Type: ${errorData.error?.type || 'Unknown'}`)
        
        // Provide specific guidance based on error
        if (response.status === 401) {
          console.log('')
          console.log('🔧 SOLUTION for 401 Unauthorized:')
          console.log('   1. Check if your OpenRouter account exists and is verified')
          console.log('   2. Verify your API key is correct')
          console.log('   3. Make sure you have credits in your OpenRouter account')
          console.log('   4. Try generating a new API key from https://openrouter.ai/keys')
        } else if (response.status === 429) {
          console.log('')
          console.log('🔧 SOLUTION for 429 Rate Limited:')
          console.log('   1. You are making too many requests')
          console.log('   2. Wait a few minutes and try again')
          console.log('   3. Consider upgrading your OpenRouter plan')
        } else if (response.status === 402) {
          console.log('')
          console.log('🔧 SOLUTION for 402 Payment Required:')
          console.log('   1. Add credits to your OpenRouter account')
          console.log('   2. Check your billing settings')
          console.log('   3. Verify your payment method')
        }
        
      } catch (parseError) {
        console.log('📋 Raw Error Response:', responseText)
      }
      
      return false
    }

  } catch (error) {
    console.log('')
    console.log('❌ NETWORK ERROR: Failed to connect to OpenRouter')
    console.log(`📋 Error: ${error.message}`)
    console.log('')
    console.log('🔧 POSSIBLE SOLUTIONS:')
    console.log('   1. Check your internet connection')
    console.log('   2. Verify the API URL is correct')
    console.log('   3. Check if OpenRouter.ai is accessible from your network')
    console.log('   4. Try again in a few minutes')
    
    return false
  }
}

async function testAlternativeModels() {
  console.log('')
  console.log('🔄 Testing alternative models...')
  console.log('=====================================')
  
  const models = [
    'anthropic/claude-3-haiku',
    'openai/gpt-3.5-turbo',
    'meta-llama/llama-3.1-8b-instruct:free',
    'microsoft/wizardlm-2-8x22b'
  ]
  
  for (const model of models) {
    console.log(`\n🧪 Testing model: ${model}`)
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'SchoolOffice Test'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: 'Test'
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        })
      })
      
      if (response.ok) {
        console.log(`   ✅ ${model} - Working`)
      } else {
        const errorText = await response.text()
        console.log(`   ❌ ${model} - Failed (${response.status})`)
        try {
          const errorData = JSON.parse(errorText)
          console.log(`      Error: ${errorData.error?.message || 'Unknown'}`)
        } catch {
          console.log(`      Error: ${errorText.substring(0, 100)}`)
        }
      }
    } catch (error) {
      console.log(`   ❌ ${model} - Network Error: ${error.message}`)
    }
  }
}

async function checkAccountInfo() {
  console.log('')
  console.log('👤 Checking account information...')
  console.log('=====================================')
  
  try {
    // Try to get account info (if endpoint exists)
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Account Info Retrieved:')
      console.log(`   Label: ${data.data?.label || 'N/A'}`)
      console.log(`   Usage: ${data.data?.usage || 'N/A'}`)
      console.log(`   Limit: ${data.data?.limit || 'N/A'}`)
      console.log(`   Is Free Tier: ${data.data?.is_free_tier || 'N/A'}`)
    } else {
      console.log('⚠️  Could not retrieve account info (this is normal for some API keys)')
    }
  } catch (error) {
    console.log('⚠️  Could not check account info:', error.message)
  }
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting OpenRouter API Key Tests')
  console.log('====================================')
  console.log('')
  
  const isValid = await testOpenRouterAPI()
  
  if (isValid) {
    await testAlternativeModels()
    await checkAccountInfo()
    
    console.log('')
    console.log('🎯 CONCLUSION:')
    console.log('✅ Your API key is working correctly!')
    console.log('✅ You can keep using this API key in your .env file')
    console.log('✅ The issue might be elsewhere in your application')
  } else {
    console.log('')
    console.log('🎯 CONCLUSION:')
    console.log('❌ Your API key is not working')
    console.log('🔧 You need to fix the API key issue before the AI assistant will work')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('1. Visit https://openrouter.ai/keys')
    console.log('2. Create a new API key or verify your existing one')
    console.log('3. Make sure your account has credits')
    console.log('4. Update your .env file with the correct API key')
  }
  
  console.log('')
  console.log('🏁 Test completed!')
}

// Execute the tests
runAllTests().catch(console.error)