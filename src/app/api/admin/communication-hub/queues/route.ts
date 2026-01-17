/**
 * Communication Hub Queues API Route
 * Requirements: 7.1, 7.2
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queueMonitorService } from '@/services/queue-monitor.service'

/**
 * GET /api/admin/communication-hub/queues
 * Fetches current status of all message queues
 * Only accessible by Super Admin role
 * Requirements: 7.1, 7.2
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

    // Get queue status for all channels
    const queueStatuses = await queueMonitorService.getQueueStatus()

    return NextResponse.json({ queues: queueStatuses })
  } catch (error) {
    console.error('Error fetching queue status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue status' },
      { status: 500 }
    )
  }
}