/**
 * SMS Template Service
 * Implements the 5 core SMS templates with strict controls
 * No fluff - just what schools actually need with proper protection
 */
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {   
  SMSTemplateKey,
  SMSTriggerType,
  BuiltInSMSTemplate,
  CustomSMSTemplate,
  SMSTemplateRenderData,
  SMSTemplateValidation,
  SMSTemplatePreview,
  SMSCostEstimate,
  SMSAutomationRule,
  SMSAuditLog
} from '@/types/sms-templates'

// ============================================
// BUILT-IN TEMPLATES - THE 5 CORE TEMPLATES
// ============================================

export const BUILT_IN_SMS_TEMPLATES: Record<SMSTemplateKey, BuiltInSMSTemplate> = {
  [SMSTemplateKey.FEES_BALANCE]: {
    key: SMSTemplateKey.FEES_BALANCE,
    name: 'Fees Balance Reminder',
    purpose: 'Push payment without sounding like extortion',
    allowedRoles: ['BURSAR', 'ADMIN', 'HEAD_TEACHER'],
    triggerType: SMSTriggerType.BOTH,
    variables: [
      { key: 'PARENT_NAME', description: 'Parent/Guardian name', required: true, example: 'Mr. Mukasa' },
      { key: 'STUDENT_NAME', description: 'Student full name', required: true, example: 'Sarah Mukasa' },
      { key: 'BALANCE', description: 'Outstanding balance amount', required: true, example: '350,000' },
      { key: 'SCHOOL_NAME', description: 'School name', required: true, example: 'St. Mary\'s Primary' }
    ],
    defaultContent: 'URGENT: {STUDENT_NAME} fees overdue. Balance: UGX {BALANCE}. Pay immediately. Contact {SCHOOL_NAME} for details.',
    maxLength: 320,
    editable: true
  },

  [SMSTemplateKey.FEES_RECEIPT]: {
    key: SMSTemplateKey.FEES_RECEIPT,
    name: 'Fees Payment Confirmation',
    purpose: 'Reassurance. Proof. Calm.',
    allowedRoles: ['BURSAR', 'ADMIN'],
    triggerType: SMSTriggerType.AUTOMATIC,
    variables: [
      { key: 'STUDENT_NAME', description: 'Student full name', required: true, example: 'Sarah Mukasa' },
      { key: 'AMOUNT_PAID', description: 'Amount paid', required: true, example: '200,000' },
      { key: 'BALANCE', description: 'Remaining balance', required: true, example: '150,000' },
      { key: 'RECEIPT_NO', description: 'Receipt number', required: true, example: 'RCP001234' }
    ],
    defaultContent: 'UGX {AMOUNT_PAID} received for {STUDENT_NAME}. Receipt: {RECEIPT_NO}. Balance: UGX {BALANCE}. Thank you.',
    maxLength: 320,
    editable: true
  },

  [SMSTemplateKey.REPORT_READY]: {
    key: SMSTemplateKey.REPORT_READY,
    name: 'Report Card Ready',
    purpose: 'Notify, not explain. Creates anticipation.',
    allowedRoles: ['ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER'],
    triggerType: SMSTriggerType.BOTH,
    variables: [
      { key: 'STUDENT_NAME', description: 'Student full name', required: true, example: 'Sarah Mukasa' },
      { key: 'TERM', description: 'Term/period', required: true, example: 'Term 1 2024' },
      { key: 'POSITION', description: 'Class position', required: true, example: '5th' },
      { key: 'SCHOOL_NAME', description: 'School name', required: true, example: 'St. Mary\'s Primary' }
    ],
    defaultContent: '{STUDENT_NAME} {TERM} report ready. Position: {POSITION}. Visit school. {SCHOOL_NAME}',
    maxLength: 320,
    editable: true
  },

  [SMSTemplateKey.ANNOUNCEMENT]: {
    key: SMSTemplateKey.ANNOUNCEMENT,
    name: 'General School Announcement',
    purpose: 'Broadcast important information only. Controlled to prevent spam.',
    allowedRoles: ['ADMIN', 'HEAD_TEACHER'],
    triggerType: SMSTriggerType.MANUAL,
    variables: [
      { key: 'MESSAGE', description: 'Announcement message', required: true, example: 'School closes early Friday 2PM for staff meeting.' },
      { key: 'SCHOOL_NAME', description: 'School name', required: true, example: 'St. Mary\'s Primary' }
    ],
    defaultContent: '{MESSAGE} - {SCHOOL_NAME}',
    maxLength: 320,
    editable: true
  },

  [SMSTemplateKey.EMERGENCY_ALERT]: {
    key: SMSTemplateKey.EMERGENCY_ALERT,
    name: 'Emergency/Urgent Alert',
    purpose: 'Immediate attention. Must be rare.',
    allowedRoles: ['HEAD_TEACHER'],
    triggerType: SMSTriggerType.MANUAL,
    variables: [
      { key: 'STUDENT_NAME', description: 'Student full name', required: true, example: 'Sarah Mukasa' },
      { key: 'REASON', description: 'Reason for contact', required: true, example: 'medical attention needed' },
      { key: 'CONTACT', description: 'Contact number', required: true, example: '0700123456' }
    ],
    defaultContent: 'URGENT: Contact school about {STUDENT_NAME}. Reason: {REASON}. Call: {CONTACT}.',
    maxLength: 320,
    editable: false, // Emergency templates should not be editable
    maxPerTerm: 3,
    requiresConfirmation: true
  }
}

// ============================================
// SMS TEMPLATE SERVICE
// ============================================

export class SMSTemplateService {
  
  /**
   * Get all built-in templates
   */
  getBuiltInTemplates(): BuiltInSMSTemplate[] {
    return Object.values(BUILT_IN_SMS_TEMPLATES)
  }

  /**
   * Get built-in template by key
   */
  getBuiltInTemplate(key: SMSTemplateKey): BuiltInSMSTemplate | null {
    return BUILT_IN_SMS_TEMPLATES[key] || null
  }

  /**
   * Get custom template for school
   */
  async getCustomTemplate(schoolId: string, templateKey: SMSTemplateKey): Promise<CustomSMSTemplate | null> {
    const template = await prisma.customSMSTemplate.findFirst({
      where: {
        schoolId,
        templateKey,
        isActive: true
      }
    })

    if (!template) return null

    return {
      id: template.id,
      schoolId: template.schoolId,
      templateKey: template.templateKey as SMSTemplateKey,
      customContent: template.customContent,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: template.createdBy
    }
  }

  /**
   * Get effective template content (custom or built-in)
   */
  async getEffectiveTemplate(schoolId: string, templateKey: SMSTemplateKey): Promise<string> {
    const customTemplate = await this.getCustomTemplate(schoolId, templateKey)
    if (customTemplate) {
      return customTemplate.customContent
    }

    const builtInTemplate = this.getBuiltInTemplate(templateKey)
    return builtInTemplate?.defaultContent || ''
  }

  /**
   * Save custom template
   */
  async saveCustomTemplate(
    schoolId: string,
    templateKey: SMSTemplateKey,
    customContent: string,
    createdBy: string
  ): Promise<CustomSMSTemplate> {
    // Validate the template first
    const validation = this.validateTemplate(templateKey, customContent)
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
    }

    const template = await prisma.customSMSTemplate.upsert({
      where: {
        schoolId_templateKey: {
          schoolId,
          templateKey
        }
      },
      update: {
        customContent,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        schoolId,
        templateKey,
        customContent,
        isActive: true,
        createdBy
      }
    })

    return {
      id: template.id,
      schoolId: template.schoolId,
      templateKey: template.templateKey as SMSTemplateKey,
      customContent: template.customContent,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: template.createdBy
    }
  }

  /**
   * Reset template to built-in default (admin only)
   */
  async resetToDefault(schoolId: string, templateKey: SMSTemplateKey): Promise<void> {
    await prisma.customSMSTemplate.updateMany({
      where: {
        schoolId,
        templateKey
      },
      data: {
        isActive: false
      }
    })
  }

  /**
   * Render template with data
   */
  renderTemplate(templateContent: string, data: SMSTemplateRenderData): string {
    let content = templateContent

    // Replace variables
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`\\{${key}\\}`, 'g')
        content = content.replace(regex, String(value))
      }
    }

    return content.trim()
  }

  /**
   * Validate template content
   */
  validateTemplate(templateKey: SMSTemplateKey, content: string): SMSTemplateValidation {
    const errors: string[] = []
    const warnings: string[] = []

    const builtInTemplate = this.getBuiltInTemplate(templateKey)
    if (!builtInTemplate) {
      errors.push('Invalid template key')
      return {
        valid: false,
        errors,
        warnings,
        characterCount: content.length,
        costEstimate: this.calculateCost(content)
      }
    }

    // Check character limit
    if (content.length > builtInTemplate.maxLength) {
      errors.push(`Content exceeds maximum length of ${builtInTemplate.maxLength} characters`)
    }

    // Check required variables
    const requiredVars = builtInTemplate.variables.filter(v => v.required)
    for (const variable of requiredVars) {
      const regex = new RegExp(`\\{${variable.key}\\}`)
      if (!regex.test(content)) {
        errors.push(`Required variable {${variable.key}} is missing`)
      }
    }

    // Check for invalid variables
    const validVarKeys = builtInTemplate.variables.map(v => v.key)
    const usedVars = content.match(/\{([^}]+)\}/g) || []
    for (const usedVar of usedVars) {
      const varKey = usedVar.replace(/[{}]/g, '')
      if (!validVarKeys.includes(varKey)) {
        warnings.push(`Unknown variable ${usedVar} - it will not be replaced`)
      }
    }

    // Character count warnings
    const characterCount = content.length
    if (characterCount > 160) {
      warnings.push('Message will be sent as multiple SMS (higher cost)')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      characterCount,
      costEstimate: this.calculateCost(content)
    }
  }

  /**
   * Calculate SMS cost estimate
   */
  calculateCost(content: string): SMSCostEstimate {
    const characters = content.length
    let smsUnits: number

    if (characters <= 160) {
      smsUnits = 1
    } else {
      // For concatenated SMS, each part can hold 153 characters
      smsUnits = Math.ceil(characters / 153)
    }

    // Estimate cost in UGX (adjust based on your SMS provider rates)
    const costPerUnit = 450 // UGX per SMS unit
    const estimatedCost = smsUnits * costPerUnit

    return {
      characters,
      smsUnits,
      estimatedCost,
      isWithinLimit: smsUnits <= 1 // Recommend max 1 SMS units
    }
  }

  /**
   * Generate template preview with sample data
   */
  generatePreview(templateKey: SMSTemplateKey, content: string): SMSTemplatePreview {
    const builtInTemplate = this.getBuiltInTemplate(templateKey)
    if (!builtInTemplate) {
      throw new Error('Invalid template key')
    }

    // Generate sample data
    const sampleData: SMSTemplateRenderData = {}
    for (const variable of builtInTemplate.variables) {
      sampleData[variable.key] = variable.example
    }

    const renderedContent = this.renderTemplate(content, sampleData)
    const costEstimate = this.calculateCost(renderedContent)

    return {
      content: renderedContent,
      characterCount: renderedContent.length,
      smsUnits: costEstimate.smsUnits,
      estimatedCost: costEstimate.estimatedCost,
      sampleData
    }
  }

  /**
   * Check if user has permission to use template
   */
  hasPermission(userRole: string, templateKey: SMSTemplateKey): boolean {
    const template = this.getBuiltInTemplate(templateKey)
    if (!template) return false

    return template.allowedRoles.includes(userRole)
  }

  /**
   * Get automation rules for school
   */
  async getAutomationRules(schoolId: string): Promise<SMSAutomationRule[]> {
    const rules = await prisma.sMSAutomationRule.findMany({
      where: { schoolId }
    })

    return rules.map((rule) => ({
      id: rule.id,
      schoolId: rule.schoolId,
      templateKey: rule.templateKey as SMSTemplateKey,
      isEnabled: rule.isEnabled,
      triggerConditions: (rule.triggerConditions || {}) as {
        balanceThreshold?: number
        daysSinceTermStart?: number
        reminderInterval?: number
        maxRemindersPerTerm?: number
      },
      restrictions: (rule.restrictions || {}) as {
        maxPerDay?: number
        maxPerWeek?: number
        maxPerTerm?: number
      },
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    }))
  }

  /**
   * Update automation rule
   */
  async updateAutomationRule(
    schoolId: string,
    templateKey: SMSTemplateKey,
    settings: Partial<SMSAutomationRule>
  ): Promise<SMSAutomationRule> {
    const rule = await prisma.sMSAutomationRule.upsert({
      where: {
        schoolId_templateKey: {
          schoolId,
          templateKey
        }
      },
      update: {
        isEnabled: settings.isEnabled,
        triggerConditions: (settings.triggerConditions || {}) as unknown as Prisma.InputJsonValue,
        restrictions: (settings.restrictions || {}) as unknown as Prisma.InputJsonValue,
        updatedAt: new Date()
      },
      create: {
        schoolId,
        templateKey,
        isEnabled: settings.isEnabled || false,
        triggerConditions: (settings.triggerConditions || {}) as unknown as Prisma.InputJsonValue,
        restrictions: (settings.restrictions || {}) as unknown as Prisma.InputJsonValue
      }
    })

    return {
      id: rule.id,
      schoolId: rule.schoolId,
      templateKey: rule.templateKey as SMSTemplateKey,
      isEnabled: rule.isEnabled,
      triggerConditions: rule.triggerConditions as {
        balanceThreshold?: number
        daysSinceTermStart?: number
        reminderInterval?: number
        maxRemindersPerTerm?: number
      },
      restrictions: rule.restrictions as {
        maxPerDay?: number
        maxPerWeek?: number
        maxPerTerm?: number
      },
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    }
  }

  /**
   * Log SMS sending for audit
   */
  async logSMSSend(
    schoolId: string,
    templateKey: SMSTemplateKey,
    sentBy: string,
    sentByRole: string,
    recipientCount: number,
    totalCost: number,
    metadata: {
      triggerType: 'manual' | 'automatic'
      content: string
      recipients: string[]
    }
  ): Promise<void> {
    await prisma.sMSAuditLog.create({
      data: {
        schoolId,
        templateKey,
        sentBy,
        sentByRole,
        recipientCount,
        totalCost,
        metadata
      }
    })
  }

  /**
   * Get SMS audit logs
   */
  async getAuditLogs(
    schoolId: string,
    startDate?: Date,
    endDate?: Date,
    templateKey?: SMSTemplateKey
  ): Promise<SMSAuditLog[]> {
    const where: Record<string, unknown> = { schoolId }
    
    if (startDate && endDate) {
      where.timestamp = {
        gte: startDate,
        lte: endDate
      }
    }
    
    if (templateKey) {
      where.templateKey = templateKey
    }

    const logs = await prisma.sMSAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100
    })

    return logs.map((log) => ({
      id: log.id,
      schoolId: log.schoolId,
      templateKey: log.templateKey as SMSTemplateKey,
      sentBy: log.sentBy,
      sentByRole: log.sentByRole,
      recipientCount: log.recipientCount,
      totalCost: log.totalCost,
      timestamp: log.timestamp,
      metadata: (log.metadata || {}) as {
        triggerType: 'manual' | 'automatic'
        content: string
        recipients: string[]
      }
    }))
  }

  /**
   * Check credit protection limits
   */
  async checkCreditLimits(
    schoolId: string,
    templateKey: SMSTemplateKey,
    recipientCount: number,
    estimatedCost: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get school's credit protection settings
    const protection = await prisma.sMSCreditProtection.findUnique({
      where: { schoolId }
    })

    if (!protection || !protection.enableProtection) {
      return { allowed: true }
    }

    // Check minimum balance
    const currentBalance = await this.getCurrentSMSBalance(schoolId)
    if (protection.blockOnZeroBalance && currentBalance <= 0) {
      return { allowed: false, reason: 'SMS balance is zero' }
    }

    if (currentBalance < protection.minimumBalance) {
      return { allowed: false, reason: `SMS balance below minimum threshold of ${protection.minimumBalance}` }
    }

    // Check if cost exceeds available balance (minus emergency reserve)
    const availableBalance = currentBalance - protection.emergencyReserve
    if (estimatedCost > availableBalance) {
      return { allowed: false, reason: 'Insufficient SMS balance (emergency reserve protected)' }
    }

    // Check daily limits
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayUsage = await prisma.sMSAuditLog.aggregate({
      where: {
        schoolId,
        templateKey,
        timestamp: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        recipientCount: true
      }
    })

    const dailyLimit = this.getDailyLimit(protection, templateKey)
    const todayCount = todayUsage._sum.recipientCount || 0

    if (dailyLimit && (todayCount + recipientCount) > dailyLimit) {
      return { 
        allowed: false, 
        reason: `Daily limit exceeded for ${templateKey} (${todayCount + recipientCount}/${dailyLimit})` 
      }
    }

    return { allowed: true }
  }

  /**
   * Get current SMS balance for school
   */
  private async getCurrentSMSBalance(schoolId: string): Promise<number> {
    // This would integrate with your SMS provider's balance API
    // For now, return a mock value
    console.log(`Getting SMS balance for school: ${schoolId}`)
    return 1000 // Mock balance
  }

  /**
   * Get daily limit for template type
   */
  private getDailyLimit(protection: { dailyLimits: Prisma.JsonValue }, templateKey: SMSTemplateKey): number | null {
    const dailyLimits = (protection.dailyLimits || {}) as {
      announcement?: number
      emergency?: number
      feesReminder?: number
    }
    
    switch (templateKey) {
      case SMSTemplateKey.ANNOUNCEMENT:
        return dailyLimits?.announcement || null
      case SMSTemplateKey.EMERGENCY_ALERT:
        return dailyLimits?.emergency || null
      case SMSTemplateKey.FEES_BALANCE:
        return dailyLimits?.feesReminder || null
      default:
        return null
    }
  }
}

// Export singleton instance
export const smsTemplateService = new SMSTemplateService()