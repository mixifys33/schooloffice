/**
 * Alert Service
 * Monitors schools and generates automated alerts for critical conditions
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
import { prisma } from '@/lib/db'
import { AlertType, AlertSeverity } from '@prisma/client'
  
/**
 * Alert Interface
 */
export interface Alert {
  id: string
  schoolId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  daysSinceCondition: number
  createdAt: Date
  acknowledgedAt?: Date | null
}

/**
 * Alert Condition Result
 */
interface AlertConditionResult {
  shouldAlert: boolean
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  conditionStartedAt: Date
}

export class AlertService {
  /**
   * Check for low SMS balance alert
   * Requirement 5.1: SMS balance < 100 messages
   */
  async checkLowSmsBalance(schoolId: string): Promise<AlertConditionResult | null> {
    // Get SMS balance from school's subscription
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { 
        subscription: {
          select: { smsBalance: true }
        }
      },
    })

    if (!school?.subscription) {
      return null
    }

    const shouldAlert = school.subscription.smsBalance < 100

    if (shouldAlert) {
      return {
        shouldAlert: true,
        type: AlertType.LOW_SMS,
        severity: AlertSeverity.WARNING,
        title: 'Low SMS Balance',
        message: `SMS balance is critically low (${school.subscription.smsBalance} messages remaining). Please top up to avoid service interruption.`,
        conditionStartedAt: new Date(), // Will be updated if alert already exists
      }
    }

    return null
  }

  /**
   * Check for inactive admin alert
   * Requirement 5.2: No admin login for 14+ days
   */
  async checkInactiveAdmin(schoolId: string): Promise<AlertConditionResult | null> {
    // Get most recent admin login from audit logs
    const recentAdminLogin = await prisma.auditLog.findFirst({
      where: { 
        schoolId,
        action: 'login',
      },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    })

    if (!recentAdminLogin) {
      // No login data available, create critical alert
      return {
        shouldAlert: true,
        type: AlertType.INACTIVE_ADMIN,
        severity: AlertSeverity.CRITICAL,
        title: 'Inactive Admin',
        message: 'No admin login activity detected. School may be at risk of churn.',
        conditionStartedAt: new Date(),
      }
    }

    const now = new Date()
    const daysSinceLogin = Math.floor(
      (now.getTime() - recentAdminLogin.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    )

    const shouldAlert = daysSinceLogin >= 14

    if (shouldAlert) {
      return {
        shouldAlert: true,
        type: AlertType.INACTIVE_ADMIN,
        severity: AlertSeverity.CRITICAL,
        title: 'Inactive Admin',
        message: `No admin login for ${daysSinceLogin} days. School may be at risk of churn.`,
        conditionStartedAt: new Date(
          now.getTime() - daysSinceLogin * 24 * 60 * 60 * 1000
        ),
      }
    }

    return null
  }

  /**
   * Check for payment overdue alert
   * Requirement 5.3: Payment overdue by 7+ days
   */
  async checkPaymentOverdue(schoolId: string): Promise<AlertConditionResult | null> {
    // Get subscription billing info
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { 
        subscription: {
          select: { 
            endDate: true,
            status: true
          }
        }
      },
    })

    if (!school?.subscription?.endDate) {
      return null // No billing date set, no alert needed
    }

    const now = new Date()
    const daysOverdue = Math.floor(
      (now.getTime() - school.subscription.endDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const shouldAlert = daysOverdue > 7

    if (shouldAlert) {
      return {
        shouldAlert: true,
        type: AlertType.PAYMENT_OVERDUE,
        severity: AlertSeverity.CRITICAL,
        title: 'Payment Overdue',
        message: `Payment is ${daysOverdue} days overdue. Immediate action required to avoid service suspension.`,
        conditionStartedAt: new Date(
          school.subscription.endDate.getTime() + 7 * 24 * 60 * 60 * 1000
        ),
      }
    }

    return null
  }

  /**
   * Check for critical health score alert
   * Requirement 5.4: Health score < 50
   */
  async checkCriticalHealth(schoolId: string): Promise<AlertConditionResult | null> {
    // Calculate health score based on multiple factors
    const [studentCount, activeStaff, recentPayments] = await Promise.all([
      prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.staff.count({ where: { schoolId, status: 'ACTIVE' } }),
      prisma.payment.count({ 
        where: { 
          schoolId,
          receivedAt: { 
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
    ])

    // Simple health score calculation (0-100)
    let healthScore = 100
    if (studentCount === 0) healthScore -= 40
    if (activeStaff === 0) healthScore -= 30
    if (recentPayments === 0) healthScore -= 30

    const shouldAlert = healthScore < 50

    if (shouldAlert) {
      return {
        shouldAlert: true,
        type: AlertType.CRITICAL_HEALTH,
        severity: AlertSeverity.CRITICAL,
        title: 'Critical Health Score',
        message: `School health score is critically low (${healthScore}/100). Multiple risk factors detected.`,
        conditionStartedAt: new Date(),
      }
    }

    return null
  }

  /**
   * Check for declining enrollment alert
   * Requirement 5.5: Student count decreased for 2 consecutive months
   */
  async checkDecliningEnrollment(schoolId: string): Promise<AlertConditionResult | null> {
    // Get current student count
    const currentCount = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' }
    })

    // Get student count from 30 days ago (approximate)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const studentsCreatedRecently = await prisma.student.count({
      where: { 
        schoolId, 
        status: 'ACTIVE',
        createdAt: { gte: thirtyDaysAgo }
      }
    })

    // Estimate previous count (current - new additions)
    const previousCount = currentCount - studentsCreatedRecently

    // Check if enrollment is declining
    const isDecining = currentCount < previousCount && previousCount > 0

    if (isDecining) {
      const decline = previousCount - currentCount
      const percentDecline = Math.round((decline / previousCount) * 100)

      return {
        shouldAlert: true,
        type: AlertType.DECLINING_ENROLLMENT,
        severity: AlertSeverity.WARNING,
        title: 'Declining Enrollment',
        message: `Student enrollment has decreased by ${decline} students (${percentDecline}%). Monitor for churn risk.`,
        conditionStartedAt: new Date(),
      }
    }

    return null
  }

  /**
   * Create or update an alert for a school
   */
  private async createOrUpdateAlert(
    schoolId: string,
    condition: AlertConditionResult
  ): Promise<void> {
    // Check if alert already exists
    const existingAlert = await prisma.schoolAlert.findFirst({
      where: {
        schoolId,
        type: condition.type,
        isActive: true,
      },
    })

    if (existingAlert) {
      // Update existing alert
      const daysSinceCondition = Math.floor(
        (new Date().getTime() - existingAlert.conditionStartedAt.getTime()) /
          (1000 * 60 * 60 * 24)
      )

      await prisma.schoolAlert.update({
        where: { id: existingAlert.id },
        data: {
          severity: condition.severity,
          title: condition.title,
          message: condition.message,
          daysSinceCondition,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new alert
      await prisma.schoolAlert.create({
        data: {
          schoolId,
          type: condition.type,
          severity: condition.severity,
          title: condition.title,
          message: condition.message,
          conditionStartedAt: condition.conditionStartedAt,
          daysSinceCondition: 0,
          isActive: true,
        },
      })
    }
  }

  /**
   * Deactivate an alert if condition no longer exists
   */
  private async deactivateAlert(
    schoolId: string,
    alertType: AlertType
  ): Promise<void> {
    await prisma.schoolAlert.updateMany({
      where: {
        schoolId,
        type: alertType,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Check all alert conditions for a school
   */
  async checkSchoolAlerts(schoolId: string): Promise<void> {
    // Check each alert condition
    const conditions = await Promise.all([
      this.checkLowSmsBalance(schoolId),
      this.checkInactiveAdmin(schoolId),
      this.checkPaymentOverdue(schoolId),
      this.checkCriticalHealth(schoolId),
      this.checkDecliningEnrollment(schoolId),
    ])

    // Process each condition
    for (const condition of conditions) {
      if (condition && condition.shouldAlert) {
        await this.createOrUpdateAlert(schoolId, condition)
      }
    }

    // Deactivate alerts for conditions that no longer exist
    const activeAlertTypes = conditions
      .filter((c) => c && c.shouldAlert)
      .map((c) => c!.type)

    const allAlertTypes = Object.values(AlertType)
    const inactiveAlertTypes = allAlertTypes.filter(
      (type) => !activeAlertTypes.includes(type)
    )

    for (const type of inactiveAlertTypes) {
      await this.deactivateAlert(schoolId, type)
    }
  }

  /**
   * Check alerts for all schools
   * Requirement 5.6: Background job for hourly alert checking
   */
  async checkAlerts(): Promise<void> {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    for (const school of schools) {
      try {
        await this.checkSchoolAlerts(school.id)
      } catch (error) {
        console.error(
          `Error checking alerts for school ${school.id}:`,
          error
        )
        // Continue with other schools
      }
    }
  }

  /**
   * Get all active alerts for a school
   * Requirement 5.7: Display alert type, severity, and days since condition started
   */
  async getSchoolAlerts(schoolId: string): Promise<Alert[]> {
    const alerts = await prisma.schoolAlert.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      orderBy: {
        severity: 'desc', // Critical alerts first
      },
    })

    return alerts.map((alert) => ({
      id: alert.id,
      schoolId: alert.schoolId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      daysSinceCondition: alert.daysSinceCondition,
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt,
    }))
  }

  /**
   * Get all active alerts across all schools
   */
  async getAllActiveAlerts(): Promise<Alert[]> {
    const alerts = await prisma.schoolAlert.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { severity: 'desc' }, // Critical alerts first
        { createdAt: 'desc' }, // Most recent first
      ],
    })

    return alerts.map((alert) => ({
      id: alert.id,
      schoolId: alert.schoolId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      daysSinceCondition: alert.daysSinceCondition,
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt,
    }))
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, adminId: string): Promise<void> {
    await prisma.schoolAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: adminId,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Get alert count by type
   */
  async getAlertCountByType(): Promise<Record<AlertType, number>> {
    const alerts = await prisma.schoolAlert.groupBy({
      by: ['type'],
      where: {
        isActive: true,
      },
      _count: {
        id: true,
      },
    })

    const counts: Record<AlertType, number> = {
      [AlertType.LOW_SMS]: 0,
      [AlertType.INACTIVE_ADMIN]: 0,
      [AlertType.PAYMENT_OVERDUE]: 0,
      [AlertType.CRITICAL_HEALTH]: 0,
      [AlertType.DECLINING_ENROLLMENT]: 0,
    }

    for (const alert of alerts) {
      counts[alert.type] = alert._count.id
    }

    return counts
  }
}

// Export singleton instance
export const alertService = new AlertService()
