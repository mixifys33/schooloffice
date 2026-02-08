import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/teacher/context
 * Get teacher context information for the dashboard
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/context - Starting request')
    
    const session = await auth()

    if (!session?.user?.id) {
      console.log('❌ [API] /api/teacher/context - No session found')
      return NextResponse.json(
        { 
          error: 'Authentication required',
          details: 'Please log in to access your teacher context'
        },
        { status: 401 }
      )
    }

    console.log('✅ [API] /api/teacher/context - Session found for user:', session.user.id)

    if (!session.user.schoolId) {
      console.log('❌ [API] /api/teacher/context - No school context')
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school. Please contact support.'
        },
        { status: 400 }
      )
    }

    // Get teacher information
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: session.user.id,
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employmentStatus: true,
        assignedSubjectIds: true,
        assignedClassIds: true,
        classTeacherForIds: true,
        canTakeAttendance: true,
        canEnterMarks: true,
        canViewReports: true,
        canSendMessages: true,
      },
    })

    if (!teacher) {
      console.log('❌ [API] /api/teacher/context - Teacher profile not found for user:', session.user.id)
      return NextResponse.json(
        { 
          error: 'Teacher profile not found',
          details: 'Your teacher profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }

    console.log('✅ [API] /api/teacher/context - Teacher profile found:', teacher.id)

    // Get current term with academic year
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Build context response
    const context = {
      teacherId: teacher.id,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      roleName: 'Teacher',
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate.toISOString(),
        endDate: currentTerm.endDate.toISOString(),
      } : null,
      academicYear: currentTerm?.academicYear || null,
      contextError: !currentTerm ? 'No active term found for the current academic year' : null,
    }

    console.log('✅ [API] /api/teacher/context - Successfully returning context')
    return NextResponse.json({ context })
  } catch (error: any) {
    console.error('❌ [API] /api/teacher/context - Error:', error)
    
    // Enhanced error handling with specific error types
    if (error.code === 'P1001') {
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: 'Unable to connect to the database. Please try again in a moment.'
        },
        { status: 503 }
      )
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { 
          error: 'Teacher profile not found',
          details: 'Your teacher profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}