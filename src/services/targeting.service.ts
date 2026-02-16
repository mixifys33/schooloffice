/**
 * Targeting Service
 * 
 * Resolves message recipients based on various targeting criteria.
 * Supports class, stream, staff role targeting and combined criteria logic.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */   

import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import {
  ITargetingService,
  TargetingParams,
  TargetingValidation,
  Recipient,
  RecipientType,
  TargetType,
  TargetCriteria,
} from '@/types'

export class TargetingService implements ITargetingService {
  /**
   * Resolves recipients based on targeting parameters
   * Requirements: 5.1-5.8
   */
  async resolveRecipients(params: TargetingParams): Promise<Recipient[]> {
    const { schoolId, targetType, criteria } = params

    // Handle combined criteria with AND/OR logic
    if (this.hasCombinedCriteria(criteria)) {
      return this.resolveCombinedCriteria(schoolId, criteria)
    }

    switch (targetType) {
      case TargetType.CLASS:
        return this.resolveByClass(schoolId, criteria.classIds || [])
      
      case TargetType.STREAM:
        return this.resolveByStream(schoolId, criteria.streamIds || [])
      
      case TargetType.STAFF_ROLE:
        return this.resolveByStaffRole(schoolId, criteria.staffRoles || [])
      
      case TargetType.FEE_DEFAULTERS:
        return this.resolveFeeDefaulters(schoolId, criteria.feeThreshold || 0)
      
      case TargetType.ATTENDANCE_BELOW:
        return this.resolveByAttendanceThreshold(schoolId, criteria.attendanceThreshold || 0)
      
      case TargetType.ENTIRE_SCHOOL:
        return this.resolveEntireSchool(schoolId)
      
      case TargetType.SPECIFIC_STUDENTS:
        return this.resolveSpecificStudents(schoolId, criteria.studentIds || [])
      
      case TargetType.SPECIFIC_GUARDIANS:
        return this.resolveSpecificGuardians(schoolId, criteria.guardianIds || [])
      
      default:
        throw new Error(`Unsupported target type: ${targetType}`)
    }
  }

  /**
   * Validates targeting parameters
   * Requirements: 5.1-5.8
   */
  async validateTargeting(params: TargetingParams): Promise<TargetingValidation> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: params.schoolId }
    })

    if (!school) {
      errors.push('School not found')
      return { isValid: false, recipientCount: 0, errors }
    }

    if (!school.isActive) {
      errors.push('School is not active')
      return { isValid: false, recipientCount: 0, errors }
    }

    // Validate criteria based on target type
    switch (params.targetType) {
      case TargetType.CLASS:
        if (!params.criteria.classIds || params.criteria.classIds.length === 0) {
          errors.push('Class IDs are required for class targeting')
        }
        break
      
      case TargetType.STREAM:
        if (!params.criteria.streamIds || params.criteria.streamIds.length === 0) {
          errors.push('Stream IDs are required for stream targeting')
        }
        break
      
      case TargetType.STAFF_ROLE:
        if (!params.criteria.staffRoles || params.criteria.staffRoles.length === 0) {
          errors.push('Staff roles are required for staff role targeting')
        }
        break
      
      case TargetType.FEE_DEFAULTERS:
        if (params.criteria.feeThreshold === undefined || params.criteria.feeThreshold < 0) {
          errors.push('Valid fee threshold is required for fee defaulter targeting')
        }
        break
      
      case TargetType.ATTENDANCE_BELOW:
        if (params.criteria.attendanceThreshold === undefined || 
            params.criteria.attendanceThreshold < 0 || 
            params.criteria.attendanceThreshold > 100) {
          errors.push('Valid attendance threshold (0-100) is required for attendance targeting')
        }
        break
    }

    if (errors.length > 0) {
      return { isValid: false, recipientCount: 0, errors, warnings }
    }

    // Get recipient count
    const recipients = await this.resolveRecipients(params)
    const recipientCount = recipients.length

    if (recipientCount === 0) {
      warnings.push('No recipients found for the specified criteria')
    }

    return {
      isValid: true,
      recipientCount,
      errors,
      warnings
    }
  }

  /**
   * Gets the count of recipients without resolving them
   * Requirements: 5.1-5.8
   */
  async getTargetCount(params: TargetingParams): Promise<number> {
    const recipients = await this.resolveRecipients(params)
    return recipients.length
  }

  /**
   * Resolves recipients by class - includes students and their guardians
   * Requirements: 5.1
   */
  async resolveByClass(schoolId: string, classIds: string[]): Promise<Recipient[]> {
    if (classIds.length === 0) {
      return []
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        classId: { in: classIds },
        status: 'ACTIVE'
      },
      include: {
        studentGuardians: {
          include: {
            guardian: true
          }
        }
      }
    })

    const recipients: Recipient[] = []

    for (const student of students) {
      // Add student as recipient
      recipients.push({
        id: student.id,
        type: RecipientType.STUDENT,
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        phone: undefined, // Students don't have direct phone numbers
        email: undefined,
        whatsappNumber: undefined,
        preferredChannel: 'SMS' // Default, will be overridden by guardian preferences
      })

      // Add guardians as recipients
      for (const studentGuardian of student.studentGuardians) {
        const guardian = studentGuardian.guardian
        recipients.push({
          id: guardian.id,
          type: RecipientType.GUARDIAN,
          studentId: student.id,
          name: `${guardian.firstName} ${guardian.lastName}`,
          phone: guardian.phone,
          email: guardian.email || undefined,
          whatsappNumber: undefined,
          preferredChannel: guardian.preferredChannel
        })
      }
    }

    return recipients
  }

  /**
   * Resolves recipients by stream - includes students and their guardians
   * Requirements: 5.2
   */
  async resolveByStream(schoolId: string, streamIds: string[]): Promise<Recipient[]> {
    if (streamIds.length === 0) {
      return []
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        streamId: { in: streamIds },
        status: 'ACTIVE'
      },
      include: {
        studentGuardians: {
          include: {
            guardian: true
          }
        }
      }
    })

    const recipients: Recipient[] = []

    for (const student of students) {
      // Add student as recipient
      recipients.push({
        id: student.id,
        type: RecipientType.STUDENT,
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        phone: undefined,
        email: undefined,
        whatsappNumber: undefined,
        preferredChannel: 'SMS'
      })

      // Add guardians as recipients
      for (const studentGuardian of student.studentGuardians) {
        const guardian = studentGuardian.guardian
        recipients.push({
          id: guardian.id,
          type: RecipientType.GUARDIAN,
          studentId: student.id,
          name: `${guardian.firstName} ${guardian.lastName}`,
          phone: guardian.phone,
          email: guardian.email || undefined,
          whatsappNumber: undefined,
          preferredChannel: guardian.preferredChannel
        })
      }
    }

    return recipients
  }

  /**
   * Resolves recipients by staff role
   * Requirements: 5.5
   */
  async resolveByStaffRole(schoolId: string, roles: Role[]): Promise<Recipient[]> {
    if (roles.length === 0) {
      return []
    }

    const staff = await prisma.staff.findMany({
      where: {
        schoolId,
        role: { in: roles },
        status: 'ACTIVE'
      },
      include: {
        user: true
      }
    })

    return staff.map(staffMember => ({
      id: staffMember.id,
      type: RecipientType.STAFF,
      studentId: undefined,
      name: `${staffMember.firstName} ${staffMember.lastName}`,
      phone: staffMember.phone || undefined,
      email: staffMember.email || staffMember.user.email || undefined,
      whatsappNumber: undefined, // Staff WhatsApp numbers not stored in current schema
      preferredChannel: 'EMAIL' // Default for staff
    }))
  }

  /**
   * Resolves fee defaulters - students with outstanding balance above threshold
   * Requirements: 5.3
   */
  async resolveFeeDefaulters(schoolId: string, threshold: number): Promise<Recipient[]> {
    // Get current active term
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: true }
    })

    if (!currentYear || currentYear.terms.length === 0) {
      return []
    }

    // For simplicity, use the first term. In a real implementation, 
    // you might want to check the current date to determine the active term
    const currentTerm = currentYear.terms[0]

    // Get students with payments and fee structures
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'ACTIVE'
      },
      include: {
        payments: {
          where: { termId: currentTerm.id }
        },
        class: {
          include: {
            feeStructures: {
              where: { termId: currentTerm.id }
            }
          }
        },
        studentGuardians: {
          include: {
            guardian: true
          }
        }
      }
    })

    const recipients: Recipient[] = []

    for (const student of students) {
      // Calculate balance
      const feeStructure = student.class.feeStructures[0]
      if (!feeStructure) continue

      const totalFees = feeStructure.totalAmount
      const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const balance = totalFees - totalPaid

      if (balance > threshold) {
        // Add student
        recipients.push({
          id: student.id,
          type: RecipientType.STUDENT,
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          phone: undefined,
          email: undefined,
          whatsappNumber: undefined,
          preferredChannel: 'SMS'
        })

        // Add guardians
        for (const studentGuardian of student.studentGuardians) {
          const guardian = studentGuardian.guardian
          recipients.push({
            id: guardian.id,
            type: RecipientType.GUARDIAN,
            studentId: student.id,
            name: `${guardian.firstName} ${guardian.lastName}`,
            phone: guardian.phone,
            email: guardian.email || undefined,
            whatsappNumber: undefined,
            preferredChannel: guardian.preferredChannel
          })
        }
      }
    }

    return recipients
  }

  /**
   * Resolves students with attendance below threshold
   * Requirements: 5.4
   */
  async resolveByAttendanceThreshold(schoolId: string, threshold: number): Promise<Recipient[]> {
    // Get current active term
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: true }
    })

    if (!currentYear || currentYear.terms.length === 0) {
      return []
    }

    const currentTerm = currentYear.terms[0]
    const termStart = currentTerm.startDate
    const termEnd = currentTerm.endDate

    // Get students with their attendance records
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'ACTIVE'
      },
      include: {
        attendance: {
          where: {
            date: {
              gte: termStart,
              lte: termEnd
            }
          }
        },
        studentGuardians: {
          include: {
            guardian: true
          }
        }
      }
    })

    const recipients: Recipient[] = []

    for (const student of students) {
      // Calculate attendance percentage
      const totalRecords = student.attendance.length
      if (totalRecords === 0) continue

      const presentRecords = student.attendance.filter(record => record.status === 'PRESENT').length
      const attendancePercentage = (presentRecords / totalRecords) * 100

      if (attendancePercentage < threshold) {
        // Add student
        recipients.push({
          id: student.id,
          type: RecipientType.STUDENT,
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          phone: undefined,
          email: undefined,
          whatsappNumber: undefined,
          preferredChannel: 'SMS'
        })

        // Add guardians
        for (const studentGuardian of student.studentGuardians) {
          const guardian = studentGuardian.guardian
          recipients.push({
            id: guardian.id,
            type: RecipientType.GUARDIAN,
            studentId: student.id,
            name: `${guardian.firstName} ${guardian.lastName}`,
            phone: guardian.phone,
            email: guardian.email || undefined,
            whatsappNumber: undefined,
            preferredChannel: guardian.preferredChannel
          })
        }
      }
    }

    return recipients
  }

  /**
   * Resolves entire school - all active students, guardians, and staff
   * Requirements: 5.8
   */
  async resolveEntireSchool(schoolId: string): Promise<Recipient[]> {
    const recipients: Recipient[] = []

    // Get all active students and their guardians
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'ACTIVE'
      },
      include: {
        studentGuardians: {
          include: {
            guardian: true
          }
        }
      }
    })

    for (const student of students) {
      // Add student
      recipients.push({
        id: student.id,
        type: RecipientType.STUDENT,
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        phone: undefined,
        email: undefined,
        whatsappNumber: undefined,
        preferredChannel: 'SMS'
      })

      // Add guardians
      for (const studentGuardian of student.studentGuardians) {
        const guardian = studentGuardian.guardian
        recipients.push({
          id: guardian.id,
          type: RecipientType.GUARDIAN,
          studentId: student.id,
          name: `${guardian.firstName} ${guardian.lastName}`,
          phone: guardian.phone,
          email: guardian.email || undefined,
          whatsappNumber: undefined,
          preferredChannel: guardian.preferredChannel
        })
      }
    }

    // Get all active staff
    const staff = await prisma.staff.findMany({
      where: {
        schoolId,
        status: 'ACTIVE'
      },
      include: {
        user: true
      }
    })

    for (const staffMember of staff) {
      recipients.push({
        id: staffMember.id,
        type: RecipientType.STAFF,
        studentId: undefined,
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        phone: staffMember.phone || undefined,
        email: staffMember.email || staffMember.user.email || undefined,
        whatsappNumber: undefined,
        preferredChannel: 'EMAIL'
      })
    }

    return recipients
  }

  /**
   * Resolves specific students by IDs
   * Requirements: 5.1-5.8 (supporting specific targeting)
   */
  private async resolveSpecificStudents(schoolId: string, studentIds: string[]): Promise<Recipient[]> {
    if (studentIds.length === 0) {
      return []
    }

    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId,
        status: 'ACTIVE'
      },
      include: {
        studentGuardians: {
          include: {
            guardian: true
          }
        }
      }
    })

    const recipients: Recipient[] = []

    for (const student of students) {
      // Add student
      recipients.push({
        id: student.id,
        type: RecipientType.STUDENT,
        studentId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        phone: undefined,
        email: undefined,
        whatsappNumber: undefined,
        preferredChannel: 'SMS'
      })

      // Add guardians
      for (const studentGuardian of student.studentGuardians) {
        const guardian = studentGuardian.guardian
        recipients.push({
          id: guardian.id,
          type: RecipientType.GUARDIAN,
          studentId: student.id,
          name: `${guardian.firstName} ${guardian.lastName}`,
          phone: guardian.phone,
          email: guardian.email || undefined,
          whatsappNumber: undefined,
          preferredChannel: guardian.preferredChannel
        })
      }
    }

    return recipients
  }

  /**
   * Resolves specific guardians by IDs
   * Requirements: 5.1-5.8 (supporting specific targeting)
   */
  private async resolveSpecificGuardians(schoolId: string, guardianIds: string[]): Promise<Recipient[]> {
    if (guardianIds.length === 0) {
      return []
    }

    const guardians = await prisma.guardian.findMany({
      where: {
        id: { in: guardianIds }
      },
      include: {
        studentGuardians: {
          include: {
            student: {
              where: {
                schoolId,
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    })

    return guardians
      .filter(guardian => guardian.studentGuardians.some(sg => sg.student))
      .map(guardian => {
        const studentGuardian = guardian.studentGuardians.find(sg => sg.student)
        return {
          id: guardian.id,
          type: RecipientType.GUARDIAN,
          studentId: studentGuardian?.student?.id,
          name: `${guardian.firstName} ${guardian.lastName}`,
          phone: guardian.phone,
          email: guardian.email || undefined,
          whatsappNumber: undefined,
          preferredChannel: guardian.preferredChannel
        }
      })
  }

  /**
   * Checks if criteria has multiple targeting types for combined logic
   * Requirements: 5.7
   */
  private hasCombinedCriteria(criteria: TargetCriteria): boolean {
    const criteriaCount = [
      criteria.classIds?.length || 0,
      criteria.streamIds?.length || 0,
      criteria.staffRoles?.length || 0,
      criteria.feeThreshold !== undefined ? 1 : 0,
      criteria.attendanceThreshold !== undefined ? 1 : 0,
      criteria.studentIds?.length || 0,
      criteria.guardianIds?.length || 0
    ].filter(count => count > 0).length

    return criteriaCount > 1
  }

  /**
   * Resolves recipients using combined criteria with AND/OR logic
   * Requirements: 5.7
   */
  private async resolveCombinedCriteria(schoolId: string, criteria: TargetCriteria): Promise<Recipient[]> {
    const recipientSets: Recipient[][] = []

    // Resolve each criteria type separately
    if (criteria.classIds && criteria.classIds.length > 0) {
      const classRecipients = await this.resolveByClass(schoolId, criteria.classIds)
      recipientSets.push(classRecipients)
    }

    if (criteria.streamIds && criteria.streamIds.length > 0) {
      const streamRecipients = await this.resolveByStream(schoolId, criteria.streamIds)
      recipientSets.push(streamRecipients)
    }

    if (criteria.staffRoles && criteria.staffRoles.length > 0) {
      const staffRecipients = await this.resolveByStaffRole(schoolId, criteria.staffRoles)
      recipientSets.push(staffRecipients)
    }

    if (criteria.feeThreshold !== undefined) {
      const feeDefaulters = await this.resolveFeeDefaulters(schoolId, criteria.feeThreshold)
      recipientSets.push(feeDefaulters)
    }

    if (criteria.attendanceThreshold !== undefined) {
      const attendanceRecipients = await this.resolveByAttendanceThreshold(schoolId, criteria.attendanceThreshold)
      recipientSets.push(attendanceRecipients)
    }

    if (criteria.studentIds && criteria.studentIds.length > 0) {
      const studentRecipients = await this.resolveSpecificStudents(schoolId, criteria.studentIds)
      recipientSets.push(studentRecipients)
    }

    if (criteria.guardianIds && criteria.guardianIds.length > 0) {
      const guardianRecipients = await this.resolveSpecificGuardians(schoolId, criteria.guardianIds)
      recipientSets.push(guardianRecipients)
    }

    if (recipientSets.length === 0) {
      return []
    }

    if (recipientSets.length === 1) {
      return recipientSets[0]
    }

    // Apply AND/OR logic
    const combineLogic = criteria.combineLogic || 'OR'

    if (combineLogic === 'AND') {
      return this.intersectRecipients(recipientSets)
    } else {
      return this.unionRecipients(recipientSets)
    }
  }

  /**
   * Performs intersection (AND) of recipient sets
   * Requirements: 5.7
   */
  private intersectRecipients(recipientSets: Recipient[][]): Recipient[] {
    if (recipientSets.length === 0) return []
    if (recipientSets.length === 1) return recipientSets[0]

    let result = recipientSets[0]

    for (let i = 1; i < recipientSets.length; i++) {
      const currentSet = recipientSets[i]
      result = result.filter(recipient => 
        currentSet.some(other => 
          other.id === recipient.id && other.type === recipient.type
        )
      )
    }

    return result
  }

  /**
   * Performs union (OR) of recipient sets, removing duplicates
   * Requirements: 5.7
   */
  private unionRecipients(recipientSets: Recipient[][]): Recipient[] {
    const allRecipients = recipientSets.flat()
    const uniqueRecipients = new Map<string, Recipient>()

    for (const recipient of allRecipients) {
      const key = `${recipient.type}:${recipient.id}`
      if (!uniqueRecipients.has(key)) {
        uniqueRecipients.set(key, recipient)
      }
    }

    return Array.from(uniqueRecipients.values())
  }
}

export const targetingService = new TargetingService()