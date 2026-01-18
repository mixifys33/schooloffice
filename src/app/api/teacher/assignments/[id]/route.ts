/**
 * Teacher Assignment Detail API
 * Requirements: 7.1-7.5 - Assignment Management Module
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { assignmentService, AssignmentValidationError } from '@/services/assignment.service'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/teacher/assignments/[id]
 * Get a specific assignment with submission status
 * Requirement 7.3: Display submission status for each student
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

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

    const assignment = await assignmentService.getAssignmentWithSubmissions(
      id,
      teacher.id,
      session.user.schoolId
    )

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Error fetching assignment:', error)
    
    if (error instanceof AssignmentValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'NOT_FOUND' ? 404 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    )
  }
}


/**
 * PUT /api/teacher/assignments/[id]
 * Update an assignment
 * Requirement 7.4: Prevent deadline modifications after deadline passes
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

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
    const { title, description, deadline, attachments } = body

    const assignment = await assignmentService.updateAssignment(
      id,
      teacher.id,
      session.user.schoolId,
      {
        title,
        description,
        deadline: deadline ? new Date(deadline) : undefined,
        attachments,
      },
      session.user.id
    )

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Error updating assignment:', error)
    
    if (error instanceof AssignmentValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'NOT_FOUND' ? 404 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teacher/assignments/[id]
 * Delete an assignment
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user?.id || !session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

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

    await assignmentService.deleteAssignment(
      id,
      teacher.id,
      session.user.schoolId,
      session.user.id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    
    if (error instanceof AssignmentValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'NOT_FOUND' ? 404 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    )
  }
}
