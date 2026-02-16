/**
 * Automation Rule Service
 * Provides CRUD operations and execution management for automation rules.
 * This service wraps the existing automation.service.ts and provides
 * additional functionality aligned with the Settings architecture.
 * 
 * Requirements: 17.1, 17.2, 17.4, 17.5, 17.6
 */
  
import { prisma } from '../lib/db'
import {
  AutomationRule,
  CreateAutomationRuleInput,
  AutomationExecutionResult,
  TriggerConfig,
} from '../types/entities'
import {
  TriggerType,
  ExecutionStatus,
  MessageChannel,
  TargetType,
} from '../types/enums'
import { automationService } from './automation.service'

// ============================================
// TYPES
// ============================================

/**
 * Automation trigger types aligned with Requirements 17.6
 */
export enum AutomationTriggerType {
  FEE_OVERDUE = 'FEE_OVERDUE',
  CONSECUTIVE_ABSENCE = 'CONSECUTIVE_ABSENCE',
  RESULTS_PUBLISHED = 'RESULTS_PUBLISHED',
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL',
}

/**
 * Automation action types aligned with Requirements 17.2
 */
export enum AutomationActionType {
  SEND_MESSAGE = 'SEND_MESSAGE',
  CREATE_ALERT = 'CREATE_ALERT',
  ESCALATE = 'ESCALATE',
  UPDATE_STATUS = 'UPDATE_STATUS',
}

/**
 * Automation condition for rule evaluation
 */
export interface AutomationCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'
  value: unknown
}

/**
 * Automation action configuration
 */
export interface AutomationAction {
  type: AutomationActionType
  config: {
    channel?: MessageChannel
    templateId?: string
    customContent?: string
    alertType?: string
    escalateTo?: string
    statusValue?: string
  }
}

/**
 * Extended automation rule with conditions and actions
 * Aligned with design document structure
 */
export interface ExtendedAutomationRule {
  id: string
  schoolId: string
  name: string
  description?: string
  trigger: {
    type: AutomationTriggerType
    config: TriggerConfig
  }
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  isEnabled: boolean
  lastExecutedAt?: Date
  executionCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating an extended automation rule
 */
export interface CreateExtendedAutomationRuleInput {
  schoolId: string
  name: string
  description?: string
  trigger: {
    type: AutomationTriggerType
    config?: TriggerConfig
  }
  conditions?: AutomationCondition[]
  actions: AutomationAction[]
  createdBy: string
}

/**
 * Input for updating an extended automation rule
 */
export interface UpdateExtendedAutomationRuleInput {
  name?: string
  description?: string
  trigger?: {
    type: AutomationTriggerType
    config?: TriggerConfig
  }
  conditions?: AutomationCondition[]
  actions?: AutomationAction[]
  isEnabled?: boolean
}

/**
 * Automation execution log entry
 * Requirement 17.5: Log each execution with timestamp and outcome
 */
export interface AutomationExecutionLog {
  id: string
  ruleId: string
  ruleName: string
  triggeredAt: Date
  completedAt?: Date
  status: ExecutionStatus
  recipientCount: number
  successCount: number
  failureCount: number
  errorMessage?: string
  triggerType: AutomationTriggerType
  actionsExecuted: string[]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map extended trigger type to internal trigger type
 */
function mapTriggerType(type: AutomationTriggerType): TriggerType {
  switch (type) {
    case AutomationTriggerType.FEE_OVERDUE:
      return TriggerType.EVENT_FEE_DUE
    case AutomationTriggerType.CONSECUTIVE_ABSENCE:
      return TriggerType.EVENT_ATTENDANCE
    case AutomationTriggerType.RESULTS_PUBLISHED:
      return TriggerType.EVENT_RESULTS
    case AutomationTriggerType.SCHEDULED:
      return TriggerType.SCHEDULED
    case AutomationTriggerType.MANUAL:
      return TriggerType.MANUAL
    default:
      return TriggerType.MANUAL
  }
}

/**
 * Map internal trigger type to extended trigger type
 */
function mapToExtendedTriggerType(type: TriggerType): AutomationTriggerType {
  switch (type) {
    case TriggerType.EVENT_FEE_DUE:
      return AutomationTriggerType.FEE_OVERDUE
    case TriggerType.EVENT_ATTENDANCE:
      return AutomationTriggerType.CONSECUTIVE_ABSENCE
    case TriggerType.EVENT_RESULTS:
      return AutomationTriggerType.RESULTS_PUBLISHED
    case TriggerType.SCHEDULED:
      return AutomationTriggerType.SCHEDULED
    case TriggerType.MANUAL:
      return AutomationTriggerType.MANUAL
    default:
      return AutomationTriggerType.MANUAL
  }
}

/**
 * Extract channel from actions
 */
function extractChannelFromActions(actions: AutomationAction[]): MessageChannel {
  const sendMessageAction = actions.find(a => a.type === AutomationActionType.SEND_MESSAGE)
  return sendMessageAction?.config.channel || MessageChannel.SMS
}

/**
 * Extract template ID from actions
 */
function extractTemplateFromActions(actions: AutomationAction[]): string | undefined {
  const sendMessageAction = actions.find(a => a.type === AutomationActionType.SEND_MESSAGE)
  return sendMessageAction?.config.templateId
}

/**
 * Map internal rule to extended rule format
 */
function mapToExtendedRule(rule: AutomationRule, conditions: AutomationCondition[], actions: AutomationAction[]): ExtendedAutomationRule {
  return {
    id: rule.id,
    schoolId: rule.schoolId,
    name: rule.name,
    description: rule.description,
    trigger: {
      type: mapToExtendedTriggerType(rule.triggerType),
      config: rule.triggerConfig,
    },
    conditions,
    actions,
    isEnabled: rule.isActive,
    lastExecutedAt: rule.lastExecutedAt,
    executionCount: rule.executionCount,
    createdBy: rule.createdBy,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }
}

// ============================================
// AUTOMATION RULE SERVICE
// ============================================

export class AutomationRuleService {
  /**
   * Create a new automation rule
   * Requirement 17.1: Allow creation of automation rules with trigger conditions
   */
  async createRule(input: CreateExtendedAutomationRuleInput): Promise<ExtendedAutomationRule> {
    // Validate input
    this.validateRuleInput(input)

    // Map to internal format
    const internalInput: CreateAutomationRuleInput = {
      schoolId: input.schoolId,
      name: input.name,
      description: input.description,
      triggerType: mapTriggerType(input.trigger.type),
      triggerConfig: {
        ...input.trigger.config,
        eventConditions: input.conditions?.map(c => ({
          field: c.field,
          operator: c.operator as 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte',
          value: c.value,
        })),
      },
      targetType: this.determineTargetType(input.trigger.type),
      targetCriteria: this.buildTargetCriteria(input.conditions || []),
      templateId: extractTemplateFromActions(input.actions),
      channel: extractChannelFromActions(input.actions),
      createdBy: input.createdBy,
    }

    // Create rule using existing service
    const rule = await automationService.createAutomationRule(internalInput)

    // Store extended data (conditions and actions) in metadata
    await this.storeExtendedData(rule.id, input.conditions || [], input.actions)

    // Log the creation
    await this.logRuleChange(rule.id, input.schoolId, input.createdBy, 'CREATE', null, {
      name: input.name,
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
    })

    return mapToExtendedRule(rule, input.conditions || [], input.actions)
  }

  /**
   * Update an existing automation rule
   * Requirement 17.1: Allow configuration of automation rules
   */
  async updateRule(
    id: string,
    updates: UpdateExtendedAutomationRuleInput,
    updatedBy: string
  ): Promise<ExtendedAutomationRule> {
    const existingRule = await this.getRuleById(id)
    if (!existingRule) {
      throw new Error(`Automation rule with id ${id} not found`)
    }

    // Build update data
    const updateData: Partial<CreateAutomationRuleInput> = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.trigger !== undefined) {
      updateData.triggerType = mapTriggerType(updates.trigger.type)
      updateData.triggerConfig = {
        ...updates.trigger.config,
        eventConditions: updates.conditions?.map(c => ({
          field: c.field,
          operator: c.operator as 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte',
          value: c.value,
        })),
      }
    }
    if (updates.actions !== undefined) {
      updateData.channel = extractChannelFromActions(updates.actions)
      updateData.templateId = extractTemplateFromActions(updates.actions)
    }

    // Update rule using existing service
    const rule = await automationService.updateAutomationRule(id, updateData)

    // Handle enable/disable separately
    if (updates.isEnabled !== undefined) {
      await automationService.setRuleActive(id, updates.isEnabled)
    }

    // Update extended data if provided
    const conditions = updates.conditions ?? existingRule.conditions
    const actions = updates.actions ?? existingRule.actions
    await this.storeExtendedData(id, conditions, actions)

    // Log the update
    await this.logRuleChange(id, existingRule.schoolId, updatedBy, 'UPDATE', existingRule, {
      ...updates,
    })

    // Fetch updated rule
    const updatedRule = await automationService.getAutomationRuleById(id)
    if (!updatedRule) {
      throw new Error(`Failed to fetch updated rule ${id}`)
    }

    return mapToExtendedRule(updatedRule, conditions, actions)
  }

  /**
   * Delete an automation rule
   * Requirement 17.4: Support configuring automation rules
   */
  async deleteRule(id: string, deletedBy: string): Promise<void> {
    const existingRule = await this.getRuleById(id)
    if (!existingRule) {
      throw new Error(`Automation rule with id ${id} not found`)
    }

    // Log the deletion before deleting
    await this.logRuleChange(id, existingRule.schoolId, deletedBy, 'DELETE', existingRule, null)

    // Delete extended data
    await this.deleteExtendedData(id)

    // Delete rule using existing service
    await automationService.deleteAutomationRule(id)
  }

  /**
   * Get all automation rules for a school
   * Requirement 17.1: Support configuring automation rules
   */
  async getRules(schoolId: string): Promise<ExtendedAutomationRule[]> {
    const rules = await automationService.getAutomationRules(schoolId)
    
    const extendedRules: ExtendedAutomationRule[] = []
    for (const rule of rules) {
      const extendedData = await this.getExtendedData(rule.id)
      extendedRules.push(mapToExtendedRule(rule, extendedData.conditions, extendedData.actions))
    }

    return extendedRules
  }

  /**
   * Get a single automation rule by ID
   */
  async getRuleById(id: string): Promise<ExtendedAutomationRule | null> {
    const rule = await automationService.getAutomationRuleById(id)
    if (!rule) return null

    const extendedData = await this.getExtendedData(id)
    return mapToExtendedRule(rule, extendedData.conditions, extendedData.actions)
  }

  /**
   * Enable or disable an automation rule
   * Requirement 17.4: Allow enabling and disabling individual automation rules
   */
  async setRuleEnabled(id: string, isEnabled: boolean, updatedBy: string): Promise<ExtendedAutomationRule> {
    const existingRule = await this.getRuleById(id)
    if (!existingRule) {
      throw new Error(`Automation rule with id ${id} not found`)
    }

    await automationService.setRuleActive(id, isEnabled)

    // Log the status change
    await this.logRuleChange(id, existingRule.schoolId, updatedBy, isEnabled ? 'ENABLE' : 'DISABLE', 
      { isEnabled: existingRule.isEnabled }, 
      { isEnabled }
    )

    const updatedRule = await this.getRuleById(id)
    if (!updatedRule) {
      throw new Error(`Failed to fetch updated rule ${id}`)
    }

    return updatedRule
  }

  /**
   * Execute an automation rule
   * Requirement 17.2: Execute actions when triggers fire
   */
  async executeRule(id: string, executedBy: string): Promise<AutomationExecutionResult> {
    const rule = await this.getRuleById(id)
    if (!rule) {
      return {
        executionId: '',
        status: ExecutionStatus.FAILED,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: [`Rule with id ${id} not found`],
      }
    }

    if (!rule.isEnabled) {
      return {
        executionId: '',
        status: ExecutionStatus.FAILED,
        recipientCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: ['Rule is not enabled'],
      }
    }

    // Execute using existing service
    const result = await automationService.executeRule(id)

    // Log the execution
    await this.logExecution(id, rule.schoolId, executedBy, result, rule.trigger.type, rule.actions)

    return result
  }

  /**
   * Get execution history for a rule
   * Requirement 17.5: Log execution with timestamp and outcome
   */
  async getExecutionHistory(ruleId: string, limit: number = 10): Promise<AutomationExecutionLog[]> {
    const rule = await this.getRuleById(ruleId)
    if (!rule) {
      return []
    }

    // Fetch execution records directly from the database to get proper timestamps
    const executions = await prisma.automationExecution.findMany({
      where: { ruleId },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    })

    return executions.map(exec => ({
      id: exec.id,
      ruleId,
      ruleName: rule.name,
      triggeredAt: exec.triggeredAt,
      completedAt: exec.completedAt ?? undefined,
      status: exec.status as ExecutionStatus,
      recipientCount: exec.recipientCount,
      successCount: exec.successCount,
      failureCount: exec.failureCount,
      errorMessage: exec.errorMessage ?? undefined,
      triggerType: rule.trigger.type,
      actionsExecuted: rule.actions.map(a => a.type),
    }))
  }

  /**
   * Get all execution logs for a school
   * Requirement 17.5: Log each execution with timestamp and outcome
   */
  async getAllExecutionLogs(schoolId: string, limit: number = 50): Promise<AutomationExecutionLog[]> {
    // Get all rules for the school
    const rules = await this.getRules(schoolId)
    const ruleIds = rules.map(r => r.id)
    const ruleMap = new Map(rules.map(r => [r.id, r]))

    // Fetch all executions for these rules
    const executions = await prisma.automationExecution.findMany({
      where: { ruleId: { in: ruleIds } },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    })

    return executions.map(exec => {
      const rule = ruleMap.get(exec.ruleId)
      return {
        id: exec.id,
        ruleId: exec.ruleId,
        ruleName: rule?.name ?? 'Unknown Rule',
        triggeredAt: exec.triggeredAt,
        completedAt: exec.completedAt ?? undefined,
        status: exec.status as ExecutionStatus,
        recipientCount: exec.recipientCount,
        successCount: exec.successCount,
        failureCount: exec.failureCount,
        errorMessage: exec.errorMessage ?? undefined,
        triggerType: rule?.trigger.type ?? AutomationTriggerType.MANUAL,
        actionsExecuted: rule?.actions.map(a => a.type) ?? [],
      }
    })
  }

  /**
   * Get execution summary by date range
   * Requirement 17.5: Log each execution with timestamp and outcome
   */
  async getExecutionSummary(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    byRule: Array<{
      ruleId: string
      ruleName: string
      executionCount: number
      successCount: number
      failureCount: number
    }>
    byTriggerType: Record<AutomationTriggerType, number>
  }> {
    // Get all rules for the school
    const rules = await this.getRules(schoolId)
    const ruleIds = rules.map(r => r.id)
    const ruleMap = new Map(rules.map(r => [r.id, r]))

    // Fetch executions within date range
    const executions = await prisma.automationExecution.findMany({
      where: {
        ruleId: { in: ruleIds },
        triggeredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Calculate summary
    let totalExecutions = 0
    let successfulExecutions = 0
    let failedExecutions = 0
    const byRuleMap = new Map<string, { executionCount: number; successCount: number; failureCount: number }>()
    const byTriggerType: Record<AutomationTriggerType, number> = {
      [AutomationTriggerType.FEE_OVERDUE]: 0,
      [AutomationTriggerType.CONSECUTIVE_ABSENCE]: 0,
      [AutomationTriggerType.RESULTS_PUBLISHED]: 0,
      [AutomationTriggerType.SCHEDULED]: 0,
      [AutomationTriggerType.MANUAL]: 0,
    }

    for (const exec of executions) {
      totalExecutions++
      if (exec.status === ExecutionStatus.COMPLETED) {
        successfulExecutions++
      } else if (exec.status === ExecutionStatus.FAILED) {
        failedExecutions++
      }

      // Aggregate by rule
      const ruleStats = byRuleMap.get(exec.ruleId) || { executionCount: 0, successCount: 0, failureCount: 0 }
      ruleStats.executionCount++
      ruleStats.successCount += exec.successCount
      ruleStats.failureCount += exec.failureCount
      byRuleMap.set(exec.ruleId, ruleStats)

      // Aggregate by trigger type
      const rule = ruleMap.get(exec.ruleId)
      if (rule) {
        byTriggerType[rule.trigger.type]++
      }
    }

    // Build byRule array
    const byRule = Array.from(byRuleMap.entries()).map(([ruleId, stats]) => ({
      ruleId,
      ruleName: ruleMap.get(ruleId)?.name ?? 'Unknown Rule',
      ...stats,
    }))

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      byRule,
      byTriggerType,
    }
  }

  /**
   * Get rules by trigger type
   * Requirement 17.6: Support common triggers
   */
  async getRulesByTriggerType(
    schoolId: string,
    triggerType: AutomationTriggerType
  ): Promise<ExtendedAutomationRule[]> {
    const internalType = mapTriggerType(triggerType)
    const rules = await automationService.getRulesByTriggerType(schoolId, internalType)

    const extendedRules: ExtendedAutomationRule[] = []
    for (const rule of rules) {
      const extendedData = await this.getExtendedData(rule.id)
      extendedRules.push(mapToExtendedRule(rule, extendedData.conditions, extendedData.actions))
    }

    return extendedRules
  }

  /**
   * Get automation statistics for a school
   */
  async getStatistics(schoolId: string): Promise<{
    totalRules: number
    enabledRules: number
    disabledRules: number
    byTriggerType: Record<AutomationTriggerType, number>
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
  }> {
    const stats = await automationService.getAutomationStats(schoolId)

    // Map trigger types
    const byTriggerType: Record<AutomationTriggerType, number> = {
      [AutomationTriggerType.FEE_OVERDUE]: 0,
      [AutomationTriggerType.CONSECUTIVE_ABSENCE]: 0,
      [AutomationTriggerType.RESULTS_PUBLISHED]: 0,
      [AutomationTriggerType.SCHEDULED]: 0,
      [AutomationTriggerType.MANUAL]: 0,
    }

    for (const [type, count] of Object.entries(stats.byTriggerType)) {
      const extendedType = mapToExtendedTriggerType(type as TriggerType)
      byTriggerType[extendedType] = count
    }

    return {
      totalRules: stats.totalRules,
      enabledRules: stats.activeRules,
      disabledRules: stats.totalRules - stats.activeRules,
      byTriggerType,
      totalExecutions: stats.totalExecutions,
      successfulExecutions: stats.successfulExecutions,
      failedExecutions: stats.failedExecutions,
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Validate rule input
   */
  private validateRuleInput(input: CreateExtendedAutomationRuleInput): void {
    if (!input.schoolId) {
      throw new Error('School ID is required')
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Rule name is required')
    }
    if (!input.trigger || !input.trigger.type) {
      throw new Error('Trigger type is required')
    }
    if (!input.actions || input.actions.length === 0) {
      throw new Error('At least one action is required')
    }
    if (!input.createdBy) {
      throw new Error('Created by is required')
    }

    // Validate scheduled trigger has schedule config
    if (input.trigger.type === AutomationTriggerType.SCHEDULED) {
      if (!input.trigger.config?.cronExpression && 
          (!input.trigger.config?.scheduledDates || input.trigger.config.scheduledDates.length === 0)) {
        throw new Error('Scheduled trigger requires cronExpression or scheduledDates')
      }
    }

    // Validate actions
    for (const action of input.actions) {
      if (!action.type) {
        throw new Error('Action type is required')
      }
      if (action.type === AutomationActionType.SEND_MESSAGE && !action.config.channel) {
        throw new Error('Send message action requires a channel')
      }
    }
  }

  /**
   * Determine target type based on trigger type
   */
  private determineTargetType(triggerType: AutomationTriggerType): string {
    switch (triggerType) {
      case AutomationTriggerType.FEE_OVERDUE:
        return TargetType.FEE_DEFAULTERS
      case AutomationTriggerType.CONSECUTIVE_ABSENCE:
        return TargetType.SPECIFIC_GUARDIANS
      case AutomationTriggerType.RESULTS_PUBLISHED:
        return TargetType.CLASS
      default:
        return TargetType.ENTIRE_SCHOOL
    }
  }

  /**
   * Build target criteria from conditions
   */
  private buildTargetCriteria(conditions: AutomationCondition[]): Record<string, unknown> {
    const criteria: Record<string, unknown> = {}

    for (const condition of conditions) {
      if (condition.field === 'feeThreshold') {
        criteria.feeThreshold = condition.value
      }
      if (condition.field === 'absenceCount') {
        criteria.absenceThreshold = condition.value
      }
      if (condition.field === 'classIds') {
        criteria.classIds = condition.value
      }
    }

    return criteria
  }

  /**
   * Store extended data (conditions and actions) for a rule
   */
  private async storeExtendedData(
    ruleId: string,
    conditions: AutomationCondition[],
    actions: AutomationAction[]
  ): Promise<void> {
    // Store in SchoolSettings with a special category for automation rule metadata
    const rule = await automationService.getAutomationRuleById(ruleId)
    if (!rule) return

    await prisma.schoolSettings.upsert({
      where: {
        schoolId_category: {
          schoolId: rule.schoolId,
          category: `automation_rule_${ruleId}`,
        },
      },
      update: {
        settings: { conditions, actions },
        updatedBy: rule.createdBy,
      },
      create: {
        schoolId: rule.schoolId,
        category: `automation_rule_${ruleId}`,
        settings: { conditions, actions },
        updatedBy: rule.createdBy,
      },
    })
  }

  /**
   * Get extended data for a rule
   */
  private async getExtendedData(ruleId: string): Promise<{
    conditions: AutomationCondition[]
    actions: AutomationAction[]
  }> {
    const rule = await automationService.getAutomationRuleById(ruleId)
    if (!rule) {
      return { conditions: [], actions: [] }
    }

    const settings = await prisma.schoolSettings.findUnique({
      where: {
        schoolId_category: {
          schoolId: rule.schoolId,
          category: `automation_rule_${ruleId}`,
        },
      },
    })

    if (!settings) {
      // Return default actions based on rule channel
      return {
        conditions: rule.triggerConfig.eventConditions?.map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })) || [],
        actions: [{
          type: AutomationActionType.SEND_MESSAGE,
          config: {
            channel: rule.channel,
            templateId: rule.templateId,
          },
        }],
      }
    }

    const data = settings.settings as { conditions?: AutomationCondition[]; actions?: AutomationAction[] }
    return {
      conditions: data.conditions || [],
      actions: data.actions || [{
        type: AutomationActionType.SEND_MESSAGE,
        config: {
          channel: rule.channel,
          templateId: rule.templateId,
        },
      }],
    }
  }

  /**
   * Delete extended data for a rule
   */
  private async deleteExtendedData(ruleId: string): Promise<void> {
    const rule = await automationService.getAutomationRuleById(ruleId)
    if (!rule) return

    await prisma.schoolSettings.deleteMany({
      where: {
        schoolId: rule.schoolId,
        category: `automation_rule_${ruleId}`,
      },
    })
  }

  /**
   * Log rule changes for audit
   */
  private async logRuleChange(
    ruleId: string,
    schoolId: string,
    userId: string,
    action: string,
    previousValue: unknown,
    newValue: unknown
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId,
          action: `automation_rule_${action.toLowerCase()}`,
          resource: 'automation_rule',
          resourceId: ruleId,
          previousValue: previousValue ? JSON.parse(JSON.stringify(previousValue)) : null,
          newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to log rule change:', error)
    }
  }

  /**
   * Log execution for audit
   * Requirement 17.5: Log each execution with timestamp and outcome
   */
  private async logExecution(
    ruleId: string,
    schoolId: string,
    executedBy: string,
    result: AutomationExecutionResult,
    triggerType: AutomationTriggerType,
    actions: AutomationAction[]
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: executedBy,
          action: 'automation_rule_execution',
          resource: 'automation_rule',
          resourceId: ruleId,
          newValue: {
            executionId: result.executionId,
            status: result.status,
            recipientCount: result.recipientCount,
            successCount: result.successCount,
            failureCount: result.failureCount,
            errors: result.errors,
            triggerType,
            actionsExecuted: actions.map(a => a.type),
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to log execution:', error)
    }
  }
}

// Export singleton instance
export const automationRuleService = new AutomationRuleService()

// ============================================
// TRIGGER EXECUTION HANDLERS
// Requirements: 17.2, 17.6
// ============================================

/**
 * Fee Overdue Event Handler
 * Requirement 17.6: Support fee overdue trigger
 */
export interface FeeOverdueEvent {
  schoolId: string
  studentId: string
  guardianId: string
  termId: string
  amountDue: number
  daysOverdue: number
}

/**
 * Consecutive Absence Event Handler
 * Requirement 17.6: Support consecutive absence trigger
 */
export interface ConsecutiveAbsenceEvent {
  schoolId: string
  studentId: string
  classId: string
  consecutiveDays: number
  dates: Date[]
}

/**
 * Results Published Event Handler
 * Requirement 17.6: Support results published trigger
 */
export interface ResultsPublishedEvent {
  schoolId: string
  classId: string
  termId: string
  examId?: string
  publishedBy: string
}

/**
 * Automation Trigger Executor
 * Handles execution of automation rules based on events
 * Requirements: 17.2, 17.6
 */
export class AutomationTriggerExecutor {
  private ruleService: AutomationRuleService

  constructor() {
    this.ruleService = new AutomationRuleService()
  }

  /**
   * Handle fee overdue event
   * Requirement 17.6: Support fee overdue trigger
   */
  async onFeeOverdue(event: FeeOverdueEvent): Promise<AutomationExecutionResult[]> {
    const results: AutomationExecutionResult[] = []

    // Get all fee overdue rules for the school
    const rules = await this.ruleService.getRulesByTriggerType(
      event.schoolId,
      AutomationTriggerType.FEE_OVERDUE
    )

    for (const rule of rules) {
      if (!rule.isEnabled) continue

      // Check if conditions match
      if (this.evaluateConditions(rule.conditions, event)) {
        // Execute the rule
        const result = await this.executeRuleActions(rule, event)
        results.push(result)
      }
    }

    return results
  }

  /**
   * Handle consecutive absence event
   * Requirement 17.6: Support consecutive absence trigger
   */
  async onConsecutiveAbsence(event: ConsecutiveAbsenceEvent): Promise<AutomationExecutionResult[]> {
    const results: AutomationExecutionResult[] = []

    // Get all consecutive absence rules for the school
    const rules = await this.ruleService.getRulesByTriggerType(
      event.schoolId,
      AutomationTriggerType.CONSECUTIVE_ABSENCE
    )

    for (const rule of rules) {
      if (!rule.isEnabled) continue

      // Check if conditions match (e.g., minimum consecutive days)
      if (this.evaluateConditions(rule.conditions, event)) {
        // Execute the rule
        const result = await this.executeRuleActions(rule, event)
        results.push(result)
      }
    }

    return results
  }

  /**
   * Handle results published event
   * Requirement 17.6: Support results published trigger
   */
  async onResultsPublished(event: ResultsPublishedEvent): Promise<AutomationExecutionResult[]> {
    const results: AutomationExecutionResult[] = []

    // Get all results published rules for the school
    const rules = await this.ruleService.getRulesByTriggerType(
      event.schoolId,
      AutomationTriggerType.RESULTS_PUBLISHED
    )

    for (const rule of rules) {
      if (!rule.isEnabled) continue

      // Check if conditions match (e.g., specific class)
      if (this.evaluateConditions(rule.conditions, event)) {
        // Execute the rule
        const result = await this.executeRuleActions(rule, event)
        results.push(result)
      }
    }

    return results
  }

  /**
   * Evaluate conditions against event data
   */
  private evaluateConditions(
    conditions: AutomationCondition[],
    event: Record<string, unknown>
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true // No conditions means always match
    }

    return conditions.every(condition => {
      const eventValue = event[condition.field]

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
        case 'contains':
          return typeof eventValue === 'string' && eventValue.includes(condition.value as string)
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(eventValue)
        default:
          return false
      }
    })
  }

  /**
   * Execute rule actions
   * Requirement 17.2: Execute actions (send message, create alert, escalate)
   */
  private async executeRuleActions(
    rule: ExtendedAutomationRule,
    event: Record<string, unknown>
  ): Promise<AutomationExecutionResult> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    let successCount = 0
    let failureCount = 0
    const errors: string[] = []

    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case AutomationActionType.SEND_MESSAGE:
            await this.executeSendMessageAction(rule, action, event)
            successCount++
            break

          case AutomationActionType.CREATE_ALERT:
            await this.executeCreateAlertAction(rule, action, event)
            successCount++
            break

          case AutomationActionType.ESCALATE:
            await this.executeEscalateAction(rule, action, event)
            successCount++
            break

          case AutomationActionType.UPDATE_STATUS:
            await this.executeUpdateStatusAction(rule, action, event)
            successCount++
            break

          default:
            errors.push(`Unknown action type: ${action.type}`)
            failureCount++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Action execution failed'
        errors.push(`${action.type}: ${errorMessage}`)
        failureCount++
      }
    }

    // Log the execution
    await this.logExecution(rule, executionId, successCount, failureCount, errors)

    return {
      executionId,
      status: failureCount === 0 ? ExecutionStatus.COMPLETED : 
              successCount > 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
      recipientCount: 1,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Execute send message action
   * Requirement 17.2: Send message action
   */
  private async executeSendMessageAction(
    rule: ExtendedAutomationRule,
    action: AutomationAction,
    event: Record<string, unknown>
  ): Promise<void> {
    const { channel, templateId, customContent } = action.config

    // Use the existing automation service to send messages
    await automationService.executeRule(rule.id)
  }

  /**
   * Execute create alert action
   * Requirement 17.2: Create alert action
   */
  private async executeCreateAlertAction(
    rule: ExtendedAutomationRule,
    action: AutomationAction,
    event: Record<string, unknown>
  ): Promise<void> {
    const { alertType } = action.config

    // Create an in-app notification for school admins
    await prisma.inAppNotification.create({
      data: {
        schoolId: rule.schoolId,
        userId: rule.createdBy, // Notify the rule creator
        type: 'ALERT',
        title: `Automation Alert: ${rule.name}`,
        message: `Automation rule "${rule.name}" triggered an alert. Type: ${alertType || 'General'}`,
        priority: 'HIGH',
        isRead: false,
      },
    })
  }

  /**
   * Execute escalate action
   * Requirement 17.2: Escalate action
   */
  private async executeEscalateAction(
    rule: ExtendedAutomationRule,
    action: AutomationAction,
    event: Record<string, unknown>
  ): Promise<void> {
    const { escalateTo } = action.config

    // Create an escalation notification
    if (escalateTo) {
      await prisma.inAppNotification.create({
        data: {
          schoolId: rule.schoolId,
          userId: escalateTo,
          type: 'TASK',
          title: `Escalation: ${rule.name}`,
          message: `An automation rule has escalated an issue that requires your attention.`,
          priority: 'HIGH',
          isRead: false,
        },
      })
    }
  }

  /**
   * Execute update status action
   * Requirement 17.2: Update status action
   */
  private async executeUpdateStatusAction(
    rule: ExtendedAutomationRule,
    action: AutomationAction,
    event: Record<string, unknown>
  ): Promise<void> {
    const { statusValue } = action.config

    // Log the status update action
    await prisma.auditLog.create({
      data: {
        schoolId: rule.schoolId,
        userId: rule.createdBy,
        action: 'automation_status_update',
        resource: 'automation_rule',
        resourceId: rule.id,
        newValue: {
          statusValue,
          event,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      },
    })
  }

  /**
   * Log execution for audit
   * Requirement 17.5: Log each execution with timestamp and outcome
   */
  private async logExecution(
    rule: ExtendedAutomationRule,
    executionId: string,
    successCount: number,
    failureCount: number,
    errors: string[]
  ): Promise<void> {
    const triggeredAt = new Date()
    const completedAt = new Date()
    const status = failureCount === 0 ? ExecutionStatus.COMPLETED : 
                   successCount > 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED

    try {
      // Create AutomationExecution record for proper tracking
      await prisma.automationExecution.create({
        data: {
          ruleId: rule.id,
          triggeredAt,
          completedAt,
          status,
          recipientCount: 1, // Single event execution
          successCount,
          failureCount,
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
        },
      })

      // Also log to audit log for comprehensive audit trail
      await prisma.auditLog.create({
        data: {
          schoolId: rule.schoolId,
          userId: rule.createdBy,
          action: 'automation_rule_execution',
          resource: 'automation_rule',
          resourceId: rule.id,
          newValue: {
            executionId,
            ruleName: rule.name,
            triggerType: rule.trigger.type,
            actionsExecuted: rule.actions.map(a => a.type),
            successCount,
            failureCount,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: triggeredAt.toISOString(),
          },
          timestamp: triggeredAt,
        },
      })

      // Update rule execution count and last executed timestamp
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: {
          lastExecutedAt: completedAt,
          executionCount: { increment: 1 },
        },
      })
    } catch (error) {
      console.error('Failed to log execution:', error)
    }
  }
}

// Export singleton instance
export const automationTriggerExecutor = new AutomationTriggerExecutor()
