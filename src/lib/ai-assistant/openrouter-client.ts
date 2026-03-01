/**
 * OpenRouter API Client for Ofiniti AI Assistant
 * Handles communication with OpenRouter API
 */

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCompletionResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class OpenRouterClient {
  private apiKey: string
  private model: string
  private baseURL = 'https://openrouter.ai/api/v1'

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''
    this.model = process.env.NEXT_PUBLIC_OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free'
  }

  async chat(messages: Message[]): Promise<string> {
    console.log('🔵 [OpenRouter] Starting chat request...')
    console.log('🔵 [OpenRouter] API Key exists:', !!this.apiKey)
    console.log('🔵 [OpenRouter] API Key prefix:', this.apiKey?.substring(0, 15) + '...')
    console.log('🔵 [OpenRouter] Model:', this.model)
    console.log('🔵 [OpenRouter] Messages count:', messages.length)
    
    if (!this.apiKey) {
      console.error('❌ [OpenRouter] API key not configured')
      throw new Error('OpenRouter API key not configured. Please add NEXT_PUBLIC_OPENROUTER_API_KEY to your .env file.')
    }

    // Retry logic for rate-limited models
    const maxRetries = 3
    const retryDelay = 2000 // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔵 [OpenRouter] Attempt ${attempt}/${maxRetries}`)
        
        const requestBody = {
          model: this.model,
          messages,
          temperature: 0.7, // Slightly lower for faster, more focused responses
          max_tokens: 600, // Reduced from 1200 to 600 for faster responses
          stream: false,
        }
        
        console.log('🔵 [OpenRouter] Sending request to:', `${this.baseURL}/chat/completions`)
        
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://schooloffice.academy',
            'X-Title': 'Ofiniti AI - SchoolOffice Assistant',
          },
          body: JSON.stringify(requestBody),
        })

        console.log('🔵 [OpenRouter] Response status:', response.status, response.statusText)

        if (response.status === 429) {
          console.warn(`⚠️ [OpenRouter] Rate limited on attempt ${attempt}/${maxRetries}`)
          
          if (attempt < maxRetries) {
            console.log(`🔵 [OpenRouter] Waiting ${retryDelay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            continue // Retry
          } else {
            throw new Error('Rate limit exceeded. Please try again in a moment.')
          }
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ [OpenRouter] Error response body:', errorText)
          
          let errorMessage = `API request failed: ${response.status}`
          
          try {
            const errorData = JSON.parse(errorText)
            console.error('❌ [OpenRouter] Parsed error:', errorData)
            errorMessage = errorData.error?.message || errorData.message || errorMessage
          } catch (parseError) {
            console.error('❌ [OpenRouter] Could not parse error response')
            errorMessage = errorText || errorMessage
          }
          
          console.error('❌ [OpenRouter] Final error message:', errorMessage)
          throw new Error(errorMessage)
        }

        const responseText = await response.text()
        console.log('🔵 [OpenRouter] Raw response:', responseText.substring(0, 500) + '...')
        
        const data: ChatCompletionResponse = JSON.parse(responseText)
        console.log('🔵 [OpenRouter] Parsed response:', {
          id: data.id,
          choices: data.choices?.length,
          usage: data.usage,
        })
        
        if (!data.choices || data.choices.length === 0) {
          console.error('❌ [OpenRouter] No choices in response')
          throw new Error('No response generated from AI model')
        }
        
        const content = data.choices[0]?.message?.content || 'No response generated'
        console.log('✅ [OpenRouter] Success! Response length:', content.length)
        console.log('✅ [OpenRouter] Response preview:', content.substring(0, 100) + '...')
        
        return content
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('❌ [OpenRouter] All retry attempts failed')
          throw error
        }
      }
    }
    
    throw new Error('Failed after all retry attempts')
  }
}

export const openRouterClient = new OpenRouterClient()
