/**
 * Teacher System Access Management API Route
 * Requirements: 4.1-4.8
 * 
 * Implements system access management for teachers:
 * - POST: Grant system access to a teacher (Requirement 4.1-4.5)
 * - DELETE: Revoke system access from a teacher (Requirement 4.8)
 * - PUT: Update permissions for a teacher with access (Requirement 4.6)
 * 
 * Core principle: Teachers exist as institutional records first,
 * system access is optional and can be granted/revoked independently.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { 
  TeacherAccessLevel,
  TeacherPermissions,
  ChannelConfig,
  DEFAULT_TEACHER_PERMISSIONS,
  DEFAULT_CHANNEL_CONFIG,
} from '@/types/teacher'
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
 * Validate permissions object
 * Requirement 4.6: Fine-grained permissions validation
 */
function validatePermissions(permissions: unknown): permissions is TeacherPermissions {
  if (!permissions || typeof permissions !== 'object') {
    return false
  }
  const p = permissions as Record<string, unknown>
  return (
    typeof p.canTakeAttendance === 'boolean' &&
    typeof p.canEnterMarks === 'boolean' &&
    typeof p.canViewReports === 'boolean' &&
    typeof p.canSendMessages === 'boolean'
  )
}

/**
 * Validate channel config object
 * Requirements 5.1, 5.2: Channel configuration validation
 */
function validateChannelConfig(config: unknown): config is ChannelConfig {
  if (!config || typeof config !== 'object') {
    return false
  }
  const c = config as Record<string, unknown>
  return (
    typeof c.inAppMessaging === 'boolean' &&
    typeof c.sms === 'boolean' &&
    typeof c.whatsapp === 'boolean' &&
    typeof c.email === 'boolean'
  )
}

/**
 * POST: Grant system access to a teacher
 * Requirements 4.1-4.5: System access grant with validation
 * 
 * Request body:
 * {
 *   accessLevel: "TEACHER" | "TEACHER_ADMIN",
 *   email: string,
 *   temporaryPassword: string,
 *   permissions?: TeacherPermissions,
 *   channelConfig?: ChannelConfig
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        attemptedAction: 'grant_teacher_access',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to grant system access' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { accessLevel, email, temporaryPassword, permissions, channelConfig } = body

    // Validate required fields (Requirement 4.4)
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required', field: 'email' },
        { status: 400 }
      )
    }

    if (!temporaryPassword || typeof temporaryPassword !== 'string' || !temporaryPassword.trim()) {
      return NextResponse.json(
        { error: 'Temporary password is required', field: 'temporaryPassword' },
        { status: 400 }
      )
    }

    // Validate access level (Requirements 4.2, 4.3)
    if (!accessLevel || ![TeacherAccessLevel.TEACHER, TeacherAccessLevel.TEACHER_ADMIN].includes(accessLevel)) {
      return NextResponse.json(
        { 
          error: 'Invalid access level', 
          field: 'accessLevel',
          validValues: [TeacherAccessLevel.TEACHER, TeacherAccessLevel.TEACHER_ADMIN],
        },
        { status: 400 }
      )
    }

    // Use provided permissions or defaults
    const finalPermissions: TeacherPermissions = permissions && validatePermissions(permissions)
      ? permissions
      : { ...DEFAULT_TEACHER_PERMISSIONS }

    // Use provided channel config or defaults (Requirement 5.2: SMS/WhatsApp disabled by default)
    const finalChannelConfig: ChannelConfig = channelConfig && validateChannelConfig(channelConfig)
      ? channelConfig
      : { ...DEFAULT_CHANNEL_CONFIG }

    // Grant system access using the service
    const teacher = await teacherManagementService.grantSystemAccess(
      id,
      schoolId,
      {
        accessLevel,
        email: email.trim(),
        temporaryPassword,
        forcePasswordReset: true, // Always true per Requirement 4.5
        permissions: finalPermissions,
        channelConfig: finalChannelConfig,
      },
      userId
    )

    return NextResponse.json({
      id: teacher.id,
      hasSystemAccess: teacher.hasSystemAccess,
      accessLevel: teacher.accessLevel,
      userId: teacher.userId,
      permissions: teacher.permissions,
      channelConfig: teacher.channelConfig,
      forcePasswordReset: teacher.forcePasswordReset,
      message: 'System access granted successfully',
    }, { status: 201 })
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

    console.error('Error granting system access:', error)
    return NextResponse.json(
      { error: 'Failed to grant system access' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Revoke system access from a teacher
 * Requirements 4.8, 2.6: Revoke access with audit logging
 * 
 * Query params:
 * - reason: Optional reason for revocation
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

    // Check authorization using RBAC
    if (!canManageTeachers(userRole)) {
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'revoke_teacher_access',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to revoke system access' },
        { status: 403 }
      )
    }

    const { id } = await params
    
    // Get optional reason from query params or body
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason') || undefined

    // Revoke system access using the service
    const teacher = await teacherManagementService.revokeSystemAccess(
      id,
      schoolId,
      userId,
      reason
    )

    return NextResponse.json({
      id: teacher.id,
      hasSystemAccess: teacher.hasSystemAccess,
      accessLevel: teacher.accessLevel,
      message: 'System access revoked successfully',
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

    console.error('Error revoking system access:', error)
    return NextResponse.json(
      { error: 'Failed to revoke system access' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Update permissions for a teacher with system access
 * Requirement 4.6: Fine-grained permission control
 * 
 * Request body:
 * {
 *   permissions?: TeacherPermissions,
 *   accessLevel?: "TEACHER" | "TEACHER_ADMIN",
 *   channelConfig?: ChannelConfig
 * }
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
        attemptedAction: 'update_teacher_permissions',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to update permissions' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { permissions, accessLevel, channelConfig } = body

    // At least one update field must be provided
    if (!permissions && !accessLevel && !channelConfig) {
      return NextResponse.json(
        { error: 'At least one of permissions, accessLevel, or channelConfig must be provided' },
        { status: 400 }
      )
    }

    let teacher = await teacherManagementService.getTeacher(id, schoolId)
    
    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Update permissions if provided
    if (permissions) {
      if (!validatePermissions(permissions)) {
        return NextResponse.json(
          { 
            error: 'Invalid permissions format', 
            field: 'permissions',
            expected: {
              canTakeAttendance: 'boolean',
              canEnterMarks: 'boolean',
              canViewReports: 'boolean',
              canSendMessages: 'boolean',
            },
          },
          { status: 400 }
        )
      }

      teacher = await teacherManagementService.updatePermissions(
        id,
        schoolId,
        permissions,
        userId
      )
    }

    // Update access level if provided (Requirements 4.2, 4.3)
    if (accessLevel) {
      if (![TeacherAccessLevel.TEACHER, TeacherAccessLevel.TEACHER_ADMIN].includes(accessLevel)) {
        return NextResponse.json(
          { 
            error: 'Invalid access level', 
            field: 'accessLevel',
            validValues: [TeacherAccessLevel.TEACHER, TeacherAccessLevel.TEACHER_ADMIN],
          },
          { status: 400 }
        )
      }

      teacher = await teacherManagementService.updateAccessLevel(
        id,
        schoolId,
        accessLevel,
        userId
      )
    }

    // Update channel config if provided (Requirements 5.1, 5.2)
    if (channelConfig) {
      if (!validateChannelConfig(channelConfig)) {
        return NextResponse.json(
          { 
            error: 'Invalid channel config format', 
            field: 'channelConfig',
            expected: {
              inAppMessaging: 'boolean',
              sms: 'boolean',
              whatsapp: 'boolean',
              email: 'boolean',
            },
          },
          { status: 400 }
        )
      }

      teacher = await teacherManagementService.configureChannels(
        id,
        schoolId,
        channelConfig,
        userId
      )
    }

    return NextResponse.json({
      id: teacher.id,
      hasSystemAccess: teacher.hasSystemAccess,
      accessLevel: teacher.accessLevel,
      permissions: teacher.permissions,
      channelConfig: teacher.channelConfig,
      message: 'Permissions updated successfully',
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

    console.error('Error updating permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    )
  }
}
