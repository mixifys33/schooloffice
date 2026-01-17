/**
 * Communication Hub Template Versions API Route
 * Requirements: 5.3, 5.4
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { templateManagementService } from '@/services/hub-template.service'

/**
 * GET /api/admin/communication-hub/templates/[id]/versions
 * Fetches version history for a specific template
 * Only accessible by Super Admin role
 * Requirements: 5.3, 5.4
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

    // Get template versions
    const versions = await templateManagementService.getTemplateVersions(templateId)

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching template versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template versions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/communication-hub/templates/[id]/versions
 * Reverts template to a specific version
 * Only accessible by Super Admin role
 * Requirements: 5.3, 5.4
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
    
    if (!body.versionId) {
      return NextResponse.json({ 
        error: 'versionId is required' 
      }, { status: 400 })
    }

    // Revert to the specified version
    const template = await templateManagementService.revertToVersion(templateId, body.versionId)

    return NextResponse.json({ 
      success: true, 
      template,
      message: `Template reverted to version ${template.version} successfully` 
    })
  } catch (error) {
    console.error('Error reverting template version:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ 
          error: error.message.includes('Version') ? 'Version not found' : 'Template not found' 
        }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to revert template version' },
      { status: 500 }
    )
  }
}