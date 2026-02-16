/**
 * Teacher Marks Management - Streams API Route
 * Progressive filtering: Step 2 - Stream Selection
 * 
 * Requirements: 1.1, 1.2, 1.3, 11.1, 11.2
 * - Display streams for selected class
 * - Include student count per stream
 * - Handle classes without streams
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentStatus } from '@/types/enums'

export interface StreamsResponse {
  streams: {
    id: string;
    name: string;
    studentCount: number;
  }[];
}

/**
 * GET /api/teacher/marks/classes/[classId]/streams
 * Returns streams for a specific class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/classes/[classId]/streams - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] Streams - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access marks management'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] Streams - No school context')
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

    // Get streams for the class
    const streams = await prisma.stream.findMany({
      where: {
        classId,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            students: {
              where: {
                status: StudentStatus.ACTIVE,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    const streamsResponse = streams.map(stream => ({
      id: stream.id,
      name: stream.name,
      studentCount: stream._count.students,
    }))

    console.log('✅ [API] Streams - Successfully returning', streamsResponse.length, 'streams')
    return NextResponse.json({ streams: streamsResponse })

  } catch (error: any) {
    console.error('❌ [API] Streams - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch streams',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}
