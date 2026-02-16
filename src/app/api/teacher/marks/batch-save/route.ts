/**
 * Teacher Marks Management - Batch Save API
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * - Support mixed CA and exam entries in single request
 * - Validate all entries before saving any
 * - Implement transaction-based saving for data integrity
 * - Add submission workflow integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { gradingEngine } from '@/lib/grading-engine'
import { z } from 'zod'
import { 
  withErrorHandling, 
  Errors, 
  assertExists, 
  assertOrThrow,
  validateRequestBody 
} from '@/lib/api-errors'
import { formatApiError } from '@/lib/error-messages'
import { invalidateMarksCaches } from '@/lib/performance-cache'

// Validation schemas
const CAEntrySchema = z.object({
  type: z.literal('CA'),
  studentId: z.string().min(1, 'Student ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  name: z.string().min(1, 'CA entry name is required').max(100, 'Name too long'),
  caType: z.enum(['ASSIGNMENT', 'TEST', 'PROJECT', 'PRACTICAL', 'OBSERVATION']),
  maxScore: z.number().min(1, 'Maximum score must be greater than 0').max(1000, 'Maximum score too high'),
  rawScore: z.number().min(0, 'Score cannot be negative'),
  competencyId: z.string().optional(),
  competencyComment: z.string().max(500, 'Comment too long').optional(),
})

const ExamEntrySchema = z.object({
  type: z.literal('EXAM'),
  studentId: z.string().min(1, 'Student ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  examScore: z.number().min(0, 'Exam score cannot be negative').max(100, 'Exam score cannot exceed 100'),
  examDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid exam date'),
})

const BatchSaveSchema = z.object({
  entries: z.array(z.union([CAEntrySchema, ExamEntrySchema])).min(1, 'At least one entry is required'),
  submitForApproval: z.boolean().default(false),
})

export interface BatchSaveRequest {
  entries: (
    | { type: 'CA'; studentId: string; subjectId: string; name: string; caType: string; maxScore: number; rawScore: number; competencyId?: string; competencyComment?: string; }
    | { type: 'EXAM'; studentId: string; subjectId: string; examScore: number; examDate: string; }
  )[];
  submitForApproval: boolean;
}

/**
 * POST /api/teacher/marks/batch-save
 * Save multiple mark entries in a single transaction with enhanced error handling
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  console.log('🔍 [API] /api/teacher/marks/batch-save - POST - Starting request')
  
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
      firstName: true,
      lastName: true,
    },
  })

  assertExists(staff, 'Staff profile')

  // Parse and validate request body with enhanced error handling
  const body = await request.json().catch(() => {
    throw Errors.BadRequest('Invalid JSON in request body')
  })

  const data = validateRequestBody<BatchSaveRequest>(body, (data) => {
    const result = BatchSaveSchema.safeParse(data)
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

  // Enhanced batch validation with detailed error reporting
  const caEntries = data.entries.filter(e => e.type === 'CA') as any[]
  const examEntries = data.entries.filter(e => e.type === 'EXAM') as any[]

  const batchValidation = gradingEngine.batchValidateEntries(
    caEntries.map(e => ({ rawScore: e.rawScore, maxScore: e.maxScore })),
    examEntries.map(e => ({ examScore: e.examScore }))
  )

  if (!batchValidation.isValid) {
    throw Errors.ValidationError(
      { batch: batchValidation.errors },
      'Batch validation failed'
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

  assertExists(currentTerm, 'Active academic term')

  // Get all unique student and subject IDs for validation
  const studentIds = [...new Set(data.entries.map(e => e.studentId))]
  const subjectIds = [...new Set(data.entries.map(e => e.subjectId))]

  // Verify all students exist and get their details
  const students = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      schoolId,
    },
    select: {
      id: true,
      classId: true,
      firstName: true,
      lastName: true,
    },
  })

  if (students.length !== studentIds.length) {
    const foundIds = students.map(s => s.id)
    const missingIds = studentIds.filter(id => !foundIds.includes(id))
    throw Errors.NotFound(`Students not found: ${missingIds.join(', ')}`)
  }

  // Create student lookup for efficient access
  const studentLookup = students.reduce((acc, student) => {
    acc[student.id] = student
    return acc
  }, {} as Record<string, typeof students[0]>)

  // Verify teacher has access to all student-subject combinations
  const classIds = [...new Set(students.map(s => s.classId))]
  const accessErrors: string[] = []
  
  for (const classId of classIds) {
    for (const subjectId of subjectIds) {
      const hasAccess = await prisma.staffSubject.findFirst({
        where: {
          staffId: staff.id,
          classId,
          subjectId,
        },
      }) || await prisma.staffClass.findFirst({
        where: {
          staffId: staff.id,
          classId,
        },
      })

      if (!hasAccess) {
        accessErrors.push(`No access to class ${classId} and subject ${subjectId}`)
      }
    }
  }

  if (accessErrors.length > 0) {
    throw Errors.Forbidden(`Access denied: ${accessErrors.join(', ')}`)
  }

  // Use transaction to ensure data integrity with detailed error tracking
  const result = await prisma.$transaction(async (tx) => {
    const createdEntries: { type: string; id: string; studentName: string; entryName?: string; }[] = []
    const errors: string[] = []
    const warnings: string[] = []

    // Process CA entries
    for (const [index, entry] of caEntries.entries()) {
      try {
        const student = studentLookup[entry.studentId]
        const studentName = `${student.firstName} ${student.lastName}`

        // Check for existing approved CA entries
        const existingApprovedCA = await tx.cAEntry.findFirst({
          where: {
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            termId: currentTerm.id,
            name: entry.name,
            status: 'APPROVED',
          },
        })

        if (existingApprovedCA) {
          errors.push(`CA entry "${entry.name}" for ${studentName}: Cannot create duplicate of approved CA entry`)
          continue
        }

        // Check for existing draft CA entries with same name
        const existingDraftCA = await tx.cAEntry.findFirst({
          where: {
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            termId: currentTerm.id,
            name: entry.name,
            status: 'DRAFT',
          },
        })

        if (existingDraftCA) {
          warnings.push(`CA entry "${entry.name}" for ${studentName}: Updating existing draft entry`)
          
          // Update existing draft
          const updatedCA = await tx.cAEntry.update({
            where: { id: existingDraftCA.id },
            data: {
              type: entry.caType,
              maxScore: entry.maxScore,
              rawScore: entry.rawScore,
              competencyId: entry.competencyId,
              competencyComment: entry.competencyComment,
              status: data.submitForApproval ? 'SUBMITTED' : 'DRAFT',
              submittedAt: data.submitForApproval ? new Date() : undefined,
              updatedAt: new Date(),
            },
          })
          
          createdEntries.push({ 
            type: 'CA_UPDATE', 
            id: updatedCA.id, 
            studentName,
            entryName: entry.name
          })
        } else {
          // Create new CA entry
          const caEntry = await tx.cAEntry.create({
            data: {
              studentId: entry.studentId,
              subjectId: entry.subjectId,
              teacherId: staff.id,
              termId: currentTerm.id,
              name: entry.name,
              type: entry.caType,
              maxScore: entry.maxScore,
              rawScore: entry.rawScore,
              date: new Date(),
              competencyId: entry.competencyId,
              competencyComment: entry.competencyComment,
              status: data.submitForApproval ? 'SUBMITTED' : 'DRAFT',
              submittedAt: data.submitForApproval ? new Date() : undefined,
            },
          })
          
          createdEntries.push({ 
            type: 'CA', 
            id: caEntry.id, 
            studentName,
            entryName: entry.name
          })
        }
      } catch (error: any) {
        const student = studentLookup[entry.studentId]
        const studentName = `${student.firstName} ${student.lastName}`
        errors.push(`CA entry "${entry.name}" for ${studentName}: ${error.message}`)
      }
    }

    // Process exam entries
    for (const [index, entry] of examEntries.entries()) {
      try {
        const student = studentLookup[entry.studentId]
        const studentName = `${student.firstName} ${student.lastName}`

        // Check if exam entry already exists
        const existingExam = await tx.examEntry.findUnique({
          where: {
            studentId_subjectId_termId: {
              studentId: entry.studentId,
              subjectId: entry.subjectId,
              termId: currentTerm.id,
            },
          },
        })

        if (existingExam) {
          // Check if existing exam entry is locked (approved)
          if (existingExam.status === 'APPROVED') {
            errors.push(`Exam entry for ${studentName}: Cannot update approved exam entries`)
            continue
          }

          warnings.push(`Exam entry for ${studentName}: Updating existing exam score`)

          // Update existing exam entry
          const updatedExam = await tx.examEntry.update({
            where: { id: existingExam.id },
            data: {
              examScore: entry.examScore,
              examDate: new Date(entry.examDate),
              status: data.submitForApproval ? 'SUBMITTED' : 'DRAFT',
              submittedAt: data.submitForApproval ? new Date() : undefined,
              updatedAt: new Date(),
            },
          })
          
          createdEntries.push({ 
            type: 'EXAM_UPDATE', 
            id: updatedExam.id, 
            studentName
          })
        } else {
          // Create new exam entry
          const examEntry = await tx.examEntry.create({
            data: {
              studentId: entry.studentId,
              subjectId: entry.subjectId,
              teacherId: staff.id,
              termId: currentTerm.id,
              examScore: entry.examScore,
              maxScore: 100,
              examDate: new Date(entry.examDate),
              status: data.submitForApproval ? 'SUBMITTED' : 'DRAFT',
              submittedAt: data.submitForApproval ? new Date() : undefined,
            },
          })
          
          createdEntries.push({ 
            type: 'EXAM', 
            id: examEntry.id, 
            studentName
          })
        }
      } catch (error: any) {
        const student = studentLookup[entry.studentId]
        const studentName = `${student.firstName} ${student.lastName}`
        errors.push(`Exam entry for ${studentName}: ${error.message}`)
      }
    }

    // If there are critical errors, rollback transaction
    if (errors.length > 0 && createdEntries.length === 0) {
      throw new Error(`All entries failed: ${errors.join('; ')}`)
    }

    return { createdEntries, errors, warnings }
  })

  // Invalidate caches for affected classes and subjects
  const affectedClassIds = [...new Set(students.map(s => s.classId))];
  affectedClassIds.forEach(classId => {
    subjectIds.forEach(subjectId => {
      invalidateMarksCaches(classId, subjectId);
    });
  });

  const successCount = result.createdEntries.length
  const errorCount = result.errors.length
  const warningCount = result.warnings.length

  console.log(`✅ [API] /api/teacher/marks/batch-save - POST - Completed: ${successCount} success, ${errorCount} errors, ${warningCount} warnings`)
  
  // Determine response based on results
  if (successCount > 0 && errorCount === 0) {
    // Complete success
    return NextResponse.json({ 
      success: true,
      message: `Successfully saved ${successCount} entries${data.submitForApproval ? ' and submitted for approval' : ''}`,
      entries: result.createdEntries,
      warnings: result.warnings,
      submitted: data.submitForApproval,
      stats: {
        total: data.entries.length,
        successful: successCount,
        errors: errorCount,
        warnings: warningCount,
      }
    })
  } else if (successCount > 0 && errorCount > 0) {
    // Partial success
    return NextResponse.json({ 
      success: true,
      message: `Partially completed: ${successCount} entries saved, ${errorCount} failed`,
      entries: result.createdEntries,
      errors: result.errors,
      warnings: result.warnings,
      submitted: data.submitForApproval,
      stats: {
        total: data.entries.length,
        successful: successCount,
        errors: errorCount,
        warnings: warningCount,
      }
    }, { status: 207 }) // 207 Multi-Status
  } else {
    // Complete failure
    throw Errors.BadRequest(`Batch save failed: ${result.errors.join('; ')}`)
  }
})