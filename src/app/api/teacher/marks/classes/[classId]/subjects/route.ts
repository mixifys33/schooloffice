/**
 * Teacher Marks Management - Subjects API Route
 * Progressive filtering: Step 3 - Subject Selection
 * 
 * Requirements: 3.1, 3.4
 * - Display only subjects assigned to teacher for selected class
 * - Include subject metadata (name, code, max scores)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export interface ClassSubjectsResponse {
  subjects: {
    id: string;
    name: string;
    code: string;
    maxCAScore: number;
    maxExamScore: number;
    teacherCanAccess: boolean;
  }[];
}

/**
 * GET /api/teacher/marks/classes/[classId]/subjects
 * Returns subjects available for marks entry in the selected class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/classes/[classId]/subjects - Starting request for class:', params.classId)
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access marks management'
      }, { status: 401 })
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { 
          error: 'Access denied. Teacher role required.',
          details: `Current role: ${userRole}. Teacher access required.`
        },
        { status: 403 }
      )
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
        primaryRole: true,
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

    // Check if teacher is class teacher for this class
    const isClassTeacher = await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: params.classId,
      },
    })

    // Get teacher's subject assignments for this class
    const teacherSubjects = await prisma.staffSubject.findMany({
      where: {
        staffId: staff.id,
        classId: params.classId,
      },
      select: {
        subjectId: true,
      },
    })

    const teacherSubjectIds = teacherSubjects.map(ts => ts.subjectId)

    // Get all subjects for the class
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId: params.classId,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        subject: {
          name: 'asc',
        },
      },
    })

    // Build subjects response
    const subjects = classSubjects.map(classSubject => {
      const canAccess = isClassTeacher || teacherSubjectIds.includes(classSubject.subjectId)
      
      return {
        id: classSubject.subject.id,
        name: classSubject.subject.name,
        code: classSubject.subject.code,
        maxCAScore: 100, // Default CA max score - can be customized per entry
        maxExamScore: 100, // Standard exam max score
        teacherCanAccess: canAccess,
      }
    }).filter(subject => subject.teacherCanAccess) // Only return accessible subjects

    if (subjects.length === 0) {
      return NextResponse.json(
        { 
          error: 'No subjects assigned',
          details: 'You do not have any subject assignments for this class. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }

    console.log('✅ [API] /api/teacher/marks/classes/[classId]/subjects - Successfully returning', subjects.length, 'subjects')
    return NextResponse.json({ subjects })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/classes/[classId]/subjects - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch class subjects',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}