/**
 * Teacher Marks Classes API Route
 * Returns teacher's assigned classes and subjects for marks entry
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * GET /api/teacher/marks/classes
 * Returns teacher's assigned class-subject combinations
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/classes - Starting request')
    
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

    const userId = session.user.id
    const schoolId = session.user.schoolId
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Try to get teacher record first
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
      },
    })

    let classes: Array<{
      classId: string
      className: string
      subjectId: string
      subjectName: string
    }> = []

    if (teacher) {
      // Get teacher's assigned classes and subjects from TeacherAssignment
      const assignments = await prisma.teacherAssignment.findMany({
        where: {
          teacherId: teacher.id,
          schoolId,
        },
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
            },
          },
        },
        orderBy: [
          { class: { name: 'asc' } },
          { subject: { name: 'asc' } },
        ],
      })

      classes = assignments.map(assignment => ({
        classId: assignment.classId,
        className: assignment.class.name,
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
      }))
    } else {
      // Fallback: Try to get from Staff record (for teachers who don't have Teacher profile yet)
      const staff = await prisma.staff.findFirst({
        where: {
          userId,
          schoolId,
        },
        select: {
          id: true,
        },
      })

      if (staff) {
        const staffSubjects = await prisma.staffSubject.findMany({
          where: {
            staffId: staff.id,
          },
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
              },
            },
          },
          orderBy: [
            { class: { name: 'asc' } },
            { subject: { name: 'asc' } },
          ],
        })

        classes = staffSubjects.map(ss => ({
          classId: ss.classId,
          className: ss.class.name,
          subjectId: ss.subjectId,
          subjectName: ss.subject.name,
        }))
      }
    }

    console.log(`✅ [API] /api/teacher/marks/classes - Returning ${classes.length} class-subject combinations`)

    return NextResponse.json({ classes })
  } catch (error) {
    console.error('❌ [API] /api/teacher/marks/classes - Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assigned classes' },
      { status: 500 }
    )
  }
}
