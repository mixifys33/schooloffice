import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * ASSIGNMENT MANAGEMENT API
 * 
 * Allows Admin and School Admin to create, update, and delete teaching assignments.
 * This is where the truth table is maintained.
 * 
 * Core Principle: OWNERSHIP
 * - Admin owns staffing decisions
 * - DoS owns academic structure but cannot assign staff
 * - Teachers cannot negotiate assignments
 */

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin and School Admin can create assignments
    const allowedRoles = [Role.ADMIN, Role.SCHOOL_ADMIN]
    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const { teacherId, classId, subjectId, isPrimary } = await request.json()

    if (!teacherId || !classId || !subjectId) {
      return NextResponse.json({ 
        error: 'Missing required fields: teacherId, classId, subjectId' 
      }, { status: 400 })
    }

    // Get current term
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true }
    })

    if (!currentAcademicYear) {
      return NextResponse.json({ error: 'No current academic year found' }, { status: 400 })
    }

    const currentTerm = await prisma.term.findFirst({
      where: { academicYearId: currentAcademicYear.id, isCurrent: true }
    })

    if (!currentTerm) {
      return NextResponse.json({ error: 'No current term found' }, { status: 400 })
    }

    // Verify the teacher belongs to this school
    const teacher = await prisma.staff.findFirst({
      where: { id: teacherId, schoolId, isActive: true }
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found or inactive' }, { status: 400 })
    }

    // Verify the class belongs to this school
    const classData = await prisma.class.findFirst({
      where: { id: classId, schoolId, isActive: true }
    })

    if (!classData) {
      return NextResponse.json({ error: 'Class not found or inactive' }, { status: 400 })
    }

    // Verify the curriculum subject exists (class-subject relationship)
    const curriculumSubject = await prisma.curriculumSubject.findFirst({
      where: {
        classId,
        subjectId,
        isActive: true
      },
      include: {
        subject: true
      }
    })

    if (!curriculumSubject) {
      return NextResponse.json({ 
        error: 'This subject is not assigned to this class' 
      }, { status: 400 })
    }

    if (!curriculumSubject.subject.isActive) {
      return NextResponse.json({ 
        error: 'Inactive subjects cannot be assigned' 
      }, { status: 400 })
    }

    // Check for existing assignment
    const existingAssignment = await prisma.staffSubject.findFirst({
      where: {
        staffId: teacherId,
        curriculumSubjectId: curriculumSubject.id,
        termId: currentTerm.id
      }
    })

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'This teacher is already assigned to this subject' 
      }, { status: 400 })
    }

    // If this is a primary assignment, check for conflicts
    if (isPrimary) {
      const existingPrimary = await prisma.staffSubject.findFirst({
        where: {
          curriculumSubjectId: curriculumSubject.id,
          termId: currentTerm.id,
          isPrimary: true
        },
        include: {
          staff: true
        }
      })

      if (existingPrimary) {
        return NextResponse.json({ 
          error: `${existingPrimary.staff.firstName} ${existingPrimary.staff.lastName} is already the primary teacher for this subject` 
        }, { status: 400 })
      }
    }

    // Create the assignment
    const assignment = await prisma.staffSubject.create({
      data: {
        staffId: teacherId,
        curriculumSubjectId: curriculumSubject.id,
        termId: currentTerm.id,
        isPrimary: isPrimary || false,
        createdBy: session.user.id
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            employeeNumber: true
          }
        },
        curriculumSubject: {
          include: {
            subject: {
              select: {
                name: true,
                code: true
              }
            },
            class: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Assignment created successfully',
      assignment: {
        id: assignment.id,
        teacher: `${assignment.staff.firstName} ${assignment.staff.lastName}`,
        class: assignment.curriculumSubject.class.name,
        subject: assignment.curriculumSubject.subject.name,
        isPrimary: assignment.isPrimary
      }
    })

  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin and School Admin can delete assignments
    const allowedRoles = [Role.ADMIN, Role.SCHOOL_ADMIN]
    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('id')

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 })
    }

    // For the composite ID format "teacherId-classId-subjectId", we need to parse it
    const parts = assignmentId.split('-')
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid assignment ID format' }, { status: 400 })
    }

    const [teacherId, classId, subjectId] = parts

    // Get current term
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId: session.user.schoolId, isCurrent: true }
    })

    if (!currentAcademicYear) {
      return NextResponse.json({ error: 'No current academic year found' }, { status: 400 })
    }

    const currentTerm = await prisma.term.findFirst({
      where: { academicYearId: currentAcademicYear.id, isCurrent: true }
    })

    if (!currentTerm) {
      return NextResponse.json({ error: 'No current term found' }, { status: 400 })
    }

    // Find the curriculum subject
    const curriculumSubject = await prisma.curriculumSubject.findFirst({
      where: { classId, subjectId }
    })

    if (!curriculumSubject) {
      return NextResponse.json({ error: 'Curriculum subject not found' }, { status: 400 })
    }

    // Find and delete the assignment
    const assignment = await prisma.staffSubject.findFirst({
      where: {
        staffId: teacherId,
        curriculumSubjectId: curriculumSubject.id,
        termId: currentTerm.id
      }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    await prisma.staffSubject.delete({
      where: { id: assignment.id }
    })

    return NextResponse.json({ message: 'Assignment deleted successfully' })

  } catch (error) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    )
  }
}