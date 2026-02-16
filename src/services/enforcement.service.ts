/**
 * Enforcement Service
 * Handles automatic payment enforcement for schools and students
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
import { prisma } from '@/lib/db'
import { LicenseType } from '@/types/enums'
import type { FeatureFlags } from '@/types'
   
// Default system rules
const DEFAULT_SYSTEM_RULES = {
  gracePeriodDays: 14,
  featureLockOrder: ['SMS', 'REPORTS', 'FULL_ACCESS'],
  pilotStudentLimit: 50,
  pilotSmsLimit: 100,
  pilotDurationDays: 30,
}

export type EnforcementAction =
  | { type: 'SUSPEND'; reason: string }
  | { type: 'WARN'; features: string[] }
  | { type: 'RESTORE' }

export interface SchoolEnforcementStatus {
  schoolId: string
  schoolName: string
  paymentStatus: 'PAID' | 'UNPAID' | 'GRACE_PERIOD'
  daysOverdue: number
  disabledFeatures: string[]
  isActive: boolean
  isSuspended: boolean
  nextAction?: EnforcementAction
}

export interface EnforcementResult {
  checkedSchools: number
  suspendedSchools: string[]
  warningSchools: string[]
  restoredSchools: string[]
  timestamp: Date
}

export interface StudentEnforcementStatus {
  studentId: string
  studentName: string
  schoolId: string
  isPaid: boolean
  isExcludedFromSMS: boolean
  isExcludedFromReports: boolean
}

export class EnforcementService {
  /**
   * Get system rules from database or defaults
   */
  private async getSystemRules() {
    const settings = await prisma.systemSettings.findUnique({
      where: { key: 'default' }
    })
    
    return {
      gracePeriodDays: settings?.gracePeriodDays ?? DEFAULT_SYSTEM_RULES.gracePeriodDays,
      featureLockOrder: settings?.featureLockOrder ?? DEFAULT_SYSTEM_RULES.featureLockOrder,
      pilotStudentLimit: settings?.pilotStudentLimit ?? DEFAULT_SYSTEM_RULES.pilotStudentLimit,
      pilotSmsLimit: settings?.pilotSmsLimit ?? DEFAULT_SYSTEM_RULES.pilotSmsLimit,
      pilotDurationDays: settings?.pilotDurationDays ?? DEFAULT_SYSTEM_RULES.pilotDurationDays,
    }
  }

  /**
   * Run daily enforcement check for all schools
   * Requirement 19.1: Daily system check for all schools
   */
  async runDailyCheck(): Promise<EnforcementResult> {
    const systemRules = await this.getSystemRules()
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: { students: true }
        }
      }
    })

    const suspendedSchools: string[] = []
    const warningSchools: string[] = []
    const restoredSchools: string[] = []

    for (const school of schools) {
      // Skip pilot schools - they have different enforcement rules
      if (school.licenseType === LicenseType.FREE_PILOT) {
        // Check pilot expiration
        const pilotExpired = await this.checkPilotExpiration(school.id, systemRules.pilotDurationDays)
        if (pilotExpired && school.isActive) {
          await this.suspendSchool(school.id, 'Pilot period expired')
          suspendedSchools.push(school.id)
        }
        continue
      }

      const status = await this.checkSchoolStatus(school.id)
      
      if (status.nextAction) {
        switch (status.nextAction.type) {
          case 'SUSPEND':
            await this.suspendSchool(school.id, status.nextAction.reason)
            suspendedSchools.push(school.id)
            break
          case 'WARN':
            await this.applyFeatureRestrictions(school.id, status.nextAction.features)
            warningSchools.push(school.id)
            break
          case 'RESTORE':
            await this.restoreSchool(school.id)
            restoredSchools.push(school.id)
            break
        }
      }
    }

    return {
      checkedSchools: schools.length,
      suspendedSchools,
      warningSchools,
      restoredSchools,
      timestamp: new Date()
    }
  }

  /**
   * Check enforcement status for a single school
   */
  async checkSchoolStatus(schoolId: string): Promise<SchoolEnforcementStatus> {
    const systemRules = await this.getSystemRules()
    
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: { students: true }
        }
      }
    })

    if (!school) {
      throw new Error(`School not found: ${schoolId}`)
    }

    // Calculate payment status based on due date
    const now = new Date()
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // End of current month
    const gracePeriodEnds = new Date(dueDate)
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + systemRules.gracePeriodDays)

    let paymentStatus: 'PAID' | 'UNPAID' | 'GRACE_PERIOD' = 'PAID'
    let daysOverdue = 0
    const disabledFeatures: string[] = []
    let nextAction: EnforcementAction | undefined

    // For pilot schools, they're always considered "paid"
    if (school.licenseType === LicenseType.FREE_PILOT) {
      return {
        schoolId: school.id,
        schoolName: school.name,
        paymentStatus: 'PAID',
        daysOverdue: 0,
        disabledFeatures: [],
        isActive: school.isActive,
        isSuspended: !school.isActive,
        nextAction: undefined
      }
    }

    // Check if past due date
    if (now > dueDate) {
      daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (now > gracePeriodEnds) {
        // Past grace period - should be suspended
        paymentStatus = 'UNPAID'
        if (school.isActive) {
          nextAction = { type: 'SUSPEND', reason: 'Grace period expired - automatic suspension' }
        }
      } else {
        // In grace period - apply feature restrictions
        paymentStatus = 'GRACE_PERIOD'
        const featuresToDisable = this.getFeaturesToDisable(systemRules.featureLockOrder, 2)
        disabledFeatures.push(...featuresToDisable)
        nextAction = { type: 'WARN', features: featuresToDisable }
      }
    }

    // Check current feature flags
    const features = school.features as FeatureFlags
    if (!features.smsEnabled) disabledFeatures.push('SMS')
    if (!features.advancedReporting) disabledFeatures.push('REPORTS')

    return {
      schoolId: school.id,
      schoolName: school.name,
      paymentStatus,
      daysOverdue,
      disabledFeatures: [...new Set(disabledFeatures)], // Remove duplicates
      isActive: school.isActive,
      isSuspended: !school.isActive,
      nextAction
    }
  }

  /**
   * Get features to disable based on lock order and restriction level
   */
  private getFeaturesToDisable(featureLockOrder: string[], level: number): string[] {
    return featureLockOrder.slice(0, level)
  }

  /**
   * Check if pilot has expired
   */
  private async checkPilotExpiration(schoolId: string, pilotDurationDays: number): Promise<boolean> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { createdAt: true, licenseType: true }
    })

    if (!school || school.licenseType !== LicenseType.FREE_PILOT) {
      return false
    }

    const pilotEndDate = new Date(school.createdAt)
    pilotEndDate.setDate(pilotEndDate.getDate() + pilotDurationDays)

    return new Date() > pilotEndDate
  }


  /**
   * Suspend a school
   * Requirement 19.2: Automatically suspend schools unpaid and past grace period
   */
  async suspendSchool(schoolId: string, reason: string): Promise<void> {
    // Disable all features and set school to inactive
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        isActive: false,
        features: {
          smsEnabled: false,
          whatsappEnabled: false,
          paymentIntegration: true, // Keep payment integration so they can pay
          advancedReporting: false,
          bulkMessaging: false,
        }
      }
    })
  }

  /**
   * Apply feature restrictions to a school
   * Requirement 19.3: Disable SMS, reports for unpaid schools
   */
  async applyFeatureRestrictions(schoolId: string, featuresToDisable: string[]): Promise<void> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { features: true }
    })

    if (!school) return

    const currentFeatures = school.features as FeatureFlags
    const updatedFeatures = { ...currentFeatures }

    for (const feature of featuresToDisable) {
      switch (feature.toUpperCase()) {
        case 'SMS':
          updatedFeatures.smsEnabled = false
          updatedFeatures.whatsappEnabled = false
          updatedFeatures.bulkMessaging = false
          break
        case 'REPORTS':
          updatedFeatures.advancedReporting = false
          break
        case 'FULL_ACCESS':
          // Full access restriction means suspend
          await this.suspendSchool(schoolId, 'Full access restricted due to non-payment')
          return
      }
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: { features: updatedFeatures }
    })
  }

  /**
   * Restore school access after payment
   * Requirement 19.4: Restore school access within 5 minutes of payment
   */
  async restoreSchool(schoolId: string): Promise<void> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { licenseType: true }
    })

    if (!school) return

    // Restore features based on license type
    const features = this.getFeaturesByLicense(school.licenseType as LicenseType)

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        isActive: true,
        features
      }
    })
  }

  /**
   * Get features by license type
   */
  private getFeaturesByLicense(licenseType: LicenseType): FeatureFlags {
    switch (licenseType) {
      case LicenseType.PREMIUM:
        return {
          smsEnabled: true,
          whatsappEnabled: true,
          paymentIntegration: true,
          advancedReporting: true,
          bulkMessaging: true,
        }
      case LicenseType.BASIC:
        return {
          smsEnabled: true,
          whatsappEnabled: true,
          paymentIntegration: true,
          advancedReporting: false,
          bulkMessaging: true,
        }
      default:
        return {
          smsEnabled: true,
          whatsappEnabled: true,
          paymentIntegration: false,
          advancedReporting: false,
          bulkMessaging: false,
        }
    }
  }

  /**
   * Check if a school is suspended
   * Requirement 19.3: Display "Account suspended" on login
   */
  async isSchoolSuspended(schoolId: string): Promise<{ suspended: boolean; reason?: string }> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { isActive: true, licenseType: true }
    })

    if (!school) {
      return { suspended: true, reason: 'School not found' }
    }

    if (!school.isActive) {
      return { suspended: true, reason: 'Account suspended. Please contact support.' }
    }

    return { suspended: false }
  }

  /**
   * Check if a student should be excluded from communications
   * Requirement 19.5: Exclude unpaid students from SMS and report distribution
   */
  async shouldExcludeStudent(studentId: string): Promise<StudentEnforcementStatus> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: {
          select: { id: true, isActive: true, features: true }
        }
      }
    })

    if (!student) {
      throw new Error(`Student not found: ${studentId}`)
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      orderBy: { startDate: 'desc' }
    })

    // Check if student has paid for current term
    let isPaid = false
    if (currentTerm) {
      const payments = await prisma.payment.findMany({
        where: {
          studentId: student.id,
          termId: currentTerm.id
        }
      })

      // Get fee structure for student's class
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          schoolId: student.schoolId,
          classId: student.classId,
          termId: currentTerm.id
        }
      })

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
      const totalRequired = feeStructure?.totalAmount ?? 0
      isPaid = totalPaid >= totalRequired
    }

    // Check school features
    const schoolFeatures = student.school.features as FeatureFlags

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      schoolId: student.schoolId,
      isPaid,
      isExcludedFromSMS: !isPaid || !schoolFeatures.smsEnabled,
      isExcludedFromReports: !isPaid || !schoolFeatures.advancedReporting
    }
  }

  /**
   * Get all unpaid students for a school
   * Requirement 19.5: Exclude unpaid students from SMS and report distribution
   */
  async getUnpaidStudents(schoolId: string): Promise<string[]> {
    // Get current term
    const currentTerm = await prisma.term.findFirst({
      orderBy: { startDate: 'desc' }
    })

    if (!currentTerm) {
      return []
    }

    // Get all students for the school
    const students = await prisma.student.findMany({
      where: { schoolId, status: 'ACTIVE' },
      select: { id: true, classId: true }
    })

    const unpaidStudentIds: string[] = []

    for (const student of students) {
      // Get payments for this student
      const payments = await prisma.payment.findMany({
        where: {
          studentId: student.id,
          termId: currentTerm.id
        }
      })

      // Get fee structure
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          schoolId,
          classId: student.classId,
          termId: currentTerm.id
        }
      })

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
      const totalRequired = feeStructure?.totalAmount ?? 0

      if (totalPaid < totalRequired) {
        unpaidStudentIds.push(student.id)
      }
    }

    return unpaidStudentIds
  }

  /**
   * Filter recipients to exclude unpaid students
   * Requirement 19.5: Exclude unpaid students from SMS and report distribution
   */
  async filterPaidStudents(studentIds: string[]): Promise<string[]> {
    if (studentIds.length === 0) return []

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      orderBy: { startDate: 'desc' }
    })

    if (!currentTerm) {
      return studentIds // If no term, don't filter
    }

    const paidStudentIds: string[] = []

    for (const studentId of studentIds) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, classId: true, schoolId: true }
      })

      if (!student) continue

      // Get payments for this student
      const payments = await prisma.payment.findMany({
        where: {
          studentId: student.id,
          termId: currentTerm.id
        }
      })

      // Get fee structure
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          schoolId: student.schoolId,
          classId: student.classId,
          termId: currentTerm.id
        }
      })

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
      const totalRequired = feeStructure?.totalAmount ?? 0

      if (totalPaid >= totalRequired) {
        paidStudentIds.push(studentId)
      }
    }

    return paidStudentIds
  }

  /**
   * Check if a specific student is paid for the current term
   * Requirement 19.5: Exclude unpaid students from SMS and report distribution
   */
  async isStudentPaid(studentId: string): Promise<boolean> {
    // Get current term
    const currentTerm = await prisma.term.findFirst({
      orderBy: { startDate: 'desc' }
    })

    if (!currentTerm) {
      return true // If no term, assume paid
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true, schoolId: true }
    })

    if (!student) return false

    // Get payments for this student
    const payments = await prisma.payment.findMany({
      where: {
        studentId: student.id,
        termId: currentTerm.id
      }
    })

    // Get fee structure
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: student.schoolId,
        classId: student.classId,
        termId: currentTerm.id
      }
    })

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalRequired = feeStructure?.totalAmount ?? 0

    return totalPaid >= totalRequired
  }

  /**
   * Get payment status for a student
   * Requirement 19.5: Exclude unpaid students from SMS and report distribution
   */
  async getStudentPaymentStatus(studentId: string): Promise<'PAID' | 'NOT_PAID' | 'PARTIAL'> {
    // Get current term
    const currentTerm = await prisma.term.findFirst({
      orderBy: { startDate: 'desc' }
    })

    if (!currentTerm) {
      return 'PAID' // If no term, assume paid
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true, schoolId: true }
    })

    if (!student) return 'NOT_PAID'

    // Get payments for this student
    const payments = await prisma.payment.findMany({
      where: {
        studentId: student.id,
        termId: currentTerm.id
      }
    })

    // Get fee structure
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: student.schoolId,
        classId: student.classId,
        termId: currentTerm.id
      }
    })

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalRequired = feeStructure?.totalAmount ?? 0

    if (totalRequired === 0 || totalPaid >= totalRequired) return 'PAID'
    if (totalPaid > 0) return 'PARTIAL'
    return 'NOT_PAID'
  }

  /**
   * Trigger immediate enforcement check for a specific school
   * Used when payment is recorded to restore access quickly
   * Requirement 19.4: Restore school access within 5 minutes of payment
   */
  async triggerImmediateCheck(schoolId: string): Promise<SchoolEnforcementStatus> {
    const status = await this.checkSchoolStatus(schoolId)
    
    // If school should be restored (payment received), do it immediately
    if (status.nextAction?.type === 'RESTORE') {
      await this.restoreSchool(schoolId)
      return {
        ...status,
        isActive: true,
        isSuspended: false,
        disabledFeatures: [],
        nextAction: undefined
      }
    }

    return status
  }
}

// Export singleton instance
export const enforcementService = new EnforcementService()
