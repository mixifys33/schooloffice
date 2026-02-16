import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

/**
 * GET /api/class-teacher/assessments/reports
 * Fetch classes and subjects for report generation
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { id: true, primaryRole: true, secondaryRoles: true },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 })
    }

    // Get staff subject assignments
    const staffSubjects = await prisma.staffSubject.findMany({
      where: { staffId: staff.id },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    // Format classes with subjects
    const classes = staffSubjects.map((assignment) => ({
      id: `${assignment.classId}-${assignment.subjectId}`,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
      name: assignment.class.name,
      subject: assignment.subject.name,
      subjectCode: assignment.subject.code,
    }))

    return NextResponse.json({ classes })
  } catch (error) {
    console.error('[API] Error fetching report classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    )
  }
}
