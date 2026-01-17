/**
 * Announcement Publish API Route
 * POST /api/announcements/[id]/publish - Publish announcement
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhancedAnnouncementService } from '@/services/enhanced-announcement.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/announcements/[id]/publish
 * Publish an announcement immediately
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
    const announcement = await enhancedAnnouncementService.publishAnnouncement(id, userId)

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error publishing announcement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish announcement' },
      { status: 500 }
    )
  }
}
