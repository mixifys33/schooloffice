/**
 * Custom SMS Templates API
 * Handle school-specific template customizations with strict validation
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { smsTemplateService } from '@/services/sms-template.service'
import { SMSTemplateKey } from '@/types/sms-templates'

/**
 * GET /api/sms/templates/custom
 * Get custom templates for a school
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

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      )
    }

    // Get all custom templates for the school
    const templates = []
    for (const templateKey of Object.values(SMSTemplateKey)) {
      const customTemplate = await smsTemplateService.getCustomTemplate(schoolId, templateKey)
      if (customTemplate) {
        templates.push(customTemplate)
      }
    }

    return NextResponse.json({
      success: true,
      templates
    })
  } catch (error) {
    console.error('Error fetching custom SMS templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch custom templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sms/templates/custom
 * Save a custom template
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
    const { schoolId, templateKey, customContent, createdBy } = body

    if (!schoolId || !templateKey || !customContent || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Get user role for permission check
    const userRole = (session.user as any).role || 'TEACHER'
    
    // Check if user has permission to edit this template
    if (!smsTemplateService.hasPermission(userRole, templateKey)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit this template' },
        { status: 403 }
      )
    }

    // Check if template is editable
    const builtInTemplate = smsTemplateService.getBuiltInTemplate(templateKey)
    if (!builtInTemplate?.editable) {
      return NextResponse.json(
        { error: 'This template cannot be customized' },
        { status: 400 }
      )
    }

    // Save the custom template
    const template = await smsTemplateService.saveCustomTemplate(
      schoolId,
      templateKey,
      customContent,
      createdBy
    )

    return NextResponse.json({
      success: true,
      template
    })
  } catch (error) {
    console.error('Error saving custom SMS template:', error)
    
    if (error instanceof Error && error.message.includes('validation failed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to save custom template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sms/templates/custom
 * Reset template to built-in default (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { schoolId, templateKey } = body

    if (!schoolId || !templateKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Check admin permissions (only admins can reset templates)
    const userRole = (session.user as any).role || 'TEACHER'
    if (!['ADMIN', 'HEAD_TEACHER'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only administrators can reset templates to default' },
        { status: 403 }
      )
    }

    // Reset the template
    await smsTemplateService.resetToDefault(schoolId, templateKey)

    return NextResponse.json({
      success: true,
      message: 'Template reset to default successfully'
    })
  } catch (error) {
    console.error('Error resetting SMS template:', error)
    return NextResponse.json(
      { error: 'Failed to reset template' },
      { status: 500 }
    )
  }
}