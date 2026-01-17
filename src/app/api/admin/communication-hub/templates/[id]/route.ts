/**
 * Communication Hub Individual Template API Route
 * Requirements: 5.1, 5.6, 5.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { templateManagementService } from '@/services/hub-template.service'
import { UpdateTemplateInput, MessageChannel } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/templates/[id]
 * Fetches a specific template by ID
 * Only accessible by Super Admin role
 * Requirements: 5.1
 */
export async function GET(
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

    // Get the template
    const template = await templateManagementService.getTemplate(templateId)

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/communication-hub/templates/[id]
 * Updates a specific template
 * Only accessible by Super Admin role
 * Requirements: 5.1, 5.3, 5.4
 */
export async function PUT(
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
    const updates: UpdateTemplateInput = await request.json()

    // Validate updates
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Template name cannot be empty' 
        }, { status: 400 })
      }
      if (updates.name.length > 100) {
        return NextResponse.json({ 
          error: 'Template name must be 100 characters or less' 
        }, { status: 400 })
      }
    }

    if (updates.content !== undefined) {
      if (!updates.content || updates.content.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Template content cannot be empty' 
        }, { status: 400 })
      }

      // Get current template to check channel for content length validation
      const currentTemplate = await templateManagementService.getTemplate(templateId)
      const maxContentLength = {
        [MessageChannel.SMS]: 1600,
        [MessageChannel.WHATSAPP]: 4096,
        [MessageChannel.EMAIL]: 50000,
      }

      if (updates.content.length > maxContentLength[currentTemplate.channel]) {
        return NextResponse.json({ 
          error: `Template content exceeds maximum length for ${currentTemplate.channel} (${maxContentLength[currentTemplate.channel]} characters)` 
        }, { status: 400 })
      }
    }

    // Update the template
    const template = await templateManagementService.updateTemplate(templateId, {
      name: updates.name?.trim(),
      content: updates.content?.trim(),
      isMandatory: updates.isMandatory,
    })

    return NextResponse.json({ 
      success: true, 
      template,
      message: 'Template updated successfully' 
    })
  } catch (error) {
    console.error('Error updating template:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/communication-hub/templates/[id]
 * Deletes a specific template
 * Only accessible by Super Admin role
 * Requirements: 5.1
 */
export async function DELETE(
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

    // For now, we'll return an error since template deletion might be dangerous
    // In a full implementation, you might want to soft-delete or archive templates
    return NextResponse.json({ 
      error: 'Template deletion is not supported. Templates can be marked as inactive instead.' 
    }, { status: 405 })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/communication-hub/templates/[id]
 * Updates template assignments or mandatory status
 * Only accessible by Super Admin role
 * Requirements: 5.6, 5.7
 */
export async function PATCH(
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

    // Handle school assignments
    if (body.assignedSchools !== undefined) {
      if (!Array.isArray(body.assignedSchools)) {
        return NextResponse.json({ 
          error: 'assignedSchools must be an array' 
        }, { status: 400 })
      }

      await templateManagementService.assignTemplateToSchools(templateId, body.assignedSchools)
    }

    // Handle mandatory status
    if (body.isMandatory !== undefined) {
      if (typeof body.isMandatory !== 'boolean') {
        return NextResponse.json({ 
          error: 'isMandatory must be a boolean' 
        }, { status: 400 })
      }

      await templateManagementService.setTemplateMandatory(templateId, body.isMandatory)
    }

    // Get updated template
    const template = await templateManagementService.getTemplate(templateId)

    return NextResponse.json({ 
      success: true, 
      template,
      message: 'Template assignments updated successfully' 
    })
  } catch (error) {
    console.error('Error updating template assignments:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to update template assignments' },
      { status: 500 }
    )
  }
}