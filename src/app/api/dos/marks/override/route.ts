/**
 * DoS Marks Override API
 * 
 * Requirements: 28.5, 28.6
 * - Allow DoS to override locks with proper logging
 * - Maintain audit trail of all mark changes and approvals
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole, MarksSubmissionStatus } from '@/types/enums'
import { z } from 'zod'

// Validation schema for override request
const OverrideRequestSchema = z.object({
  entryType: z.enum(['CA', 'EXAM'], { required_error: 'Entry type is required' }),
  entryIds: z.array(z.string().min(1, 'Entry ID cannot be empty')).min(1, 'At least one entry ID is required'),
  reason: z.string().min(10, 'Override reason must be at least 10 characters').max(500, 'Reason cannot exceed 500 characters'),
  newStatus: z.enum(['DRAFT', 'SUBMITTED'], { required_error: 'New status is required' }),
})

export interface OverrideRequest {
  entryType: 'CA' | 'EXAM';
  entryIds: string[];
  reason: string;
  newStatus: 'DRAFT' | 'SUBMITTED';
}

/**
 * POST /api/dos/marks/override
 * Override approved marks locks and revert to editable status
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/dos/marks/override - POST - Starting override request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to override marks locks'
      }, { status: 401 })
    }

    // Verify user has DoS role
    const userRole = session.user.activeRole || session.user.role
    const hasDoSAccess = userRole === Role.DOS || 
                        userRole === StaffRole.DOS || 
                        session.user.roles.includes(Role.DOS) || 
                        session.user.roles.includes(StaffRole.DOS) ||
                        userRole === Role.SCHOOL_ADMIN || // School admin can also override
                        userRole === Role.DEPUTY // Deputy can also override

    if (!hasDoSAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied. DoS role required.',
          details: `Current role: ${userRole}. DoS, School Admin, or Deputy access required for override operations.`
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
    const validationResult = OverrideRequestSchema.safeParse(body)
    
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

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      const overriddenEntries: { type: string; id: string; studentName: string; previousStatus: string; }[] = []
      const errors: string[] = []
      const now = new Date()

      if (data.entryType === 'CA') {
        // Process CA entries
        for (const entryId of data.entryIds) {
          try {
            // Verify entry exists and is approved
            const caEntry = await tx.cAEntry.findFirst({
              where: {
                id: entryId,
                status: MarksSubmissionStatus.APPROVED,
              },
              include: {
                student: {
                  select: {
                    firstName: true,
                    lastName: true,
                    classId: true,
                    schoolId: true,
                  },
                },
              },
            })

            if (!caEntry) {
              errors.push(`CA entry ${entryId}: Not found or not in approved status`)
              continue
            }

            // Verify entry belongs to the school
            if (caEntry.student.schoolId !== schoolId) {
              errors.push(`CA entry ${entryId}: Does not belong to your school`)
              continue
            }

            // Override the CA entry status
            const overriddenEntry = await tx.cAEntry.update({
              where: { id: entryId },
              data: {
                status: data.newStatus,
                approvedAt: null, // Clear approval timestamp
                approvedBy: null, // Clear approver
                updatedAt: now,
              },
            })

            overriddenEntries.push({
              type: 'CA',
              id: overriddenEntry.id,
              studentName: `${caEntry.student.firstName} ${caEntry.student.lastName}`,
              previousStatus: 'APPROVED',
            })

            // Create audit log entry for override
            await tx.marksAuditLog.create({
              data: {
                schoolId,
                entryType: 'CA',
                entryId: overriddenEntry.id,
                studentId: caEntry.studentId,
                subjectId: caEntry.subjectId,
                classId: caEntry.student.classId,
                termId: caEntry.termId,
                action: 'OVERRIDE',
                performedBy: staff.id,
                performedAt: now,
                comments: `DoS Override: ${data.reason}`,
                metadata: {
                  caEntryName: caEntry.name,
                  caType: caEntry.type,
                  rawScore: caEntry.rawScore,
                  maxScore: caEntry.maxScore,
                  previousStatus: 'APPROVED',
                  newStatus: data.newStatus,
                  overrideReason: data.reason,
                  overrideBy: `${staff.firstName} ${staff.lastName}`,
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
            // Verify entry exists and is approved
            const examEntry = await tx.examEntry.findFirst({
              where: {
                id: entryId,
                status: MarksSubmissionStatus.APPROVED,
              },
              include: {
                student: {
                  select: {
                    firstName: true,
                    lastName: true,
                    classId: true,
                    schoolId: true,
                  },
                },
              },
            })

            if (!examEntry) {
              errors.push(`Exam entry ${entryId}: Not found or not in approved status`)
              continue
            }

            // Verify entry belongs to the school
            if (examEntry.student.schoolId !== schoolId) {
              errors.push(`Exam entry ${entryId}: Does not belong to your school`)
              continue
            }

            // Override the exam entry status
            const overriddenEntry = await tx.examEntry.update({
              where: { id: entryId },
              data: {
                status: data.newStatus,
                approvedAt: null, // Clear approval timestamp
                approvedBy: null, // Clear approver
                updatedAt: now,
              },
            })

            overriddenEntries.push({
              type: 'EXAM',
              id: overriddenEntry.id,
              studentName: `${examEntry.student.firstName} ${examEntry.student.lastName}`,
              previousStatus: 'APPROVED',
            })

            // Create audit log entry for override
            await tx.marksAuditLog.create({
              data: {
                schoolId,
                entryType: 'EXAM',
                entryId: overriddenEntry.id,
                studentId: examEntry.studentId,
                subjectId: examEntry.subjectId,
                classId: examEntry.student.classId,
                termId: examEntry.termId,
                action: 'OVERRIDE',
                performedBy: staff.id,
                performedAt: now,
                comments: `DoS Override: ${data.reason}`,
                metadata: {
                  examScore: examEntry.examScore,
                  maxScore: examEntry.maxScore,
                  examDate: examEntry.examDate.toISOString(),
                  previousStatus: 'APPROVED',
                  newStatus: data.newStatus,
                  overrideReason: data.reason,
                  overrideBy: `${staff.firstName} ${staff.lastName}`,
                },
              },
            })

          } catch (error: any) {
            errors.push(`Exam entry ${entryId}: ${error.message}`)
          }
        }
      }

      if (errors.length > 0 && overriddenEntries.length === 0) {
        throw new Error(`Override failed: ${errors.join(', ')}`)
      }

      return { overriddenEntries, errors }
    })

    console.log('✅ [API] /api/dos/marks/override - POST - Successfully overridden', result.overriddenEntries.length, 'entries')
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully overridden ${result.overriddenEntries.length} ${data.entryType} entries`,
      overriddenEntries: result.overriddenEntries,
      errors: result.errors.length > 0 ? result.errors : undefined,
      overriddenBy: `${staff.firstName} ${staff.lastName}`,
      overriddenAt: new Date().toISOString(),
      reason: data.reason,
      newStatus: data.newStatus,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/dos/marks/override - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Override failed',
        details: error.message || 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}
</content>