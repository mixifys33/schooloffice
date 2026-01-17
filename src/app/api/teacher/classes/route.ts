/**
 * Teacher Classes API Route
 * Requirements: 3.1, 3.2, 3.4 - Return only classes explicitly assigned to the teacher
 * with subject name, class name, and student count
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'

/**
 * Assigned class data for teacher's My Classes section
 * Requirements: 3.1, 3.2 - Display subject name, class name, student count
 */
export interface AssignedClassData {
  id: string
  classId: string
  className: string
  streamName: string | null
  subject: {
    id: string
    name: string
  }
  studentCount: number
  isClassTeacher: boolean
}

/**
 * GET /api/teacher/classes
 * Returns only classes explicitly assigned to the authenticated teacher
 * Requirements: 3.1, 3.2, 3.4 - Enforce teacher assignment validation
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get teacher record for the user
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
        classTeacherForIds: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Requirements: 3.1, 3.4 - Return only classes explicitly assigned to the teacher
    if (teacher.assignedClassIds.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    // Get class details for assigned classes
    const classes = await prisma.class.findMany({
      where: {
        id: { in: teacher.assignedClassIds },
        schoolId,
      },
      select: {
        id: true,
        name: true,
        streams: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Get subject details for assigned subjects
    const subjects = teacher.assignedSubjectIds.length > 0
      ? await prisma.subject.findMany({
          where: {
            id: { in: teacher.assignedSubjectIds },
            schoolId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : []

    // Build assigned class data with subject combinations
    // Requirements: 3.2 - Include subject name, class name, student count
    const assignedClasses: AssignedClassData[] = []

    for (const cls of classes) {
      // Get student count for this class
      const studentCount = await prisma.student.count({
        where: {
          classId: cls.id,
          status: StudentStatus.ACTIVE,
        },
      })

      // Check if teacher is class teacher for this class
      const isClassTeacher = teacher.classTeacherForIds.includes(cls.id)

      // If teacher has assigned subjects, create entries for each class-subject combination
      if (subjects.length > 0) {
        for (const subject of subjects) {
          assignedClasses.push({
            id: `${cls.id}-${subject.id}`,
            classId: cls.id,
            className: cls.name,
            streamName: cls.streams.length > 0 ? cls.streams[0].name : null,
            subject: {
              id: subject.id,
              name: subject.name,
            },
            studentCount,
            isClassTeacher,
          })
        }
      } else {
        // If no subjects assigned, still show the class
        assignedClasses.push({
          id: cls.id,
          classId: cls.id,
          className: cls.name,
          streamName: cls.streams.length > 0 ? cls.streams[0].name : null,
          subject: {
            id: '',
            name: 'No subject assigned',
          },
          studentCount,
          isClassTeacher,
        })
      }
    }

    return NextResponse.json({ classes: assignedClasses })
  } catch (error) {
    console.error('Error fetching teacher classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher classes' },
      { status: 500 }
    )
  }
}
