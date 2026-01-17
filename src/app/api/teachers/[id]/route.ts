/**
 * Individual Teacher API Route
 * Requirements: 1.3, 10.1-10.7
 * 
 * Implements single teacher operations: GET, PUT, DELETE
 * Requirement 1.3: Allow updates while preserving Teacher_ID
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { 
  teacherManagementService, 
  TeacherValidationError 
} from '@/services/teacher-management.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { 
  canManageTeachers, 
  createTeacherManagementAuditEntry,
  getTeacherManagementPermissions,
} from '@/lib/rbac'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET: Get single teacher details
 * Requirements: 10.1-10.7 - Role-based authorization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
        attemptedAction: 'get_teacher',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to teacher management' },
        { status: 403 }
      )
    }

    const { id } = await params

    const teacher = await teacherManagementService.getTeacher(id, schoolId)

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Error fetching teacher:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Update teacher details
 * Requirement 1.3: Allow updates while preserving Teacher_ID
 * Requirements: 10.1-10.7 - Role-based authorization
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
        attemptedAction: 'update_teacher',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to update teachers' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Update teacher using the service (Requirement 1.3 - preserves Teacher_ID)
    const teacher = await teacherManagementService.updateTeacher(id, schoolId, body, userId)

    return NextResponse.json(teacher)
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

    console.error('Error updating teacher:', error)
    return NextResponse.json(
      { error: 'Failed to update teacher' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Remove teacher record
 * Requirements: 10.1-10.7 - Role-based authorization
 * Note: This soft-deletes by setting status to LEFT, preserving historical data
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Check authorization - only SCHOOL_ADMIN can delete using RBAC
    const permissions = getTeacherManagementPermissions(userRole)
    if (!permissions.canDelete) {
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'delete_teacher',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Only school administrators can delete teachers' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Soft delete by setting status to LEFT (preserves historical data per Requirement 2.9)
    const { TeacherEmploymentStatus } = await import('@/types/teacher')
    await teacherManagementService.updateEmploymentStatus(
      id,
      schoolId,
      TeacherEmploymentStatus.LEFT,
      userId,
      'Teacher record deleted'
    )

    return NextResponse.json({ success: true, message: 'Teacher removed successfully' })
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

    console.error('Error deleting teacher:', error)
    return NextResponse.json(
      { error: 'Failed to delete teacher' },
      { status: 500 }
    )
  }
}
