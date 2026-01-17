/**
 * Communication Permission Service
 * Implements role-based access control for messaging functionality
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */
import { prisma } from '@/lib/db'
import { Role, MessageChannel, MessageType, TargetType } from '@/types/enums'
import {
  ICommunicationPermissionService,
  PermissionCheckParams,
  PermissionResult,
  PermissionRestriction,
} from '@/types/services'

/**
 * Communication Permission Service Implementation
 * Requirement 14.1: Restrict message sending based on user role
 * Requirement 14.2: Class teachers can only message recipients in their own class
 * Requirement 14.3: Bursars can only send financial message types
 * Requirement 14.4: DOS can only send academic message types
 * Requirement 14.5: Head teachers have unrestricted access
 * Requirement 14.6: Log all permission checks for audit purposes
 */
export class CommunicationPermissionService implements ICommunicationPermissionService {
  /**
   * Check if a user can send a message based on their role and restrictions
   * Requirement 14.1: Restrict message sending based on user role
   */
  async canSendMessage(params: PermissionCheckParams): Promise<PermissionResult> {
    try {
      // Get user details with their role and assignments
      const user = await this.getUserWithAssignments(params.userId, params.schoolId)
      
      if (!user) {
        return {
          allowed: false,
          reason: 'User not found or not authorized for this school',
        }
      }

      // Check role-specific permissions
      const roleCheck = await this.checkRolePermissions(user, params)
      
      // Log the permission check
      await this.logPermissionCheck(params, roleCheck)
      
      return roleCheck
    } catch (error) {
      const errorResult: PermissionResult = {
        allowed: false,
        reason: `Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
      
      await this.logPermissionCheck(params, errorResult)
      return errorResult
    }
  }

  /**
   * Get allowed recipient types for a user based on their role
   * Requirement 14.2: Class teachers can only message recipients in their own class
   * Requirement 14.5: Head teachers have unrestricted access
   */
  async getAllowedRecipientTypes(userId: string, role: Role): Promise<string[]> {
    switch (role) {
      case Role.SUPER_ADMIN:
      case Role.SCHOOL_ADMIN:
        // Full access to all recipient types
        return Object.values(TargetType)
      
      case Role.DEPUTY:
        // Academic management access
        return [
          TargetType.ENTIRE_SCHOOL,
          TargetType.CLASS,
          TargetType.STREAM,
          TargetType.ATTENDANCE_BELOW,
          TargetType.STAFF_ROLE,
          TargetType.SPECIFIC_STUDENTS,
          TargetType.SPECIFIC_GUARDIANS,
        ]
      
      case Role.TEACHER:
        // Limited to their assigned classes
        return [
          TargetType.CLASS,
          TargetType.STREAM,
          TargetType.SPECIFIC_STUDENTS,
          TargetType.SPECIFIC_GUARDIANS,
        ]
      
      case Role.ACCOUNTANT:
        // Financial communications only
        return [
          TargetType.ENTIRE_SCHOOL,
          TargetType.CLASS,
          TargetType.STREAM,
          TargetType.FEE_DEFAULTERS,
          TargetType.SPECIFIC_STUDENTS,
          TargetType.SPECIFIC_GUARDIANS,
        ]
      
      case Role.STUDENT:
      case Role.PARENT:
        // No message sending permissions
        return []
      
      default:
        return []
    }
  }

  /**
   * Get allowed message types for a user based on their role
   * Requirement 14.3: Bursars can only send financial message types
   * Requirement 14.4: DOS can only send academic message types
   */
  async getAllowedMessageTypes(userId: string, role: Role): Promise<string[]> {
    switch (role) {
      case Role.SUPER_ADMIN:
      case Role.SCHOOL_ADMIN:
        // Full access to all message types
        return Object.values(MessageType)
      
      case Role.DEPUTY:
        // Academic and general messages
        return [
          MessageType.GENERAL,
          MessageType.ACADEMIC,
          MessageType.ATTENDANCE,
          MessageType.ANNOUNCEMENT,
        ]
      
      case Role.TEACHER:
        // Academic and attendance messages for their classes
        return [
          MessageType.GENERAL,
          MessageType.ACADEMIC,
          MessageType.ATTENDANCE,
        ]
      
      case Role.ACCOUNTANT:
        // Financial messages only
        return [
          MessageType.FINANCIAL,
          MessageType.GENERAL, // Allow general messages for payment confirmations
        ]
      
      case Role.STUDENT:
      case Role.PARENT:
        // No message sending permissions
        return []
      
      default:
        return []
    }
  }

  /**
   * Get allowed channels for a user based on their role
   * Requirement 14.1: Restrict message sending based on user role
   */
  async getAllowedChannels(userId: string, role: Role): Promise<MessageChannel[]> {
    switch (role) {
      case Role.SUPER_ADMIN:
      case Role.SCHOOL_ADMIN:
        // Full access to all channels
        return Object.values(MessageChannel)
      
      case Role.DEPUTY:
      case Role.TEACHER:
      case Role.ACCOUNTANT:
        // Standard channels (no emergency channels)
        return [
          MessageChannel.SMS,
          MessageChannel.WHATSAPP,
          MessageChannel.EMAIL,
        ]
      
      case Role.STUDENT:
      case Role.PARENT:
        // No message sending permissions
        return []
      
      default:
        return []
    }
  }

  /**
   * Log permission check for audit purposes
   * Requirement 14.6: Log all permission checks for audit purposes
   */
  async logPermissionCheck(
    params: PermissionCheckParams,
    result: PermissionResult
  ): Promise<void> {
    try {
      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          schoolId: params.schoolId,
          userId: params.userId,
          action: 'communication_permission_check',
          resource: 'message',
          resourceId: `${params.action}_${params.targetType || 'unknown'}`,
          newValue: {
            action: params.action,
            targetType: params.targetType,
            messageType: params.messageType,
            channel: params.channel,
            userRole: params.userRole,
            allowed: result.allowed,
            reason: result.reason,
            restrictions: result.restrictions,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
      })
    } catch (error) {
      // Log error but don't throw - permission check should still work
      console.error('Failed to log permission check:', error)
    }
  }

  /**
   * Get user with their role assignments and class/subject assignments
   */
  private async getUserWithAssignments(userId: string, schoolId: string) {
    return await prisma.user.findFirst({
      where: {
        id: userId,
        schoolId: schoolId,
        isActive: true,
      },
      include: {
        staff: {
          include: {
            staffClasses: {
              include: {
                class: true,
              },
            },
            staffSubjects: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Check role-specific permissions and restrictions
   */
  private async checkRolePermissions(
    user: any,
    params: PermissionCheckParams
  ): Promise<PermissionResult> {
    const role = params.userRole

    // Check if user can send messages at all
    const allowedRecipientTypes = await this.getAllowedRecipientTypes(params.userId, role)
    if (allowedRecipientTypes.length === 0) {
      return {
        allowed: false,
        reason: 'Your role does not have permission to send messages',
      }
    }

    // Check action-specific permissions
    switch (params.action) {
      case 'SEND':
        return await this.checkSendPermission(user, params)
      case 'SEND_BULK':
        return await this.checkBulkSendPermission(user, params)
      case 'SEND_EMERGENCY':
        return await this.checkEmergencyPermission(user, params)
      case 'VIEW_LOGS':
        return await this.checkViewLogsPermission(user, params)
      default:
        return {
          allowed: false,
          reason: 'Unknown action requested',
        }
    }
  }

  /**
   * Check permission for regular message sending
   */
  private async checkSendPermission(
    user: any,
    params: PermissionCheckParams
  ): Promise<PermissionResult> {
    const role = params.userRole

    // Check target type restrictions
    if (params.targetType) {
      const allowedTargetTypes = await this.getAllowedRecipientTypes(params.userId, role)
      if (!allowedTargetTypes.includes(params.targetType)) {
        return {
          allowed: false,
          reason: `Your role cannot send messages to ${params.targetType}`,
        }
      }

      // Special restrictions for teachers
      if (role === Role.TEACHER) {
        const teacherRestriction = await this.checkTeacherClassRestrictions(user, params)
        if (!teacherRestriction.allowed) {
          return teacherRestriction
        }
      }
    }

    // Check message type restrictions
    if (params.messageType) {
      const allowedMessageTypes = await this.getAllowedMessageTypes(params.userId, role)
      if (!allowedMessageTypes.includes(params.messageType)) {
        return {
          allowed: false,
          reason: `Your role cannot send ${params.messageType} messages`,
        }
      }
    }

    // Check channel restrictions
    if (params.channel) {
      const allowedChannels = await this.getAllowedChannels(params.userId, role)
      if (!allowedChannels.includes(params.channel)) {
        return {
          allowed: false,
          reason: `Your role cannot use ${params.channel} channel`,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check permission for bulk message sending
   */
  private async checkBulkSendPermission(
    user: any,
    params: PermissionCheckParams
  ): Promise<PermissionResult> {
    const role = params.userRole

    // Only certain roles can send bulk messages
    const bulkAllowedRoles = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.DEPUTY, Role.ACCOUNTANT]
    
    if (!bulkAllowedRoles.includes(role)) {
      return {
        allowed: false,
        reason: 'Your role does not have permission to send bulk messages',
      }
    }

    // Apply same restrictions as regular send
    return await this.checkSendPermission(user, params)
  }

  /**
   * Check permission for emergency message sending
   */
  private async checkEmergencyPermission(
    user: any,
    params: PermissionCheckParams
  ): Promise<PermissionResult> {
    const role = params.userRole

    // Only admin roles can send emergency messages
    const emergencyAllowedRoles = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN]
    
    if (!emergencyAllowedRoles.includes(role)) {
      return {
        allowed: false,
        reason: 'Your role does not have permission to send emergency alerts',
      }
    }

    return { allowed: true }
  }

  /**
   * Check permission for viewing message logs
   */
  private async checkViewLogsPermission(
    user: any,
    params: PermissionCheckParams
  ): Promise<PermissionResult> {
    const role = params.userRole

    // Most roles can view logs, but with different scopes
    const logViewAllowedRoles = [
      Role.SUPER_ADMIN,
      Role.SCHOOL_ADMIN,
      Role.DEPUTY,
      Role.TEACHER,
      Role.ACCOUNTANT,
    ]
    
    if (!logViewAllowedRoles.includes(role)) {
      return {
        allowed: false,
        reason: 'Your role does not have permission to view message logs',
      }
    }

    // Teachers can only view logs for their classes
    if (role === Role.TEACHER) {
      return {
        allowed: true,
        restrictions: [
          {
            type: 'TARGET_LIMIT',
            allowedValues: user.staff?.staffClasses?.map((sc: any) => sc.class.id) || [],
          },
        ],
      }
    }

    // Accountants can only view financial message logs
    if (role === Role.ACCOUNTANT) {
      return {
        allowed: true,
        restrictions: [
          {
            type: 'MESSAGE_TYPE_LIMIT',
            allowedValues: [MessageType.FINANCIAL, MessageType.GENERAL],
          },
        ],
      }
    }

    return { allowed: true }
  }

  /**
   * Check teacher-specific class restrictions
   * Requirement 14.2: Class teachers can only message recipients in their own class
   */
  private async checkTeacherClassRestrictions(
    user: any,
    params: PermissionCheckParams
  ): Promise<PermissionResult> {
    if (!user.staff || !user.staff.staffClasses) {
      return {
        allowed: false,
        reason: 'Teacher has no assigned classes',
      }
    }

    const assignedClassIds = user.staff.staffClasses.map((sc: any) => sc.class.id)

    // For class-based targeting, ensure teacher is assigned to those classes
    if (params.targetType === TargetType.CLASS) {
      return {
        allowed: true,
        restrictions: [
          {
            type: 'TARGET_LIMIT',
            allowedValues: assignedClassIds,
          },
        ],
      }
    }

    // For stream-based targeting, check if streams belong to assigned classes
    if (params.targetType === TargetType.STREAM) {
      return {
        allowed: true,
        restrictions: [
          {
            type: 'TARGET_LIMIT',
            allowedValues: assignedClassIds, // Will be validated against stream's class
          },
        ],
      }
    }

    return { allowed: true }
  }
}

// Export singleton instance
export const communicationPermissionService = new CommunicationPermissionService()
