/**
 * DoS Marks Approval API
 * 
 * Requirements: 28.1, 28.2, 28.3, 28.4, 28.5
 * - Implement POST /api/dos/marks/approve for approving submissions
 * - Add approval workflow with proper authorization
 * - Implement marks locking after approval
 * - Add audit logging for all approval actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole, MarksSubmissionStatus } from '@/types/enums'
import { z } from 'zod'

// Validation schema for approval request
const ApprovalRequestSchema = z.object({
  entryType: z.enum(['CA', 'EXAM'], { required_error: 'Entry type is required' }),
  entryIds: z.array(z.string().min(1, 'Entry ID cannot be empty')).min(1, 'At least one entry ID is required'),
  classId: z.string().min(1, 'Class ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  termId: z.string().optional(), // Optional - will use current term if not provided
  comments: z.string().max(500, 'Comments cannot exceed 500 characters').optional(),
})

export interface ApprovalRequest {
  entryType: 'CA' | 'EXAM';
  entryIds: string[];
  classId: string;
  subjectId: string;
  termId?: string;
  comments?: string;
}

/**
 * POST /api/dos/marks/approve
 * Approve CA or Exam entries and lock them from further editing
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/dos/marks/approve - POST - Starting approval request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to approve marks'
      }, { status: 401 })
    }

    // Verify user has DoS role
    const userRole = session.user.activeRole || session.user.role
    const hasDoSAccess = userRole === Role.DOS || 
                        userRole === StaffRole.DOS || 
                        session.user.roles.includes(Role.DOS) || 
                        session.user.roles.includes(StaffRole.DOS) ||
                        userRole === Role.SCHOOL_ADMIN || // School admin can also approve
                        userRole === Role.DEPUTY // Deputy can also approve

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
    const validationResult = ApprovalRequestSchema.safeParse(body)
    
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
      const approvedEntries: { type: string; id: string; studentName: string; }[] = []
      const errors: string[] = []
      const now = new Date()

      if (data.entryType === 'CA') {
        // Process CA entries
        for (const entryId of data.entryIds) {
          try {
            // Verify entry exists and is in submitted status
            const caEntry = await tx.cAEntry.findFirst({
              where: {
                id: entryId,
                subjectId: data.subjectId,
                termId,
                status: MarksSubmissionStatus.SUBMITTED,
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
              errors.push(`CA entry ${entryId}: Not found or not in submitted status`)
              continue
            }

            // Verify student belongs to the specified class
            if (caEntry.student.classId !== data.classId) {
              errors.push(`CA entry ${entryId}: Student does not belong to the specified class`)
              continue
            }

            // Approve the CA entry
            const approvedEntry = await tx.cAEntry.update({
              where: { id: entryId },
              data: {
                status: MarksSubmissionStatus.APPROVED,
                approvedAt: now,
                approvedBy: staff.id,
                updatedAt: now,
              },
            })

            approvedEntries.push({
              type: 'CA',
              id: approvedEntry.id,
              studentName: `${caEntry.student.firstName} ${caEntry.student.lastName}`,
            })

            // Create audit log entry
            await tx.marksAuditLog.create({
              data: {
                schoolId,
                entryType: 'CA',
                entryId: approvedEntry.id,
                studentId: caEntry.studentId,
                subjectId: data.subjectId,
                classId: data.classId,
                termId,
                action: 'APPROVED',
                performedBy: staff.id,
                performedAt: now,
                comments: data.comments,
                metadata: {
                  caEntryName: caEntry.name,
                  caType: caEntry.type,
                  rawScore: caEntry.rawScore,
                  maxScore: caEntry.maxScore,
                  approverName: `${staff.firstName} ${staff.lastName}`,
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
            // Verify entry exists and is in submitted status
            const examEntry = await tx.examEntry.findFirst({
              where: {
                id: entryId,
                subjectId: data.subjectId,
                termId,
                status: MarksSubmissionStatus.SUBMITTED,
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
              errors.push(`Exam entry ${entryId}: Not found or not in submitted status`)
              continue
            }

            // Verify student belongs to the specified class
            if (examEntry.student.classId !== data.classId) {
              errors.push(`Exam entry ${entryId}: Student does not belong to the specified class`)
              continue
            }

            // Approve the exam entry
            const approvedEntry = await tx.examEntry.update({
              where: { id: entryId },
              data: {
                status: MarksSubmissionStatus.APPROVED,
                approvedAt: now,
                approvedBy: staff.id,
                updatedAt: now,
              },
            })

            approvedEntries.push({
              type: 'EXAM',
              id: approvedEntry.id,
              studentName: `${examEntry.student.firstName} ${examEntry.student.lastName}`,
            })

            // Create audit log entry
            await tx.marksAuditLog.create({
              data: {
                schoolId,
                entryType: 'EXAM',
                entryId: approvedEntry.id,
                studentId: examEntry.studentId,
                subjectId: data.subjectId,
                classId: data.classId,
                termId,
                action: 'APPROVED',
                performedBy: staff.id,
                performedAt: now,
                comments: data.comments,
                metadata: {
                  examScore: examEntry.examScore,
                  maxScore: examEntry.maxScore,
                  examDate: examEntry.examDate.toISOString(),
                  approverName: `${staff.firstName} ${staff.lastName}`,
                },
              },
            })

          } catch (error: any) {
            errors.push(`Exam entry ${entryId}: ${error.message}`)
          }
        }
      }

      if (errors.length > 0 && approvedEntries.length === 0) {
        throw new Error(`Approval failed: ${errors.join(', ')}`)
      }

      return { approvedEntries, errors }
    })

    console.log('✅ [API] /api/dos/marks/approve - POST - Successfully approved', result.approvedEntries.length, 'entries')
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully approved ${result.approvedEntries.length} ${data.entryType} entries`,
      approvedEntries: result.approvedEntries,
      errors: result.errors.length > 0 ? result.errors : undefined,
      approvedBy: `${staff.firstName} ${staff.lastName}`,
      approvedAt: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('❌ [API] /api/dos/marks/approve - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Approval failed',
        details: error.message || 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}