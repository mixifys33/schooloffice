/**
 * Communication Stats API Route
 * GET /api/communication/stats - Get communication statistics
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MessageStatus, MessageChannel } from '@/types/enums'

/**
 * GET /api/communication/stats
 * Get communication statistics for the school
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get this month's date range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    // Today's stats
    const todayMessages = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        status: true,
      },
    })

    const todayStats = {
      sent: todayMessages.length,
      delivered: todayMessages.filter(m => 
        m.status === 'DELIVERED' || m.status === 'READ' || m.status === 'SENT'
      ).length,
      failed: todayMessages.filter(m => 
        m.status === 'FAILED' || m.status === 'BOUNCED'
      ).length,
      pending: todayMessages.filter(m => 
        m.status === 'QUEUED' || m.status === 'SENDING'
      ).length,
    }

    // This month's stats by channel
    const monthMessages = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        channel: true,
        status: true,
      },
    })

    const monthStats = {
      sms: monthMessages.filter(m => m.channel === 'SMS').length,
      email: monthMessages.filter(m => m.channel === 'EMAIL').length,
      total: monthMessages.length,
    }

    // Calculate delivery rate
    const deliveredCount = monthMessages.filter(m => 
      m.status === 'DELIVERED' || 
      m.status === 'READ' ||
      m.status === 'SENT'
    ).length
    const deliveryRate = monthStats.total > 0 
      ? Math.round((deliveredCount / monthStats.total) * 100) 
      : 0

    // Get SMS balance from school settings (if available)
    let smsBalance = 0
    try {
      const schoolSettings = await prisma.schoolSettings.findUnique({
        where: {
          schoolId_category: {
            schoolId,
            category: 'communication',
          },
        },
      })
      // Check if settings has smsCredits or similar field
      const settingsData = schoolSettings?.settings as { smsCredits?: number };
      smsBalance = settingsData?.smsCredits || 0
    } catch {
      // Field may not exist, use default
    }

    return NextResponse.json({
      success: true,
      stats: {
        today: todayStats,
        thisMonth: monthStats,
        deliveryRate,
        smsBalance,
      },
    })
  } catch (error) {
    console.error('Error fetching communication stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communication stats' },
      { status: 500 }
    )
  }
}
