/**
 * Communication Hub Template Preview API Route
 * Requirements: 5.2, 5.5
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { templateManagementService } from '@/services/hub-template.service'

/**
 * POST /api/admin/communication-hub/templates/[id]/preview
 * Previews a template with sample data
 * Only accessible by Super Admin role
 * Requirements: 5.2, 5.5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Super Admin access required' 
      }, { status: 403 })
    }

    const templateId = params.id
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    
    if (!body.sampleData || typeof body.sampleData !== 'object') {
      return NextResponse.json({ 
        error: 'sampleData object is required' 
      }, { status: 400 })
    }

    // Validate sample data values are strings
    const invalidValues = Object.entries(body.sampleData).filter(
      ([key, value]) => typeof value !== 'string'
    )
    
    if (invalidValues.length > 0) {
      return NextResponse.json({ 
        error: `Sample data values must be strings. Invalid keys: ${invalidValues.map(([key]) => key).join(', ')}` 
      }, { status: 400 })
    }

    // Preview the template
    const previewContent = await templateManagementService.previewTemplate(
      templateId, 
      body.sampleData
    )

    // Get template info for context
    const template = await templateManagementService.getTemplate(templateId)

    return NextResponse.json({ 
      success: true,
      preview: {
        templateId,
        templateName: template.name,
        channel: template.channel,
        originalContent: template.content,
        renderedContent: previewContent,
        variables: template.variables,
        sampleData: body.sampleData,
      }
    })
  } catch (error) {
    console.error('Error previewing template:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to preview template' },
      { status: 500 }
    )
  }
}