/**
 * Communication Hub Queue Pause API Route
 * Requirements: 7.4
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { queueMonitorService } from '@/services/queue-monitor.service'
import { MessageChannel } from '@/types/communication-hub'

/**
 * POST /api/admin/communication-hub/queues/[channel]/pause
 * Pauses a specific message queue channel
 * Only accessible by Super Admin role
 * Requirements: 7.4
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { channel: string } }
) {
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

    const channel = params.channel?.toUpperCase()
    if (!channel) {
      return NextResponse.json({ error: 'Channel is required' }, { status: 400 })
    }

    // Validate channel
    const validChannels = Object.values(MessageChannel)
    if (!validChannels.includes(channel as MessageChannel)) {
      return NextResponse.json({ 
        error: 'Invalid channel. Must be SMS, WHATSAPP, or EMAIL' 
      }, { status: 400 })
    }

    // Pause the queue
    await queueMonitorService.pauseQueue(channel as MessageChannel)

    return NextResponse.json({ 
      success: true, 
      message: `${channel} queue paused successfully` 
    })
  } catch (error) {
    console.error('Error pausing queue:', error)
    return NextResponse.json(
      { error: 'Failed to pause queue' },
      { status: 500 }
    )
  }
}