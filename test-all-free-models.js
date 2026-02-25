/**
 * Test All Free OpenRouter Models
 * This script tests every free model to find which ones actually work
 */

const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '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'

// List of all known free models on OpenRouter
const FREE_MODELS = [
  // Google Models
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-flash-1.5:free',
  'google/gemini-pro-1.5:free',
  
  // Meta Llama Models
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.2-1b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3.1-70b-instruct:free',
  'meta-llama/llama-3-8b-instruct:free',
  
  // Qwen Models (Alibaba)
  'qwen/qwen-2.5-7b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  
  // Microsoft Models
  'microsoft/phi-3-mini-128k-instruct:free',
  'microsoft/phi-3-medium-128k-instruct:free',
  
  // Mistral Models
  'mistralai/mistral-7b-instruct:free',
  'mistralai/mixtral-8x7b-instruct:free',
  
  // Other Models
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'openchat/openchat-7b:free',
  'huggingfaceh4/zephyr-7b-beta:free',
  'gryphe/mythomist-7b:free',
  'undi95/toppy-m-7b:free',
]

const testMessage = [
  {
    role: 'user',
    content: 'Say "Hello" in one word.'
  }
]

async function testModel(model) {
  try {
    console.log(`\n🧪 Testing: ${model}`)
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://schooloffice.vercel.app',
        'X-Title': 'Model Tester',
      },
      body: JSON.stringify({
        model: model,
        messages: testMessage,
        max_tokens: 10,
      }),
    })

    const status = response.status
    
    if (status === 200) {
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || 'No response'
      console.log(`   ✅ SUCCESS! Response: "${reply}"`)
      return { model, status: 'working', response: reply }
    } else if (status === 429) {
      console.log(`   ⚠️  RATE LIMITED (model exists but too busy)`)
      return { model, status: 'rate-limited', error: 'Too many requests' }
    } else if (status === 404) {
      console.log(`   ❌ NOT FOUND (model doesn't exist)`)
      return { model, status: 'not-found', error: 'Model not found' }
    } else {
      const errorText = await response.text()
      console.log(`   ❌ ERROR ${status}: ${errorText.substring(0, 100)}`)
      return { model, status: 'error', error: errorText }
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`)
    return { model, status: 'failed', error: error.message }
  }
}

async function testAllModels() {
  console.log('🚀 Testing All Free OpenRouter Models')
  console.log('=' .repeat(60))
  console.log(`Total models to test: ${FREE_MODELS.length}`)
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`)
  console.log('=' .repeat(60))

  const results = []
  
  for (const model of FREE_MODELS) {
    const result = await testModel(model)
    results.push(result)
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n\n')
  console.log('=' .repeat(60))
  console.log('📊 SUMMARY')
  console.log('=' .repeat(60))

  const working = results.filter(r => r.status === 'working')
  const rateLimited = results.filter(r => r.status === 'rate-limited')
  const notFound = results.filter(r => r.status === 'not-found')
  const failed = results.filter(r => r.status === 'error' || r.status === 'failed')

  console.log(`\n✅ WORKING MODELS (${working.length}):`)
  if (working.length > 0) {
    working.forEach(r => {
      console.log(`   • ${r.model}`)
      console.log(`     Response: "${r.response}"`)
    })
  } else {
    console.log('   None found 😞')
  }

  console.log(`\n⚠️  RATE LIMITED (${rateLimited.length}):`)
  if (rateLimited.length > 0) {
    rateLimited.forEach(r => console.log(`   • ${r.model}`))
  } else {
    console.log('   None')
  }

  console.log(`\n❌ NOT FOUND (${notFound.length}):`)
  if (notFound.length > 0) {
    notFound.forEach(r => console.log(`   • ${r.model}`))
  } else {
    console.log('   None')
  }

  console.log(`\n💥 FAILED (${failed.length}):`)
  if (failed.length > 0) {
    failed.forEach(r => console.log(`   • ${r.model}`))
  } else {
    console.log('   None')
  }

  // Recommendation
  console.log('\n\n')
  console.log('=' .repeat(60))
  console.log('💡 RECOMMENDATION')
  console.log('=' .repeat(60))

  if (working.length > 0) {
    console.log(`\n✅ Use this model in your .env file:\n`)
    console.log(`NEXT_PUBLIC_OPENROUTER_MODEL="${working[0].model}"`)
    console.log(`\nAlternatives (in order of preference):`)
    working.slice(1, 5).forEach((r, i) => {
      console.log(`${i + 2}. ${r.model}`)
    })
  } else if (rateLimited.length > 0) {
    console.log(`\n⚠️  All working models are rate-limited right now.`)
    console.log(`Try again in a few minutes, or use one of these:\n`)
    rateLimited.slice(0, 3).forEach((r, i) => {
      console.log(`${i + 1}. ${r.model}`)
    })
  } else {
    console.log(`\n❌ No free models are currently available.`)
    console.log(`\nOptions:`)
    console.log(`1. Wait and try again later`)
    console.log(`2. Add $5 credits to OpenRouter (will last months)`)
    console.log(`3. Use the fallback responses (already working!)`)
  }

  console.log('\n')
}

// Run the test
testAllModels().catch(console.error)
