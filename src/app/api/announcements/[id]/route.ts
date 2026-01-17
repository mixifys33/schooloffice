/**
 * Announcement API Route
 * GET /api/announcements/[id] - Get single announcement
 * PUT /api/announcements/[id] - Update announcement
 * DELETE /api/announcements/[id] - Delete announcement
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhancedAnnouncementService } from '@/services/enhanced-announcement.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/announcements/[id]
 * Get a single announcement
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
    const announcement = await enhancedAnnouncementService.getAnnouncementById(id)

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcement' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/announcements/[id]
 * Update an announcement
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const announcement = await enhancedAnnouncementService.updateAnnouncement(id, body)

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update announcement' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/announcements/[id]
 * Delete an announcement
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    await enhancedAnnouncementService.deleteAnnouncement(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}
