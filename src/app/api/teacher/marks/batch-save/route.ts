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
 * Save multiple mark entries in a single transaction
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/batch-save - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to save marks'
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
    const validationResult = BatchSaveSchema.safeParse(body)
    
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

    // Batch validate all entries before saving
    const caEntries = data.entries.filter(e => e.type === 'CA') as any[]
    const examEntries = data.entries.filter(e => e.type === 'EXAM') as any[]

    const batchValidation = gradingEngine.batchValidateEntries(
      caEntries.map(e => ({ rawScore: e.rawScore, maxScore: e.maxScore })),
      examEntries.map(e => ({ examScore: e.examScore }))
    )

    if (!batchValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Batch validation failed',
          details: batchValidation.errors.join(', ')
        },
        { status: 400 }
      )
    }

    // Get all unique student IDs to verify access
    const studentIds = [...new Set(data.entries.map(e => e.studentId))]
    const subjectIds = [...new Set(data.entries.map(e => e.subjectId))]

    // Verify all students exist and get their class IDs
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId,
      },
      select: {
        id: true,
        classId: true,
      },
    })

    if (students.length !== studentIds.length) {
      return NextResponse.json(
        { 
          error: 'Some students not found',
          details: 'One or more students could not be found or are not in your school.'
        },
        { status: 404 }
      )
    }

    // Verify teacher has access to all student-subject combinations
    const classIds = [...new Set(students.map(s => s.classId))]
    
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
          return NextResponse.json(
            { 
              error: 'Access denied',
              details: `You do not have permission to enter marks for class ${classId} and subject ${subjectId}.`
            },
            { status: 403 }
          )
        }
      }
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      const createdEntries: { type: string; id: string; }[] = []
      const errors: string[] = []

      // Process CA entries
      for (const entry of caEntries) {
        try {
          // Check if there are any existing approved CA entries for this student-subject-term
          const existingApprovedCA = await tx.cAEntry.findFirst({
            where: {
              studentId: entry.studentId,
              subjectId: entry.subjectId,
              termId: currentTerm.id,
              name: entry.name, // Check for same CA entry name
              status: 'APPROVED',
            },
          })

          if (existingApprovedCA) {
            errors.push(`CA entry "${entry.name}" for student ${entry.studentId}: Cannot create duplicate of approved CA entry. Contact DoS for override.`)
            continue
          }

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
          
          createdEntries.push({ type: 'CA', id: caEntry.id })
        } catch (error: any) {
          errors.push(`CA entry for student ${entry.studentId}: ${error.message}`)
        }
      }

      // Process exam entries
      for (const entry of examEntries) {
        try {
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
              errors.push(`Exam entry for student ${entry.studentId}: Cannot update approved exam entries. Contact DoS for override.`)
              continue
            }

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
            
            createdEntries.push({ type: 'EXAM_UPDATE', id: updatedExam.id })
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
            
            createdEntries.push({ type: 'EXAM', id: examEntry.id })
          }
        } catch (error: any) {
          errors.push(`Exam entry for student ${entry.studentId}: ${error.message}`)
        }
      }

      if (errors.length > 0) {
        throw new Error(`Batch save failed: ${errors.join(', ')}`)
      }

      return createdEntries
    })

    console.log('✅ [API] /api/teacher/marks/batch-save - POST - Successfully saved', result.length, 'entries')
    return NextResponse.json({ 
      success: true,
      message: `Successfully saved ${result.length} entries`,
      entries: result,
      submitted: data.submitForApproval,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/batch-save - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Batch save failed',
        details: error.message || 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}