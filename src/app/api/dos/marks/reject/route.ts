/**
 * DoS Marks Rejection API
 * 
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 * - Implement POST /api/dos/marks/reject for rejecting submissions
 * - Add rejection workflow with proper authorization
 * - Return marks to draft status for teacher editing
 * - Add audit logging for all rejection actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole, MarksSubmissionStatus } from '@/types/enums'
import { z } from 'zod'

// Validation schema for rejection request
const RejectionRequestSchema = z.object({
  entryType: z.enum(['CA', 'EXAM'], { required_error: 'Entry type is required' }),
  entryIds: z.array(z.string().min(1, 'Entry ID cannot be empty')).min(1, 'At least one entry ID is required'),
  classId: z.string().min(1, 'Class ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  termId: z.string().optional(), // Optional - will use current term if not provided
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(500, 'Rejection reason cannot exceed 500 characters'),
  returnToDraft: z.boolean().default(true), // Whether to return to draft status for editing
})

export interface RejectionRequest {
  entryType: 'CA' | 'EXAM';
  entryIds: string[];
  classId: string;
  subjectId: string;
  termId?: string;
  rejectionReason: string;
  returnToDraft?: boolean;
}

/**
 * POST /api/dos/marks/reject
 * Reject CA or Exam entries and optionally return them to draft status
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/dos/marks/reject - POST - Starting rejection request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to reject marks'
      }, { status: 401 })
    }

    // Verify user has DoS role
    const userRole = session.user.activeRole || session.user.role
    const hasDoSAccess = userRole === Role.DOS || 
                        userRole === StaffRole.DOS || 
                        session.user.roles.includes(Role.DOS) || 
                        session.user.roles.includes(StaffRole.DOS) ||
                        userRole === Role.SCHOOL_ADMIN || // School admin can also reject
                        userRole === Role.DEPUTY // Deputy can also reject

    if (!hasDoSAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied. DoS role required.',
          details: `Current role: ${userRole}. DoS, School Admin, or Deputy access required.`
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

    // Get staff record for audit logging
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
    const validationResult = RejectionRequestSchema.safeParse(body)
    
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

    // Get current term if not provided
    let termId = data.termId
    if (!termId) {
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

      termId = currentTerm.id
    }

    // Verify class and subject exist and belong to the school
    const [classData, subjectData] = await Promise.all([
      prisma.class.findFirst({
        where: {
          id: data.classId,
          schoolId,
        },
        select: { id: true, name: true },
      }),
      prisma.subject.findFirst({
        where: {
          id: data.subjectId,
          schoolId,
        },
        select: { id: true, name: true },
      }),
    ])

    if (!classData) {
      return NextResponse.json(
        { 
          error: 'Class not found',
          details: 'The specified class could not be found or does not belong to your school.'
        },
        { status: 404 }
      )
    }

    if (!subjectData) {
      return NextResponse.json(
        { 
          error: 'Subject not found',
          details: 'The specified subject could not be found or does not belong to your school.'
        },
        { status: 404 }
      )
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      const rejectedEntries: { type: string; id: string; studentName: string; }[] = []
      const errors: string[] = []
      const now = new Date()

      // Determine new status based on returnToDraft flag
      const newStatus = data.returnToDraft ? MarksSubmissionStatus.DRAFT : MarksSubmissionStatus.REJECTED

      if (data.entryType === 'CA') {
        // Process CA entries
        for (const entryId of data.entryIds) {
          try {
            // Verify entry exists and is in submitted or approved status
            const caEntry = await tx.cAEntry.findFirst({
              where: {
                id: entryId,
                subjectId: data.subjectId,
                termId,
                status: { in: [MarksSubmissionStatus.SUBMITTED, MarksSubmissionStatus.APPROVED] },
              },
              include: {
                student: {
                  select: {
                    firstName: true,
                    lastName: true,
                    classId: true,
                  },
                },
              },
            })

            if (!caEntry) {
              errors.push(`CA entry ${entryId}: Not found or not in submitted/approved status`)
              continue
            }

            // Verify student belongs to the specified class
            if (caEntry.student.classId !== data.classId) {
              errors.push(`CA entry ${entryId}: Student does not belong to the specified class`)
              continue
            }

            // Reject the CA entry
            const rejectedEntry = await tx.cAEntry.update({
              where: { id: entryId },
              data: {
                status: newStatus,
                approvedAt: null, // Clear approval timestamp
                approvedBy: null, // Clear approver
                submittedAt: newStatus === MarksSubmissionStatus.DRAFT ? null : caEntry.submittedAt, // Clear submission if returning to draft
                updatedAt: now,
              },
            })

            rejectedEntries.push({
              type: 'CA',
              id: rejectedEntry.id,
              studentName: `${caEntry.student.firstName} ${caEntry.student.lastName}`,
            })

            // Create audit log entry
            await tx.marksAuditLog.create({
              data: {
                schoolId,
                entryType: 'CA',
                entryId: rejectedEntry.id,
                studentId: caEntry.studentId,
                subjectId: data.subjectId,
                classId: data.classId,
                termId,
                action: 'REJECTED',
                performedBy: staff.id,
                performedAt: now,
                comments: data.rejectionReason,
                metadata: {
                  caEntryName: caEntry.name,
                  caType: caEntry.type,
                  rawScore: caEntry.rawScore,
                  maxScore: caEntry.maxScore,
                  rejectorName: `${staff.firstName} ${staff.lastName}`,
                  returnedToDraft: data.returnToDraft,
                  previousStatus: caEntry.status,
                  newStatus,
                },
              },
            })

          } catch (error: any) {
            errors.push(`CA entry ${entryId}: ${error.message}`)
          }
        }
      } else if (data.entryType === 'EXAM') {
        // Process Exam entries
        for (const entryId of data.entryIds) {
          try {
            // Verify entry exists and is in submitted or approved status
            const examEntry = await tx.examEntry.findFirst({
              where: {
                id: entryId,
                subjectId: data.subjectId,
                termId,
                status: { in: [MarksSubmissionStatus.SUBMITTED, MarksSubmissionStatus.APPROVED] },
              },
              include: {
                student: {
                  select: {
                    firstName: true,
                    lastName: true,
                    classId: true,
                  },
                },
              },
            })

            if (!examEntry) {
              errors.push(`Exam entry ${entryId}: Not found or not in submitted/approved status`)
              continue
            }

            // Verify student belongs to the specified class
            if (examEntry.student.classId !== data.classId) {
              errors.push(`Exam entry ${entryId}: Student does not belong to the specified class`)
              continue
            }

            // Reject the exam entry
            const rejectedEntry = await tx.examEntry.update({
              where: { id: entryId },
              data: {
                status: newStatus,
                approvedAt: null, // Clear approval timestamp
                approvedBy: null, // Clear approver
                submittedAt: newStatus === MarksSubmissionStatus.DRAFT ? null : examEntry.submittedAt, // Clear submission if returning to draft
                updatedAt: now,
              },
            })

            rejectedEntries.push({
              type: 'EXAM',
              id: rejectedEntry.id,
              studentName: `${examEntry.student.firstName} ${examEntry.student.lastName}`,
            })

            // Create audit log entry
            await tx.marksAuditLog.create({
              data: {
                schoolId,
                entryType: 'EXAM',
                entryId: rejectedEntry.id,
                studentId: examEntry.studentId,
                subjectId: data.subjectId,
                classId: data.classId,
                termId,
                action: 'REJECTED',
                performedBy: staff.id,
                performedAt: now,
                comments: data.rejectionReason,
                metadata: {
                  examScore: examEntry.examScore,
                  maxScore: examEntry.maxScore,
                  examDate: examEntry.examDate.toISOString(),
                  rejectorName: `${staff.firstName} ${staff.lastName}`,
                  returnedToDraft: data.returnToDraft,
                  previousStatus: examEntry.status,
                  newStatus,
                },
              },
            })

          } catch (error: any) {
            errors.push(`Exam entry ${entryId}: ${error.message}`)
          }
        }
      }

      if (errors.length > 0 && rejectedEntries.length === 0) {
        throw new Error(`Rejection failed: ${errors.join(', ')}`)
      }

      return { rejectedEntries, errors }
    })

    console.log('✅ [API] /api/dos/marks/reject - POST - Successfully rejected', result.rejectedEntries.length, 'entries')
    
    const statusMessage = data.returnToDraft 
      ? `Successfully rejected ${result.rejectedEntries.length} ${data.entryType} entries and returned them to draft status for editing`
      : `Successfully rejected ${result.rejectedEntries.length} ${data.entryType} entries`

    return NextResponse.json({ 
      success: true,
      message: statusMessage,
      rejectedEntries: result.rejectedEntries,
      errors: result.errors.length > 0 ? result.errors : undefined,
      rejectedBy: `${staff.firstName} ${staff.lastName}`,
      rejectedAt: new Date().toISOString(),
      rejectionReason: data.rejectionReason,
      returnedToDraft: data.returnToDraft,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/dos/marks/reject - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Rejection failed',
        details: error.message || 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}