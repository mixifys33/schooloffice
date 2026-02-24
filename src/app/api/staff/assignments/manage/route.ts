import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/staff/assignments/manage
 * Create a new staff assignment (teacher to class/subject)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Check if user has permission (admin or school admin)
    const userRole = session.user.role
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'DEPUTY') {
      return NextResponse.json(
        { error: 'You do not have permission to manage assignments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { teacherId, classId, subjectId, isPrimary } = body

    if (!teacherId || !classId || !subjectId) {
      return NextResponse.json(
        { error: 'Teacher, class, and subject are required' },
        { status: 400 }
      )
    }

    // Verify teacher exists and belongs to this school
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Verify class exists and belongs to this school
    const classExists = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
      },
    })

    if (!classExists) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Verify subject exists and belongs to this school
    const subjectExists = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
      },
    })

    if (!subjectExists) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId,
        classId,
        subjectId,
        schoolId,
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'This assignment already exists' },
        { status: 400 }
      )
    }

    // Create the assignment
    const assignment = await prisma.teacherAssignment.create({
      data: {
        schoolId,
        teacherId,
        classId,
        subjectId,
      },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            name: true,
          },
        },
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    })

    // Also update the teacher's assigned arrays for quick lookups
    // Only add if not already present
    const currentTeacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: {
        assignedClassIds: true,
        assignedSubjectIds: true,
      },
    })

    const updatedClassIds = currentTeacher?.assignedClassIds || []
    const updatedSubjectIds = currentTeacher?.assignedSubjectIds || []

    if (!updatedClassIds.includes(classId)) {
      updatedClassIds.push(classId)
    }
    if (!updatedSubjectIds.includes(subjectId)) {
      updatedSubjectIds.push(subjectId)
    }

    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        assignedClassIds: updatedClassIds,
        assignedSubjectIds: updatedSubjectIds,
      },
    })

    return NextResponse.json({
      message: 'Assignment created successfully',
      assignment,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/staff/assignments/manage
 * Delete a staff assignment
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Check if user has permission
    const userRole = session.user.role
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'DEPUTY') {
      return NextResponse.json(
        { error: 'You do not have permission to manage assignments' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('id')

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    // Verify assignment exists and belongs to this school
    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        id: assignmentId,
        schoolId,
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Delete the assignment
    await prisma.teacherAssignment.delete({
      where: { id: assignmentId },
    })

    return NextResponse.json({
      message: 'Assignment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/staff/assignments/manage
 * Get all staff assignments for the school
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: { schoolId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { teacher: { lastName: 'asc' } },
        { class: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}
