/**
 * Communication Hub Queued Messages API Route
 * Requirements: 7.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queueMonitorService } from '@/services/queue-monitor.service'
import { QueueFilters, MessageChannel, MessagePriority, QueuedMessageStatus } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/queues/messages
 * Fetches queued messages with filtering support
 * Only accessible by Super Admin role
 * Requirements: 7.7
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    
    // Build filters from query parameters
    const filters: QueueFilters = {}

    // Channel filter
    const channel = searchParams.get('channel')
    if (channel && Object.values(MessageChannel).includes(channel as MessageChannel)) {
      filters.channel = channel as MessageChannel
    }

    // School filter
    const schoolId = searchParams.get('schoolId')
    if (schoolId) {
      filters.schoolId = schoolId
    }

    // Priority filter
    const priority = searchParams.get('priority')
    if (priority && Object.values(MessagePriority).includes(priority as MessagePriority)) {
      filters.priority = priority as MessagePriority
    }

    // Status filter
    const status = searchParams.get('status')
    if (status && Object.values(QueuedMessageStatus).includes(status as QueuedMessageStatus)) {
      filters.status = status as QueuedMessageStatus
    }

    // Get queued messages with filters
    const messages = await queueMonitorService.getQueuedMessages(filters)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching queued messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queued messages' },
      { status: 500 }
    )
  }
}