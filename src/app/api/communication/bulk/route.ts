/**
 * Communication Bulk Send API Route
 * POST /api/communication/bulk - Send bulk messages
 * Requirements: 1.1, 3.1
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { messageOrchestratorService } from '@/services/message-orchestrator.service'
import { TargetType, MessageChannel } from '@/types/enums'
import { TargetCriteria } from '@/types/entities'

interface BulkMessageRequestBody {
  targetType: TargetType
  targetCriteria: TargetCriteria
  templateId?: string
  customContent?: string
  channel?: MessageChannel
  priority?: 'normal' | 'high' | 'critical'
  scheduledAt?: string
  batchSize?: number
  rateLimit?: number
}

/**
 * POST /api/communication/bulk
 * Send bulk messages to targeted recipients
 * Requirements: 1.1, 3.1
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

    const body: BulkMessageRequestBody = await request.json()

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

    // Send bulk message via orchestrator
    const result = await messageOrchestratorService.sendBulkMessage({
      schoolId,
      targetType: body.targetType,
      targetCriteria: body.targetCriteria || {},
      templateId: body.templateId,
      customContent: body.customContent,
      channel: body.channel,
      priority: body.priority || 'normal',
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      senderId: userId,
      batchSize: body.batchSize,
      rateLimit: body.rateLimit,
    })

    return NextResponse.json({
      success: result.errors.length === 0,
      jobId: result.jobId,
      totalRecipients: result.totalRecipients,
      queued: result.queued,
      errors: result.errors,
    })
  } catch (error) {
    console.error('Error sending bulk message:', error)
    return NextResponse.json(
      { error: 'Failed to send bulk message' },
      { status: 500 }
    )
  }
}
