/**
 * Teacher Marks Management - CA Entry Update/Delete API
 * 
 * Requirements: 23.6, 28.3
 * - Allow teachers to edit CA entries until they are submitted
 * - Prevent editing of approved CA entries
 * - Support CA entry deletion
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { gradingEngine } from '@/lib/grading-engine'
import { validateMarksEntryAccess, getLockedMarksErrorMessage } from '@/lib/marks-access-control'
import { z } from 'zod'

// Validation schema for CA entry update
const UpdateCAEntrySchema = z.object({
  name: z.string().min(1, 'CA entry name is required').max(100, 'Name too long').optional(),
  type: z.enum(['ASSIGNMENT', 'TEST', 'PROJECT', 'PRACTICAL', 'OBSERVATION']).optional(),
  maxScore: z.number().min(1, 'Maximum score must be greater than 0').max(1000, 'Maximum score too high').optional(),
  rawScore: z.number().min(0, 'Score cannot be negative').optional(),
  competencyId: z.string().optional(),
  competencyComment: z.string().max(500, 'Comment too long').optional(),
})

/**
 * PUT /api/teacher/marks/ca-entry/[id]
 * Update an existing CA entry
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/ca-entry/[id] - PUT - Starting request for ID:', params.id)
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to update CA entries'
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

    // Get existing CA entry
    const existingEntry = await prisma.cAEntry.findUnique({
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
          error: 'CA entry not found',
          details: 'The specified CA entry could not be found.'
        },
        { status: 404 }
      )
    }

    // Check if entry is locked (approved) and validate access
    const accessValidation = validateMarksEntryAccess(existingEntry.status, session, 'CA')
    if (accessValidation) {
      return NextResponse.json(accessValidation, { status: 403 })
    }

    // Verify teacher has access to this CA entry
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
          details: 'You do not have permission to edit this CA entry.'
        },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = UpdateCAEntrySchema.safeParse(body)
    
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

    // Validate score against maximum if both are provided
    if (data.rawScore !== undefined && data.maxScore !== undefined) {
      const scoreValidation = gradingEngine.validateCAEntry(data.rawScore, data.maxScore)
      if (!scoreValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Score validation failed',
            details: scoreValidation.error
          },
          { status: 400 }
        )
      }
    } else if (data.rawScore !== undefined) {
      // Validate against existing max score
      const scoreValidation = gradingEngine.validateCAEntry(data.rawScore, existingEntry.maxScore)
      if (!scoreValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Score validation failed',
            details: scoreValidation.error
          },
          { status: 400 }
        )
      }
    } else if (data.maxScore !== undefined) {
      // Validate existing score against new max score
      const scoreValidation = gradingEngine.validateCAEntry(existingEntry.rawScore, data.maxScore)
      if (!scoreValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Score validation failed',
            details: `Existing score ${existingEntry.rawScore} exceeds new maximum ${data.maxScore}`
          },
          { status: 400 }
        )
      }
    }

    // Update CA entry
    const updatedEntry = await prisma.cAEntry.update({
      where: {
        id: params.id,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })

    console.log('✅ [API] /api/teacher/marks/ca-entry/[id] - PUT - Successfully updated CA entry:', updatedEntry.id)
    return NextResponse.json({ 
      success: true,
      caEntry: {
        id: updatedEntry.id,
        name: updatedEntry.name,
        type: updatedEntry.type,
        maxScore: updatedEntry.maxScore,
        rawScore: updatedEntry.rawScore,
        percentage: gradingEngine.calculateCAPercentage(updatedEntry.rawScore, updatedEntry.maxScore),
      }
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/ca-entry/[id] - PUT - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update CA entry',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teacher/marks/ca-entry/[id]
 * Delete a CA entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/ca-entry/[id] - DELETE - Starting request for ID:', params.id)
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to delete CA entries'
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

    // Get existing CA entry
    const existingEntry = await prisma.cAEntry.findUnique({
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
          error: 'CA entry not found',
          details: 'The specified CA entry could not be found.'
        },
        { status: 404 }
      )
    }

    // Check if entry is locked (approved) and validate access
    const accessValidation = validateMarksEntryAccess(existingEntry.status, session, 'CA')
    if (accessValidation) {
      return NextResponse.json(accessValidation, { status: 403 })
    }

    // Verify teacher has access to this CA entry
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
          details: 'You do not have permission to delete this CA entry.'
        },
        { status: 403 }
      )
    }

    // Delete CA entry
    await prisma.cAEntry.delete({
      where: {
        id: params.id,
      },
    })

    console.log('✅ [API] /api/teacher/marks/ca-entry/[id] - DELETE - Successfully deleted CA entry:', params.id)
    return NextResponse.json({ 
      success: true,
      message: 'CA entry deleted successfully'
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/ca-entry/[id] - DELETE - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to delete CA entry',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}