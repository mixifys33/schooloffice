/**
 * Announcement Pin API Route
 * POST /api/announcements/[id]/pin - Pin announcement
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhancedAnnouncementService } from '@/services/enhanced-announcement.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/announcements/[id]/pin
 * Pin an announcement
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
    
    // Get optional pinnedUntil from body
    let pinnedUntil: Date | undefined
    try {
      const body = await request.json()
      if (body.pinnedUntil) {
        pinnedUntil = new Date(body.pinnedUntil)
      }
    } catch {
      // No body provided, that's fine
    }

    const announcement = await enhancedAnnouncementService.pinAnnouncement(id, pinnedUntil)

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error pinning announcement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pin announcement' },
      { status: 500 }
    )
  }
}
