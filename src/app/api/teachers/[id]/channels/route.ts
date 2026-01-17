/**
 * Teacher Communication Channels API Route
 * Requirements: 5.1-5.2
 * 
 * Implements communication channel configuration for teachers:
 * - GET: Get current channel configuration
 * - PUT: Update channel configuration
 * 
 * Core principle: SMS and WhatsApp are disabled by default.
 * Only authorized roles can configure teacher communication channels.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ChannelConfig } from '@/types/teacher'
import { 
  teacherCommunicationService, 
  CommunicationValidationError 
} from '@/services/teacher-communication.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { canManageTeachers, createTeacherManagementAuditEntry } from '@/lib/rbac'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Validate channel config object
 */
function validateChannelConfig(config: unknown): config is Partial<ChannelConfig> {
  if (!config || typeof config !== 'object') {
    return false
  }
  const c = config as Record<string, unknown>
  
  // At least one channel must be specified
  const hasValidField = 
    (c.inAppMessaging === undefined || typeof c.inAppMessaging === 'boolean') &&
    (c.sms === undefined || typeof c.sms === 'boolean') &&
    (c.whatsapp === undefined || typeof c.whatsapp === 'boolean') &&
    (c.email === undefined || typeof c.email === 'boolean')
  
  return hasValidField
}


/**
 * GET: Get current channel configuration for a teacher
 * Requirements 5.1, 5.2: Channel configuration retrieval
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
        attemptedAction: 'get_teacher_channels',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to teacher channel configuration' },
        { status: 403 }
      )
    }

    const { id } = await params

    const channelConfig = await teacherCommunicationService.getChannelConfig(id, schoolId)

    if (!channelConfig) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      teacherId: id,
      channelConfig,
    })
  } catch (error) {
    console.error('Error fetching teacher channel config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channel configuration' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Update channel configuration for a teacher
 * Requirements 5.1, 5.2: Channel configuration with SMS/WhatsApp disabled by default
 * 
 * Request body:
 * {
 *   inAppMessaging?: boolean,
 *   sms?: boolean,
 *   whatsapp?: boolean,
 *   email?: boolean
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
        attemptedAction: 'update_teacher_channels',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to update channel configuration' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Validate channel config
    if (!validateChannelConfig(body)) {
      return NextResponse.json(
        { 
          error: 'Invalid channel configuration format', 
          expected: {
            inAppMessaging: 'boolean (optional)',
            sms: 'boolean (optional)',
            whatsapp: 'boolean (optional)',
            email: 'boolean (optional)',
          },
        },
        { status: 400 }
      )
    }

    // At least one field must be provided
    const { inAppMessaging, sms, whatsapp, email } = body
    if (inAppMessaging === undefined && sms === undefined && whatsapp === undefined && email === undefined) {
      return NextResponse.json(
        { error: 'At least one channel configuration field must be provided' },
        { status: 400 }
      )
    }

    // Update channel configuration using the service
    const result = await teacherCommunicationService.configureChannels(
      id,
      schoolId,
      { inAppMessaging, sms, whatsapp, email },
      userId
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof CommunicationValidationError) {
      return NextResponse.json(
        { 
          error: error.message, 
          field: error.field,
          code: error.code,
        },
        { status: 400 }
      )
    }

    console.error('Error updating teacher channel config:', error)
    return NextResponse.json(
      { error: 'Failed to update channel configuration' },
      { status: 500 }
    )
  }
}
