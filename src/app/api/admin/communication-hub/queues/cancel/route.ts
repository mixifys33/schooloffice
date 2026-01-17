/**
 * Communication Hub Queue Cancel Messages API Route
 * Requirements: 7.3
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queueMonitorService } from '@/services/queue-monitor.service'

interface CancelMessagesRequestBody {
  messageIds: string[]
}

/**
 * POST /api/admin/communication-hub/queues/cancel
 * Cancels specific messages in queue
 * Only accessible by Super Admin role
 * Requirements: 7.3
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Super Admin access required' 
      }, { status: 403 })
    }

    // Parse request body
    const body: CancelMessagesRequestBody = await request.json()
    
    if (!body.messageIds || !Array.isArray(body.messageIds) || body.messageIds.length === 0) {
      return NextResponse.json({ 
        error: 'messageIds array is required and must not be empty' 
      }, { status: 400 })
    }

    // Validate message IDs
    const invalidIds = body.messageIds.filter(id => typeof id !== 'string' || id.trim().length === 0)
    if (invalidIds.length > 0) {
      return NextResponse.json({ 
        error: 'All message IDs must be non-empty strings' 
      }, { status: 400 })
    }

    // Limit the number of messages that can be canceled at once
    if (body.messageIds.length > 100) {
      return NextResponse.json({ 
        error: 'Cannot cancel more than 100 messages at once' 
      }, { status: 400 })
    }

    // Cancel the messages
    const result = await queueMonitorService.cancelMessages(body.messageIds)

    return NextResponse.json({
      success: result.success,
      canceledCount: result.canceledCount,
      failedIds: result.failedIds,
      message: result.success 
        ? `Successfully canceled ${result.canceledCount} messages`
        : `Canceled ${result.canceledCount} messages, ${result.failedIds.length} failed`
    })
  } catch (error) {
    console.error('Error canceling messages:', error)
    return NextResponse.json(
      { error: 'Failed to cancel messages' },
      { status: 500 }
    )
  }
}