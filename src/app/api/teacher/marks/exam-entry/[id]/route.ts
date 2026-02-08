/**
 * Teacher Marks Management - Exam Entry Update API
 * 
 * Requirements: 25.5, 28.3
 * - Allow teachers to update exam entries until they are approved
 * - Prevent editing of approved exam entries
 * - Validate exam scores do not exceed 100
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { gradingEngine } from '@/lib/grading-engine'
import { validateMarksEntryAccess } from '@/lib/marks-access-control'
import { z } from 'zod'

// Validation schema for exam entry update
const UpdateExamEntrySchema = z.object({
  examScore: z.number().min(0, 'Exam score cannot be negative').max(100, 'Exam score cannot exceed 100').optional(),
  examDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid exam date').optional(),
})

/**
 * PUT /api/teacher/marks/exam-entry/[id]
 * Update an existing exam entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/exam-entry/[id] - PUT - Starting request for ID:', params.id)
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to update exam entries'
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

    // Get existing exam entry
    const existingEntry = await prisma.examEntry.findUnique({
      where: {
        id: params.id,
      },
      include: {
        student: {
          select: {
            classId: true,
          },
        },
      },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { 
          error: 'Exam entry not found',
          details: 'The specified exam entry could not be found.'
        },
        { status: 404 }
      )
    }

    // Check if entry is locked (approved) and validate access
    const accessValidation = validateMarksEntryAccess(existingEntry.status, session, 'EXAM')
    if (accessValidation) {
      return NextResponse.json(accessValidation, { status: 403 })
    }

    // Verify teacher has access to this exam entry
    const hasAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: existingEntry.student.classId,
        subjectId: existingEntry.subjectId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: existingEntry.student.classId,
      },
    })

    if (!hasAccess && existingEntry.teacherId !== staff.id) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          details: 'You do not have permission to edit this exam entry.'
        },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = UpdateExamEntrySchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Validate exam score if provided
    if (data.examScore !== undefined) {
      const scoreValidation = gradingEngine.validateExamEntry(data.examScore)
      if (!scoreValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Score validation failed',
            details: scoreValidation.error
          },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.examScore !== undefined) {
      updateData.examScore = data.examScore
    }

    if (data.examDate !== undefined) {
      updateData.examDate = new Date(data.examDate)
    }

    // Update exam entry
    const updatedEntry = await prisma.examEntry.update({
      where: {
        id: params.id,
      },
      data: updateData,
    })

    console.log('✅ [API] /api/teacher/marks/exam-entry/[id] - PUT - Successfully updated exam entry:', updatedEntry.id)
    return NextResponse.json({ 
      success: true,
      examEntry: {
        id: updatedEntry.id,
        examScore: updatedEntry.examScore,
        maxScore: updatedEntry.maxScore,
        examContribution: gradingEngine.calculateExamContribution({
          ...updatedEntry,
          status: updatedEntry.status as any,
          createdAt: updatedEntry.createdAt,
          updatedAt: updatedEntry.updatedAt,
        }),
      }
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/exam-entry/[id] - PUT - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update exam entry',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teacher/marks/exam-entry/[id]
 * Delete an exam entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/exam-entry/[id] - DELETE - Starting request for ID:', params.id)
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to delete exam entries'
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

    // Get existing exam entry
    const existingEntry = await prisma.examEntry.findUnique({
      where: {
        id: params.id,
      },
      include: {
        student: {
          select: {
            classId: true,
          },
        },
      },
    })

    if (!existingEntry) {
      return NextResponse.json(
        { 
          error: 'Exam entry not found',
          details: 'The specified exam entry could not be found.'
        },
        { status: 404 }
      )
    }

    // Check if entry is locked (approved) and validate access
    const accessValidation = validateMarksEntryAccess(existingEntry.status, session, 'EXAM')
    if (accessValidation) {
      return NextResponse.json(accessValidation, { status: 403 })
    }

    // Verify teacher has access to this exam entry
    const hasAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: existingEntry.student.classId,
        subjectId: existingEntry.subjectId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: existingEntry.student.classId,
      },
    })

    if (!hasAccess && existingEntry.teacherId !== staff.id) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          details: 'You do not have permission to delete this exam entry.'
        },
        { status: 403 }
      )
    }

    // Delete exam entry
    await prisma.examEntry.delete({
      where: {
        id: params.id,
      },
    })

    console.log('✅ [API] /api/teacher/marks/exam-entry/[id] - DELETE - Successfully deleted exam entry:', params.id)
    return NextResponse.json({ 
      success: true,
      message: 'Exam entry deleted successfully'
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/exam-entry/[id] - DELETE - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to delete exam entry',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}