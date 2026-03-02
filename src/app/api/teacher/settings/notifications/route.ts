/**
 * Teacher Notification Settings API
 * GET: Retrieve notification preferences
 * POST: Update notification preferences
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface NotificationPreferences {
  emailNotifications: boolean
  inAppNotifications: boolean
  attendanceReminders: boolean
  gradeSubmissionReminders: boolean
  classUpdates: boolean
  systemAnnouncements: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  inAppNotifications: true,
  attendanceReminders: true,
  gradeSubmissionReminders: true,
  classUpdates: true,
  systemAnnouncements: true,
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const schoolId = session.user.schoolId

    if (!schoolId) {
      return NextResponse.json({ error: 'No school context' }, { status: 400 })
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
        inAppMessagingEnabled: true,
        emailEnabled: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // For now, return default preferences
    // In a real implementation, you'd store these in a separate table
    const preferences: NotificationPreferences = {
      ...DEFAULT_PREFERENCES,
      emailNotifications: teacher.emailEnabled,
      inAppNotifications: teacher.inAppMessagingEnabled,
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const schoolId = session.user.schoolId

    if (!schoolId) {
      return NextResponse.json({ error: 'No school context' }, { status: 400 })
    }

    const body = await request.json()
    const { preferences } = body as { preferences: NotificationPreferences }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Update teacher notification settings
    await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        emailEnabled: preferences.emailNotifications,
        inAppMessagingEnabled: preferences.inAppNotifications,
      },
    })

    // In a real implementation, you'd store the other preferences in a separate table
    // For now, we'll just acknowledge the save

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences,
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
