/**
 * Announcement Stats API Route
 * GET /api/announcements/[id]/stats - Get delivery stats
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhancedAnnouncementService } from '@/services/enhanced-announcement.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/announcements/[id]/stats
 * Get delivery statistics for an announcement
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const stats = await enhancedAnnouncementService.getDeliveryStats(id)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error fetching announcement stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcement stats' },
      { status: 500 }
    )
  }
}
