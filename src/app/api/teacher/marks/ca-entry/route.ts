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
import { marksAuditService } from '@/services/marks-audit.service'
import { z } from 'zod'
import { 
  withErrorHandling, 
  Errors, 
  assertExists, 
  assertOrThrow,
  validateRequestBody 
} from '@/lib/api-errors'
import { formatApiError } from '@/lib/error-messages'

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
 * Create a new CA entry with enhanced error handling
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  console.log('🔍 [API] /api/teacher/marks/ca-entry - POST - Starting request')
  
  const session = await auth()
  assertOrThrow(!!session?.user, Errors.Unauthorized())

  // Verify user has appropriate role
  const userRole = session.user.activeRole || session.user.role
  assertOrThrow(
    userRole === Role.TEACHER || userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY,
    Errors.Forbidden('Teacher role required for marks entry')
  )

  const schoolId = session.user.schoolId
  assertOrThrow(!!schoolId, Errors.BadRequest('No school context found'))

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

  assertExists(staff, 'Staff profile')

  // Parse and validate request body with enhanced error handling
  const body = await request.json().catch(() => {
    throw Errors.BadRequest('Invalid JSON in request body')
  })

  const data = validateRequestBody<CreateCAEntryRequest>(body, (data) => {
    const result = CreateCAEntrySchema.safeParse(data)
    return {
      isValid: result.success,
      errors: result.success ? {} : result.error.errors.reduce((acc, err) => {
        const field = err.path.join('.')
        if (!acc[field]) acc[field] = []
        acc[field].push(err.message)
        return acc
      }, {} as Record<string, string[]>)
    }
  })

  // Enhanced score validation with detailed error messages
  const scoreValidation = gradingEngine.validateCAEntry(data.rawScore, data.maxScore)
  if (!scoreValidation.isValid) {
    throw Errors.ValidationError(
      { rawScore: [scoreValidation.error || 'Invalid score'] },
      'Score validation failed'
    )
  }

  // Get current active term with better error handling
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

  assertExists(currentTerm, 'Active academic term')

  // Verify student exists and is accessible
  const student = await prisma.student.findUnique({
    where: {
      id: data.studentId,
    },
    select: {
      id: true,
      classId: true,
      schoolId: true,
      firstName: true,
      lastName: true,
    },
  })

  assertExists(student, 'Student')
  assertOrThrow(
    student.schoolId === schoolId,
    Errors.Forbidden('Student not accessible in your school')
  )

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

  assertOrThrow(
    !!hasAccess,
    Errors.Forbidden(`Access denied for ${student.firstName} ${student.lastName} in this subject`)
  )

  // Check for duplicate CA entries with same name
  const existingCA = await prisma.cAEntry.findFirst({
    where: {
      studentId: data.studentId,
      subjectId: data.subjectId,
      termId: currentTerm.id,
      name: data.name,
    },
  })

  if (existingCA) {
    throw Errors.Conflict(`CA entry "${data.name}" already exists for this student and subject`)
  }

  // Create CA entry with transaction for data integrity
  const caEntry = await prisma.$transaction(async (tx) => {
    const newCAEntry = await tx.cAEntry.create({
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

    // Log audit entry for CA creation
    // Requirement 32.1: Maintain complete audit trails for all grading activities
    await marksAuditService.logCAEntryCreated({
      schoolId,
      entryId: newCAEntry.id,
      studentId: data.studentId,
      subjectId: data.subjectId,
      classId: student.classId,
      termId: currentTerm.id,
      teacherId: staff.id,
      caData: {
        name: data.name,
        type: data.type,
        maxScore: data.maxScore,
        rawScore: data.rawScore,
        percentage: gradingEngine.calculateCAPercentage(data.rawScore, data.maxScore),
        competencyId: data.competencyId,
        competencyComment: data.competencyComment,
      },
    })

    return newCAEntry
  })

  console.log('✅ [API] /api/teacher/marks/ca-entry - POST - Successfully created CA entry:', caEntry.id)
  
  return NextResponse.json({ 
    success: true,
    message: `CA entry "${data.name}" created successfully`,
    caEntry: {
      id: caEntry.id,
      name: caEntry.name,
      type: caEntry.type,
      maxScore: caEntry.maxScore,
      rawScore: caEntry.rawScore,
      percentage: gradingEngine.calculateCAPercentage(caEntry.rawScore, caEntry.maxScore),
      studentName: `${student.firstName} ${student.lastName}`,
    }
  })
})