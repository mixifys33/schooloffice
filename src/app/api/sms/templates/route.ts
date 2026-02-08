/**
 * SMS Templates API Route
 * Requirement 8.5: Message templates (attendance alert, fees reminder, report ready)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'
import { MessageChannel, MessageTemplateType } from '@/types/enums'

// Default SMS templates (Requirement 8.5) - Professional, user-friendly content
const DEFAULT_TEMPLATES: Record<MessageTemplateType, { name: string; content: string }> = {
  [MessageTemplateType.ATTENDANCE_ALERT]: {
    name: 'Attendance Alert',
    content: '{{studentName}} absent {{date}}. Please confirm safety. {{schoolName}}',
  },
  [MessageTemplateType.FEES_REMINDER]: {
    name: 'Fees Reminder',
    content: '{{guardianName}}, {{studentName}} owes UGX {{balance}}. Pay now or child may be sent home. {{schoolName}}',
  },
  [MessageTemplateType.REPORT_READY]: {
    name: 'Report Ready',
    content: '{{studentName}} {{term}} report ready. Visit school. {{schoolName}}',
  },
  [MessageTemplateType.TERM_START]: {
    name: 'Term Start',
    content: 'Welcome back {{guardianName}}! {{studentName}} is in {{className}} for new term. {{schoolName}}',
  },
  [MessageTemplateType.MID_TERM_PROGRESS]: {
    name: 'Mid-Term Progress',
    content: '{{guardianName}}, {{studentName}} average: {{average}}%. Keep it up! {{schoolName}}',
  },
  [MessageTemplateType.TERM_SUMMARY]: {
    name: 'Term Summary',
    content: '{{guardianName}}, {{studentName}} finished {{position}} with {{average}}%. Excellent! {{schoolName}}',
  },
  [MessageTemplateType.DISCIPLINE_NOTICE]: {
    name: 'Discipline Notice',
    content: '{{guardianName}}, regarding {{studentName}}: {{description}}. Let\'s work together. {{schoolName}}',
  },
  [MessageTemplateType.GENERAL_ANNOUNCEMENT]: {
    name: 'General Announcement',
    content: '{{content}} - {{schoolName}}',
  },
}

/**
 * GET /api/sms/templates
 * Get all SMS templates for the school
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    // Get custom templates from database
    const customTemplates = await prisma.messageTemplate.findMany({
      where: {
        schoolId,
        channel: MessageChannel.SMS,
      },
      orderBy: { type: 'asc' },
    })

    // Merge with defaults
    const templateMap = new Map(customTemplates.map(t => [t.type, t]))
    
    const templates = Object.entries(DEFAULT_TEMPLATES).map(([type, defaultTemplate]) => {
      const custom = templateMap.get(type as MessageTemplateType)
      return {
        id: custom?.id || `default-${type}`,
        type: type as MessageTemplateType,
        name: defaultTemplate.name,
        content: custom?.content || defaultTemplate.content,
        channel: MessageChannel.SMS, // Ensure channel is always set
        isCustom: !!custom,
        isActive: custom?.isActive ?? true,
        placeholders: extractPlaceholders(custom?.content || defaultTemplate.content),
      }
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching SMS templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SMS templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sms/templates
 * Create or update an SMS template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { type, content } = body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Template type and content are required' },
        { status: 400 }
      )
    }

    // Validate template type
    if (!Object.values(MessageTemplateType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid template type' },
        { status: 400 }
      )
    }

    // Upsert template
    const template = await prisma.messageTemplate.upsert({
      where: {
        schoolId_type_channel: {
          schoolId,
          type,
          channel: MessageChannel.SMS,
        },
      },
      update: {
        content,
        isActive: true,
      },
      create: {
        schoolId,
        type,
        channel: MessageChannel.SMS,
        content,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        type: template.type,
        content: template.content,
        isActive: template.isActive,
      },
    })
  } catch (error) {
    console.error('Error saving SMS template:', error)
    return NextResponse.json(
      { error: 'Failed to save SMS template' },
      { status: 500 }
    )
  }
}

/**
 * Extract placeholders from template content
 */
function extractPlaceholders(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}
