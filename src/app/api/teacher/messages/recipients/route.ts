/**
 * Teacher Messages Recipients API Route
 * GET /api/teacher/messages/recipients - Get recipients for a class
 * Requirements: 8.1, 8.2
 * - Return students in assigned class (8.1)
 * - Return parents of students if parent messaging enabled (8.2)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { schoolSettingsService, CommunicationSettings } from '@/services/school-settings.service'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const type = searchParams.get('type') || 'student'

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    // Get teacher record and verify class assignment
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
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Requirement 8.1: Verify class is assigned to teacher
    if (!teacher.assignedClassIds.includes(classId)) {
      return NextResponse.json(
        { error: 'You are not assigned to this class' },
        { status: 403 }
      )
    }

    // Get class info
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true, stream: { select: { name: true } } },
    })

    if (!classInfo) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const className = classInfo.name + (classInfo.stream?.name ? ` - ${classInfo.stream.name}` : '')

    if (type === 'parent') {
      // Requirement 8.2: Check if parent messaging is enabled
      const commSettings = await schoolSettingsService.getSettings<CommunicationSettings>(
        schoolId,
        'communication'
      )

      if (!commSettings.teacherParentMessagingEnabled) {
        return NextResponse.json(
          { error: 'Parent messaging is not enabled for this school' },
          { status: 403 }
        )
      }

      // Get parents of students in the class
      const students = await prisma.student.findMany({
        where: {
          classId,
          schoolId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentGuardians: {
            select: {
              guardian: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      })

      // Build unique guardian list
      const guardianMap = new Map<string, { id: string; name: string }>()
      for (const student of students) {
        for (const sg of student.studentGuardians) {
          if (!guardianMap.has(sg.guardian.id)) {
            guardianMap.set(sg.guardian.id, {
              id: sg.guardian.id,
              name: `${sg.guardian.firstName} ${sg.guardian.lastName}`,
            })
          }
        }
      }

      const recipients = Array.from(guardianMap.values())
        .map((g) => ({
          id: g.id,
          name: g.name,
          type: 'parent' as const,
          classId,
          className,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      return NextResponse.json({ recipients })
    }

    // Get students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const recipients = students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      type: 'student' as const,
      classId,
      className,
    }))

    return NextResponse.json({ recipients })
  } catch (error) {
    console.error('Error fetching recipients:', error)
    return NextResponse.json({ error: 'Failed to load recipients' }, { status: 500 })
  }
}
