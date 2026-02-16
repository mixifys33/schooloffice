/**
 * Class Teacher Marks - Classes API Route
 * Returns classes and subjects assigned to the teacher for marks entry
 * 
 * This is an alias/duplicate of the assessments/classes endpoint
 * to support the marks entry page at /class-teacher/marks
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export interface ClassTeacherAssignedClass {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

export interface ClassTeacherClassesResponse {
  classes: ClassTeacherAssignedClass[];
}

/**
 * GET /api/class-teacher/marks/classes
 * Returns classes and subjects available for marks entry
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access marks management'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school. Please contact support.'
        },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        primaryRole: true,
        secondaryRoles: true,
        status: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { 
          error: 'No staff profile found',
          details: 'Your staff profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    const isClassTeacher = userRole === Role.TEACHER || 
                           staff.primaryRole === StaffRole.CLASS_TEACHER ||
                           (staff.secondaryRoles as string[] || []).includes(StaffRole.CLASS_TEACHER)
    
    if (!isClassTeacher && !isAdmin) {
      return NextResponse.json(
        { 
          error: 'Access denied. Class teacher role required.',
          details: `Current role: ${userRole}. Class teacher access required.`
        },
        { status: 403 }
      )
    }

    // Get staff subject assignments (subjects teacher actually teaches)
    const staffSubjects = await prisma.staffSubject.findMany({
      where: { staffId: staff.id },
      select: {
        classId: true,
        subjectId: true,
        subject: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      }
    })

    if (staffSubjects.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    // Build classes with only assigned subjects
    const classesWithSubjects: ClassTeacherAssignedClass[] = []

    for (const staffSubject of staffSubjects) {
      classesWithSubjects.push({
        classId: staffSubject.classId,
        className: staffSubject.class.name,
        subjectId: staffSubject.subjectId,
        subjectName: staffSubject.subject.name
      })
    }

    return NextResponse.json({ classes: classesWithSubjects })

  } catch (error: any) {
    console.error('Error fetching assigned classes for marks:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch assigned classes',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}
