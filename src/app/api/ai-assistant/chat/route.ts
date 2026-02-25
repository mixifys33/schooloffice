/**
 * AI Assistant Chat API Route
 * Handles chat requests to OpenRouter API
 */

import { NextRequest, NextResponse } from 'next/server'
import { openRouterClient, Message } from '@/lib/ai-assistant/openrouter-client'
import { contextBuilder } from '@/lib/ai-assistant/context-builder'
import { getRelevantDocsFromFiles } from '@/lib/ai-assistant/documentation-reader'

export async function POST(request: NextRequest) {
  console.log('🟢 [AI API] Received chat request')
  
  try {
    const body = await request.json()
    console.log('🟢 [AI API] Request body parsed:', {
      messagesCount: body.messages?.length,
      pathname: body.pathname,
      hasError: !!body.error,
    })
    
    const { messages, pathname, error } = body as { 
      messages: Message[]
      pathname?: string
      error?: string
    }

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ [AI API] Invalid request: messages array missing')
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      )
    }

    // Check if API key is configured
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
    console.log('🟢 [AI API] API key check:', {
      exists: !!apiKey,
      prefix: apiKey?.substring(0, 15) + '...',
      isPlaceholder: apiKey === 'your_openrouter_api_key_here',
    })
    
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      console.warn('⚠️ [AI API] API key not configured, returning setup message')
      return NextResponse.json({
        success: true,
        message: `I'm currently not configured with an API key. To enable me:

1. Get a free API key from https://openrouter.ai/keys
2. Add it to your .env file as NEXT_PUBLIC_OPENROUTER_API_KEY
3. Restart your dev server

In the meantime, here are some quick links:
• Login help: /forgot-password
• Documentation: Check the documentations/ folder
• Support: Contact your school admin`,
      })
    }

    console.log('🟢 [AI API] Building context...')
    // Build enhanced context with real documentation
    const systemContext = contextBuilder.getSystemContext()
    const pageContext = pathname ? contextBuilder.getPageContext(pathname) : ''
    const errorContext = error ? contextBuilder.getErrorContext(error) : ''
    
    // Get relevant documentation from actual files
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    console.log('🟢 [AI API] Last user message:', lastUserMessage.substring(0, 100))
    
    // Get full documentation context for better answers
    const docsContext = getRelevantDocsFromFiles(lastUserMessage).substring(0, 5000)
    console.log('🟢 [AI API] Docs context length:', docsContext.length)

    const contextMessage: Message = {
      role: 'system',
      content: `${systemContext}\n\nCURRENT PAGE: ${pageContext}\n${errorContext}\n\nRELEVANT DOCUMENTATION:\n${docsContext}`,
    }

    // Prepare messages with context
    const apiMessages = [contextMessage, ...messages]
    console.log('🟢 [AI API] Total messages to send:', apiMessages.length)

    try {
      console.log('🟢 [AI API] Calling OpenRouter...')
      // Get response from OpenRouter
      const response = await openRouterClient.chat(apiMessages)
      console.log('✅ [AI API] Got response from OpenRouter, length:', response.length)

      return NextResponse.json({
        success: true,
        message: response,
      })
    } catch (apiError) {
      // If OpenRouter fails, provide a helpful fallback response
      console.error('❌ [AI API] OpenRouter failed, using fallback')
      console.error('❌ [AI API] Error details:', apiError)
      
      const userQuestion = messages[messages.length - 1]?.content.toLowerCase() || ''
      let fallbackResponse = ''
      
      // Provide basic answers for common questions
      if (userQuestion.includes('login') || userQuestion.includes('sign in')) {
        fallbackResponse = `To login:
1. Enter your school code
2. Enter your email/phone/username
3. Enter your password

Having trouble? Try /forgot-password or contact your school admin.`
      } else if (userQuestion.includes('mark') || userQuestion.includes('grade')) {
        fallbackResponse = `To enter marks:
1. Go to Teacher Dashboard
2. Click Marks Entry
3. Select term, class, and subject
4. Enter marks for each student
5. Save your work`
      } else if (userQuestion.includes('report')) {
        fallbackResponse = `For reports:
• Teachers: Enter marks first
• DOS: Approve marks, then generate reports
• Parents: View reports in parent portal`
      } else {
        fallbackResponse = `I'm having trouble connecting to my AI service right now. 

Please check the documentation at /documentations or contact your school administrator for help.

Common pages:
• Documentation: /documentations
• Login: /login
• Forgot Password: /forgot-password
• Dashboard: /dashboard`
      }
      
      console.log('🟢 [AI API] Returning fallback response')
      return NextResponse.json({
        success: true,
        message: fallbackResponse,
      })
    }
  } catch (error) {
    console.error('❌ [AI API] Fatal error:', error)
    
    // Get detailed error message
    let errorMessage = 'An error occurred while processing your request.'
    
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('❌ [AI API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
