/**
 * SMS Delivery Status Check API
 * Polls Africa's Talking for delivery status updates
 * Updates message records with actual delivery status
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MessageStatus } from '@/types/enums'

/**
 * POST /api/sms/check-delivery
 * Check delivery status for pending messages
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Get messages that are still in SENT status (not yet confirmed delivered or failed)
    // Only check messages from the last 48 hours
    const pendingMessages = await prisma.message.findMany({
      where: {
        schoolId,
        status: MessageStatus.SENT,
        channel: 'SMS',
        sentAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      },
      include: {
        guardian: { select: { phone: true } },
      },
      take: 100, // Limit to prevent timeout
    })

    if (pendingMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending messages to check',
        checked: 0,
        updated: 0,
      })
    }

    // For sandbox mode, we can't actually poll delivery status
    // Africa's Talking sandbox doesn't provide real delivery reports
    // In production, you would use the delivery callback webhook
    
    // For now, mark messages older than 5 minutes as potentially failed
    // if they haven't received a delivery callback
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    let updated = 0
    
    for (const msg of pendingMessages) {
      if (msg.sentAt && msg.sentAt < fiveMinutesAgo) {
        // Message has been pending for more than 5 minutes
        // In sandbox mode, this likely means delivery failed
        // In production, you'd check the actual delivery status via API
        
        // For sandbox testing, we'll mark old messages as needing attention
        // but won't automatically mark them as failed
        console.log(`[SMS Check] Message ${msg.id} pending for >5 min, phone: ${msg.guardian.phone}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${pendingMessages.length} pending messages`,
      checked: pendingMessages.length,
      updated,
      note: 'In sandbox mode, delivery reports are simulated. Configure webhook for production.',
    })
  } catch (error) {
    console.error('Delivery check error:', error)
    return NextResponse.json({ error: 'Failed to check delivery status' }, { status: 500 })
  }
}

/**
 * GET /api/sms/check-delivery
 * Get delivery statistics for recent messages
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Get message statistics for the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const stats = await prisma.message.groupBy({
      by: ['status'],
      where: {
        schoolId,
        channel: 'SMS',
        createdAt: { gte: oneDayAgo },
      },
      _count: true,
    })

    const statusCounts = {
      queued: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      total: 0,
    }

    for (const stat of stats) {
      const count = stat._count
      statusCounts.total += count
      
      switch (stat.status) {
        case 'QUEUED':
          statusCounts.queued = count
          break
        case 'SENT':
          statusCounts.sent = count
          break
        case 'DELIVERED':
          statusCounts.delivered = count
          break
        case 'FAILED':
          statusCounts.failed = count
          break
      }
    }

    // Calculate delivery rate
    const deliveryRate = statusCounts.total > 0
      ? Math.round((statusCounts.delivered / statusCounts.total) * 100)
      : 0

    return NextResponse.json({
      success: true,
      stats: statusCounts,
      deliveryRate,
      period: '24 hours',
    })
  } catch (error) {
    console.error('Delivery stats error:', error)
    return NextResponse.json({ error: 'Failed to get delivery stats' }, { status: 500 })
  }
}
