/**
 * Teacher Assignments API
 * Requirements: 7.1-7.5 - Assignment Management Module
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assignmentService, AssignmentValidationError } from '@/services/assignment.service'
import { prisma } from '@/lib/db'

/**
 * GET /api/teacher/assignments
 * Get all assignments for the logged-in teacher
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId: session.user.schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher record not found' },
        { status: 404 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId') || undefined
    const subjectId = searchParams.get('subjectId') || undefined
    const status = searchParams.get('status') || undefined

    const assignments = await assignmentService.getTeacherAssignments(
      teacher.id,
      session.user.schoolId,
      { classId, subjectId, status }
    )

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}


/**
 * POST /api/teacher/assignments
 * Create a new assignment
 * Requirement 7.1: Create assignment with subject, class, title, description, deadline, attachments
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId: session.user.schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher record not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { classId, subjectId, title, description, deadline, attachments } = body

    // Validate required fields
    if (!classId || !subjectId || !title || !description || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields: classId, subjectId, title, description, deadline' },
        { status: 400 }
      )
    }

    const assignment = await assignmentService.createAssignment(
      {
        schoolId: session.user.schoolId,
        teacherId: teacher.id,
        classId,
        subjectId,
        title,
        description,
        deadline: new Date(deadline),
        attachments: attachments || [],
      },
      session.user.id
    )

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Error creating assignment:', error)
    
    if (error instanceof AssignmentValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}
