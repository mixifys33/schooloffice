/**
 * School Settings Service
 * Handles school-specific configuration settings
 * Requirements: 10.1, 17.1, 12.7 (Finance settings audit)
 */
import { prisma } from '@/lib/db'
import { FinanceAuditService } from './finance-audit.service'
    
// Settings category types
export type SettingsCategory =
  | 'identity'
  | 'academic'
  | 'communication'
  | 'attendance'
  | 'grading'
  | 'finance'
  | 'guardian'
  | 'security'

// School Identity Settings - Requirements 10.1, 10.2, 10.3
export interface SchoolIdentitySettings {
  name: string
  code: string
  logo?: string
  motto?: string
  schoolType: 'PRIMARY' | 'SECONDARY' | 'BOTH'
  boardingStatus: 'DAY' | 'BOARDING' | 'MIXED'
  address?: string
  phone?: string
  email?: string
  timezone: string
  defaultLanguage: string
}

// Academic Settings - Requirements 11.1, 11.2, 11.3, 11.4
export interface AcademicSettings {
  academicYearFormat: string
  termStructure: 'TRIMESTER' | 'SEMESTER' | 'QUARTER'
  defaultTermWeeks: number
  gradingScale: string
}

// Communication Settings - Requirements 13.1, 13.2, 13.3, 13.5
// Teacher Dashboard Requirement 8.2: Parent messaging enabled by school
export interface CommunicationSettings {
  smsProvider?: string
  smsApiKey?: string
  smsSenderId?: string
  whatsappEnabled: boolean
  whatsappApiKey?: string
  emailSmtpHost?: string
  emailSmtpPort?: number
  emailSmtpUser?: string
  emailSmtpPassword?: string
  emailFromAddress?: string
  quietHoursStart?: string // HH:mm format
  quietHoursEnd?: string // HH:mm format
  emergencyOverrideEnabled: boolean
  // Teacher Dashboard Requirement 8.2: Allow teachers to message parents
  teacherParentMessagingEnabled: boolean
}

// Attendance Settings - Requirements 14.1, 14.2, 14.3, 14.4, 4.3, 4.4, 4.5
export interface AttendanceSettings {
  lateThresholdMinutes: number
  absentCutoffTime: string // HH:mm format - cutoff time for attendance entry
  statuses: string[]
  markingRoles: string[]
  autoNotifyOnAbsence: boolean
  // Teacher Dashboard Requirements: 4.3, 4.4, 4.5 - Time-based locking
  allowSameDayEdit: boolean // Whether teachers can edit same-day attendance before cutoff
  requireAdminApprovalAfterLock: boolean // Whether admin approval is needed after cutoff
  lockMessage: string // Custom message to display when attendance is locked
}

// Grading Settings - Requirements 15.1, 15.2, 15.3, 15.4, 15.5
export interface GradingSettings {
  gradingScaleType: 'LETTER' | 'PERCENTAGE' | 'POINTS'
  passMarkPercentage: number
  examWeights: {
    type: string
    weight: number
  }[]
  termContributionRules: {
    term: number
    weight: number
  }[]
  enableClassRanking: boolean
  enableSubjectRanking: boolean
}

// Finance Settings - Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
export interface FinanceSettings {
  // Currency configuration - Requirement 12.1
  currency: string
  currencySymbol: string
  supportedCurrencies: SupportedCurrency[]
  
  // Receipt/Invoice format configuration - Requirement 12.2
  receiptNumberFormat: string // e.g., 'RCP-{YEAR}-{NUMBER}'
  invoiceNumberFormat: string // e.g., 'INV-{YEAR}-{NUMBER}'
  receiptPrefix: string
  invoicePrefix: string
  nextReceiptNumber: number
  nextInvoiceNumber: number
  
  // Due date configuration - Requirement 12.3
  defaultDueDays: number // Days after term start
  
  // Penalty configuration - Requirement 12.4
  enableAutoPenalty: boolean
  penaltyType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  latePenaltyPercentage: number // Used when penaltyType is PERCENTAGE
  latePenaltyFixedAmount: number // Used when penaltyType is FIXED_AMOUNT
  gracePeriodDays: number
  maxPenaltyPercentage: number // Cap for percentage-based penalties
  
  // Discount approval workflow - Requirement 12.5
  enableDiscountApproval: boolean
  discountApprovalThreshold: number // Amount above which approval is required
  discountApprovalRoles: string[] // Roles that can approve discounts
  
  // Payment method configuration - Requirement 12.6
  paymentMethods: PaymentMethodConfig[]
  enabledPaymentMethods: string[] // List of enabled method codes
}

// Supported currency definition
export interface SupportedCurrency {
  code: string
  symbol: string
  name: string
}

// Payment method configuration
export interface PaymentMethodConfig {
  code: string
  name: string
  enabled: boolean
  requiresReference: boolean
  requiresBankName: boolean
  requiresChequeNumber: boolean
  requiresMobileNumber: boolean
}

// Guardian Settings - Requirements 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
export interface GuardianSettings {
  allowedRelationshipTypes: string[]
  maxGuardiansPerStudent: number
  defaultPrimaryGuardianLogic: 'FIRST_ADDED' | 'MOTHER' | 'FATHER' | 'MANUAL'
  academicMessageRecipients: string[]
  financeMessageRecipients: string[]
  portalDefaultVisibility: {
    attendance: boolean
    results: boolean
    fees: boolean
  }
  requireConsentAcknowledgement: boolean
  consentPolicyVersion: string
}

// Security Settings - Requirements 18.1, 18.2, 18.3, 18.4, 18.6
export interface SecuritySettings {
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSpecialChars: boolean
  maxLoginAttempts: number
  lockoutDurationMinutes: number
  sessionTimeoutMinutes: number
  enableTwoFactorAuth: boolean
  autoLogoutOnInactivity: boolean
}

// Union type for all settings
export type SchoolSettingsData =
  | SchoolIdentitySettings
  | AcademicSettings
  | CommunicationSettings
  | AttendanceSettings
  | GradingSettings
  | FinanceSettings
  | GuardianSettings
  | SecuritySettings

// School Settings entity
export interface SchoolSettings {
  id: string
  schoolId: string
  category: SettingsCategory
  settings: SchoolSettingsData
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

// Default settings by category
const DEFAULT_SETTINGS: Record<SettingsCategory, SchoolSettingsData> = {
  identity: {
    name: '',
    code: '',
    schoolType: 'PRIMARY',
    boardingStatus: 'DAY',
    timezone: 'Africa/Kampala',
    defaultLanguage: 'en',
  },
  academic: {
    academicYearFormat: 'YYYY',
    termStructure: 'TRIMESTER',
    defaultTermWeeks: 12,
    gradingScale: 'default',
  },
  communication: {
    whatsappEnabled: false,
    emergencyOverrideEnabled: true,
    teacherParentMessagingEnabled: false, // Disabled by default per Requirement 8.2
  },
  attendance: {
    lateThresholdMinutes: 15,
    absentCutoffTime: '17:00',
    statuses: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
    markingRoles: ['TEACHER', 'SCHOOL_ADMIN'],
    autoNotifyOnAbsence: true,
    // Teacher Dashboard Requirements: 4.3, 4.4, 4.5 - Time-based locking
    allowSameDayEdit: true,
    requireAdminApprovalAfterLock: true,
    lockMessage: 'Attendance cutoff time has passed. Contact administration for approval to make changes.',
  },
  grading: {
    gradingScaleType: 'PERCENTAGE',
    passMarkPercentage: 50,
    examWeights: [
      { type: 'BOT', weight: 20 },
      { type: 'MID', weight: 30 },
      { type: 'EOT', weight: 50 },
    ],
    termContributionRules: [],
    enableClassRanking: true,
    enableSubjectRanking: true,
  },
  finance: {
    // Currency configuration - Requirement 12.1
    currency: 'UGX',
    currencySymbol: 'UGX',
    supportedCurrencies: [
      { code: 'UGX', symbol: 'UGX', name: 'Ugandan Shilling' },
      { code: 'KES', symbol: 'KES', name: 'Kenyan Shilling' },
      { code: 'TZS', symbol: 'TZS', name: 'Tanzanian Shilling' },
      { code: 'RWF', symbol: 'RWF', name: 'Rwandan Franc' },
      { code: 'USD', symbol: '$', name: 'US Dollar' },
      { code: 'GBP', symbol: '£', name: 'British Pound' },
      { code: 'EUR', symbol: '€', name: 'Euro' },
    ],
    
    // Receipt/Invoice format configuration - Requirement 12.2
    receiptNumberFormat: 'RCP-{YEAR}-{NUMBER}',
    invoiceNumberFormat: 'INV-{YEAR}-{NUMBER}',
    receiptPrefix: 'RCP',
    invoicePrefix: 'INV',
    nextReceiptNumber: 1,
    nextInvoiceNumber: 1,
    
    // Due date configuration - Requirement 12.3
    defaultDueDays: 14, // 14 days after term start
    
    // Penalty configuration - Requirement 12.4
    enableAutoPenalty: false,
    penaltyType: 'PERCENTAGE' as const,
    latePenaltyPercentage: 0,
    latePenaltyFixedAmount: 0,
    gracePeriodDays: 7,
    maxPenaltyPercentage: 25, // Cap at 25%
    
    // Discount approval workflow - Requirement 12.5
    enableDiscountApproval: false,
    discountApprovalThreshold: 0, // Any discount requires approval when enabled
    discountApprovalRoles: ['SCHOOL_ADMIN', 'DEPUTY'],
    
    // Payment method configuration - Requirement 12.6
    paymentMethods: [
      { code: 'CASH', name: 'Cash', enabled: true, requiresReference: false, requiresBankName: false, requiresChequeNumber: false, requiresMobileNumber: false },
      { code: 'MOBILE_MONEY', name: 'Mobile Money', enabled: true, requiresReference: true, requiresBankName: false, requiresChequeNumber: false, requiresMobileNumber: true },
      { code: 'BANK', name: 'Bank Transfer', enabled: true, requiresReference: true, requiresBankName: true, requiresChequeNumber: false, requiresMobileNumber: false },
      { code: 'CHEQUE', name: 'Cheque', enabled: false, requiresReference: true, requiresBankName: true, requiresChequeNumber: true, requiresMobileNumber: false },
    ],
    enabledPaymentMethods: ['CASH', 'MOBILE_MONEY', 'BANK'],
  },
  guardian: {
    allowedRelationshipTypes: ['FATHER', 'MOTHER', 'GUARDIAN', 'UNCLE', 'AUNT', 'GRANDPARENT', 'SPONSOR', 'OTHER'],
    maxGuardiansPerStudent: 4,
    defaultPrimaryGuardianLogic: 'FIRST_ADDED',
    academicMessageRecipients: ['FATHER', 'MOTHER', 'GUARDIAN'],
    financeMessageRecipients: ['FATHER', 'MOTHER', 'GUARDIAN', 'SPONSOR'],
    portalDefaultVisibility: {
      attendance: true,
      results: true,
      fees: true,
    },
    requireConsentAcknowledgement: false,
    consentPolicyVersion: '1.0',
  },
  security: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    sessionTimeoutMinutes: 60,
    enableTwoFactorAuth: false,
    autoLogoutOnInactivity: true,
  },
}

export class SchoolSettingsService {
  /**
   * Get settings for a specific category
   * Requirement 10.1: Allow configuration of school settings
   */
  async getSettings<T extends SchoolSettingsData>(
    schoolId: string,
    category: SettingsCategory
  ): Promise<T> {
    const settings = await prisma.schoolSettings.findUnique({
      where: {
        schoolId_category: {
          schoolId,
          category,
        },
      },
    })

    if (!settings) {
      // Return default settings if none exist
      return DEFAULT_SETTINGS[category] as T
    }

    return settings.settings as unknown as T
  }

  /**
   * Update settings for a specific category
   * Requirement 10.1: Allow configuration of school settings
   * Requirement 12.7: Audit log on finance settings change
   */
  async updateSettings<T extends SchoolSettingsData>(
    schoolId: string,
    category: SettingsCategory,
    settings: Partial<T>,
    updatedBy: string,
    ipAddress?: string
  ): Promise<T> {
    // Get current settings or defaults
    const currentSettings = await this.getSettings<T>(schoolId, category)

    // Merge with new settings
    const mergedSettings = {
      ...currentSettings,
      ...settings,
    }

    // Upsert the settings
    const result = await prisma.schoolSettings.upsert({
      where: {
        schoolId_category: {
          schoolId,
          category,
        },
      },
      update: {
        settings: mergedSettings as object,
        updatedBy,
      },
      create: {
        schoolId,
        category,
        settings: mergedSettings as object,
        updatedBy,
      },
    })

    // Create audit log for finance settings changes - Requirement 12.7
    if (category === 'finance') {
      try {
        await FinanceAuditService.logAction({
          schoolId,
          userId: updatedBy,
          action: 'SETTINGS_UPDATED',
          entityType: 'Settings',
          entityId: result.id,
          details: {
            previousValue: currentSettings as unknown as Record<string, unknown>,
            newValue: mergedSettings as unknown as Record<string, unknown>,
          },
          ipAddress,
        })
      } catch (auditError) {
        // Log error but don't fail the settings update
        console.error('Failed to create audit log for finance settings update:', auditError)
      }
    }

    return result.settings as unknown as T
  }

  /**
   * Get all settings for a school
   */
  async getAllSettings(schoolId: string): Promise<Record<SettingsCategory, SchoolSettingsData>> {
    const allSettings = await prisma.schoolSettings.findMany({
      where: { schoolId },
    })

    // Build result with defaults for missing categories
    const result: Record<SettingsCategory, SchoolSettingsData> = {
      identity: DEFAULT_SETTINGS.identity,
      academic: DEFAULT_SETTINGS.academic,
      communication: DEFAULT_SETTINGS.communication,
      attendance: DEFAULT_SETTINGS.attendance,
      grading: DEFAULT_SETTINGS.grading,
      finance: DEFAULT_SETTINGS.finance,
      guardian: DEFAULT_SETTINGS.guardian,
      security: DEFAULT_SETTINGS.security,
    }

    // Override with stored settings
    for (const setting of allSettings) {
      result[setting.category as SettingsCategory] = setting.settings as unknown as SchoolSettingsData
    }

    return result
  }

  /**
   * Initialize default settings for a new school
   */
  async initializeDefaultSettings(schoolId: string, updatedBy: string): Promise<void> {
    const categories: SettingsCategory[] = [
      'identity',
      'academic',
      'communication',
      'attendance',
      'grading',
      'finance',
      'guardian',
      'security',
    ]

    for (const category of categories) {
      await prisma.schoolSettings.upsert({
        where: {
          schoolId_category: {
            schoolId,
            category,
          },
        },
        update: {},
        create: {
          schoolId,
          category,
          settings: DEFAULT_SETTINGS[category] as object,
          updatedBy,
        },
      })
    }
  }

  /**
   * Delete all settings for a school
   */
  async deleteAllSettings(schoolId: string): Promise<void> {
    await prisma.schoolSettings.deleteMany({
      where: { schoolId },
    })
  }

  /**
   * Get a specific setting value
   */
  async getSettingValue<T>(
    schoolId: string,
    category: SettingsCategory,
    key: string
  ): Promise<T | undefined> {
    const settings = await this.getSettings(schoolId, category)
    return (settings as unknown as Record<string, unknown>)[key] as T | undefined
  }

  // ============================================
  // FINANCE-SPECIFIC HELPER METHODS
  // Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
  // ============================================

  /**
   * Get finance settings for a school
   * Requirement 12.1-12.6: Finance settings configuration
   */
  async getFinanceSettings(schoolId: string): Promise<FinanceSettings> {
    return this.getSettings<FinanceSettings>(schoolId, 'finance')
  }

  /**
   * Update finance settings with audit logging
   * Requirement 12.7: Audit log on settings change
   */
  async updateFinanceSettings(
    schoolId: string,
    settings: Partial<FinanceSettings>,
    updatedBy: string,
    ipAddress?: string
  ): Promise<FinanceSettings> {
    return this.updateSettings<FinanceSettings>(
      schoolId,
      'finance',
      settings,
      updatedBy,
      ipAddress
    )
  }

  /**
   * Update currency configuration
   * Requirement 12.1: Currency configuration with symbol
   */
  async updateCurrency(
    schoolId: string,
    currency: string,
    currencySymbol: string,
    updatedBy: string,
    ipAddress?: string
  ): Promise<FinanceSettings> {
    return this.updateFinanceSettings(
      schoolId,
      { currency, currencySymbol },
      updatedBy,
      ipAddress
    )
  }

  /**
   * Update receipt/invoice format configuration
   * Requirement 12.2: Receipt/invoice format configuration
   */
  async updateDocumentFormats(
    schoolId: string,
    formats: {
      receiptNumberFormat?: string
      invoiceNumberFormat?: string
      receiptPrefix?: string
      invoicePrefix?: string
    },
    updatedBy: string,
    ipAddress?: string
  ): Promise<FinanceSettings> {
    return this.updateFinanceSettings(schoolId, formats, updatedBy, ipAddress)
  }

  /**
   * Update due date configuration
   * Requirement 12.3: Due date configuration
   */
  async updateDueDateConfig(
    schoolId: string,
    defaultDueDays: number,
    updatedBy: string,
    ipAddress?: string
  ): Promise<FinanceSettings> {
    if (defaultDueDays < 0 || defaultDueDays > 365) {
      throw new Error('Default due days must be between 0 and 365')
    }
    return this.updateFinanceSettings(
      schoolId,
      { defaultDueDays },
      updatedBy,
      ipAddress
    )
  }

  /**
   * Update penalty configuration
   * Requirement 12.4: Penalty configuration (percentage/fixed, grace period)
   */
  async updatePenaltyConfig(
    schoolId: string,
    config: {
      enableAutoPenalty?: boolean
      penaltyType?: 'PERCENTAGE' | 'FIXED_AMOUNT'
      latePenaltyPercentage?: number
      latePenaltyFixedAmount?: number
      gracePeriodDays?: number
      maxPenaltyPercentage?: number
    },
    updatedBy: string,
    ipAddress?: string
  ): Promise<FinanceSettings> {
    // Validate penalty percentage
    if (config.latePenaltyPercentage !== undefined) {
      if (config.latePenaltyPercentage < 0 || config.latePenaltyPercentage > 100) {
        throw new Error('Late penalty percentage must be between 0 and 100')
      }
    }
    // Validate max penalty percentage
    if (config.maxPenaltyPercentage !== undefined) {
      if (config.maxPenaltyPercentage < 0 || config.maxPenaltyPercentage > 100) {
        throw new Error('Max penalty percentage must be between 0 and 100')
      }
    }
    // Validate grace period
    if (config.gracePeriodDays !== undefined) {
      if (config.gracePeriodDays < 0 || config.gracePeriodDays > 365) {
        throw new Error('Grace period must be between 0 and 365 days')
      }
    }
    // Validate fixed amount
    if (config.latePenaltyFixedAmount !== undefined) {
      if (config.latePenaltyFixedAmount < 0) {
        throw new Error('Late penalty fixed amount cannot be negative')
      }
    }
    return this.updateFinanceSettings(schoolId, config, updatedBy, ipAddress)
  }

  /**
   * Update discount approval workflow configuration
   * Requirement 12.5: Discount approval workflow configuration
   */
  async updateDiscountApprovalConfig(
    schoolId: string,
    config: {
      enableDiscountApproval?: boolean
      discountApprovalThreshold?: number
      discountApprovalRoles?: string[]
    },
    updatedBy: string,
    ipAddress?: string
  ): Promise<FinanceSettings> {
    // Validate threshold
    if (config.discountApprovalThreshold !== undefined) {
      if (config.discountApprovalThreshold < 0) {
        throw new Error('Discount approval threshold cannot be negative')
      }
    }
    return this.updateFinanceSettings(schoolId, config, updatedBy, ipAddress)
  }

  /**
   * Update payment method configuration
   * Requirement 12.6: Payment method enable/disable
   */
  async updatePaymentMethods(
    schoolId: string,
    paymentMethods: PaymentMethodConfig[],
    updatedBy: string,
    ipAddress?: string
  ): Promise<FinanceSettings> {
    // Validate at least one payment method is enabled
    const enabledMethods = paymentMethods.filter(m => m.enabled)
    if (enabledMethods.length === 0) {
      throw new Error('At least one payment method must be enabled')
    }
    
    // Update enabled payment methods list
    const enabledPaymentMethods = enabledMethods.map(m => m.code)
    
    return this.updateFinanceSettings(
      schoolId,
      { paymentMethods, enabledPaymentMethods },
      updatedBy,
      ipAddress
    )
  }

  /**
   * Enable or disable a specific payment method
   * Requirement 12.6: Payment method enable/disable
   */
  async togglePaymentMethod(
    schoolId: string,
    methodCode: string,
    enabled: boolean,
    updatedBy: string,
    ipAddress?: string
  ): Promise<FinanceSettings> {
    const settings = await this.getFinanceSettings(schoolId)
    
    // Find and update the payment method
    const updatedMethods = settings.paymentMethods.map(method => {
      if (method.code === methodCode) {
        return { ...method, enabled }
      }
      return method
    })
    
    // Validate at least one method remains enabled
    const enabledMethods = updatedMethods.filter(m => m.enabled)
    if (enabledMethods.length === 0) {
      throw new Error('At least one payment method must be enabled')
    }
    
    // Update enabled payment methods list
    const enabledPaymentMethods = enabledMethods.map(m => m.code)
    
    return this.updateFinanceSettings(
      schoolId,
      { paymentMethods: updatedMethods, enabledPaymentMethods },
      updatedBy,
      ipAddress
    )
  }

  /**
   * Get the next receipt number and increment the counter
   * Requirement 12.2: Receipt format configuration
   */
  async getNextReceiptNumber(schoolId: string, updatedBy: string): Promise<string> {
    const settings = await this.getFinanceSettings(schoolId)
    const currentNumber = settings.nextReceiptNumber || 1
    const year = new Date().getFullYear()
    
    // Generate receipt number using format
    const receiptNumber = settings.receiptNumberFormat
      .replace('{YEAR}', year.toString())
      .replace('{NUMBER}', currentNumber.toString().padStart(6, '0'))
    
    // Increment the counter (no audit log for counter increment)
    await prisma.schoolSettings.update({
      where: {
        schoolId_category: {
          schoolId,
          category: 'finance',
        },
      },
      data: {
        settings: {
          ...settings,
          nextReceiptNumber: currentNumber + 1,
        } as object,
        updatedBy,
      },
    })
    
    return receiptNumber
  }

  /**
   * Get the next invoice number and increment the counter
   * Requirement 12.2: Invoice format configuration
   */
  async getNextInvoiceNumber(schoolId: string, updatedBy: string): Promise<string> {
    const settings = await this.getFinanceSettings(schoolId)
    const currentNumber = settings.nextInvoiceNumber || 1
    const year = new Date().getFullYear()
    
    // Generate invoice number using format
    const invoiceNumber = settings.invoiceNumberFormat
      .replace('{YEAR}', year.toString())
      .replace('{NUMBER}', currentNumber.toString().padStart(6, '0'))
    
    // Increment the counter (no audit log for counter increment)
    await prisma.schoolSettings.update({
      where: {
        schoolId_category: {
          schoolId,
          category: 'finance',
        },
      },
      data: {
        settings: {
          ...settings,
          nextInvoiceNumber: currentNumber + 1,
        } as object,
        updatedBy,
      },
    })
    
    return invoiceNumber
  }

  /**
   * Check if a discount requires approval based on settings
   * Requirement 12.5: Discount approval workflow
   */
  async requiresDiscountApproval(schoolId: string, discountAmount: number): Promise<boolean> {
    const settings = await this.getFinanceSettings(schoolId)
    
    if (!settings.enableDiscountApproval) {
      return false
    }
    
    // If threshold is 0, all discounts require approval
    if (settings.discountApprovalThreshold === 0) {
      return true
    }
    
    return discountAmount >= settings.discountApprovalThreshold
  }

  /**
   * Check if a user role can approve discounts
   * Requirement 12.5: Discount approval workflow
   */
  async canApproveDiscount(schoolId: string, userRole: string): Promise<boolean> {
    const settings = await this.getFinanceSettings(schoolId)
    return settings.discountApprovalRoles.includes(userRole)
  }

  /**
   * Check if a payment method is enabled
   * Requirement 12.6: Payment method enable/disable
   */
  async isPaymentMethodEnabled(schoolId: string, methodCode: string): Promise<boolean> {
    const settings = await this.getFinanceSettings(schoolId)
    return settings.enabledPaymentMethods.includes(methodCode)
  }

  /**
   * Get enabled payment methods
   * Requirement 12.6: Payment method enable/disable
   */
  async getEnabledPaymentMethods(schoolId: string): Promise<PaymentMethodConfig[]> {
    const settings = await this.getFinanceSettings(schoolId)
    return settings.paymentMethods.filter(m => m.enabled)
  }

  /**
   * Calculate late penalty amount based on settings
   * Requirement 12.4: Penalty configuration
   */
  async calculateLatePenalty(schoolId: string, outstandingBalance: number): Promise<number> {
    const settings = await this.getFinanceSettings(schoolId)
    
    if (!settings.enableAutoPenalty) {
      return 0
    }
    
    let penaltyAmount: number
    
    if (settings.penaltyType === 'PERCENTAGE') {
      penaltyAmount = (outstandingBalance * settings.latePenaltyPercentage) / 100
      
      // Apply max penalty cap if set
      if (settings.maxPenaltyPercentage > 0) {
        const maxPenalty = (outstandingBalance * settings.maxPenaltyPercentage) / 100
        penaltyAmount = Math.min(penaltyAmount, maxPenalty)
      }
    } else {
      penaltyAmount = settings.latePenaltyFixedAmount
    }
    
    return Math.round(penaltyAmount * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Format currency amount with symbol
   * Requirement 12.1: Currency configuration
   */
  async formatCurrency(schoolId: string, amount: number): Promise<string> {
    const settings = await this.getFinanceSettings(schoolId)
    return `${settings.currencySymbol} ${amount.toLocaleString()}`
  }
}

// Export singleton instance
export const schoolSettingsService = new SchoolSettingsService()
