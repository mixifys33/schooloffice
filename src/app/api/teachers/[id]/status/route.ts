/**
 * Teacher Status Management API Route
 * Requirements: 2.5-2.9
 * 
 * Implements employment status updates with side effects:
 * - Requirement 2.6: Revoke login capability for inactive status
 * - Requirement 2.7: Exclude from timetable assignments
 * - Requirement 2.8: Prevent attendance marking
 * - Requirement 2.9: Preserve historical data
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { TeacherEmploymentStatus } from '@/types/teacher'
import { 
  teacherManagementService, 
  TeacherValidationError 
} from '@/services/teacher-management.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { canManageTeachers, createTeacherManagementAuditEntry } from '@/lib/rbac'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT: Update teacher employment status
 * Requirements 2.5-2.9: Status management with automatic side effects
 * 
 * Side effects for inactive statuses (On Leave, Suspended, Left):
 * - Revoke login capability (Requirement 2.6)
 * - Exclude from timetable assignments (Requirement 2.7)
 * - Prevent attendance marking (Requirement 2.8) - handled by permission checks
 * - Preserve historical data (Requirement 2.9)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as string
    const userId = session.user.id as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC
    if (!canManageTeachers(userRole)) {
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'update_teacher_status',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to update teacher status' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status, reason } = body

    // Validate status value
    if (!status || !Object.values(TeacherEmploymentStatus).includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status value', 
          field: 'status',
          validValues: Object.values(TeacherEmploymentStatus),
        },
        { status: 400 }
      )
    }

    // Update status using the service (handles all side effects)
    const teacher = await teacherManagementService.updateEmploymentStatus(
      id,
      schoolId,
      status as TeacherEmploymentStatus,
      userId,
      reason
    )

    return NextResponse.json({
      id: teacher.id,
      employmentStatus: teacher.employmentStatus,
      hasSystemAccess: teacher.hasSystemAccess,
      message: `Teacher status updated to ${status}`,
    })
  } catch (error) {
    if (error instanceof TeacherValidationError) {
      return NextResponse.json(
        { 
          error: error.message, 
          field: error.field,
          code: error.code,
        },
        { status: 400 }
      )
    }

    console.error('Error updating teacher status:', error)
    return NextResponse.json(
      { error: 'Failed to update teacher status' },
      { status: 500 }
    )
  }
}
