/**
 * SMS Automation Rules API
 * Manage automation settings for SMS templates
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { smsTemplateService } from '@/services/sms-template.service'
import { SMSTemplateKey } from '@/types/sms-templates'

/**
 * GET /api/sms/automation
 * Get automation rules for school
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      )
    }

    const rules = await smsTemplateService.getAutomationRules(schoolId)

    return NextResponse.json({
      success: true,
      rules
    })
  } catch (error) {
    console.error('Error fetching automation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sms/automation
 * Update automation rule
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

    const { schoolId, templateKey, settings } = await request.json()

    if (!schoolId || !templateKey || !settings) {
      return NextResponse.json(
        { error: 'School ID, template key, and settings are required' },
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

    const rule = await smsTemplateService.updateAutomationRule(schoolId, templateKey, settings)

    return NextResponse.json({
      success: true,
      rule
    })
  } catch (error) {
    console.error('Error updating automation rule:', error)
    return NextResponse.json(
      { error: 'Failed to update automation rule' },
      { status: 500 }
    )
  }
}