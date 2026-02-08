/**
 * SMS Template System Types
 * Built-in templates with strict controls and validation
 * Based on the 5 core SMS templates that schools actually need
 */

export enum SMSTemplateKey {
  FEES_BALANCE = 'FEES_BALANCE',
  FEES_RECEIPT = 'FEES_RECEIPT', 
  REPORT_READY = 'REPORT_READY',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  EMERGENCY_ALERT = 'EMERGENCY_ALERT'
}

export enum SMSTriggerType {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
  BOTH = 'BOTH'
}

export interface SMSTemplateVariable {
  key: string
  description: string
  required: boolean
  example: string
}

export interface BuiltInSMSTemplate {
  key: SMSTemplateKey
  name: string
  purpose: string
  allowedRoles: string[]
  triggerType: SMSTriggerType
  variables: SMSTemplateVariable[]
  defaultContent: string
  maxLength: number
  editable: boolean
  maxPerTerm?: number // For emergency templates
  requiresConfirmation?: boolean
}

export interface CustomSMSTemplate {
  id: string
  schoolId: string
  templateKey: SMSTemplateKey
  customContent: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface SMSTemplateRenderData {
  PARENT_NAME?: string
  STUDENT_NAME?: string
  BALANCE?: string
  TERM?: string
  SCHOOL_NAME?: string
  PAYMENT_DEADLINE?: string
  AMOUNT_PAID?: string
  DATE?: string
  RECEIPT_NO?: string
  POSITION?: string
  MESSAGE?: string
  REASON?: string
  CONTACT?: string
  [key: string]: string | undefined
}

export interface SMSCostEstimate {
  characters: number
  smsUnits: number
  estimatedCost: number
  isWithinLimit: boolean
}

export interface SMSTemplateValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  characterCount: number
  costEstimate: SMSCostEstimate
}

export interface SMSTemplatePreview {
  content: string
  characterCount: number
  smsUnits: number
  estimatedCost: number
  sampleData: SMSTemplateRenderData
}

// Permission levels for template management
export enum SMSTemplatePermission {
  VIEW = 'VIEW',
  EDIT = 'EDIT', 
  SEND = 'SEND',
  ADMIN = 'ADMIN'
}

export interface SMSTemplatePermissions {
  [key: string]: SMSTemplatePermission[]
}

// Automation settings
export interface SMSAutomationRule {
  id: string
  schoolId: string
  templateKey: SMSTemplateKey
  isEnabled: boolean
  triggerConditions: {
    balanceThreshold?: number
    daysSinceTermStart?: number
    reminderInterval?: number
    maxRemindersPerTerm?: number
  }
  restrictions: {
    maxPerDay?: number
    maxPerWeek?: number
    maxPerTerm?: number
  }
  createdAt: Date
  updatedAt: Date
}

// Credit protection settings
export interface SMSCreditProtection {
  schoolId: string
  enableProtection: boolean
  minimumBalance: number
  emergencyReserve: number
  blockOnZeroBalance: boolean
  dailyLimits: {
    announcement: number
    emergency: number
    feesReminder: number
  }
  termLimits: {
    emergency: number
    maxPerStudent: number
  }
}

// Audit log for SMS sending
export interface SMSAuditLog {
  id: string
  schoolId: string
  templateKey: SMSTemplateKey
  sentBy: string
  sentByRole: string
  recipientCount: number
  totalCost: number
  timestamp: Date
  metadata: {
    triggerType: 'manual' | 'automatic'
    content: string
    recipients: string[]
  }
}