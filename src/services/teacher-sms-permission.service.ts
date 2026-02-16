/**
 * Teacher SMS Permission Service
 * Manages permission codes for teachers to send SMS messages
 * Requirements: Teachers must enter admin-generated codes that expire every 5 hours
 */
   
import { prisma } from '@/lib/db'
import { auditService, AuditAction, AuditResource } from './audit.service'
import { randomBytes } from 'crypto'

export interface PermissionCode {
  id: string
  code: string
  schoolId: string
  createdById: string
  teacherId: string | null
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface GenerateCodeOptions {
  schoolId: string
  createdById: string
  teacherId?: string
  expiresInHours?: number
}

export class TeacherSMSPermissionService {
  /**
   * Generate a new permission code for a teacher
   * @param options - Generation options including school, admin, and optional teacher
   * @returns The generated permission code
   */
  async generateCode(options: GenerateCodeOptions): Promise<PermissionCode> {
    const { schoolId, createdById, teacherId, expiresInHours = 5 } = options
    
    // Generate a 6-digit numeric code
    const code = this.generateNumericCode(6)
    
    // Calculate expiration time (5 hours from now)
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    
    // Create the permission code record
    const permissionCode = await prisma.teacherSmsPermissionCode.create({
      data: {
        code,
        schoolId,
        createdById,
        teacherId: teacherId || null,
        expiresAt,
      }
    })
    
    // Log the creation in audit trail
    await auditService.log({
      schoolId,
      userId: createdById,
      action: AuditAction.CREATE,
      resource: AuditResource.PERMISSION,
      resourceId: permissionCode.id,
      newValue: {
        code: permissionCode.code,
        teacherId: permissionCode.teacherId,
        expiresAt: permissionCode.expiresAt.toISOString(),
        expiresInHours,
      }
    })
    
    return {
      id: permissionCode.id,
      code: permissionCode.code,
      schoolId: permissionCode.schoolId,
      createdById: permissionCode.createdById,
      teacherId: permissionCode.teacherId,
      expiresAt: permissionCode.expiresAt,
      usedAt: permissionCode.usedAt,
      createdAt: permissionCode.createdAt,
      updatedAt: permissionCode.updatedAt,
    }
  }
  
  /**
   * Validate a permission code for a teacher
   * @param code - The permission code to validate
   * @param schoolId - The school ID for tenant isolation
   * @param teacherId - Optional teacher ID to check if code is assigned to specific teacher
   * @returns Validation result with code details if valid
   */
  async validateCode(
    code: string, 
    schoolId: string, 
    teacherId?: string
  ): Promise<{
    valid: boolean
    code?: PermissionCode
    error?: string
  }> {
    try {
      // Find the permission code
      const permissionCode = await prisma.teacherSmsPermissionCode.findFirst({
        where: {
          code,
          schoolId,
        }
      })
      
      if (!permissionCode) {
        return {
          valid: false,
          error: 'Invalid permission code'
        }
      }
      
      // Check if code is already used
      if (permissionCode.usedAt) {
        return {
          valid: false,
          error: 'Permission code has already been used'
        }
      }
      
      // Check if code is expired
      if (permissionCode.expiresAt < new Date()) {
        return {
          valid: false,
          error: 'Permission code has expired'
        }
      }
      
      // Check if code is assigned to a specific teacher
      if (permissionCode.teacherId && teacherId && permissionCode.teacherId !== teacherId) {
        return {
          valid: false,
          error: 'Permission code is not assigned to this teacher'
        }
      }
      
      return {
        valid: true,
        code: {
          id: permissionCode.id,
          code: permissionCode.code,
          schoolId: permissionCode.schoolId,
          createdById: permissionCode.createdById,
          teacherId: permissionCode.teacherId,
          expiresAt: permissionCode.expiresAt,
          usedAt: permissionCode.usedAt,
          createdAt: permissionCode.createdAt,
          updatedAt: permissionCode.updatedAt,
        }
      }
    } catch (error) {
      console.error('Error validating permission code:', error)
      return {
        valid: false,
        error: 'Failed to validate permission code'
      }
    }
  }
  
  /**
   * Mark a permission code as used
   * @param codeId - The ID of the permission code
   * @param usedByTeacherId - The teacher who used the code
   * @returns Updated permission code
   */
  async useCode(codeId: string, usedByTeacherId: string): Promise<PermissionCode> {
    const updatedCode = await prisma.teacherSmsPermissionCode.update({
      where: { id: codeId },
      data: {
        usedAt: new Date(),
        usedBy: usedByTeacherId,
      }
    })
    
    // Log the usage in audit trail
    await auditService.log({
      schoolId: updatedCode.schoolId,
      userId: usedByTeacherId,
      action: AuditAction.USE,
      resource: AuditResource.PERMISSION,
      resourceId: updatedCode.id,
      newValue: {
        usedAt: updatedCode.usedAt?.toISOString(),
        usedBy: usedByTeacherId,
      }
    })
    
    return {
      id: updatedCode.id,
      code: updatedCode.code,
      schoolId: updatedCode.schoolId,
      createdById: updatedCode.createdById,
      teacherId: updatedCode.teacherId,
      expiresAt: updatedCode.expiresAt,
      usedAt: updatedCode.usedAt,
      createdAt: updatedCode.createdAt,
      updatedAt: updatedCode.updatedAt,
    }
  }
  
  /**
   * Get all active permission codes for a school
   * @param schoolId - The school ID
   * @returns Array of active permission codes
   */
  async getActiveCodes(schoolId: string): Promise<PermissionCode[]> {
    const codes = await prisma.teacherSmsPermissionCode.findMany({
      where: {
        schoolId,
        usedAt: null,
        expiresAt: {
          gte: new Date(),
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    })
    
    return codes.map(code => ({
      id: code.id,
      code: code.code,
      schoolId: code.schoolId,
      createdById: code.createdById,
      teacherId: code.teacherId,
      expiresAt: code.expiresAt,
      usedAt: code.usedAt,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt,
    }))
  }
  
  /**
   * Get permission codes generated by an admin
   * @param createdById - The admin ID
   * @param schoolId - The school ID
   * @returns Array of permission codes
   */
  async getCodesByAdmin(createdById: string, schoolId: string): Promise<PermissionCode[]> {
    const codes = await prisma.teacherSmsPermissionCode.findMany({
      where: {
        createdById,
        schoolId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to recent 50 codes
    })
    
    return codes.map(code => ({
      id: code.id,
      code: code.code,
      schoolId: code.schoolId,
      createdById: code.createdById,
      teacherId: code.teacherId,
      expiresAt: code.expiresAt,
      usedAt: code.usedAt,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt,
    }))
  }
  
  /**
   * Delete expired permission codes (cleanup)
   * @param olderThanDays - Delete codes older than this many days (default: 30)
   * @returns Number of deleted codes
   */
  async cleanupExpiredCodes(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    
    const result = await prisma.teacherSmsPermissionCode.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        }
      }
    })
    
    return result.count
  }
  
  /**
   * Generate a numeric code of specified length
   * @param length - Length of the code (default: 6)
   * @returns Generated numeric code
   */
  private generateNumericCode(length: number = 6): string {
    const digits = '0123456789'
    let code = ''
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)]
    }
    return code
  }
}

// Export singleton instance
export const teacherSMSPermissionService = new TeacherSMSPermissionService()