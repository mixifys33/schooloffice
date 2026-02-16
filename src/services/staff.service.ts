/**
 * Staff Service
 * Handles staff profile management and assignments
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */
import { prisma } from '@/lib/db'
import {
  Staff,
  CreateStaffInput,
  Subject,
  Class,   
} from '@/types'
import { Role, StaffStatus } from '@/types/enums'
import { auditService, AuditAction, AuditResource } from './audit.service'

/**
 * Input for updating staff profile
 */
export interface UpdateStaffInput {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  role?: Role
}

/**
 * Map Prisma Staff to domain Staff type
 */
function mapPrismaStaffToDomain(prismaStaff: {
  id: string
  userId: string
  schoolId: string
  employeeNumber: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  role: string
  hireDate: Date
  status: string
  createdAt: Date
  updatedAt: Date
}): Staff {
  return {
    id: prismaStaff.id,
    userId: prismaStaff.userId,
    schoolId: prismaStaff.schoolId,
    employeeNumber: prismaStaff.employeeNumber,
    firstName: prismaStaff.firstName,
    lastName: prismaStaff.lastName,
    phone: prismaStaff.phone ?? '',
    email: prismaStaff.email ?? '',
    role: prismaStaff.role as Role,
    hireDate: prismaStaff.hireDate,
    status: prismaStaff.status as StaffStatus,
    createdAt: prismaStaff.createdAt,
    updatedAt: prismaStaff.updatedAt,
  }
}

function mapPrismaSubjectToDomain(prismaSubject: {
  id: string
  schoolId: string
  name: string
  code: string
  gradingSystemId: string | null
  createdAt: Date
  updatedAt: Date
}): Subject {
  return {
    id: prismaSubject.id,
    schoolId: prismaSubject.schoolId,
    name: prismaSubject.name,
    code: prismaSubject.code,
    gradingSystemId: prismaSubject.gradingSystemId ?? undefined,
    createdAt: prismaSubject.createdAt,
    updatedAt: prismaSubject.updatedAt,
  }
}

function mapPrismaClassToDomain(prismaClass: {
  id: string
  schoolId: string
  name: string
  level: number
  createdAt: Date
  updatedAt: Date
}): Class {
  return {
    id: prismaClass.id,
    schoolId: prismaClass.schoolId,
    name: prismaClass.name,
    level: prismaClass.level,
    createdAt: prismaClass.createdAt,
    updatedAt: prismaClass.updatedAt,
  }
}

export class StaffService {
  /**
   * Create a new staff profile
   * Requirement 13.1: Create staff profile with personal information, role, and employment details
   */
  async createStaff(data: CreateStaffInput): Promise<Staff> {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    })

    if (!user) {
      throw new Error(`User with id ${data.userId} not found`)
    }

    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${data.schoolId} not found`)
    }

    if (user.schoolId !== data.schoolId) {
      throw new Error('User does not belong to the specified school')
    }

    const existingStaff = await prisma.staff.findUnique({
      where: { userId: data.userId },
    })

    if (existingStaff) {
      throw new Error('Staff profile already exists for this user')
    }

    const existingEmployeeNumber = await prisma.staff.findFirst({
      where: {
        schoolId: data.schoolId,
        employeeNumber: data.employeeNumber,
      },
    })

    if (existingEmployeeNumber) {
      throw new Error(`Employee number "${data.employeeNumber}" already exists`)
    }

    const staff = await prisma.staff.create({
      data: {
        userId: data.userId,
        schoolId: data.schoolId,
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        role: data.role,
        hireDate: new Date(),
        status: StaffStatus.ACTIVE,
      },
    })

    return mapPrismaStaffToDomain(staff)
  }

  async getStaffById(id: string): Promise<Staff | null> {
    const staff = await prisma.staff.findUnique({ where: { id } })
    if (!staff) return null
    return mapPrismaStaffToDomain(staff)
  }

  async getStaffByUserId(userId: string): Promise<Staff | null> {
    const staff = await prisma.staff.findUnique({ where: { userId } })
    if (!staff) return null
    return mapPrismaStaffToDomain(staff)
  }

  async getStaffBySchool(schoolId: string): Promise<Staff[]> {
    const staffList = await prisma.staff.findMany({
      where: { schoolId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    return staffList.map(mapPrismaStaffToDomain)
  }

  async getActiveStaffBySchool(schoolId: string): Promise<Staff[]> {
    const staffList = await prisma.staff.findMany({
      where: { schoolId, status: StaffStatus.ACTIVE },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    return staffList.map(mapPrismaStaffToDomain)
  }

  async getStaffByRole(schoolId: string, role: Role): Promise<Staff[]> {
    const staffList = await prisma.staff.findMany({
      where: { schoolId, role },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })
    return staffList.map(mapPrismaStaffToDomain)
  }

  async getTeachers(schoolId: string): Promise<Staff[]> {
    return this.getStaffByRole(schoolId, Role.TEACHER)
  }


  /**
   * Update staff profile
   * Requirement 13.3: Maintain audit trail of changes
   */
  async updateStaff(
    id: string,
    data: UpdateStaffInput,
    updatedBy?: string
  ): Promise<Staff> {
    const existingStaff = await prisma.staff.findUnique({ where: { id } })

    if (!existingStaff) {
      throw new Error(`Staff with id ${id} not found`)
    }

    const updateData: Record<string, unknown> = {}
    const previousValue: Record<string, unknown> = {}
    const newValue: Record<string, unknown> = {}

    if (data.firstName !== undefined && data.firstName !== existingStaff.firstName) {
      previousValue.firstName = existingStaff.firstName
      newValue.firstName = data.firstName
      updateData.firstName = data.firstName
    }

    if (data.lastName !== undefined && data.lastName !== existingStaff.lastName) {
      previousValue.lastName = existingStaff.lastName
      newValue.lastName = data.lastName
      updateData.lastName = data.lastName
    }

    if (data.phone !== undefined && data.phone !== existingStaff.phone) {
      previousValue.phone = existingStaff.phone
      newValue.phone = data.phone
      updateData.phone = data.phone
    }

    if (data.email !== undefined && data.email !== existingStaff.email) {
      previousValue.email = existingStaff.email
      newValue.email = data.email
      updateData.email = data.email
    }

    if (data.role !== undefined && data.role !== existingStaff.role) {
      previousValue.role = existingStaff.role
      newValue.role = data.role
      updateData.role = data.role
    }

    if (Object.keys(updateData).length === 0) {
      return mapPrismaStaffToDomain(existingStaff)
    }

    const staff = await prisma.staff.update({
      where: { id },
      data: updateData,
    })

    // Log audit trail (Requirement 13.3)
    if (updatedBy) {
      await auditService.log({
        schoolId: existingStaff.schoolId,
        userId: updatedBy,
        action: AuditAction.UPDATE,
        resource: AuditResource.STAFF,
        resourceId: id,
        previousValue,
        newValue,
      })
    }

    return mapPrismaStaffToDomain(staff)
  }

  /**
   * Assign a subject to a staff member (teacher)
   * Requirement 13.2: Assign teachers to subjects for access control and timetabling
   */
  async assignSubjectToStaff(staffId: string, subjectId: string): Promise<void> {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } })
    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!subject) {
      throw new Error(`Subject with id ${subjectId} not found`)
    }

    if (subject.schoolId !== staff.schoolId) {
      throw new Error('Subject does not belong to the same school as staff')
    }

    const existing = await prisma.staffSubject.findUnique({
      where: { staffId_subjectId: { staffId, subjectId } },
    })

    if (existing) {
      return // Already assigned
    }

    await prisma.staffSubject.create({
      data: { staffId, subjectId },
    })
  }

  /**
   * Remove a subject assignment from a staff member
   */
  async removeSubjectFromStaff(staffId: string, subjectId: string): Promise<void> {
    await prisma.staffSubject.deleteMany({
      where: { staffId, subjectId },
    })
  }

  /**
   * Assign a class to a staff member (teacher)
   * Requirement 13.2: Assign teachers to classes for access control and timetabling
   */
  async assignClassToStaff(staffId: string, classId: string): Promise<void> {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } })
    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    const classRecord = await prisma.class.findUnique({ where: { id: classId } })
    if (!classRecord) {
      throw new Error(`Class with id ${classId} not found`)
    }

    if (classRecord.schoolId !== staff.schoolId) {
      throw new Error('Class does not belong to the same school as staff')
    }

    const existing = await prisma.staffClass.findUnique({
      where: { staffId_classId: { staffId, classId } },
    })

    if (existing) {
      return // Already assigned
    }

    await prisma.staffClass.create({
      data: { staffId, classId },
    })
  }

  /**
   * Remove a class assignment from a staff member
   */
  async removeClassFromStaff(staffId: string, classId: string): Promise<void> {
    await prisma.staffClass.deleteMany({
      where: { staffId, classId },
    })
  }

  /**
   * Get all subjects assigned to a staff member
   */
  async getStaffSubjects(staffId: string): Promise<Subject[]> {
    const staffSubjects = await prisma.staffSubject.findMany({
      where: { staffId },
      include: { subject: true },
    })

    return staffSubjects.map((ss) => mapPrismaSubjectToDomain(ss.subject))
  }

  /**
   * Get all classes assigned to a staff member
   */
  async getStaffClasses(staffId: string): Promise<Class[]> {
    const staffClasses = await prisma.staffClass.findMany({
      where: { staffId },
      include: { class: true },
    })

    return staffClasses.map((sc) => mapPrismaClassToDomain(sc.class))
  }

  /**
   * Check if staff is assigned to a specific subject
   */
  async isStaffAssignedToSubject(staffId: string, subjectId: string): Promise<boolean> {
    const assignment = await prisma.staffSubject.findUnique({
      where: { staffId_subjectId: { staffId, subjectId } },
    })
    return !!assignment
  }

  /**
   * Check if staff is assigned to a specific class
   */
  async isStaffAssignedToClass(staffId: string, classId: string): Promise<boolean> {
    const assignment = await prisma.staffClass.findUnique({
      where: { staffId_classId: { staffId, classId } },
    })
    return !!assignment
  }


  /**
   * Deactivate a staff member
   * Requirement 13.4: Revoke access while preserving historical records
   */
  async deactivateStaff(
    id: string,
    deactivatedBy?: string,
    reason?: string
  ): Promise<Staff> {
    const staff = await prisma.staff.findUnique({ where: { id } })

    if (!staff) {
      throw new Error(`Staff with id ${id} not found`)
    }

    if (staff.status === StaffStatus.INACTIVE) {
      throw new Error('Staff is already inactive')
    }

    // Use transaction to deactivate both staff and user
    const [updatedStaff] = await prisma.$transaction([
      prisma.staff.update({
        where: { id },
        data: { status: StaffStatus.INACTIVE },
      }),
      // Revoke user access by deactivating the user account
      prisma.user.update({
        where: { id: staff.userId },
        data: { isActive: false },
      }),
    ])

    // Log audit trail (Requirement 13.3)
    if (deactivatedBy) {
      await auditService.logStaffDeactivation({
        schoolId: staff.schoolId,
        adminUserId: deactivatedBy,
        staffId: id,
        employeeNumber: staff.employeeNumber,
        reason,
      })
    }

    return mapPrismaStaffToDomain(updatedStaff)
  }

  /**
   * Reactivate a staff member
   */
  async reactivateStaff(id: string, reactivatedBy?: string): Promise<Staff> {
    const staff = await prisma.staff.findUnique({ where: { id } })

    if (!staff) {
      throw new Error(`Staff with id ${id} not found`)
    }

    if (staff.status === StaffStatus.ACTIVE) {
      throw new Error('Staff is already active')
    }

    // Use transaction to reactivate both staff and user
    const [updatedStaff] = await prisma.$transaction([
      prisma.staff.update({
        where: { id },
        data: { status: StaffStatus.ACTIVE },
      }),
      // Restore user access
      prisma.user.update({
        where: { id: staff.userId },
        data: { isActive: true },
      }),
    ])

    // Log audit trail
    if (reactivatedBy) {
      await auditService.log({
        schoolId: staff.schoolId,
        userId: reactivatedBy,
        action: AuditAction.UPDATE,
        resource: AuditResource.STAFF,
        resourceId: id,
        previousValue: { status: StaffStatus.INACTIVE },
        newValue: { status: StaffStatus.ACTIVE },
      })
    }

    return mapPrismaStaffToDomain(updatedStaff)
  }

  /**
   * Delete a staff member (soft delete via deactivation)
   * Note: We don't hard delete to preserve historical records (Requirement 13.4)
   */
  async deleteStaff(id: string, deletedBy?: string, reason?: string): Promise<void> {
    await this.deactivateStaff(id, deletedBy, reason)
  }

  /**
   * Check if employee number is available in a school
   */
  async isEmployeeNumberAvailable(
    schoolId: string,
    employeeNumber: string,
    excludeStaffId?: string
  ): Promise<boolean> {
    const existing = await prisma.staff.findFirst({
      where: {
        schoolId,
        employeeNumber,
        ...(excludeStaffId ? { NOT: { id: excludeStaffId } } : {}),
      },
      select: { id: true },
    })
    return !existing
  }

  /**
   * Count staff by school
   */
  async countStaffBySchool(schoolId: string): Promise<number> {
    return prisma.staff.count({ where: { schoolId } })
  }

  /**
   * Count active staff by school
   */
  async countActiveStaffBySchool(schoolId: string): Promise<number> {
    return prisma.staff.count({
      where: { schoolId, status: StaffStatus.ACTIVE },
    })
  }

  /**
   * Get staff with their assignments (subjects and classes)
   */
  async getStaffWithAssignments(staffId: string): Promise<{
    staff: Staff
    subjects: Subject[]
    classes: Class[]
  } | null> {
    const staff = await this.getStaffById(staffId)
    if (!staff) return null

    const [subjects, classes] = await Promise.all([
      this.getStaffSubjects(staffId),
      this.getStaffClasses(staffId),
    ])

    return { staff, subjects, classes }
  }

  /**
   * Bulk assign subjects to a staff member
   */
  async bulkAssignSubjects(staffId: string, subjectIds: string[]): Promise<void> {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } })
    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    for (const subjectId of subjectIds) {
      await this.assignSubjectToStaff(staffId, subjectId)
    }
  }

  /**
   * Bulk assign classes to a staff member
   */
  async bulkAssignClasses(staffId: string, classIds: string[]): Promise<void> {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } })
    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    for (const classId of classIds) {
      await this.assignClassToStaff(staffId, classId)
    }
  }

  /**
   * Replace all subject assignments for a staff member
   */
  async replaceSubjectAssignments(staffId: string, subjectIds: string[]): Promise<void> {
    await prisma.staffSubject.deleteMany({ where: { staffId } })
    await this.bulkAssignSubjects(staffId, subjectIds)
  }

  /**
   * Replace all class assignments for a staff member
   */
  async replaceClassAssignments(staffId: string, classIds: string[]): Promise<void> {
    await prisma.staffClass.deleteMany({ where: { staffId } })
    await this.bulkAssignClasses(staffId, classIds)
  }
}

// Export singleton instance
export const staffService = new StaffService()
