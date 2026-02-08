/**
 * Teacher Marks Management - Exam Entry Management API
 * 
 * Requirements: 25.1, 25.2, 25.4, 25.5
 * - Create exam entries (one per student-subject-term)
 * - Validate exam scores against 100 maximum
 * - Enforce unique constraint per student-subject-term
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { gradingEngine } from '@/lib/grading-engine'
import { z } from 'zod'

// Validation schema for exam entry creation
const CreateExamEntrySchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  examScore: z.number().min(0, 'Exam score cannot be negative').max(100, 'Exam score cannot exceed 100'),
  examDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid exam date'),
})

export interface CreateExamEntryRequest {
  studentId: string;
  subjectId: string;
  examScore: number;
  examDate: string;
}

/**
 * POST /api/teacher/marks/exam-entry
 * Create a new exam entry
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/exam-entry - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to create exam entries'
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
    const validationResult = CreateExamEntrySchema.safeParse(body)
    
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

    // Validate exam score
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
          details: 'You do not have permission to create exam entries for this student and subject.'
        },
        { status: 403 }
      )
    }

    // Check if exam entry already exists for this student-subject-term combination
    const existingExam = await prisma.examEntry.findUnique({
      where: {
        studentId_subjectId_termId: {
          studentId: data.studentId,
          subjectId: data.subjectId,
          termId: currentTerm.id,
        },
      },
    })

    if (existingExam) {
      return NextResponse.json(
        { 
          error: 'Exam entry already exists',
          details: 'An exam entry already exists for this student and subject in the current term. Use the update endpoint to modify it.'
        },
        { status: 409 }
      )
    }

    // Create exam entry
    const examEntry = await prisma.examEntry.create({
      data: {
        studentId: data.studentId,
        subjectId: data.subjectId,
        teacherId: staff.id,
        termId: currentTerm.id,
        examScore: data.examScore,
        maxScore: 100, // Always 100 for exams
        examDate: new Date(data.examDate),
        status: 'DRAFT',
      },
    })

    console.log('✅ [API] /api/teacher/marks/exam-entry - POST - Successfully created exam entry:', examEntry.id)
    return NextResponse.json({ 
      success: true,
      examEntry: {
        id: examEntry.id,
        examScore: examEntry.examScore,
        maxScore: examEntry.maxScore,
        examContribution: gradingEngine.calculateExamContribution({
          ...examEntry,
          status: examEntry.status as any,
          createdAt: examEntry.createdAt,
          updatedAt: examEntry.updatedAt,
        }),
      }
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/exam-entry - POST - Error:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          error: 'Exam entry already exists',
          details: 'An exam entry already exists for this student and subject in the current term.'
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create exam entry',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}