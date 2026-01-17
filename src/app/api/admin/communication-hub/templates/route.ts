/**
 * Communication Hub Templates API Route
 * Requirements: 5.1-5.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { templateManagementService } from '@/services/hub-template.service'
import { CreateTemplateInput, TemplateFilters, MessageChannel } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/templates
 * Fetches templates with optional filtering
 * Only accessible by Super Admin role
 * Requirements: 5.1
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    
    // Build filters from query parameters
    const filters: TemplateFilters = {}

    // Channel filter
    const channel = searchParams.get('channel')
    if (channel && Object.values(MessageChannel).includes(channel as MessageChannel)) {
      filters.channel = channel as MessageChannel
    }

    // Mandatory filter
    const isMandatory = searchParams.get('isMandatory')
    if (isMandatory !== null) {
      filters.isMandatory = isMandatory === 'true'
    }

    // Search query
    const searchQuery = searchParams.get('search')
    if (searchQuery) {
      filters.searchQuery = searchQuery
    }

    // Get templates with filters
    const templates = await templateManagementService.listTemplates(filters)

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/communication-hub/templates
 * Creates a new template
 * Only accessible by Super Admin role
 * Requirements: 5.1
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const templateData: CreateTemplateInput = await request.json()

    // Validate required fields
    if (!templateData.name || templateData.name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Template name is required' 
      }, { status: 400 })
    }

    if (!templateData.channel) {
      return NextResponse.json({ 
        error: 'Template channel is required' 
      }, { status: 400 })
    }

    if (!Object.values(MessageChannel).includes(templateData.channel)) {
      return NextResponse.json({ 
        error: 'Invalid channel. Must be SMS, WHATSAPP, or EMAIL' 
      }, { status: 400 })
    }

    if (!templateData.content || templateData.content.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Template content is required' 
      }, { status: 400 })
    }

    // Validate template name length
    if (templateData.name.length > 100) {
      return NextResponse.json({ 
        error: 'Template name must be 100 characters or less' 
      }, { status: 400 })
    }

    // Validate content length based on channel
    const maxContentLength = {
      [MessageChannel.SMS]: 1600, // SMS limit
      [MessageChannel.WHATSAPP]: 4096, // WhatsApp limit
      [MessageChannel.EMAIL]: 50000, // Email limit
    }

    if (templateData.content.length > maxContentLength[templateData.channel]) {
      return NextResponse.json({ 
        error: `Template content exceeds maximum length for ${templateData.channel} (${maxContentLength[templateData.channel]} characters)` 
      }, { status: 400 })
    }

    // Create the template
    const template = await templateManagementService.createTemplate({
      name: templateData.name.trim(),
      channel: templateData.channel,
      content: templateData.content.trim(),
      isMandatory: templateData.isMandatory || false,
    })

    return NextResponse.json({ 
      success: true, 
      template,
      message: 'Template created successfully' 
    })
  } catch (error) {
    console.error('Error creating template:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}