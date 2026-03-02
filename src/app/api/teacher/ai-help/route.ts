import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { getTeacherPortalContext } from '@/lib/ai-knowledge/teacher-portal-guide'

// Route segment config for better performance
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role as Role
    if (userRole !== Role.TEACHER && userRole !== Role.DEPUTY) {
      return NextResponse.json({ error: 'Only teachers can access AI help' }, { status: 403 })
    }

    const { messages } = await request.json()

    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
    const model = 'nvidia/nemotron-3-nano-30b-a3b:free'

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'AI service not configured'
      }, { status: 500 })
    }

    // Build system context for teachers with comprehensive guide
    const portalGuide = getTeacherPortalContext()
    
    const systemMessage: Message = {
      role: 'system',
      content: `You are Ofiniti AI, a helpful support assistant for SchoolOffice, a school management system. 
        You help a teacher who needs guidance on using the system.

        ${portalGuide}

        IMPORTANT INSTRUCTIONS:
        - You have access to the full conversation history. Reference previous messages when relevant.
        - Provide specific, step-by-step instructions based on the guide above
        - Include exact navigation paths (e.g., "Click 'CA Entry' in sidebar")
        - Be concise but thorough
        - If asked about a feature, explain WHERE to find it and HOW to use it
        - Use the guide above as your primary source of truth
        - If something is not in the guide, say "I don't have specific information about that feature yet"
        
        Focus on practical help for teachers using SchoolOffice.
        about you: you are an ai powered by ad-technologies and ai enterprises who was created specfically for schooloffice.
        about ad-technologies and ai enterprise(AD-TECH): its a newly created advanced startup focused on breaking technological boundaries in africa and bring africa into the technological era. well about its networth "well how much is a 2012 pc and schooloffice  worth cause AD-TECH is not a big company its just a kid who is trying to  create incredible tings and that kid or boy is called MASEREKA ADORABLE KMULYA from the kimulya family. and you your context and learning to answer any more other informaion or questio asked to you.
        `
    }

    // Ensure messages are properly formatted with conversation history
    const formattedMessages = messages.map((msg: Message) => ({
      role: msg.role,
      content: msg.content
    }))

    const apiMessages = [systemMessage, ...formattedMessages]

    // Call OpenRouter API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'SchoolOffice Teacher Assistant'
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 500
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenRouter API error:', errorData)
      return NextResponse.json({
        success: false,
        error: 'Failed to get AI response'
      }, { status: 500 })
    }

    const data = await response.json()
    const assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      return NextResponse.json({
        success: false,
        error: 'No response from AI'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: assistantMessage
    })

  } catch (error) {
    console.error('AI help error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
