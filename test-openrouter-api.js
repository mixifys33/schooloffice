/**
 * Test OpenRouter API Key
 * Run this to verify your API key works
 */

const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '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'
const MODEL = 'meta-llama/llama-3.2-3b-instruct:free'

async function testAPI() {
  console.log('🧪 Testing OpenRouter API...\n')
  console.log('API Key:', API_KEY.substring(0, 20) + '...')
  console.log('Model:', MODEL)
  console.log('\n---\n')

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://schooloffice.academy',
        'X-Title': 'Ofiniti AI Test',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, I am working!" in one sentence.'
          }
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    })

    console.log('Response Status:', response.status, response.statusText)
    console.log('\n---\n')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:')
      console.error(errorText)
      
      if (response.status === 401) {
        console.log('\n💡 Solution: Your API key is invalid or expired.')
        console.log('   Get a new key from: https://openrouter.ai/keys')
      } else if (response.status === 429) {
        console.log('\n💡 Solution: Rate limit exceeded. Wait a moment and try again.')
      } else if (response.status === 402) {
        console.log('\n💡 Solution: Insufficient credits. Add credits or use a free model.')
      }
      
      return
    }

    const data = await response.json()
    console.log('✅ API Response:')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.choices && data.choices[0]) {
      console.log('\n✅ AI Message:')
      console.log(data.choices[0].message.content)
      console.log('\n🎉 Success! Your API key is working!')
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Solution: Check your internet connection and try again.')
  }
}

testAPI()
