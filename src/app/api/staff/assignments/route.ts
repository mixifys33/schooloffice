/**
 * Staff Assignments API Route
 * Returns all staff assignments including class teachers and subject teachers
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * GET /api/staff/assignments
 * Returns class teacher assignments and subject teacher assignments
 * Requires SCHOOL_ADMIN, DEPUTY, or SUPER_ADMIN permission
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to access this resource' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'School context required' },
        { status: 400 }
      )
    }

    // Get class teacher assignments from StaffClass
    const staffClasses = await prisma.staffClass.findMany({
      where: {
        staff: { schoolId },
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            primaryRole: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    })

    // Get subject teacher assignments from StaffSubject
    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        staff: { schoolId },
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
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

    // Get class subjects to determine which classes each subject teacher teaches
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        class: { schoolId },
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
          },
        },
      },
    })

    // Build class subject map
    const subjectClassMap = new Map<string, string[]>()
    for (const cs of classSubjects) {
      const classes = subjectClassMap.get(cs.subjectId) || []
      classes.push(cs.class.name)
      subjectClassMap.set(cs.subjectId, classes)
    }

    // Get staff responsibilities
    const responsibilities = await prisma.staffResponsibility.findMany({
      where: {
        staff: { schoolId },
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            primaryRole: true,
          },
        },
      },
    })

    // Format class teachers
    const classTeachers = staffClasses.map((sc) => ({
      classId: sc.classId,
      className: sc.class.name,
      staffId: sc.staffId,
      staffName: `${sc.staff.firstName} ${sc.staff.lastName}`,
      employeeNumber: sc.staff.employeeNumber,
    }))

    // Format subject assignments (group by staff+subject)
    const subjectAssignmentMap = new Map<string, {
      subjectId: string
      subjectName: string
      subjectCode: string
      staffId: string
      staffName: string
      employeeNumber: string
      classes: string[]
    }>()

    for (const ss of staffSubjects) {
      const key = `${ss.staffId}-${ss.subjectId}`
      if (!subjectAssignmentMap.has(key)) {
        subjectAssignmentMap.set(key, {
          subjectId: ss.subjectId,
          subjectName: ss.subject.name,
          subjectCode: ss.subject.code,
          staffId: ss.staffId,
          staffName: `${ss.staff.firstName} ${ss.staff.lastName}`,
          employeeNumber: ss.staff.employeeNumber,
          classes: subjectClassMap.get(ss.subjectId) || [],
        })
      }
    }

    const subjectAssignments = Array.from(subjectAssignmentMap.values())

    // Format responsibilities
    const formattedResponsibilities = responsibilities.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      staffName: `${r.staff.firstName} ${r.staff.lastName}`,
      employeeNumber: r.staff.employeeNumber,
      primaryRole: r.staff.primaryRole,
      type: r.type,
      details: r.details as Record<string, unknown>,
      assignedAt: r.assignedAt,
    }))

    return NextResponse.json({
      data: {
        classTeachers,
        subjectAssignments,
        responsibilities: formattedResponsibilities,
      },
    })
  } catch (error) {
    console.error('Error fetching staff assignments:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
