/**
 * School Asset Detail API Route
 * 
 * Handles individual asset operations:
 * - GET: Get asset details
 * - DELETE: Delete an asset
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { imagekitService } from '@/lib/imagekit'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id } = await params

    const asset = await prisma.schoolAsset.findFirst({
      where: {
        id,
        schoolId,
      },
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error('Error fetching school asset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id as string
    const userName = (session.user as { name?: string }).name || 'Unknown'

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Find the asset
    const asset = await prisma.schoolAsset.findFirst({
      where: {
        id,
        schoolId,
      },
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Delete from ImageKit if fileId exists
    if (asset.fileId && imagekitService.isConfigured()) {
      try {
        await imagekitService.deleteFile(asset.fileId)
      } catch (err) {
        console.warn('Failed to delete file from ImageKit:', err)
        // Continue with database deletion even if ImageKit deletion fails
      }
    }

    // Delete from database
    await prisma.schoolAsset.delete({
      where: { id },
    })

    // Log audit event
    await auditService.log({
      schoolId,
      userId,
      action: AuditAction.DELETE,
      resource: AuditResource.SCHOOL,
      resourceId: id,
      previousValue: {
        assetType: asset.assetType,
        name: asset.name,
        fileName: asset.fileName,
        deletedBy: userName,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting school asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
