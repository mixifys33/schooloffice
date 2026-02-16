/**
 * Streams API Route
 * Requirements: 4.4 - Create stream via POST to /api/streams
 * Requirements: 4.5 - List streams via GET to /api/streams
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { getTeacherAssignments } from '@/lib/teacher-access'

// GET: List all streams for the school
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const userId = session.user.id as string
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Build where clause with school scoping
    const where: Record<string, unknown> = {
      class: {
        schoolId
      }
    }

    // Teachers can only view streams for their assigned classes
    if (userRole === Role.TEACHER) {
      const assignments = await getTeacherAssignments(userId)
      if (!assignments || assignments.classIds.length === 0) {
        return NextResponse.json({ streams: [] })
      }
      where.classId = { in: assignments.classIds }
    }

    const streams = await prisma.stream.findMany({
      where,
      include: {
        class: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: [
        { class: { level: 'asc' } },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      streams: streams.map(s => ({
        id: s.id,
        name: s.name,
        classId: s.classId,
        class: s.class,
        _count: s._count
      }))
    })
  } catch (error) {
    console.error('Error fetching streams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch streams' },
      { status: 500 }
    )
  }
}

// POST: Create a new stream for a class
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { classId, name } = body

    // Validate required fields
    if (!classId || typeof classId !== 'string') {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Stream name is required' },
        { status: 400 }
      )
    }

    // Verify class exists and belongs to the school
    const classRecord = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check for duplicate stream name in the same class
    const existingStream = await prisma.stream.findFirst({
      where: {
        classId,
        name: name.trim(),
      },
    })

    if (existingStream) {
      return NextResponse.json(
        { error: `Stream "${name}" already exists in this class` },
        { status: 400 }
      )
    }

    // Create the stream
    const newStream = await prisma.stream.create({
      data: {
        schoolId,
        classId,
        name: name.trim(),
      },
    })

    return NextResponse.json({
      id: newStream.id,
      classId: newStream.classId,
      name: newStream.name,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating stream:', error)
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    )
  }
}
