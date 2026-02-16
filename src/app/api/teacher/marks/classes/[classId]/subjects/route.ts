/**
 * Teacher Marks Management - Subjects API Route
 * Progressive filtering: Step 3 - Subject Selection
 * 
 * Requirements: 1.1, 1.2, 1.3, 11.1, 11.2
 * - Display subjects for selected class
 * - Filter subjects based on teacher assignments
 * - Include subject metadata (code, max scores)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export interface SubjectsResponse {
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
 * Returns subjects for a specific class that the teacher can access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/classes/[classId]/subjects - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] Subjects - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access marks management'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] Subjects - No school context')
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school. Please contact support.'
        },
        { status: 400 }
      )
    }

    const { classId } = await params

    // Verify class belongs to school
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
    })

    if (!classRecord) {
      return NextResponse.json(
        { 
          error: 'Class not found',
          details: 'The requested class does not exist or you do not have access to it.'
        },
        { status: 404 }
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
        secondaryRoles: true,
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

    // Check if user is class teacher for this class
    const isClassTeacher = await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId,
      },
    })

    // Get subjects based on teacher role
    let subjectsQuery;
    
    if (isClassTeacher) {
      // Class teachers can access all subjects for their class
      subjectsQuery = prisma.classSubject.findMany({
        where: {
          classId,
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true,
            },
          },
        },
      })
    } else {
      // Subject teachers can only access subjects they're assigned to
      const staffSubjects = await prisma.staffSubject.findMany({
        where: {
          staffId: staff.id,
          classId,
        },
        select: {
          subjectId: true,
        },
      })

      const subjectIds = staffSubjects.map(ss => ss.subjectId)

      subjectsQuery = prisma.classSubject.findMany({
        where: {
          classId,
          subjectId: {
            in: subjectIds,
          },
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true,
            },
          },
        },
      })
    }

    const classSubjects = await subjectsQuery

    // Filter out inactive subjects and map to response format
    const subjectsResponse = classSubjects
      .filter(cs => cs.subject.isActive)
      .map(cs => ({
        id: cs.subject.id,
        name: cs.subject.name,
        code: cs.subject.code,
        maxCAScore: cs.maxMark * 0.4, // Assuming 40% for CA
        maxExamScore: cs.maxMark * 0.6, // Assuming 60% for Exam
        teacherCanAccess: true,
      }))

    console.log('✅ [API] Subjects - Successfully returning', subjectsResponse.length, 'subjects')
    return NextResponse.json({ subjects: subjectsResponse })

  } catch (error: any) {
    console.error('❌ [API] Subjects - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch subjects',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}
