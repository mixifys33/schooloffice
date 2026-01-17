/**
 * Announcement Unpin API Route
 * POST /api/announcements/[id]/unpin - Unpin announcement
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhancedAnnouncementService } from '@/services/enhanced-announcement.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/announcements/[id]/unpin
 * Unpin an announcement
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

    const { id } = await params
    const announcement = await enhancedAnnouncementService.unpinAnnouncement(id)

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error unpinning announcement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unpin announcement' },
      { status: 500 }
    )
  }
}
