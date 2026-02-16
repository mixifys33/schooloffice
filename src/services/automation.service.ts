/**
 * Automation Service
 * Handles scheduled and event-driven messaging automation.
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
   
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/db'
import {
  AutomationRule,
  CreateAutomationRuleInput,
  AutomationExecutionResult,
  TriggerConfig,
  TargetCriteria,
} from '../types/entities'
import {
  TriggerType,
  ExecutionStatus,
  MessageChannel,
  DeliveryStatus,
  TargetType,
} from '../types/enums'
import type {
  IAutomationService,
  AttendanceEvent,
  PaymentEvent,
  ResultsEvent,
} from '../types/services'
import { messageOrchestratorService } from './message-orchestrator.service'
import { targetingService } from './targeting.service'
import { messageTemplateService } from './message-template.service'
import { attendanceMessageService } from './attendance-message.service'
import { financialMessageService } from './financial-message.service'

// ============================================
// TYPES
// ============================================

interface AutomationRulePrisma {
  id: string
  schoolId: string
  name: string
  description: string | null
  triggerType: string
  triggerConfig: unknown
  targetType: string
  targetCriteria: unknown
  templateId: string | null
  channel: string
  isActive: boolean
  lastExecutedAt: Date | null
  executionCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface AutomationExecutionPrisma {
  id: string
  ruleId: string
  triggeredAt: Date
  completedAt: Date | null
  status: string
  recipientCount: number
  successCount: number
  failureCount: number
  errorMessage: string | null
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma automation rule to domain type
 */
function mapPrismaRuleToDomain(rule: AutomationRulePrisma): AutomationRule {
  return {
    id: rule.id,
    schoolId: rule.schoolId,
    name: rule.name,
    description: rule.description || undefined,
    triggerType: rule.triggerType as TriggerType,
    triggerConfig: rule.triggerConfig as TriggerConfig,
    targetType: rule.targetType,
    targetCriteria: rule.targetCriteria as TargetCriteria,
    templateId: rule.templateId || undefined,
    channel: rule.channel as MessageChannel,
    isActive: rule.isActive,
    lastExecutedAt: rule.lastExecutedAt || undefined,
    executionCount: rule.executionCount,
    createdBy: rule.createdBy,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }
}

/**
 * Check if a cron expression matches the current time
 * Simple implementation for common patterns
 */
function cronMatchesNow(cronExpression: string): boolean {
  const now = new Date()
  const parts = cronExpression.split(' ')
  
  if (parts.length !== 5) return false
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  
  // Check minute
  if (minute !== '*' && parseInt(minute) !== now.getMinutes()) return false
  
  // Check hour
  if (hour !== '*' && parseInt(hour) !== now.getHours()) return false
  
  // Check day of month
  if (dayOfMonth !== '*' && parseInt(dayOfMonth) !== now.getDate()) return false
  
  // Check month (cron months are 1-12)
  if (month !== '*' && parseInt(month) !== now.getMonth() + 1) return false
  
  // Check day of week (0 = Sunday)
  if (dayOfWeek !== '*' && parseInt(dayOfWeek) !== now.getDay()) return false
  
  return true
}

/**
 * Check if a scheduled date matches today
 */
function scheduledDateMatchesToday(scheduledDates: Date[]): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return scheduledDates.some(date => {
    const schedDate = new Date(date)
    schedDate.setHours(0, 0, 0, 0)
    return schedDate.getTime() === today.getTime()
  })
}

// ============================================
// AUTOMATION SERVICE
// ============================================

export class AutomationService implements IAutomationService {
  /**
   * Create a new automation rule
   * Requirement 11.4: Support configuring automation rules with conditions and actions
   */
  async createAutomationRule(input: CreateAutomationRuleInput): Promise<AutomationRule> {
    // Validate the input
    this.validateRuleInput(input)

    const rule = await prisma.automationRule.create({
      data: {
        schoolId: input.schoolId,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig as object,
        targetType: input.targetType,
        targetCriteria: input.targetCriteria as object,
        templateId: input.templateId,
        channel: input.channel,
        isActive: true,
        executionCount: 0,
        createdBy: input.createdBy,
      },
    })

    return mapPrismaRuleToDomain(rule as AutomationRulePrisma)
  }

  /**
   * Update an existing automation rule
   * Requirement 11.4: Support configuring automation rules
   */
  async updateAutomationRule(
    id: string,
    updates: Partial<CreateAutomationRuleInput>
  ): Promise<AutomationRule> {
    const existingRule = await prisma.automationRule.findUnique({
      where: { id },
    })

    if (!existingRule) {
      throw new Error(`Automation rule with id ${id} not found`)
    }

    const updateData: Record<string, unknown> = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.triggerType !== undefined) updateData.triggerType = updates.triggerType
    if (updates.triggerConfig !== undefined) updateData.triggerConfig = updates.triggerConfig as object
    if (updates.targetType !== undefined) updateData.targetType = updates.targetType
    if (updates.targetCriteria !== undefined) updateData.targetCriteria = updates.targetCriteria as object
    if (updates.templateId !== undefined) updateData.templateId = updates.templateId
    if (updates.channel !== undefined) updateData.channel = updates.channel

    const rule = await prisma.automationRule.update({
      where: { id },
      data: updateData,
    })

    return mapPrismaRuleToDomain(rule as AutomationRulePrisma)
  }

  /**
   * Delete an automation rule
   * Requirement 11.4: Support configuring automation rules
   */
  async deleteAutomationRule(id: string): Promise<void> {
    const existingRule = await prisma.automationRule.findUnique({
      where: { id },
    })

    if (!existingRule) {
      throw new Error(`Automation rule with id ${id} not found`)
    }

    await prisma.automationRule.delete({
      where: { id },
    })
  }

  /**
   * Get all automation rules for a school
   * Requirement 11.4: Support configuring automation rules
   */
  async getAutomationRules(schoolId: string): Promise<AutomationRule[]> {
    const rules = await prisma.automationRule.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    })

    return rules.map(rule => mapPrismaRuleToDomain(rule as AutomationRulePrisma))
  }

  /**
   * Get a single automation rule by ID
   */
  async getAutomationRuleById(id: string): Promise<AutomationRule | null> {
    const rule = await prisma.automationRule.findUnique({
      where: { id },
    })

    if (!rule) return null
    return mapPrismaRuleToDomain(rule as AutomationRulePrisma)
  }

  /**
   * Execute an automation rule manually or by trigger
   * Requirement 11.5: Log failures and retry according to policy
   */
  async executeRule(ruleId: string): Promise<AutomationExecutionResult> {
    const rule = await this.getAutomationRuleById(ruleId)
    
    if (!rule) {
      return {
        executionId: uuidv4(),
        status: ExecutionStatus.FAILED,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [`Rule with id ${ruleId} not found`],
      }
    }

    if (!rule.isActive) {
      return {
        executionId: uuidv4(),
        status: ExecutionStatus.FAILED,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: ['Rule is not active'],
      }
    }

    // Create execution record
    const execution = await prisma.automationExecution.create({
      data: {
        ruleId,
        status: ExecutionStatus.RUNNING,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
      },
    })

    try {
      // Resolve recipients based on targeting
      const recipients = await targetingService.resolveRecipients({
        schoolId: rule.schoolId,
        targetType: rule.targetType as TargetType,
        criteria: rule.targetCriteria,
      })

      if (recipients.length === 0) {
        await this.updateExecution(execution.id, {
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date(),
          recipientCount: 0,
          errorMessage: 'No recipients found',
        })

        return {
          executionId: execution.id,
          status: ExecutionStatus.COMPLETED,
          recipientCount: 0,
          successCount: 0,
          failureCount: 0,
          errors: ['No recipients found'],
        }
      }

      // Get template content if specified
      let content: string | undefined
      if (rule.templateId) {
        const template = await messageTemplateService.getTemplateById(rule.templateId)
        content = template?.content
      }

      // Send messages via orchestrator
      const result = await messageOrchestratorService.sendBulkMessage({
        schoolId: rule.schoolId,
        targetType: rule.targetType as TargetType,
        targetCriteria: rule.targetCriteria,
        templateId: rule.templateId,
        customContent: content,
        channel: rule.channel,
        priority: 'normal',
        senderId: rule.createdBy,
      })

      // Update execution record
      const successCount = result.queued
      const failureCount = result.errors.length

      await this.updateExecution(execution.id, {
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
        recipientCount: result.totalRecipients,
        successCount,
        failureCount,
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
      })

      // Update rule execution stats
      await prisma.automationRule.update({
        where: { id: ruleId },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 },
        },
      })

      return {
        executionId: execution.id,
        status: ExecutionStatus.COMPLETED,
        recipientCount: result.totalRecipients,
        successCount,
        failureCount,
        errors: result.errors,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed'

      await this.updateExecution(execution.id, {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      })

      return {
        executionId: execution.id,
        status: ExecutionStatus.FAILED,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [errorMessage],
      }
    }
  }

  /**
   * Process all scheduled messages that are due
   * Requirement 6.2: Send announcements at specified date and time
   * Requirement 11.1: Send fee reminders on specified dates automatically
   */
  async processScheduledMessages(): Promise<void> {
    // Get all active scheduled rules
    const scheduledRules = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: TriggerType.SCHEDULED,
      },
    })

    for (const rule of scheduledRules) {
      const triggerConfig = rule.triggerConfig as TriggerConfig

      // Check if rule should execute now
      let shouldExecute = false

      if (triggerConfig.cronExpression) {
        shouldExecute = cronMatchesNow(triggerConfig.cronExpression)
      } else if (triggerConfig.scheduledDates && triggerConfig.scheduledDates.length > 0) {
        shouldExecute = scheduledDateMatchesToday(triggerConfig.scheduledDates)
      }

      if (shouldExecute) {
        try {
          await this.executeRule(rule.id)
        } catch (error) {
          console.error(`Failed to execute scheduled rule ${rule.id}:`, error)
          // Log the failure but continue processing other rules
          await this.logAutomationError(rule.id, error)
        }
      }
    }
  }

  /**
   * Handle attendance marked event
   * Requirement 11.2: Trigger absence notifications without manual action
   */
  async onAttendanceMarked(event: AttendanceEvent): Promise<void> {
    const { studentId, classId, date, status } = event

    // Get student's school
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    })

    if (!student) return

    // Find active attendance automation rules for this school
    const rules = await prisma.automationRule.findMany({
      where: {
        schoolId: student.schoolId,
        isActive: true,
        triggerType: TriggerType.EVENT_ATTENDANCE,
      },
    })

    for (const rule of rules) {
      const triggerConfig = rule.triggerConfig as TriggerConfig

      // Check if event matches rule conditions
      if (this.eventMatchesConditions(event, triggerConfig.eventConditions)) {
        // Apply delay if configured
        const delayMs = (triggerConfig.delayMinutes || 0) * 60 * 1000

        if (delayMs > 0) {
          setTimeout(async () => {
            await this.executeAttendanceAutomation(rule.id, event)
          }, delayMs)
        } else {
          await this.executeAttendanceAutomation(rule.id, event)
        }
      }
    }

    // Also trigger the attendance message service directly for immediate notifications
    if (status === 'ABSENT' || status === 'LATE') {
      await attendanceMessageService.handleAttendanceEvent({
        studentId,
        classId,
        schoolId: student.schoolId,
        date,
        status: status as 'ABSENT' | 'LATE',
        senderId: 'system',
      })
    }
  }

  /**
   * Handle payment received event
   * Requirement 11.3: Notify relevant students and guardians automatically
   */
  async onPaymentReceived(event: PaymentEvent): Promise<void> {
    const { studentId, amount, paymentId, termId } = event

    // Get student's school
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    })

    if (!student) return

    // Find active payment automation rules for this school
    const rules = await prisma.automationRule.findMany({
      where: {
        schoolId: student.schoolId,
        isActive: true,
        triggerType: TriggerType.EVENT_PAYMENT,
      },
    })

    for (const rule of rules) {
      const triggerConfig = rule.triggerConfig as TriggerConfig

      // Check if event matches rule conditions
      if (this.eventMatchesConditions(event, triggerConfig.eventConditions)) {
        // Apply delay if configured
        const delayMs = (triggerConfig.delayMinutes || 0) * 60 * 1000

        if (delayMs > 0) {
          setTimeout(async () => {
            await this.executePaymentAutomation(rule.id, event)
          }, delayMs)
        } else {
          await this.executePaymentAutomation(rule.id, event)
        }
      }
    }

    // Also send payment confirmation directly
    await financialMessageService.sendPaymentConfirmation({
      schoolId: student.schoolId,
      studentId,
      termId,
      paymentId,
      senderId: 'system',
    })
  }

  /**
   * Handle results published event
   * Requirement 11.3: Notify relevant students and guardians automatically when results are published
   */
  async onResultsPublished(event: ResultsEvent): Promise<void> {
    const { classId, termId, examId } = event

    // Get class's school
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    })

    if (!classInfo) return

    // Find active results automation rules for this school
    const rules = await prisma.automationRule.findMany({
      where: {
        schoolId: classInfo.schoolId,
        isActive: true,
        triggerType: TriggerType.EVENT_RESULTS,
      },
    })

    for (const rule of rules) {
      const triggerConfig = rule.triggerConfig as TriggerConfig

      // Check if event matches rule conditions
      if (this.eventMatchesConditions(event, triggerConfig.eventConditions)) {
        // Apply delay if configured
        const delayMs = (triggerConfig.delayMinutes || 0) * 60 * 1000

        if (delayMs > 0) {
          setTimeout(async () => {
            await this.executeResultsAutomation(rule.id, event)
          }, delayMs)
        } else {
          await this.executeResultsAutomation(rule.id, event)
        }
      }
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Validate automation rule input
   */
  private validateRuleInput(input: CreateAutomationRuleInput): void {
    if (!input.schoolId) {
      throw new Error('School ID is required')
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Rule name is required')
    }
    if (!input.triggerType) {
      throw new Error('Trigger type is required')
    }
    if (!input.targetType) {
      throw new Error('Target type is required')
    }
    if (!input.channel) {
      throw new Error('Channel is required')
    }
    if (!input.createdBy) {
      throw new Error('Created by is required')
    }

    // Validate trigger config based on trigger type
    if (input.triggerType === TriggerType.SCHEDULED) {
      if (!input.triggerConfig.cronExpression && 
          (!input.triggerConfig.scheduledDates || input.triggerConfig.scheduledDates.length === 0)) {
        throw new Error('Scheduled trigger requires cronExpression or scheduledDates')
      }
    }
  }

  /**
   * Update execution record
   */
  private async updateExecution(
    executionId: string,
    data: Partial<AutomationExecutionPrisma>
  ): Promise<void> {
    await prisma.automationExecution.update({
      where: { id: executionId },
      data,
    })
  }

  /**
   * Check if an event matches the configured conditions
   */
  private eventMatchesConditions(
    event: AttendanceEvent | PaymentEvent | ResultsEvent,
    conditions?: { field: string; operator: string; value: unknown }[]
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true // No conditions means always match
    }

    return conditions.every(condition => {
      const eventValue = (event as Record<string, unknown>)[condition.field]
      
      switch (condition.operator) {
        case 'eq':
          return eventValue === condition.value
        case 'ne':
          return eventValue !== condition.value
        case 'gt':
          return typeof eventValue === 'number' && eventValue > (condition.value as number)
        case 'lt':
          return typeof eventValue === 'number' && eventValue < (condition.value as number)
        case 'gte':
          return typeof eventValue === 'number' && eventValue >= (condition.value as number)
        case 'lte':
          return typeof eventValue === 'number' && eventValue <= (condition.value as number)
        default:
          return false
      }
    })
  }

  /**
   * Execute attendance-specific automation
   */
  private async executeAttendanceAutomation(
    ruleId: string,
    event: AttendanceEvent
  ): Promise<void> {
    const rule = await this.getAutomationRuleById(ruleId)
    if (!rule || !rule.isActive) return

    // Create execution record
    const execution = await prisma.automationExecution.create({
      data: {
        ruleId,
        status: ExecutionStatus.RUNNING,
        recipientCount: 1,
        successCount: 0,
        failureCount: 0,
      },
    })

    try {
      const result = await attendanceMessageService.handleAttendanceEvent({
        studentId: event.studentId,
        classId: event.classId,
        schoolId: rule.schoolId,
        date: event.date,
        status: event.status as 'ABSENT' | 'LATE',
        senderId: rule.createdBy,
      })

      await this.updateExecution(execution.id, {
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
        successCount: result.success ? 1 : 0,
        failureCount: result.success ? 0 : 1,
        errorMessage: result.error || null,
      })

      // Update rule stats
      await prisma.automationRule.update({
        where: { id: ruleId },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 },
        },
      })
    } catch (error) {
      await this.updateExecution(execution.id, {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        failureCount: 1,
        errorMessage: error instanceof Error ? error.message : 'Execution failed',
      })
    }
  }

  /**
   * Execute payment-specific automation
   */
  private async executePaymentAutomation(
    ruleId: string,
    event: PaymentEvent
  ): Promise<void> {
    const rule = await this.getAutomationRuleById(ruleId)
    if (!rule || !rule.isActive) return

    // Create execution record
    const execution = await prisma.automationExecution.create({
      data: {
        ruleId,
        status: ExecutionStatus.RUNNING,
        recipientCount: 1,
        successCount: 0,
        failureCount: 0,
      },
    })

    try {
      const result = await financialMessageService.sendPaymentConfirmation({
        schoolId: rule.schoolId,
        studentId: event.studentId,
        termId: event.termId,
        paymentId: event.paymentId,
        senderId: rule.createdBy,
      })

      await this.updateExecution(execution.id, {
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
        successCount: result.success ? 1 : 0,
        failureCount: result.success ? 0 : 1,
        errorMessage: result.error || null,
      })

      // Update rule stats
      await prisma.automationRule.update({
        where: { id: ruleId },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 },
        },
      })
    } catch (error) {
      await this.updateExecution(execution.id, {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        failureCount: 1,
        errorMessage: error instanceof Error ? error.message : 'Execution failed',
      })
    }
  }

  /**
   * Execute results-specific automation
   */
  private async executeResultsAutomation(
    ruleId: string,
    event: ResultsEvent
  ): Promise<void> {
    const rule = await this.getAutomationRuleById(ruleId)
    if (!rule || !rule.isActive) return

    // Create execution record
    const execution = await prisma.automationExecution.create({
      data: {
        ruleId,
        status: ExecutionStatus.RUNNING,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
      },
    })

    try {
      // Send bulk message to class students/guardians about results
      const result = await messageOrchestratorService.sendBulkMessage({
        schoolId: rule.schoolId,
        targetType: TargetType.CLASS,
        targetCriteria: { classIds: [event.classId] },
        templateId: rule.templateId,
        channel: rule.channel,
        priority: 'normal',
        senderId: rule.createdBy,
      })

      await this.updateExecution(execution.id, {
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
        recipientCount: result.totalRecipients,
        successCount: result.queued,
        failureCount: result.errors.length,
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
      })

      // Update rule stats
      await prisma.automationRule.update({
        where: { id: ruleId },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 },
        },
      })
    } catch (error) {
      await this.updateExecution(execution.id, {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Execution failed',
      })
    }
  }

  /**
   * Log automation error for debugging
   */
  private async logAutomationError(ruleId: string, error: unknown): Promise<void> {
    try {
      const rule = await prisma.automationRule.findUnique({
        where: { id: ruleId },
        select: { schoolId: true, createdBy: true },
      })

      if (rule) {
        await prisma.auditLog.create({
          data: {
            schoolId: rule.schoolId,
            userId: rule.createdBy,
            action: 'automation_execution_error',
            resource: 'automation_rule',
            resourceId: ruleId,
            newValue: {
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date(),
          },
        })
      }
    } catch (logError) {
      console.error('Failed to log automation error:', logError)
    }
  }

  // ============================================
  // UTILITY METHODS FOR TESTING
  // ============================================

  /**
   * Check if a cron expression is valid
   */
  isValidCronExpression(cronExpression: string): boolean {
    const parts = cronExpression.split(' ')
    if (parts.length !== 5) return false

    const ranges = [
      { min: 0, max: 59 },  // minute
      { min: 0, max: 23 },  // hour
      { min: 1, max: 31 },  // day of month
      { min: 1, max: 12 },  // month
      { min: 0, max: 6 },   // day of week
    ]

    return parts.every((part, index) => {
      if (part === '*') return true
      const num = parseInt(part)
      if (isNaN(num)) return false
      return num >= ranges[index].min && num <= ranges[index].max
    })
  }

  /**
   * Get next execution time for a scheduled rule
   */
  getNextExecutionTime(triggerConfig: TriggerConfig): Date | null {
    if (triggerConfig.scheduledDates && triggerConfig.scheduledDates.length > 0) {
      const now = new Date()
      const futureDates = triggerConfig.scheduledDates
        .map(d => new Date(d))
        .filter(d => d > now)
        .sort((a, b) => a.getTime() - b.getTime())
      
      return futureDates.length > 0 ? futureDates[0] : null
    }

    // For cron expressions, return null (would need more complex calculation)
    return null
  }

  /**
   * Activate or deactivate a rule
   */
  async setRuleActive(ruleId: string, isActive: boolean): Promise<AutomationRule> {
    const rule = await prisma.automationRule.update({
      where: { id: ruleId },
      data: { isActive },
    })

    return mapPrismaRuleToDomain(rule as AutomationRulePrisma)
  }

  /**
   * Get execution history for a rule
   */
  async getExecutionHistory(
    ruleId: string,
    limit: number = 10
  ): Promise<AutomationExecutionResult[]> {
    const executions = await prisma.automationExecution.findMany({
      where: { ruleId },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    })

    return executions.map(exec => ({
      executionId: exec.id,
      status: exec.status as ExecutionStatus,
      recipientCount: exec.recipientCount,
      successCount: exec.successCount,
      failureCount: exec.failureCount,
      errors: exec.errorMessage ? [exec.errorMessage] : [],
    }))
  }

  // ============================================
  // SCHEDULED MESSAGE PROCESSING
  // Requirements: 6.2, 11.1
  // ============================================

  /**
   * Process fee reminder schedules
   * Requirement 11.1: Send fee reminders on specified dates automatically
   */
  async processFeeReminderSchedules(): Promise<void> {
    // Get all active fee reminder rules
    const feeReminderRules = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: TriggerType.EVENT_FEE_DUE,
      },
    })

    for (const rule of feeReminderRules) {
      const triggerConfig = rule.triggerConfig as TriggerConfig

      // Check if rule should execute today
      let shouldExecute = false

      if (triggerConfig.cronExpression) {
        shouldExecute = cronMatchesNow(triggerConfig.cronExpression)
      } else if (triggerConfig.scheduledDates && triggerConfig.scheduledDates.length > 0) {
        shouldExecute = scheduledDateMatchesToday(triggerConfig.scheduledDates)
      }

      if (shouldExecute) {
        try {
          await this.executeFeeReminderRule(rule.id)
        } catch (error) {
          console.error(`Failed to execute fee reminder rule ${rule.id}:`, error)
          await this.logAutomationError(rule.id, error)
        }
      }
    }
  }

  /**
   * Execute a fee reminder automation rule
   * Requirement 11.1: Send fee reminders on specified dates automatically
   */
  private async executeFeeReminderRule(ruleId: string): Promise<AutomationExecutionResult> {
    const rule = await this.getAutomationRuleById(ruleId)
    
    if (!rule || !rule.isActive) {
      return {
        executionId: uuidv4(),
        status: ExecutionStatus.FAILED,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: ['Rule not found or inactive'],
      }
    }

    // Create execution record
    const execution = await prisma.automationExecution.create({
      data: {
        ruleId,
        status: ExecutionStatus.RUNNING,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
      },
    })

    try {
      // Get current term
      const currentYear = await prisma.academicYear.findFirst({
        where: { schoolId: rule.schoolId, isActive: true },
        include: { terms: true },
      })

      if (!currentYear || currentYear.terms.length === 0) {
        await this.updateExecution(execution.id, {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
          errorMessage: 'No active academic year or term found',
        })

        return {
          executionId: execution.id,
          status: ExecutionStatus.FAILED,
          recipientCount: 0,
          successCount: 0,
          failureCount: 0,
          errors: ['No active academic year or term found'],
        }
      }

      const currentTerm = currentYear.terms[0]

      // Get fee threshold from target criteria
      const feeThreshold = rule.targetCriteria.feeThreshold || 0

      // Send bulk fee reminders
      const result = await financialMessageService.sendBulkFeeReminders({
        schoolId: rule.schoolId,
        termId: currentTerm.id,
        senderId: rule.createdBy,
        minBalance: feeThreshold,
        channel: rule.channel,
      })

      await this.updateExecution(execution.id, {
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
        recipientCount: result.totalStudents,
        successCount: result.sent,
        failureCount: result.failed + result.blocked,
        errorMessage: result.errors.length > 0 ? result.errors.join('; ') : null,
      })

      // Update rule stats
      await prisma.automationRule.update({
        where: { id: ruleId },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 },
        },
      })

      return {
        executionId: execution.id,
        status: ExecutionStatus.COMPLETED,
        recipientCount: result.totalStudents,
        successCount: result.sent,
        failureCount: result.failed + result.blocked,
        errors: result.errors,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed'

      await this.updateExecution(execution.id, {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      })

      return {
        executionId: execution.id,
        status: ExecutionStatus.FAILED,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [errorMessage],
      }
    }
  }

  /**
   * Create a fee reminder schedule rule
   * Requirement 11.1: Configure fee reminder schedules
   */
  async createFeeReminderSchedule(params: {
    schoolId: string
    name: string
    description?: string
    feeThreshold: number
    scheduledDates?: Date[]
    cronExpression?: string
    channel: MessageChannel
    createdBy: string
  }): Promise<AutomationRule> {
    const { schoolId, name, description, feeThreshold, scheduledDates, cronExpression, channel, createdBy } = params

    if (!scheduledDates?.length && !cronExpression) {
      throw new Error('Either scheduledDates or cronExpression is required')
    }

    return this.createAutomationRule({
      schoolId,
      name,
      description,
      triggerType: TriggerType.EVENT_FEE_DUE,
      triggerConfig: {
        scheduledDates,
        cronExpression,
      },
      targetType: TargetType.FEE_DEFAULTERS,
      targetCriteria: {
        feeThreshold,
      },
      channel,
      createdBy,
    })
  }

  /**
   * Process all scheduled announcements
   * Requirement 6.2: Send announcements at specified date and time
   */
  async processScheduledAnnouncements(): Promise<void> {
    const now = new Date()

    // Get all scheduled announcements that are due
    const dueAnnouncements = await prisma.enhancedAnnouncement.findMany({
      where: {
        scheduledAt: {
          lte: now,
        },
        publishedAt: null,
      },
    })

    for (const announcement of dueAnnouncements) {
      try {
        // Send the announcement
        await messageOrchestratorService.sendBulkMessage({
          schoolId: announcement.schoolId,
          targetType: announcement.targetType as TargetType,
          targetCriteria: announcement.targetCriteria as TargetCriteria,
          customContent: announcement.content,
          channel: announcement.channels[0] || MessageChannel.SMS,
          priority: 'normal',
          senderId: announcement.createdBy,
        })

        // Mark as published
        await prisma.enhancedAnnouncement.update({
          where: { id: announcement.id },
          data: { publishedAt: new Date() },
        })
      } catch (error) {
        console.error(`Failed to process scheduled announcement ${announcement.id}:`, error)
      }
    }
  }

  /**
   * Run all scheduled processing tasks
   * This should be called by a cron job or scheduler
   */
  async runScheduledTasks(): Promise<void> {
    await Promise.all([
      this.processScheduledMessages(),
      this.processFeeReminderSchedules(),
      this.processScheduledAnnouncements(),
    ])
  }

  // ============================================
  // EVENT-DRIVEN TRIGGER HELPERS
  // Requirements: 11.2, 11.3
  // ============================================

  /**
   * Create an attendance trigger rule
   * Requirement 11.2: Trigger on attendance marked
   */
  async createAttendanceTriggerRule(params: {
    schoolId: string
    name: string
    description?: string
    attendanceStatus?: 'ABSENT' | 'LATE' | 'EARLY_DEPARTURE'
    delayMinutes?: number
    channel: MessageChannel
    templateId?: string
    createdBy: string
  }): Promise<AutomationRule> {
    const { schoolId, name, description, attendanceStatus, delayMinutes, channel, templateId, createdBy } = params

    const eventConditions = attendanceStatus
      ? [{ field: 'status', operator: 'eq' as const, value: attendanceStatus }]
      : undefined

    return this.createAutomationRule({
      schoolId,
      name,
      description,
      triggerType: TriggerType.EVENT_ATTENDANCE,
      triggerConfig: {
        eventConditions,
        delayMinutes,
      },
      targetType: TargetType.SPECIFIC_GUARDIANS,
      targetCriteria: {},
      templateId,
      channel,
      createdBy,
    })
  }

  /**
   * Create a payment trigger rule
   * Requirement 11.3: Trigger on payment received
   */
  async createPaymentTriggerRule(params: {
    schoolId: string
    name: string
    description?: string
    minAmount?: number
    delayMinutes?: number
    channel: MessageChannel
    templateId?: string
    createdBy: string
  }): Promise<AutomationRule> {
    const { schoolId, name, description, minAmount, delayMinutes, channel, templateId, createdBy } = params

    const eventConditions = minAmount
      ? [{ field: 'amount', operator: 'gte' as const, value: minAmount }]
      : undefined

    return this.createAutomationRule({
      schoolId,
      name,
      description,
      triggerType: TriggerType.EVENT_PAYMENT,
      triggerConfig: {
        eventConditions,
        delayMinutes,
      },
      targetType: TargetType.SPECIFIC_GUARDIANS,
      targetCriteria: {},
      templateId,
      channel,
      createdBy,
    })
  }

  /**
   * Create a results published trigger rule
   * Requirement 11.3: Trigger on results published
   */
  async createResultsTriggerRule(params: {
    schoolId: string
    name: string
    description?: string
    delayMinutes?: number
    channel: MessageChannel
    templateId?: string
    createdBy: string
  }): Promise<AutomationRule> {
    const { schoolId, name, description, delayMinutes, channel, templateId, createdBy } = params

    return this.createAutomationRule({
      schoolId,
      name,
      description,
      triggerType: TriggerType.EVENT_RESULTS,
      triggerConfig: {
        delayMinutes,
      },
      targetType: TargetType.CLASS,
      targetCriteria: {},
      templateId,
      channel,
      createdBy,
    })
  }

  /**
   * Get all event-driven rules for a school
   */
  async getEventDrivenRules(schoolId: string): Promise<AutomationRule[]> {
    const rules = await prisma.automationRule.findMany({
      where: {
        schoolId,
        triggerType: {
          in: [
            TriggerType.EVENT_ATTENDANCE,
            TriggerType.EVENT_PAYMENT,
            TriggerType.EVENT_RESULTS,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return rules.map(rule => mapPrismaRuleToDomain(rule as AutomationRulePrisma))
  }

  /**
   * Get rules by trigger type
   */
  async getRulesByTriggerType(
    schoolId: string,
    triggerType: TriggerType
  ): Promise<AutomationRule[]> {
    const rules = await prisma.automationRule.findMany({
      where: {
        schoolId,
        triggerType,
      },
      orderBy: { createdAt: 'desc' },
    })

    return rules.map(rule => mapPrismaRuleToDomain(rule as AutomationRulePrisma))
  }

  /**
   * Test if an event would trigger any rules (without executing)
   * Useful for debugging and testing
   */
  async testEventTrigger(
    schoolId: string,
    triggerType: TriggerType,
    event: AttendanceEvent | PaymentEvent | ResultsEvent
  ): Promise<{ ruleId: string; ruleName: string; wouldTrigger: boolean }[]> {
    const rules = await this.getRulesByTriggerType(schoolId, triggerType)

    return rules.map(rule => {
      const triggerConfig = rule.triggerConfig
      const wouldTrigger = rule.isActive && 
        this.eventMatchesConditions(event, triggerConfig.eventConditions)

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        wouldTrigger,
      }
    })
  }

  /**
   * Get statistics for automation rules
   */
  async getAutomationStats(schoolId: string): Promise<{
    totalRules: number
    activeRules: number
    byTriggerType: Record<string, number>
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
  }> {
    const rules = await prisma.automationRule.findMany({
      where: { schoolId },
      include: {
        executions: {
          select: { status: true },
        },
      },
    })

    const byTriggerType: Record<string, number> = {}
    let totalExecutions = 0
    let successfulExecutions = 0
    let failedExecutions = 0

    for (const rule of rules) {
      byTriggerType[rule.triggerType] = (byTriggerType[rule.triggerType] || 0) + 1
      
      for (const exec of rule.executions) {
        totalExecutions++
        if (exec.status === ExecutionStatus.COMPLETED) {
          successfulExecutions++
        } else if (exec.status === ExecutionStatus.FAILED) {
          failedExecutions++
        }
      }
    }

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      byTriggerType,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
    }
  }
}

// Export singleton instance
export const automationService = new AutomationService()
