/**
 * SMS Template Validation API
 * Validates template content against built-in rules
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { smsTemplateService } from '@/services/sms-template.service'
import { SMSTemplateKey } from '@/types/sms-templates'

/**
 * POST /api/sms/templates/validate
 * Validate template content
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { templateKey, content } = await request.json()

    if (!templateKey || !content) {
      return NextResponse.json(
        { error: 'Template key and content are required' },
        { status: 400 }
      )
    }

    // Validate template key
    if (!Object.values(SMSTemplateKey).includes(templateKey)) {
      return NextResponse.json(
        { error: 'Invalid template key' },
        { status: 400 }
      )
    }

    // Validate the template
    const validation = smsTemplateService.validateTemplate(templateKey, content)

    return NextResponse.json({
      success: true,
      validation
    })
  } catch (error) {
    console.error('Error validating SMS template:', error)
    return NextResponse.json(
      { error: 'Failed to validate template' },
      { status: 500 }
    )
  }
}