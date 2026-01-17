/**
 * Communication Hub Queue Retry Messages API Route
 * Requirements: 7.5
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queueMonitorService } from '@/services/queue-monitor.service'

interface RetryMessagesRequestBody {
  messageIds: string[]
}

/**
 * POST /api/admin/communication-hub/queues/retry
 * Retries failed messages in queue
 * Only accessible by Super Admin role
 * Requirements: 7.5
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
    const body: RetryMessagesRequestBody = await request.json()
    
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

    // Limit the number of messages that can be retried at once
    if (body.messageIds.length > 100) {
      return NextResponse.json({ 
        error: 'Cannot retry more than 100 messages at once' 
      }, { status: 400 })
    }

    // Retry the messages
    const result = await queueMonitorService.retryFailedMessages(body.messageIds)

    return NextResponse.json({
      success: result.success,
      retriedCount: result.retriedCount,
      failedIds: result.failedIds,
      message: result.success 
        ? `Successfully retried ${result.retriedCount} messages`
        : `Retried ${result.retriedCount} messages, ${result.failedIds.length} failed`
    })
  } catch (error) {
    console.error('Error retrying messages:', error)
    return NextResponse.json(
      { error: 'Failed to retry messages' },
      { status: 500 }
    )
  }
}