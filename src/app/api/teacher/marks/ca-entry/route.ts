/**
 * Teacher Marks Management - CA Entry Management API
 * 
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 29.1, 29.2
 * - Create CA entries with custom naming and max scores
 * - Support all CA types (Assignment, Test, Project, Practical, Observation)
 * - Include competency linking functionality
 * - Validate marks against maximum scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { gradingEngine } from '@/lib/grading-engine'
import { z } from 'zod'

// Validation schema for CA entry creation
const CreateCAEntrySchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  name: z.string().min(1, 'CA entry name is required').max(100, 'Name too long'),
  type: z.enum(['ASSIGNMENT', 'TEST', 'PROJECT', 'PRACTICAL', 'OBSERVATION']),
  maxScore: z.number().min(1, 'Maximum score must be greater than 0').max(1000, 'Maximum score too high'),
  rawScore: z.number().min(0, 'Score cannot be negative'),
  competencyId: z.string().optional(),
  competencyComment: z.string().max(500, 'Comment too long').optional(),
})

export interface CreateCAEntryRequest {
  studentId: string;
  subjectId: string;
  name: string;
  type: 'ASSIGNMENT' | 'TEST' | 'PROJECT' | 'PRACTICAL' | 'OBSERVATION';
  maxScore: number;
  rawScore: number;
  competencyId?: string;
  competencyComment?: string;
}

/**
 * POST /api/teacher/marks/ca-entry
 * Create a new CA entry
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/ca-entry - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to create CA entries'
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

    // Parse and validate request body
    const body = await request.json()
    const validationResult = CreateCAEntrySchema.safeParse(body)
    
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

    // Validate score against maximum
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

    // Get current active term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true,
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No active term found',
          details: 'No current academic term is active. Please contact your school administrator.'
        },
        { status: 400 }
      )
    }

    // Verify student exists and is in teacher's accessible classes
    const student = await prisma.student.findUnique({
      where: {
        id: data.studentId,
      },
      select: {
        id: true,
        classId: true,
        schoolId: true,
      },
    })

    if (!student || student.schoolId !== schoolId) {
      return NextResponse.json(
        { 
          error: 'Student not found',
          details: 'The specified student could not be found or is not in your school.'
        },
        { status: 404 }
      )
    }

    // Verify teacher has access to this student's class and subject
    const hasAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: student.classId,
        subjectId: data.subjectId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: student.classId,
      },
    })

    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          details: 'You do not have permission to create CA entries for this student and subject.'
        },
        { status: 403 }
      )
    }

    // Create CA entry
    const caEntry = await prisma.cAEntry.create({
      data: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        teacherId: staff.id,
        termId: currentTerm.id,
        name: data.name,
        type: data.type,
        maxScore: data.maxScore,
        rawScore: data.rawScore,
        date: new Date(),
        competencyId: data.competencyId,
        competencyComment: data.competencyComment,
        status: 'DRAFT',
      },
    })

    console.log('✅ [API] /api/teacher/marks/ca-entry - POST - Successfully created CA entry:', caEntry.id)
    return NextResponse.json({ 
      success: true,
      caEntry: {
        id: caEntry.id,
        name: caEntry.name,
        type: caEntry.type,
        maxScore: caEntry.maxScore,
        rawScore: caEntry.rawScore,
        percentage: gradingEngine.calculateCAPercentage(caEntry.rawScore, caEntry.maxScore),
      }
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/ca-entry - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create CA entry',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}