/**
 * Simple OpenRouter API Test
 */

const API_KEY = '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'

async function testAPI() {
  console.log('Testing OpenRouter API Key...')
  console.log('API Key:', API_KEY.substring(0, 15) + '...')
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      })
    })
    
    console.log('Status:', response.status)
    const text = await response.text()
    console.log('Response:', text.substring(0, 200))
    
    if (response.ok) {
      console.log('✅ API Key is VALID')
    } else {
      console.log('❌ API Key has issues')
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

testAPI()