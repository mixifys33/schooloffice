/**
 * Built-in SMS Templates API
 * Returns the 5 core SMS templates that schools actually need
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { smsTemplateService } from '@/services/sms-template.service'

/**
 * GET /api/sms/templates/built-in
 * Get all built-in SMS templates
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

    const templates = smsTemplateService.getBuiltInTemplates()

    return NextResponse.json({
      success: true,
      templates
    })
  } catch (error) {
    console.error('Error fetching built-in SMS templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch built-in templates' },
      { status: 500 }
    )
  }
}