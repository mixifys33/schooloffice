/**
 * Announcement Retry API Route
 * POST /api/announcements/[id]/retry - Retry failed deliveries
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhancedAnnouncementService } from '@/services/enhanced-announcement.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/announcements/[id]/retry
 * Retry failed deliveries for an announcement
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as { id?: string }).id

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      )
    }

    const { id } = await params
    const result = await enhancedAnnouncementService.retryFailedDeliveries(id, userId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error retrying announcement deliveries:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry deliveries' },
      { status: 500 }
    )
  }
}
