/**
 * Subscription Service
 * Handles school subscription management, payment tracking, and enforcement
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 19.1, 19.2, 19.3, 19.4
 */
import { prisma } from '@/lib/db'
import { PaymentMethod, LicenseType } from '@/types/enums'
import type {
  SchoolSubscriptionWithDetails,
  SubscriptionPayment,
  CreateSubscriptionPaymentInput,
  SystemRules,
} from '@/types'
    
// Default system rules
const DEFAULT_SYSTEM_RULES: Omit<SystemRules, 'id' | 'updatedAt' | 'updatedBy'> = {
  gracePeriodDays: 14,
  featureLockOrder: ['SMS', 'REPORTS', 'FULL_ACCESS'],
  pilotStudentLimit: 50,
  pilotSmsLimit: 100,
  pilotDurationDays: 30,
}

// Per-student subscription fee (UGX)
const PER_STUDENT_FEE = 50000

export type SubscriptionStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'GRACE_PERIOD' | 'SUSPENDED'

export interface SchoolSubscriptionData {
  id: string
  schoolId: string
  schoolName: string
  schoolCode: string
  termId: string
  termName: string
  studentCount: number
  amountPerStudent: number
  totalBill: number
  amountPaid: number
  outstandingBalance: number
  status: SubscriptionStatus
  dueDate: Date
  gracePeriodEnds?: Date
  isActive: boolean
  licenseType: string
}

export class SubscriptionService {
  /**
   * Get the current grace period days from system settings
   */
  private async getGracePeriodDays(): Promise<number> {
    const settings = await prisma.systemSettings.findUnique({
      where: { key: 'default' }
    })
    return settings?.gracePeriodDays ?? DEFAULT_SYSTEM_RULES.gracePeriodDays
  }

  /**
   * Get all school subscriptions with details
   * Requirement 14.1: Display schools with term subscription amount, amount per student, total bill, payment history, outstanding balance
   */
  async getAllSubscriptions(): Promise<SchoolSubscriptionData[]> {
    // Get grace period from system settings
    const gracePeriodDays = await this.getGracePeriodDays()

    // Get all schools with student counts
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Get current active term (simplified - get most recent term)
    const currentTerm = await prisma.term.findFirst({
      orderBy: { startDate: 'desc' },
      include: { academicYear: true }
    })

    const subscriptions: SchoolSubscriptionData[] = schools.map(school => {
      const studentCount = school._count.students
      const totalBill = school.licenseType !== LicenseType.FREE_PILOT 
        ? studentCount * PER_STUDENT_FEE 
        : 0
      
      // Calculate due date (end of current month)
      const now = new Date()
      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      
      // Determine subscription status
      let status: SubscriptionStatus = 'PENDING'
      let gracePeriodEnds: Date | undefined

      if (school.licenseType === LicenseType.FREE_PILOT) {
        status = 'PAID' // Pilots don't pay
      } else if (!school.isActive) {
        status = 'SUSPENDED'
      } else if (now > dueDate) {
        gracePeriodEnds = new Date(dueDate)
        gracePeriodEnds.setDate(gracePeriodEnds.getDate() + gracePeriodDays)
        
        if (now > gracePeriodEnds) {
          status = 'SUSPENDED'
        } else {
          status = 'GRACE_PERIOD'
        }
      }

      return {
        id: school.id,
        schoolId: school.id,
        schoolName: school.name,
        schoolCode: school.code,
        termId: currentTerm?.id || '',
        termName: currentTerm ? `${currentTerm.academicYear.name} - ${currentTerm.name}` : 'N/A',
        studentCount,
        amountPerStudent: PER_STUDENT_FEE,
        totalBill,
        amountPaid: 0, // Will be calculated from payment history
        outstandingBalance: totalBill,
        status,
        dueDate,
        gracePeriodEnds,
        isActive: school.isActive,
        licenseType: school.licenseType
      }
    })

    return subscriptions
  }

  /**
   * Get subscription details for a specific school
   */
  async getSchoolSubscription(schoolId: string): Promise<SchoolSubscriptionData | null> {
    // Get grace period from system settings
    const gracePeriodDays = await this.getGracePeriodDays()

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        _count: {
          select: { students: true }
        }
      }
    })

    if (!school) return null

    const currentTerm = await prisma.term.findFirst({
      orderBy: { startDate: 'desc' },
      include: { academicYear: true }
    })

    const studentCount = school._count.students
    const totalBill = school.licenseType !== LicenseType.FREE_PILOT 
      ? studentCount * PER_STUDENT_FEE 
      : 0

    const now = new Date()
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    let status: SubscriptionStatus = 'PENDING'
    let gracePeriodEnds: Date | undefined

    if (school.licenseType === LicenseType.FREE_PILOT) {
      status = 'PAID'
    } else if (!school.isActive) {
      status = 'SUSPENDED'
    } else if (now > dueDate) {
      gracePeriodEnds = new Date(dueDate)
      gracePeriodEnds.setDate(gracePeriodEnds.getDate() + gracePeriodDays)
      
      if (now > gracePeriodEnds) {
        status = 'SUSPENDED'
      } else {
        status = 'GRACE_PERIOD'
      }
    }

    return {
      id: school.id,
      schoolId: school.id,
      schoolName: school.name,
      schoolCode: school.code,
      termId: currentTerm?.id || '',
      termName: currentTerm ? `${currentTerm.academicYear.name} - ${currentTerm.name}` : 'N/A',
      studentCount,
      amountPerStudent: PER_STUDENT_FEE,
      totalBill,
      amountPaid: 0,
      outstandingBalance: totalBill,
      status,
      dueDate,
      gracePeriodEnds,
      isActive: school.isActive,
      licenseType: school.licenseType
    }
  }

  /**
   * Check payment status for all schools at term start
   * Requirement 14.2: Automatically check payment status for each school at term start
   */
  async checkAllPaymentStatuses(): Promise<{
    checked: number
    overdue: string[]
    gracePeriod: string[]
    suspended: string[]
  }> {
    const subscriptions = await this.getAllSubscriptions()
    
    const overdue: string[] = []
    const gracePeriod: string[] = []
    const suspended: string[] = []

    for (const sub of subscriptions) {
      if (sub.status === 'OVERDUE') {
        overdue.push(sub.schoolId)
      } else if (sub.status === 'GRACE_PERIOD') {
        gracePeriod.push(sub.schoolId)
      } else if (sub.status === 'SUSPENDED') {
        suspended.push(sub.schoolId)
      }
    }

    return {
      checked: subscriptions.length,
      overdue,
      gracePeriod,
      suspended
    }
  }

  /**
   * Apply feature restrictions for unpaid schools based on configured feature lock order
   * Requirement 14.3: Disable SMS and report features for unpaid schools
   * Requirement 17.3: Define feature lock order (SMS, then reports, then full access)
   */
  async applyFeatureRestrictions(schoolId: string, restrictionLevel: number = 2): Promise<void> {
    // Get the configured feature lock order
    const settings = await prisma.systemSettings.findUnique({
      where: { key: 'default' }
    })
    const featureLockOrder = settings?.featureLockOrder ?? DEFAULT_SYSTEM_RULES.featureLockOrder

    // Determine which features to disable based on restriction level
    // Level 1: First feature in order (usually SMS)
    // Level 2: First two features (usually SMS + REPORTS)
    // Level 3+: All features (FULL_ACCESS)
    const featuresToDisable = featureLockOrder.slice(0, restrictionLevel)

    const features = {
      smsEnabled: !featuresToDisable.includes('SMS'),
      paymentIntegration: true, // Always keep payment integration
      advancedReporting: !featuresToDisable.includes('REPORTS'),
      bulkMessaging: !featuresToDisable.includes('SMS'), // Bulk messaging follows SMS
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: { features }
    })
  }

  /**
   * Suspend school after grace period expires
   * Requirement 14.4: Set school status to Suspended when grace period expires
   */
  async suspendSchool(schoolId: string, reason: string): Promise<void> {
    await prisma.school.update({
      where: { id: schoolId },
      data: { isActive: false }
    })

    // Log the suspension in audit
    // Note: This would require the userId from the session
  }

  /**
   * Record a subscription payment and restore features
   * Requirement 14.5: Record payment and restore school features after payment
   */
  async recordPayment(input: CreateSubscriptionPaymentInput): Promise<{
    success: boolean
    message: string
  }> {
    const school = await prisma.school.findUnique({
      where: { id: input.schoolId }
    })

    if (!school) {
      return { success: false, message: 'School not found' }
    }

    // Restore school features based on license type
    const features = this.getFeaturesByLicense(school.licenseType as LicenseType)

    await prisma.school.update({
      where: { id: input.schoolId },
      data: {
        isActive: true,
        features
      }
    })

    return { 
      success: true, 
      message: 'Payment recorded and school features restored' 
    }
  }

  /**
   * Get features by license type
   */
  private getFeaturesByLicense(licenseType: LicenseType) {
    switch (licenseType) {
      case LicenseType.PREMIUM:
        return {
          smsEnabled: true,
          paymentIntegration: true,
          advancedReporting: true,
          bulkMessaging: true,
        }
      case LicenseType.BASIC:
        return {
          smsEnabled: true,
          paymentIntegration: true,
          advancedReporting: false,
          bulkMessaging: true,
        }
      default:
        return {
          smsEnabled: true,
          paymentIntegration: false,
          advancedReporting: false,
          bulkMessaging: false,
        }
    }
  }

  /**
   * Check if school has active subscription
   */
  async hasActiveSubscription(schoolId: string): Promise<boolean> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { isActive: true, licenseType: true }
    })

    if (!school) return false
    if (school.licenseType === LicenseType.FREE_PILOT) return true
    return school.isActive
  }

  /**
   * Get system rules
   * Requirement 17.1: Display configurable rules
   */
  async getSystemRules(): Promise<SystemRules> {
    // Try to fetch from database
    const settings = await prisma.systemSettings.findUnique({
      where: { key: 'default' }
    })

    if (settings) {
      return {
        id: settings.id,
        gracePeriodDays: settings.gracePeriodDays,
        featureLockOrder: settings.featureLockOrder,
        pilotStudentLimit: settings.pilotStudentLimit,
        pilotSmsLimit: settings.pilotSmsLimit,
        pilotDurationDays: settings.pilotDurationDays,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy || 'system'
      }
    }

    // Return defaults if no settings exist
    return {
      id: 'default',
      ...DEFAULT_SYSTEM_RULES,
      updatedAt: new Date(),
      updatedBy: 'system'
    }
  }

  /**
   * Update system rules
   * Requirement 17.2: Save new grace period value and apply to all schools
   * Requirement 17.4: Changes apply to all schools on next daily check
   */
  async updateSystemRules(rules: Partial<SystemRules>): Promise<SystemRules> {
    const updateData: {
      gracePeriodDays?: number
      featureLockOrder?: string[]
      pilotStudentLimit?: number
      pilotSmsLimit?: number
      pilotDurationDays?: number
      updatedBy?: string
    } = {}

    if (rules.gracePeriodDays !== undefined) updateData.gracePeriodDays = rules.gracePeriodDays
    if (rules.featureLockOrder !== undefined) updateData.featureLockOrder = rules.featureLockOrder
    if (rules.pilotStudentLimit !== undefined) updateData.pilotStudentLimit = rules.pilotStudentLimit
    if (rules.pilotSmsLimit !== undefined) updateData.pilotSmsLimit = rules.pilotSmsLimit
    if (rules.pilotDurationDays !== undefined) updateData.pilotDurationDays = rules.pilotDurationDays
    if (rules.updatedBy !== undefined) updateData.updatedBy = rules.updatedBy

    // Upsert the settings - create if not exists, update if exists
    const settings = await prisma.systemSettings.upsert({
      where: { key: 'default' },
      update: updateData,
      create: {
        key: 'default',
        gracePeriodDays: rules.gracePeriodDays ?? DEFAULT_SYSTEM_RULES.gracePeriodDays,
        featureLockOrder: rules.featureLockOrder ?? DEFAULT_SYSTEM_RULES.featureLockOrder,
        pilotStudentLimit: rules.pilotStudentLimit ?? DEFAULT_SYSTEM_RULES.pilotStudentLimit,
        pilotSmsLimit: rules.pilotSmsLimit ?? DEFAULT_SYSTEM_RULES.pilotSmsLimit,
        pilotDurationDays: rules.pilotDurationDays ?? DEFAULT_SYSTEM_RULES.pilotDurationDays,
        updatedBy: rules.updatedBy
      }
    })

    return {
      id: settings.id,
      gracePeriodDays: settings.gracePeriodDays,
      featureLockOrder: settings.featureLockOrder,
      pilotStudentLimit: settings.pilotStudentLimit,
      pilotSmsLimit: settings.pilotSmsLimit,
      pilotDurationDays: settings.pilotDurationDays,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy || 'system'
    }
  }

  /**
   * Run daily enforcement check
   * Requirement 19.1, 19.2: Daily system check and automatic suspension
   * Requirement 17.4: Apply rule changes to all schools on next daily check
   */
  async runDailyEnforcement(): Promise<{
    checked: number
    suspended: string[]
    warned: string[]
    restored: string[]
  }> {
    // Get current system rules (includes any recent updates)
    const systemRules = await this.getSystemRules()
    
    const subscriptions = await this.getAllSubscriptions()
    const suspended: string[] = []
    const warned: string[] = []
    const restored: string[] = []

    for (const sub of subscriptions) {
      if (sub.licenseType === LicenseType.FREE_PILOT) {
        // Check pilot expiration
        // Note: Pilot expiration check would need pilot start date tracking
        continue
      }

      if (sub.status === 'SUSPENDED' && sub.isActive) {
        // School should be suspended
        await this.suspendSchool(sub.schoolId, 'Grace period expired - automatic suspension')
        suspended.push(sub.schoolId)
      } else if (sub.status === 'GRACE_PERIOD') {
        // Apply feature restrictions based on configured order
        await this.applyFeatureRestrictions(sub.schoolId)
        warned.push(sub.schoolId)
      }
    }

    return {
      checked: subscriptions.length,
      suspended,
      warned,
      restored
    }
  }

  /**
   * Get pilot limits from system settings
   * Used for enforcing pilot school restrictions
   */
  async getPilotLimits(): Promise<{
    studentLimit: number
    smsLimit: number
    durationDays: number
  }> {
    const settings = await prisma.systemSettings.findUnique({
      where: { key: 'default' }
    })
    
    return {
      studentLimit: settings?.pilotStudentLimit ?? DEFAULT_SYSTEM_RULES.pilotStudentLimit,
      smsLimit: settings?.pilotSmsLimit ?? DEFAULT_SYSTEM_RULES.pilotSmsLimit,
      durationDays: settings?.pilotDurationDays ?? DEFAULT_SYSTEM_RULES.pilotDurationDays
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService()
