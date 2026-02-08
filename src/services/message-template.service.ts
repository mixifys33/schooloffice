/**
 * Message Template Service
 * Handles message template CRUD and rendering with placeholders
 * Requirements: 21.1, 21.4, 21.5
 */
import { prisma } from '@/lib/db'
import { MessageTemplate } from '@/types'
import { MessageChannel, MessageTemplateType } from '@/types/enums'

// ============================================
// TYPES
// ============================================

export interface CreateMessageTemplateInput {
  schoolId: string
  type: MessageTemplateType
  channel: MessageChannel
  content: string
}

export interface UpdateMessageTemplateInput {
  content?: string
  isActive?: boolean
}

export interface TemplateRenderData {
  studentName?: string
  className?: string
  date?: string
  periods?: string
  balance?: string
  average?: string
  position?: string
  link?: string
  description?: string
  content?: string
  [key: string]: unknown
}

/**
 * Result of template variable validation
 * Requirements: 13.2, 13.3
 */
export interface TemplateVariableValidationResult {
  valid: boolean
  missingVariables: string[]
  unreplacedPlaceholders: string[]
  errors: string[]
}

/**
 * Result of rendering a template with strict validation
 * Requirements: 13.2, 13.3
 */
export interface StrictRenderResult {
  success: boolean
  content?: string
  error?: string
  validationResult: TemplateVariableValidationResult
}

/**
 * Result of WhatsApp template validation
 * Requirements: 2.1, 13.4
 */
export interface WhatsAppTemplateValidationResult {
  valid: boolean
  templateName?: string
  error?: string
  isApproved: boolean
}

// ============================================
// DEFAULT TEMPLATES
// ============================================

/**
 * Default SMS templates (concise for character limits)
 * Requirement 21.1: Predefined templates with placeholders
 */
const DEFAULT_SMS_TEMPLATES: Record<MessageTemplateType, string> = {
  [MessageTemplateType.TERM_START]: 
    'Welcome back! {{studentName}} is in {{className}} for new term. Portal: {{link}}',
  [MessageTemplateType.ATTENDANCE_ALERT]: 
    '{{studentName}} absent {{date}}. Please confirm safety. {{link}}',
  [MessageTemplateType.FEES_REMINDER]: 
    '{{studentName}} owes UGX {{balance}}. Pay now or child may be sent home. {{link}}',
  [MessageTemplateType.MID_TERM_PROGRESS]: 
    '{{studentName}} average: {{average}}%. Keep it up! Details: {{link}}',
  [MessageTemplateType.REPORT_READY]: 
    '{{studentName}} report ready. View: {{link}}',
  [MessageTemplateType.TERM_SUMMARY]: 
    '{{studentName}}: Pos {{position}}, Avg {{average}}%. Excellent! Report: {{link}}',
  [MessageTemplateType.DISCIPLINE_NOTICE]: 
    'Regarding {{studentName}}: {{description}}. Let\'s work together. {{link}}',
  [MessageTemplateType.GENERAL_ANNOUNCEMENT]: 
    '{{content}} More: {{link}}',
}



/**
 * Default Email templates (HTML formatted)
 */
const DEFAULT_EMAIL_TEMPLATES: Record<MessageTemplateType, string> = {
  [MessageTemplateType.TERM_START]: 
    `<h2>Term Start Notice</h2><p>Welcome back!</p><p><strong>{{studentName}}</strong> is enrolled in <strong>{{className}}</strong> for the new term.</p><p><a href="{{link}}">View Details</a></p>`,
  [MessageTemplateType.ATTENDANCE_ALERT]: 
    `<h2>Attendance Alert</h2><p><strong>{{studentName}}</strong> was absent on <strong>{{date}}</strong>.</p><p>Periods missed: {{periods}}</p><p><a href="{{link}}">Respond Here</a></p>`,
  [MessageTemplateType.FEES_REMINDER]: 
    `<h2>Fees Reminder</h2><p><strong>{{studentName}}</strong> has an outstanding balance of <strong>UGX {{balance}}</strong>.</p><p>Please pay now or child may be sent home.</p><p><a href="{{link}}">Make Payment</a></p>`,
  [MessageTemplateType.MID_TERM_PROGRESS]: 
    `<h2>Mid-Term Progress</h2><p><strong>{{studentName}}</strong> average: <strong>{{average}}%</strong></p><p>Keep it up!</p><p><a href="{{link}}">View Full Report</a></p>`,
  [MessageTemplateType.REPORT_READY]: 
    `<h2>Report Card Ready</h2><p><strong>{{studentName}}</strong>'s report card is ready.</p><p><a href="{{link}}">Download Report</a></p>`,
  [MessageTemplateType.TERM_SUMMARY]: 
    `<h2>Term Summary</h2><p><strong>{{studentName}}</strong></p><ul><li>Position: {{position}}</li><li>Average: {{average}}%</li></ul><p>Excellent work!</p><p><a href="{{link}}">View Full Report</a></p>`,
  [MessageTemplateType.DISCIPLINE_NOTICE]: 
    `<h2>Discipline Notice</h2><p>Regarding <strong>{{studentName}}</strong>:</p><p>{{description}}</p><p>Let's work together.</p><p><a href="{{link}}">View Details</a></p>`,
  [MessageTemplateType.GENERAL_ANNOUNCEMENT]: 
    `<h2>School Announcement</h2><p>{{content}}</p><p><a href="{{link}}">More Information</a></p>`,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma MessageTemplate to domain type
 */
function mapPrismaTemplateToDomain(prismaTemplate: {
  id: string
  schoolId: string
  type: string
  channel: string
  content: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): MessageTemplate {
  return {
    id: prismaTemplate.id,
    schoolId: prismaTemplate.schoolId,
    type: prismaTemplate.type as MessageTemplateType,
    channel: prismaTemplate.channel as MessageChannel,
    content: prismaTemplate.content,
    isActive: prismaTemplate.isActive,
    createdAt: prismaTemplate.createdAt,
    updatedAt: prismaTemplate.updatedAt,
  }
}

/**
 * Get default template for a type and channel
 */
function getDefaultTemplate(type: MessageTemplateType, channel: MessageChannel): string {
  switch (channel) {
    case MessageChannel.SMS:
      return DEFAULT_SMS_TEMPLATES[type] || '{{content}}'
    case MessageChannel.EMAIL:
      return DEFAULT_EMAIL_TEMPLATES[type] || '{{content}}'
    default:
      return '{{content}}'
  }
}

// ============================================
// MESSAGE TEMPLATE SERVICE
// ============================================

export class MessageTemplateService {
  /**
   * Create a new message template
   * Requirement 21.1: Implement template CRUD with placeholders
   */
  async createTemplate(data: CreateMessageTemplateInput): Promise<MessageTemplate> {
    // Check if template already exists for this school/type/channel
    const existing = await prisma.messageTemplate.findFirst({
      where: {
        schoolId: data.schoolId,
        type: data.type,
        channel: data.channel,
      },
    })

    if (existing) {
      throw new Error(`Template already exists for ${data.type} on ${data.channel}`)
    }

    const template = await prisma.messageTemplate.create({
      data: {
        schoolId: data.schoolId,
        type: data.type,
        channel: data.channel,
        content: data.content,
        isActive: true,
      },
    })

    return mapPrismaTemplateToDomain(template)
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<MessageTemplate | null> {
    // Check if the ID is a valid MongoDB ObjectId format
    // MongoDB ObjectIds are 24-character hexadecimal strings
    const objectIdRegex = /^[0-9a-fA-F]{24}$/
    
    if (!objectIdRegex.test(id)) {
      // If not a valid ObjectId, return null to prevent database errors
      return null
    }
    
    const template = await prisma.messageTemplate.findUnique({
      where: { id },
    })

    if (!template) return null
    return mapPrismaTemplateToDomain(template)
  }

  /**
   * Get active template for a school, type, and channel
   */
  async getActiveTemplate(
    schoolId: string,
    type: MessageTemplateType,
    channel: MessageChannel
  ): Promise<MessageTemplate | null> {
    const template = await prisma.messageTemplate.findFirst({
      where: {
        schoolId,
        type,
        channel,
        isActive: true,
      },
    })

    if (!template) return null
    return mapPrismaTemplateToDomain(template)
  }

  /**
   * Get all templates for a school
   */
  async getSchoolTemplates(schoolId: string): Promise<MessageTemplate[]> {
    const templates = await prisma.messageTemplate.findMany({
      where: { schoolId },
      orderBy: [{ type: 'asc' }, { channel: 'asc' }],
    })

    return templates.map(mapPrismaTemplateToDomain)
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    data: UpdateMessageTemplateInput
  ): Promise<MessageTemplate> {
    const template = await prisma.messageTemplate.update({
      where: { id },
      data,
    })

    return mapPrismaTemplateToDomain(template)
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    await prisma.messageTemplate.delete({
      where: { id },
    })
  }

  /**
   * Render a template with data
   * Requirement 21.1: Use predefined templates with placeholders
   */
  async renderTemplate(
    schoolId: string,
    type: MessageTemplateType,
    channel: MessageChannel,
    data: TemplateRenderData
  ): Promise<string> {
    // Try to get custom template
    const template = await this.getActiveTemplate(schoolId, type, channel)
    
    // Use custom template or fall back to default
    let content = template?.content || getDefaultTemplate(type, channel)

    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      }
    }

    // Remove any unreplaced placeholders
    content = content.replace(/{{[^}]+}}/g, '')

    return content.trim()
  }

  /**
   * Render template synchronously (for testing)
   */
  renderTemplateSync(
    templateContent: string,
    data: TemplateRenderData
  ): string {
    let content = templateContent

    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      }
    }

    // Remove any unreplaced placeholders
    content = content.replace(/{{[^}]+}}/g, '')

    return content.trim()
  }

  /**
   * Get character count for SMS template
   * Requirement 21.1: Keep messages within character limits
   */
  getSmsCharacterInfo(content: string): {
    characters: number
    segments: number
    isWithinLimit: boolean
  } {
    const characters = content.length
    // GSM encoding: 160 chars for single, 153 for concatenated
    const segments = characters <= 160 ? 1 : Math.ceil(characters / 153)
    const isWithinLimit = segments <= 3 // Recommend max 3 segments

    return { characters, segments, isWithinLimit }
  }

  /**
   * Validate template placeholders
   */
  validateTemplate(content: string, type: MessageTemplateType): {
    valid: boolean
    missingPlaceholders: string[]
    extraPlaceholders: string[]
  } {
    // Extract placeholders from content
    const placeholderRegex = /{{(\w+)}}/g
    const foundPlaceholders: string[] = []
    let match
    while ((match = placeholderRegex.exec(content)) !== null) {
      foundPlaceholders.push(match[1])
    }

    // Required placeholders by type
    const requiredPlaceholders: Record<MessageTemplateType, string[]> = {
      [MessageTemplateType.TERM_START]: ['studentName', 'className'],
      [MessageTemplateType.ATTENDANCE_ALERT]: ['studentName', 'date', 'periods'],
      [MessageTemplateType.FEES_REMINDER]: ['studentName', 'balance'],
      [MessageTemplateType.MID_TERM_PROGRESS]: ['studentName', 'average'],
      [MessageTemplateType.REPORT_READY]: ['studentName', 'link'],
      [MessageTemplateType.TERM_SUMMARY]: ['studentName', 'position', 'average'],
      [MessageTemplateType.DISCIPLINE_NOTICE]: ['studentName'],
      [MessageTemplateType.GENERAL_ANNOUNCEMENT]: ['content'],
    }

    const required = requiredPlaceholders[type] || []
    const missingPlaceholders = required.filter(p => !foundPlaceholders.includes(p))
    const extraPlaceholders = foundPlaceholders.filter(p => !required.includes(p) && p !== 'link')

    return {
      valid: missingPlaceholders.length === 0,
      missingPlaceholders,
      extraPlaceholders,
    }
  }

  /**
   * Initialize default templates for a school
   */
  async initializeDefaultTemplates(schoolId: string): Promise<number> {
    let created = 0

    for (const type of Object.values(MessageTemplateType)) {
      for (const channel of Object.values(MessageChannel)) {
        const existing = await prisma.messageTemplate.findFirst({
          where: { schoolId, type, channel },
        })

        if (!existing) {
          await prisma.messageTemplate.create({
            data: {
              schoolId,
              type,
              channel,
              content: getDefaultTemplate(type, channel),
              isActive: true,
            },
          })
          created++
        }
      }
    }

    return created
  }

  /**
   * Render a template with URL shortening for SMS
   * Requirement 21.3: Generate shortened tracking URLs (e.g., https://tama.ri/ABC1)
   */
  async renderTemplateWithShortUrl(
    schoolId: string,
    type: MessageTemplateType,
    channel: MessageChannel,
    data: TemplateRenderData,
    context?: {
      studentId?: string
      messageId?: string
    }
  ): Promise<string> {
    // Import URL shortener service
    const { urlShortenerService } = await import('./url-shortener.service')
    
    // If there's a link in the data, shorten it
    let processedData = { ...data }
    if (data.link && typeof data.link === 'string') {
      const shortUrl = await urlShortenerService.createShortUrl({
        originalUrl: data.link,
        schoolId,
        studentId: context?.studentId,
        messageId: context?.messageId,
        channel,
      })
      processedData.link = urlShortenerService.getBaseUrl() + '/' + shortUrl.code
    }

    // Render the template with the shortened URL
    return this.renderTemplate(schoolId, type, channel, processedData)
  }

  // ============================================
  // VARIABLE VALIDATION METHODS
  // Requirements: 13.2, 13.3
  // ============================================

  /**
   * Extract all placeholders from a template content
   */
  extractPlaceholders(content: string): string[] {
    const placeholderRegex = /{{(\w+)}}/g
    const placeholders: string[] = []
    let match
    while ((match = placeholderRegex.exec(content)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1])
      }
    }
    return placeholders
  }

  /**
   * Validate that all required variables have values before sending
   * Requirement 13.2: Validate all required variables have values before sending
   * Requirement 13.3: Reject messages with unreplaced placeholders
   */
  validateVariables(
    templateContent: string,
    data: TemplateRenderData,
    type: MessageTemplateType
  ): TemplateVariableValidationResult {
    const errors: string[] = []
    const missingVariables: string[] = []
    const unreplacedPlaceholders: string[] = []

    // Extract all placeholders from the template
    const placeholders = this.extractPlaceholders(templateContent)

    // Get required placeholders for this template type
    const requiredPlaceholders = this.getRequiredPlaceholders(type)

    // Check for missing required variables (not provided in data)
    for (const placeholder of requiredPlaceholders) {
      const value = data[placeholder]
      if (value === undefined || value === null || value === '') {
        missingVariables.push(placeholder)
        errors.push(`Required variable '${placeholder}' is missing or empty`)
      }
    }

    // Check for any placeholders that won't be replaced
    for (const placeholder of placeholders) {
      const value = data[placeholder]
      if (value === undefined || value === null) {
        unreplacedPlaceholders.push(placeholder)
        if (!missingVariables.includes(placeholder)) {
          errors.push(`Variable '${placeholder}' has no value and will remain unreplaced`)
        }
      }
    }

    return {
      valid: missingVariables.length === 0 && unreplacedPlaceholders.length === 0,
      missingVariables,
      unreplacedPlaceholders,
      errors,
    }
  }

  /**
   * Get required placeholders for a template type
   */
  getRequiredPlaceholders(type: MessageTemplateType): string[] {
    const requiredPlaceholders: Record<MessageTemplateType, string[]> = {
      [MessageTemplateType.TERM_START]: ['studentName', 'className'],
      [MessageTemplateType.ATTENDANCE_ALERT]: ['studentName', 'date', 'periods'],
      [MessageTemplateType.FEES_REMINDER]: ['studentName', 'balance'],
      [MessageTemplateType.MID_TERM_PROGRESS]: ['studentName', 'average'],
      [MessageTemplateType.REPORT_READY]: ['studentName', 'link'],
      [MessageTemplateType.TERM_SUMMARY]: ['studentName', 'position', 'average'],
      [MessageTemplateType.DISCIPLINE_NOTICE]: ['studentName'],
      [MessageTemplateType.GENERAL_ANNOUNCEMENT]: ['content'],
    }
    return requiredPlaceholders[type] || []
  }

  /**
   * Render template with strict validation - rejects if any placeholders remain unreplaced
   * Requirement 13.2: Validate all required variables have values before sending
   * Requirement 13.3: Reject messages with unreplaced placeholders
   */
  renderTemplateStrict(
    templateContent: string,
    data: TemplateRenderData,
    type: MessageTemplateType
  ): StrictRenderResult {
    // First validate the variables
    const validationResult = this.validateVariables(templateContent, data, type)

    if (!validationResult.valid) {
      return {
        success: false,
        error: `Template validation failed: ${validationResult.errors.join('; ')}`,
        validationResult,
      }
    }

    // Render the template
    let content = templateContent
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      }
    }

    // Final check for any unreplaced placeholders
    const remainingPlaceholders = this.extractPlaceholders(content)
    if (remainingPlaceholders.length > 0) {
      return {
        success: false,
        error: `Message contains unreplaced placeholders: ${remainingPlaceholders.join(', ')}`,
        validationResult: {
          ...validationResult,
          valid: false,
          unreplacedPlaceholders: remainingPlaceholders,
          errors: [...validationResult.errors, `Unreplaced placeholders found: ${remainingPlaceholders.join(', ')}`],
        },
      }
    }

    return {
      success: true,
      content: content.trim(),
      validationResult,
    }
  }

  /**
   * Async version of strict rendering with database template lookup
   * Requirement 13.2, 13.3
   */
  async renderTemplateStrictAsync(
    schoolId: string,
    type: MessageTemplateType,
    channel: MessageChannel,
    data: TemplateRenderData
  ): Promise<StrictRenderResult> {
    // Get the template content
    const template = await this.getActiveTemplate(schoolId, type, channel)
    const templateContent = template?.content || getDefaultTemplate(type, channel)

    return this.renderTemplateStrict(templateContent, data, type)
  }
}


// Export singleton instance
export const messageTemplateService = new MessageTemplateService()
