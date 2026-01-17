/**
 * Communication Send API Route
 * POST /api/communication/send - Send a single message
 * Requirements: 1.1, 1.2
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { messageOrchestratorService } from '@/services/message-orchestrator.service'
import { TargetType, MessageChannel } from '@/types/enums'
import { TargetCriteria } from '@/types/entities'

interface SendMessageRequestBody {
  targetType: TargetType
  targetCriteria: TargetCriteria
  templateId?: string
  customContent?: string
  channel?: MessageChannel
  priority?: 'normal' | 'high' | 'critical'
  scheduledAt?: string
}

/**
 * POST /api/communication/send
 * Send a message to targeted recipients
 * Requirements: 1.1, 1.2
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = (session.user as { id?: string }).id

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      )
    }

    const body: SendMessageRequestBody = await request.json()

    // Validate required fields
    if (!body.targetType) {
      return NextResponse.json(
        { error: 'Target type is required' },
        { status: 400 }
      )
    }

    if (!body.templateId && !body.customContent) {
      return NextResponse.json(
        { error: 'Either templateId or customContent is required' },
        { status: 400 }
      )
    }

    // Send message via orchestrator
    const result = await messageOrchestratorService.sendMessage({
      schoolId,
      targetType: body.targetType,
      targetCriteria: body.targetCriteria || {},
      templateId: body.templateId,
      customContent: body.customContent,
      channel: body.channel,
      priority: body.priority || 'normal',
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      senderId: userId,
    })

    return NextResponse.json({
      success: result.status !== 'FAILED',
      messageId: result.messageId,
      status: result.status,
      channel: result.channel,
      error: result.error,
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
