/**
 * Class Teacher Marks - Exams API Route
 * Returns exams available for marks entry for a specific class
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export interface ExamOption {
  id: string;
  name: string;
  type: string;
  isOpen: boolean;
}

export interface ExamsResponse {
  exams: ExamOption[];
}

/**
 * GET /api/class-teacher/marks/exams?classId=xxx
 * Returns exams available for marks entry
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

    // Get classId from query params
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
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

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    })

    if (!currentTerm) {
      console.log('⚠️ No current term found for school:', schoolId)
      return NextResponse.json({ exams: [] })
    }

    console.log('✅ Current term found:', currentTerm.id)

    // Get exams for the current term
    const exams = await prisma.exam.findMany({
      where: {
        schoolId,
        termId: currentTerm.id
      },
      select: {
        id: true,
        name: true,
        type: true,
        isOpen: true,
        startDate: true,
        endDate: true
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    console.log(`✅ Found ${exams.length} exams for term ${currentTerm.id}`)

    const examOptions: ExamOption[] = exams.map(exam => ({
      id: exam.id,
      name: exam.name,
      type: exam.type,
      isOpen: exam.isOpen
    }))

    return NextResponse.json({ exams: examOptions })

  } catch (error: any) {
    console.error('Error fetching exams for marks:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch exams',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}
