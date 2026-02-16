/**
 * SMS Budget Service
 * Handles SMS cost tracking, budget controls, and alerts
 * Requirements: 23.1, 23.2, 23.3, 23.4, 31.1, 31.2, 31.3, 31.4, 31.5
 */   
import { prisma } from '@/lib/db'
import {
  SMSBudgetUsage,
  SMSCostLog,
  SMSBudgetAlert,
  SMSBudgetStatus,
  CreateSMSBudgetUsageInput,
  LogSMSCostInput,
  SMSBudgetCheckResult,
} from '@/types/entities'
import { SMSBudgetAlertType } from '@/types/enums'

// ============================================
// CONSTANTS
// ============================================

/**
 * Default SMS cost in UGX (approximately 25 UGX per SMS)
 * Requirement 23.1: Log cost (approximately 25 UGX per SMS)
 */
export const SMS_COST_UGX = 25

/**
 * Budget threshold percentages for alerts
 * Requirement 31.1: Alert at 80% of budget
 * Requirement 31.2: Alert at 100% of budget
 */
export const BUDGET_WARNING_THRESHOLD = 0.8 // 80%
export const BUDGET_EXCEEDED_THRESHOLD = 1.0 // 100%

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma SMSBudgetUsage to domain type
 */
function mapPrismaBudgetUsageToDomain(prismaUsage: {
  id: string
  schoolId: string
  termId: string
  totalBudget: number
  usedAmount: number
  smsCount: number
  isPaused: boolean
  lastAlertAt: Date | null
  alertType: string | null
  createdAt: Date
  updatedAt: Date
}): SMSBudgetUsage {
  return {
    id: prismaUsage.id,
    schoolId: prismaUsage.schoolId,
    termId: prismaUsage.termId,
    totalBudget: prismaUsage.totalBudget,
    usedAmount: prismaUsage.usedAmount,
    smsCount: prismaUsage.smsCount,
    isPaused: prismaUsage.isPaused,
    lastAlertAt: prismaUsage.lastAlertAt ?? undefined,
    alertType: prismaUsage.alertType as SMSBudgetAlertType | undefined,
    createdAt: prismaUsage.createdAt,
    updatedAt: prismaUsage.updatedAt,
  }
}

/**
 * Map Prisma SMSCostLog to domain type
 */
function mapPrismaCostLogToDomain(prismaLog: {
  id: string
  schoolId: string
  messageId: string
  studentId: string
  cost: number
  recipient: string
  segments: number
  createdAt: Date
}): SMSCostLog {
  return {
    id: prismaLog.id,
    schoolId: prismaLog.schoolId,
    messageId: prismaLog.messageId,
    studentId: prismaLog.studentId,
    cost: prismaLog.cost,
    recipient: prismaLog.recipient,
    segments: prismaLog.segments,
    createdAt: prismaLog.createdAt,
  }
}

/**
 * Map Prisma SMSBudgetAlert to domain type
 */
function mapPrismaAlertToDomain(prismaAlert: {
  id: string
  schoolId: string
  termId: string
  alertType: string
  usedAmount: number
  budgetLimit: number
  percentage: number
  message: string
  notifiedAt: Date
  acknowledgedAt: Date | null
  acknowledgedBy: string | null
}): SMSBudgetAlert {
  return {
    id: prismaAlert.id,
    schoolId: prismaAlert.schoolId,
    termId: prismaAlert.termId,
    alertType: prismaAlert.alertType as SMSBudgetAlertType,
    usedAmount: prismaAlert.usedAmount,
    budgetLimit: prismaAlert.budgetLimit,
    percentage: prismaAlert.percentage,
    message: prismaAlert.message,
    notifiedAt: prismaAlert.notifiedAt,
    acknowledgedAt: prismaAlert.acknowledgedAt ?? undefined,
    acknowledgedBy: prismaAlert.acknowledgedBy ?? undefined,
  }
}

// ============================================
// SMS BUDGET SERVICE CLASS
// ============================================

export class SMSBudgetService {
  // ============================================
  // BUDGET MANAGEMENT
  // ============================================

  /**
   * Initialize or get SMS budget usage for a school/term
   * Requirement 31.4: Super Admin sets budget limits per school per term
   */
  async initializeBudget(input: CreateSMSBudgetUsageInput): Promise<SMSBudgetUsage> {
    const existing = await prisma.sMSBudgetUsage.findUnique({
      where: {
        schoolId_termId: {
          schoolId: input.schoolId,
          termId: input.termId,
        },
      },
    })

    if (existing) {
      return mapPrismaBudgetUsageToDomain(existing)
    }

    const created = await prisma.sMSBudgetUsage.create({
      data: {
        schoolId: input.schoolId,
        termId: input.termId,
        totalBudget: input.totalBudget,
        usedAmount: 0,
        smsCount: 0,
        isPaused: false,
      },
    })

    return mapPrismaBudgetUsageToDomain(created)
  }

  /**
   * Get budget usage for a school/term
   */
  async getBudgetUsage(schoolId: string, termId: string): Promise<SMSBudgetUsage | null> {
    const usage = await prisma.sMSBudgetUsage.findUnique({
      where: {
        schoolId_termId: {
          schoolId,
          termId,
        },
      },
    })

    return usage ? mapPrismaBudgetUsageToDomain(usage) : null
  }

  /**
   * Update budget limit for a school/term
   * Requirement 31.4: Super Admin sets budget limits per school per term
   */
  async updateBudgetLimit(
    schoolId: string,
    termId: string,
    newBudget: number
  ): Promise<SMSBudgetUsage> {
    const updated = await prisma.sMSBudgetUsage.upsert({
      where: {
        schoolId_termId: {
          schoolId,
          termId,
        },
      },
      update: {
        totalBudget: newBudget,
      },
      create: {
        schoolId,
        termId,
        totalBudget: newBudget,
        usedAmount: 0,
        smsCount: 0,
        isPaused: false,
      },
    })

    return mapPrismaBudgetUsageToDomain(updated)
  }

  // ============================================
  // COST TRACKING
  // ============================================

  /**
   * Log SMS cost and update budget usage
   * Requirement 23.1: Log cost (approximately 25 UGX per SMS) and associate with school
   */
  async logSMSCost(input: LogSMSCostInput): Promise<SMSCostLog> {
    // Create cost log entry
    const costLog = await prisma.sMSCostLog.create({
      data: {
        schoolId: input.schoolId,
        messageId: input.messageId,
        studentId: input.studentId,
        cost: input.cost,
        recipient: input.recipient,
        segments: input.segments ?? 1,
      },
    })

    // Get current term for the school
    const currentTerm = await this.getCurrentTermForSchool(input.schoolId)
    
    if (currentTerm) {
      // Update budget usage
      await this.updateBudgetUsage(input.schoolId, currentTerm.id, input.cost)
    }

    return mapPrismaCostLogToDomain(costLog)
  }

  /**
   * Update budget usage and check thresholds
   */
  private async updateBudgetUsage(
    schoolId: string,
    termId: string,
    cost: number
  ): Promise<void> {
    // Upsert budget usage
    const usage = await prisma.sMSBudgetUsage.upsert({
      where: {
        schoolId_termId: {
          schoolId,
          termId,
        },
      },
      update: {
        usedAmount: { increment: cost },
        smsCount: { increment: 1 },
      },
      create: {
        schoolId,
        termId,
        totalBudget: 0, // Will be set by admin
        usedAmount: cost,
        smsCount: 1,
        isPaused: false,
      },
    })

    // Check thresholds and create alerts if needed
    await this.checkBudgetThresholds(schoolId, termId, usage)
  }

  /**
   * Get current term for a school
   */
  private async getCurrentTermForSchool(schoolId: string): Promise<{ id: string } | null> {
    const term = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true,
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      select: { id: true },
    })

    return term
  }

  // ============================================
  // BUDGET THRESHOLD CHECKS
  // ============================================

  /**
   * Check budget thresholds and trigger alerts
   * Requirement 31.1: Alert at 80% of budget
   * Requirement 31.2: Alert at 100% of budget and pause non-critical SMS
   */
  private async checkBudgetThresholds(
    schoolId: string,
    termId: string,
    usage: { totalBudget: number; usedAmount: number; alertType: string | null }
  ): Promise<void> {
    if (usage.totalBudget <= 0) return // No budget set

    const percentage = usage.usedAmount / usage.totalBudget

    // Check 100% threshold first
    if (percentage >= BUDGET_EXCEEDED_THRESHOLD) {
      if (usage.alertType !== SMSBudgetAlertType.EXCEEDED_100) {
        await this.triggerBudgetAlert(
          schoolId,
          termId,
          SMSBudgetAlertType.EXCEEDED_100,
          usage.usedAmount,
          usage.totalBudget,
          percentage * 100
        )
        
        // Pause non-critical SMS
        await this.pauseNonCriticalSMS(schoolId, termId)
      }
    }
    // Check 80% threshold
    else if (percentage >= BUDGET_WARNING_THRESHOLD) {
      if (usage.alertType !== SMSBudgetAlertType.WARNING_80 && 
          usage.alertType !== SMSBudgetAlertType.EXCEEDED_100) {
        await this.triggerBudgetAlert(
          schoolId,
          termId,
          SMSBudgetAlertType.WARNING_80,
          usage.usedAmount,
          usage.totalBudget,
          percentage * 100
        )
      }
    }
  }

  /**
   * Trigger a budget alert
   * Requirement 31.1, 31.2: Send alerts to School Admin and Super Admin
   */
  private async triggerBudgetAlert(
    schoolId: string,
    termId: string,
    alertType: SMSBudgetAlertType,
    usedAmount: number,
    budgetLimit: number,
    percentage: number
  ): Promise<SMSBudgetAlert> {
    const message = this.generateAlertMessage(alertType, usedAmount, budgetLimit, percentage)

    // Create alert record
    const alert = await prisma.sMSBudgetAlert.create({
      data: {
        schoolId,
        termId,
        alertType,
        usedAmount,
        budgetLimit,
        percentage,
        message,
      },
    })

    // Update budget usage with alert info
    await prisma.sMSBudgetUsage.update({
      where: {
        schoolId_termId: {
          schoolId,
          termId,
        },
      },
      data: {
        lastAlertAt: new Date(),
        alertType,
      },
    })

    // In production, this would also send notifications to admins
    console.log(`[SMS_BUDGET_ALERT] ${alertType} for school ${schoolId}: ${message}`)

    return mapPrismaAlertToDomain(alert)
  }

  /**
   * Generate alert message based on type
   */
  private generateAlertMessage(
    alertType: SMSBudgetAlertType,
    usedAmount: number,
    budgetLimit: number,
    percentage: number
  ): string {
    const formattedUsed = usedAmount.toLocaleString()
    const formattedBudget = budgetLimit.toLocaleString()
    const formattedPercentage = percentage.toFixed(1)

    switch (alertType) {
      case SMSBudgetAlertType.WARNING_80:
        return `SMS budget warning: ${formattedPercentage}% used (UGX ${formattedUsed} of ${formattedBudget}). Consider reviewing SMS usage.`
      case SMSBudgetAlertType.EXCEEDED_100:
        return `SMS budget exceeded: ${formattedPercentage}% used (UGX ${formattedUsed} of ${formattedBudget}). Non-critical SMS has been paused.`
      case SMSBudgetAlertType.BUDGET_RESET:
        return `SMS budget has been reset for the new term.`
      default:
        return `SMS budget alert: ${formattedPercentage}% used.`
    }
  }

  /**
   * Pause non-critical SMS for a school
   * Requirement 31.2: Pause non-critical SMS when budget exceeded
   */
  async pauseNonCriticalSMS(schoolId: string, termId: string): Promise<void> {
    await prisma.sMSBudgetUsage.update({
      where: {
        schoolId_termId: {
          schoolId,
          termId,
        },
      },
      data: {
        isPaused: true,
      },
    })
  }

  /**
   * Resume SMS sending (requires Super Admin approval)
   * Requirement 31.5: Require Super Admin approval to continue sending
   */
  async resumeSMS(
    schoolId: string,
    termId: string,
    approvedBy: string
  ): Promise<SMSBudgetUsage> {
    const updated = await prisma.sMSBudgetUsage.update({
      where: {
        schoolId_termId: {
          schoolId,
          termId,
        },
      },
      data: {
        isPaused: false,
      },
    })

    // Log the approval action
    console.log(`[SMS_BUDGET] SMS resumed for school ${schoolId} by ${approvedBy}`)

    return mapPrismaBudgetUsageToDomain(updated)
  }

  // ============================================
  // BUDGET CHECKS FOR SENDING
  // ============================================

  /**
   * Check if SMS can be sent based on budget
   * Requirement 31.2: Pause non-critical SMS when budget exceeded
   */
  async canSendSMS(
    schoolId: string,
    isCritical: boolean = false
  ): Promise<SMSBudgetCheckResult> {
    // First check school's SMS budget setting
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { smsBudgetPerTerm: true, isActive: true },
    })

    if (!school || !school.isActive) {
      return {
        canSend: false,
        reason: 'School is inactive or not found',
        isPaused: false,
        usagePercentage: 0,
        remainingBudget: 0,
      }
    }

    const currentTerm = await this.getCurrentTermForSchool(schoolId)
    
    if (!currentTerm) {
      // No active term - allow sending but with school budget as limit
      const remainingBudget = school.smsBudgetPerTerm
      if (remainingBudget <= 0 && !isCritical) {
        return {
          canSend: false,
          reason: 'No SMS budget allocated. Contact your administrator.',
          isPaused: false,
          usagePercentage: 0,
          remainingBudget: 0,
        }
      }
      return {
        canSend: true,
        isPaused: false,
        usagePercentage: 0,
        remainingBudget,
      }
    }

    const usage = await this.getBudgetUsage(schoolId, currentTerm.id)
    
    // If no usage record, use school's default budget
    const totalBudget = usage?.totalBudget || school.smsBudgetPerTerm
    const usedAmount = usage?.usedAmount || 0
    const isPaused = usage?.isPaused || false

    // Check if any budget is allocated
    if (totalBudget <= 0 && !isCritical) {
      return {
        canSend: false,
        reason: 'No SMS budget allocated for this term. Contact your administrator.',
        isPaused: false,
        usagePercentage: 0,
        remainingBudget: 0,
      }
    }

    const usagePercentage = totalBudget > 0 
      ? (usedAmount / totalBudget) * 100 
      : 0
    const remainingBudget = Math.max(0, totalBudget - usedAmount)

    // Critical messages bypass budget limits (Requirement 32.1)
    if (isCritical) {
      return {
        canSend: true,
        isPaused,
        usagePercentage,
        remainingBudget,
      }
    }

    // Check if paused
    if (isPaused) {
      return {
        canSend: false,
        reason: 'SMS sending is paused due to budget exceeded. Super Admin approval required.',
        isPaused: true,
        usagePercentage,
        remainingBudget,
      }
    }

    // Check if budget exceeded
    if (usedAmount >= totalBudget) {
      return {
        canSend: false,
        reason: 'SMS budget has been exceeded for this term.',
        isPaused: false,
        usagePercentage,
        remainingBudget: 0,
      }
    }

    return {
      canSend: true,
      isPaused: false,
      usagePercentage,
      remainingBudget,
    }
  }

  /**
   * Pure function for budget check (for testing)
   */
  canSendSMSPure(
    usedAmount: number,
    totalBudget: number,
    isPaused: boolean,
    isCritical: boolean
  ): SMSBudgetCheckResult {
    const usagePercentage = totalBudget > 0 ? (usedAmount / totalBudget) * 100 : 0
    const remainingBudget = Math.max(0, totalBudget - usedAmount)

    // Critical messages bypass budget limits
    if (isCritical) {
      return {
        canSend: true,
        isPaused,
        usagePercentage,
        remainingBudget,
      }
    }

    // Check if paused
    if (isPaused) {
      return {
        canSend: false,
        reason: 'SMS sending is paused due to budget exceeded.',
        isPaused: true,
        usagePercentage,
        remainingBudget,
      }
    }

    // Check if budget exceeded
    if (totalBudget > 0 && usedAmount >= totalBudget) {
      return {
        canSend: false,
        reason: 'SMS budget has been exceeded.',
        isPaused: false,
        usagePercentage,
        remainingBudget,
      }
    }

    return {
      canSend: true,
      isPaused: false,
      usagePercentage,
      remainingBudget,
    }
  }

  // ============================================
  // BUDGET STATUS AND REPORTING
  // ============================================

  /**
   * Get budget status for dashboard display
   * Requirement 31.3: Display current SMS spend, remaining budget, and projected term cost
   */
  async getBudgetStatus(schoolId: string, termId: string): Promise<SMSBudgetStatus | null> {
    const usage = await this.getBudgetUsage(schoolId, termId)
    
    if (!usage) {
      return null
    }

    // Get term dates for projection calculation
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { startDate: true, endDate: true },
    })

    if (!term) {
      return null
    }

    const now = new Date()
    const termStart = new Date(term.startDate)
    const termEnd = new Date(term.endDate)
    
    // Calculate days elapsed and remaining
    const totalDays = Math.ceil((termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24))
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24)))
    const daysRemaining = Math.max(0, Math.ceil((termEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // Calculate projections
    const averageDailyCost = usage.usedAmount / daysElapsed
    const projectedTermCost = averageDailyCost * totalDays

    const usagePercentage = usage.totalBudget > 0 
      ? (usage.usedAmount / usage.totalBudget) * 100 
      : 0
    const remainingBudget = Math.max(0, usage.totalBudget - usage.usedAmount)

    return {
      schoolId,
      termId,
      totalBudget: usage.totalBudget,
      usedAmount: usage.usedAmount,
      remainingBudget,
      smsCount: usage.smsCount,
      usagePercentage,
      isPaused: usage.isPaused,
      projectedTermCost,
      daysRemaining,
      averageDailyCost,
    }
  }

  /**
   * Get SMS cost report for a school
   * Requirement 23.2: Display SMS sent count, cost, and remaining quota per student tier
   */
  async getSMSCostReport(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCost: number
    totalSMS: number
    averageCostPerSMS: number
    costByDay: { date: string; cost: number; count: number }[]
  }> {
    const logs = await prisma.sMSCostLog.findMany({
      where: {
        schoolId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const totalCost = logs.reduce((sum, log) => sum + log.cost, 0)
    const totalSMS = logs.length
    const averageCostPerSMS = totalSMS > 0 ? totalCost / totalSMS : 0

    // Group by day
    const costByDayMap = new Map<string, { cost: number; count: number }>()
    
    for (const log of logs) {
      const dateKey = log.createdAt.toISOString().split('T')[0]
      const existing = costByDayMap.get(dateKey) || { cost: 0, count: 0 }
      costByDayMap.set(dateKey, {
        cost: existing.cost + log.cost,
        count: existing.count + 1,
      })
    }

    const costByDay = Array.from(costByDayMap.entries()).map(([date, data]) => ({
      date,
      cost: data.cost,
      count: data.count,
    }))

    return {
      totalCost,
      totalSMS,
      averageCostPerSMS,
      costByDay,
    }
  }

  /**
   * Get term communication cost summary
   * Requirement 23.3: Generate communication cost summary showing total SMS and Email volumes
   */
  async getTermCostSummary(
    schoolId: string,
    termId: string
  ): Promise<{
    sms: { count: number; cost: number }
    email: { count: number; cost: number }
    total: { count: number; cost: number }
  }> {
    // Get SMS costs from our tracking
    const usage = await this.getBudgetUsage(schoolId, termId)
    
    // Get message counts by channel
    const messageCounts = await prisma.message.groupBy({
      by: ['channel'],
      where: {
        schoolId,
        // Messages created during the term
        createdAt: {
          gte: await this.getTermStartDate(termId),
          lte: await this.getTermEndDate(termId),
        },
      },
      _count: true,
    })

    const smsCount = messageCounts.find(m => m.channel === 'SMS')?._count ?? 0
    const emailCount = messageCounts.find(m => m.channel === 'EMAIL')?._count ?? 0

    const smsCost = usage?.usedAmount ?? smsCount * SMS_COST_UGX
    const emailCost = 0 // Email is typically free or bundled

    return {
      sms: { count: smsCount, cost: smsCost },
      email: { count: emailCount, cost: emailCost },
      total: {
        count: smsCount + emailCount,
        cost: smsCost + emailCost,
      },
    }
  }

  /**
   * Get term start date
   */
  private async getTermStartDate(termId: string): Promise<Date> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { startDate: true },
    })
    return term?.startDate ?? new Date()
  }

  /**
   * Get term end date
   */
  private async getTermEndDate(termId: string): Promise<Date> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { endDate: true },
    })
    return term?.endDate ?? new Date()
  }

  // ============================================
  // ALERTS MANAGEMENT
  // ============================================

  /**
   * Get alerts for a school
   */
  async getAlerts(
    schoolId: string,
    options?: {
      termId?: string
      unacknowledgedOnly?: boolean
      limit?: number
    }
  ): Promise<SMSBudgetAlert[]> {
    const alerts = await prisma.sMSBudgetAlert.findMany({
      where: {
        schoolId,
        ...(options?.termId && { termId: options.termId }),
        ...(options?.unacknowledgedOnly && { acknowledgedAt: null }),
      },
      orderBy: { notifiedAt: 'desc' },
      take: options?.limit ?? 50,
    })

    return alerts.map(mapPrismaAlertToDomain)
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<SMSBudgetAlert> {
    const updated = await prisma.sMSBudgetAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    })

    return mapPrismaAlertToDomain(updated)
  }

  // ============================================
  // BUDGET RESET
  // ============================================

  /**
   * Reset budget for a new term
   */
  async resetBudgetForNewTerm(
    schoolId: string,
    newTermId: string,
    budget: number
  ): Promise<SMSBudgetUsage> {
    // Create new budget usage for the new term
    const usage = await this.initializeBudget({
      schoolId,
      termId: newTermId,
      totalBudget: budget,
    })

    // Create reset alert
    await prisma.sMSBudgetAlert.create({
      data: {
        schoolId,
        termId: newTermId,
        alertType: SMSBudgetAlertType.BUDGET_RESET,
        usedAmount: 0,
        budgetLimit: budget,
        percentage: 0,
        message: `SMS budget has been reset for the new term. Budget: UGX ${budget.toLocaleString()}`,
      },
    })

    return usage
  }

  // ============================================
  // PURE FUNCTIONS FOR TESTING
  // ============================================

  /**
   * Calculate usage percentage (pure function for testing)
   */
  calculateUsagePercentage(usedAmount: number, totalBudget: number): number {
    if (totalBudget <= 0) return 0
    return (usedAmount / totalBudget) * 100
  }

  /**
   * Check if threshold is reached (pure function for testing)
   */
  isThresholdReached(
    usedAmount: number,
    totalBudget: number,
    threshold: number
  ): boolean {
    if (totalBudget <= 0) return false
    return usedAmount / totalBudget >= threshold
  }

  /**
   * Calculate remaining budget (pure function for testing)
   */
  calculateRemainingBudget(usedAmount: number, totalBudget: number): number {
    return Math.max(0, totalBudget - usedAmount)
  }

  /**
   * Calculate projected term cost (pure function for testing)
   */
  calculateProjectedTermCost(
    usedAmount: number,
    daysElapsed: number,
    totalDays: number
  ): number {
    if (daysElapsed <= 0) return 0
    const averageDailyCost = usedAmount / daysElapsed
    return averageDailyCost * totalDays
  }
}

// Export singleton instance
export const smsBudgetService = new SMSBudgetService()
