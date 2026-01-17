/**
 * Teacher Academic Assignments API Route
 * Requirements: 3.1-3.5, 3.8
 * 
 * Implements academic assignment management for teachers:
 * - PUT: Update subject, class, stream assignments
 * - PUT: Set class teacher designation
 * - PUT: Assign examination roles
 * 
 * Core principle: Academic assignments directly control data access permissions.
 * Changes take effect immediately (Requirement 3.8).
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ExaminationRole } from '@/types/teacher'
import { 
  teacherAssignmentService, 
  AssignmentValidationError 
} from '@/services/teacher-assignment.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { canManageTeachers, createTeacherManagementAuditEntry } from '@/lib/rbac'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET: Get assignment summary for a teacher
 * Returns subjects, classes, streams, class teacher designations, and exam roles
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
        attemptedAction: 'get_teacher_assignments',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to teacher assignments' },
        { status: 403 }
      )
    }

    const { id } = await params

    const summary = await teacherAssignmentService.getAssignmentSummary(id, schoolId)

    return NextResponse.json(summary)
  } catch (error) {
    if (error instanceof AssignmentValidationError) {
      return NextResponse.json(
        { 
          error: error.message, 
          field: error.field,
          code: error.code,
        },
        { status: 400 }
      )
    }

    console.error('Error fetching teacher assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher assignments' },
      { status: 500 }
    )
  }
}


/**
 * PUT: Update academic assignments for a teacher
 * Requirements 3.1-3.5, 3.8: Academic assignment management
 * 
 * Request body can include any combination of:
 * {
 *   subjectIds?: string[],      // Requirement 3.1: Subject assignments
 *   classIds?: string[],        // Requirement 3.2: Class assignments
 *   streamIds?: string[],       // Requirement 3.3: Stream assignments
 *   classTeacher?: {            // Requirement 3.4: Class teacher designation
 *     classId: string,
 *     isClassTeacher: boolean
 *   },
 *   examinationRole?: {         // Requirement 3.5: Examination roles
 *     examId: string,
 *     role: "SETTER" | "MARKER" | "MODERATOR",
 *     action: "assign" | "remove"
 *   }
 * }
 * 
 * Requirement 3.8: Changes take effect immediately
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
        attemptedAction: 'update_teacher_assignments',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to update assignments' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { subjectIds, classIds, streamIds, classTeacherForIds, classTeacher, examinationRole } = body

    const results: Record<string, unknown> = {}

    // Handle bulk assignment updates (Requirement 3.1, 3.2, 3.3)
    if (subjectIds !== undefined || classIds !== undefined || streamIds !== undefined || classTeacherForIds !== undefined) {
      const bulkResult = await teacherAssignmentService.updateAllAssignments(
        id,
        schoolId,
        {
          subjectIds,
          classIds,
          streamIds,
          classTeacherForIds,
        },
        userId
      )
      results.assignments = bulkResult
    }

    // Handle individual class teacher designation (Requirement 3.4)
    if (classTeacher) {
      const { classId, isClassTeacher } = classTeacher
      
      if (!classId || typeof isClassTeacher !== 'boolean') {
        return NextResponse.json(
          { 
            error: 'Invalid classTeacher format', 
            field: 'classTeacher',
            expected: { classId: 'string', isClassTeacher: 'boolean' },
          },
          { status: 400 }
        )
      }

      const classTeacherResult = await teacherAssignmentService.setClassTeacher(
        id,
        schoolId,
        classId,
        isClassTeacher,
        userId
      )
      results.classTeacher = classTeacherResult
    }

    // Handle examination role assignment (Requirement 3.5)
    if (examinationRole) {
      const { examId, role, action } = examinationRole
      
      if (!examId || !role || !action) {
        return NextResponse.json(
          { 
            error: 'Invalid examinationRole format', 
            field: 'examinationRole',
            expected: { 
              examId: 'string', 
              role: 'SETTER | MARKER | MODERATOR',
              action: 'assign | remove',
            },
          },
          { status: 400 }
        )
      }

      // Validate role value
      if (!Object.values(ExaminationRole).includes(role)) {
        return NextResponse.json(
          { 
            error: 'Invalid examination role', 
            field: 'examinationRole.role',
            validValues: Object.values(ExaminationRole),
          },
          { status: 400 }
        )
      }

      if (action === 'assign') {
        const examResult = await teacherAssignmentService.assignExaminationRole(
          id,
          schoolId,
          examId,
          role as ExaminationRole,
          userId
        )
        results.examinationRole = examResult
      } else if (action === 'remove') {
        const examResult = await teacherAssignmentService.removeExaminationRole(
          id,
          schoolId,
          examId,
          role as ExaminationRole,
          userId
        )
        results.examinationRole = examResult
      } else {
        return NextResponse.json(
          { 
            error: 'Invalid action for examination role', 
            field: 'examinationRole.action',
            validValues: ['assign', 'remove'],
          },
          { status: 400 }
        )
      }
    }

    // If no valid update fields provided
    if (Object.keys(results).length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid assignment fields provided',
          validFields: ['subjectIds', 'classIds', 'streamIds', 'classTeacherForIds', 'classTeacher', 'examinationRole'],
        },
        { status: 400 }
      )
    }

    // Get updated assignment summary
    const summary = await teacherAssignmentService.getAssignmentSummary(id, schoolId)

    return NextResponse.json({
      ...results,
      summary,
      message: 'Assignments updated successfully',
    })
  } catch (error) {
    if (error instanceof AssignmentValidationError) {
      return NextResponse.json(
        { 
          error: error.message, 
          field: error.field,
          code: error.code,
        },
        { status: 400 }
      )
    }

    console.error('Error updating teacher assignments:', error)
    return NextResponse.json(
      { error: 'Failed to update teacher assignments' },
      { status: 500 }
    )
  }
}
