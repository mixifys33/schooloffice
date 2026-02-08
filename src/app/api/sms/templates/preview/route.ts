/**
 * SMS Template Preview API
 * Generate preview with sample data for template testing
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { smsTemplateService } from '@/services/sms-template.service'
import { SMSTemplateKey } from '@/types/sms-templates'

/**
 * POST /api/sms/templates/preview
 * Generate template preview with sample data
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

    const body = await request.json()
    const { templateKey, content } = body

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

    // Generate preview
    const preview = smsTemplateService.generatePreview(templateKey, content)

    return NextResponse.json({
      success: true,
      preview
    })
  } catch (error) {
    console.error('Error generating SMS template preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}