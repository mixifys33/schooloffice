/**
 * Teacher Marks Classes API Route
 * Requirements: 6.1 - Return only classes and subjects assigned to the teacher for marks entry
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * GET /api/teacher/marks/classes
 * Returns classes and subjects assigned to the teacher for marks entry
 * Requirements: 6.1 - Display only students in assigned class
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
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Requirements: 6.1 - Return only assigned classes and subjects
    if (teacher.assignedClassIds.length === 0 || teacher.assignedSubjectIds.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    // Get class details
    const classes = await prisma.class.findMany({
      where: {
        id: { in: teacher.assignedClassIds },
        schoolId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    // Get subject details
    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: teacher.assignedSubjectIds },
        schoolId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    // Build class-subject combinations
    const classSubjectCombinations = []
    for (const cls of classes) {
      for (const subject of subjects) {
        classSubjectCombinations.push({
          classId: cls.id,
          className: cls.name,
          subjectId: subject.id,
          subjectName: subject.name,
        })
      }
    }

    return NextResponse.json({ classes: classSubjectCombinations })
  } catch (error) {
    console.error('Error fetching teacher marks classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assigned classes' },
      { status: 500 }
    )
  }
}
