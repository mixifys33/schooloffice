/**
 * Teacher Marks Management - Streams API Route
 * Progressive filtering: Step 2 - Stream Selection
 * 
 * Requirements: 2.1, 2.4
 * - Display all streams available within selected class
 * - Include stream metadata (name, student count)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'

export interface ClassStreamsResponse {
  streams: {
    id: string;
    name: string;
    studentCount: number;
  }[];
}

/**
 * GET /api/teacher/marks/classes/[classId]/streams
 * Returns streams available in the selected class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/classes/[classId]/streams - Starting request for class:', params.classId)
    
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

    // Verify teacher has access to this class
    const hasClassAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: params.classId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: params.classId,
      },
    })

    if (!hasClassAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          details: 'You do not have permission to access this class.'
        },
        { status: 403 }
      )
    }

    // Get streams for the class
    const streams = await prisma.stream.findMany({
      where: {
        classId: params.classId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get student count for each stream
    const streamsWithCount = await Promise.all(
      streams.map(async (stream) => {
        const studentCount = await prisma.student.count({
          where: {
            classId: params.classId,
            streamId: stream.id,
            status: StudentStatus.ACTIVE,
          },
        })

        return {
          id: stream.id,
          name: stream.name,
          studentCount,
        }
      })
    )

    console.log('✅ [API] /api/teacher/marks/classes/[classId]/streams - Successfully returning', streamsWithCount.length, 'streams')
    return NextResponse.json({ streams: streamsWithCount })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/classes/[classId]/streams - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch class streams',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}