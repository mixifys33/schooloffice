/**
 * Announcements API Route
 * GET /api/announcements - List announcements
 * POST /api/announcements - Create announcement
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhancedAnnouncementService } from '@/services/enhanced-announcement.service'
import { TargetType, MessageChannel } from '@/types/enums'

interface CreateAnnouncementBody {
  title: string
  content: string
  targetType: TargetType
  targetCriteria: Record<string, unknown>
  channels: MessageChannel[]
  isPinned?: boolean
  pinnedUntil?: string
  scheduledAt?: string
  expiresAt?: string
}

/**
 * GET /api/announcements
 * List announcements for the school
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

    const { searchParams } = new URL(request.url)
    const isPublished = searchParams.get('isPublished')
    const isPinned = searchParams.get('isPinned')
    const scheduled = searchParams.get('scheduled')

    const announcements = await enhancedAnnouncementService.getAnnouncementsBySchool(schoolId, {
      isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
      isPinned: isPinned === 'true' ? true : undefined,
    })

    return NextResponse.json({
      success: true,
      announcements,
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/announcements
 * Create a new announcement
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = (session.user as { id?: string }).id

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      )
    }

    const body: CreateAnnouncementBody = await request.json()

    // Validate required fields
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!body.channels || body.channels.length === 0) {
      return NextResponse.json(
        { error: 'At least one channel is required' },
        { status: 400 }
      )
    }

    const announcement = await enhancedAnnouncementService.createAnnouncement({
      schoolId,
      title: body.title,
      content: body.content,
      targetType: body.targetType || TargetType.ENTIRE_SCHOOL,
      targetCriteria: body.targetCriteria || {},
      channels: body.channels,
      isPinned: body.isPinned || false,
      pinnedUntil: body.pinnedUntil ? new Date(body.pinnedUntil) : undefined,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdBy: userId,
    })

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create announcement' },
      { status: 500 }
    )
  }
}
