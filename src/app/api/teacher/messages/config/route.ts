/**
 * Teacher Messages Config API Route
 * GET /api/teacher/messages/config - Get messaging configuration for teacher
 * Requirements: 8.1, 8.2
 * - Return assigned classes for recipient selection (8.1)
 * - Return parent messaging enabled status from school settings (8.2)
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { schoolSettingsService, CommunicationSettings } from '@/services/school-settings.service'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id?: string }).id
    const schoolId = (session.user as { schoolId?: string }).schoolId

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
        assignedClassIds: true,
        canSendMessages: true,
        hasSystemAccess: true,
        inAppMessagingEnabled: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Check if teacher can send messages
    if (!teacher.hasSystemAccess || !teacher.canSendMessages || !teacher.inAppMessagingEnabled) {
      return NextResponse.json({ error: 'Messaging not enabled for this account' }, { status: 403 })
    }

    // Get assigned classes with student counts
    const assignedClasses = await prisma.class.findMany({
      where: {
        id: { in: teacher.assignedClassIds },
        schoolId,
      },
      select: {
        id: true,
        name: true,
        stream: {
          select: { name: true },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Get school communication settings for parent messaging
    const commSettings = await schoolSettingsService.getSettings<CommunicationSettings>(
      schoolId,
      'communication'
    )

    return NextResponse.json({
      parentMessagingEnabled: commSettings.teacherParentMessagingEnabled ?? false,
      assignedClasses: assignedClasses.map((cls) => ({
        id: cls.id,
        name: cls.name,
        streamName: cls.stream?.name,
        studentCount: cls._count.students,
      })),
    })
  } catch (error) {
    console.error('Error fetching messaging config:', error)
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 })
  }
}
