/**
 * School Assets API Route
 * 
 * Handles school document and asset management:
 * - GET: List all school assets
 * - POST: Upload a new asset
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'

export async function GET(request: NextRequest) {
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const assetType = searchParams.get('type')

    const whereClause: Record<string, unknown> = { schoolId }
    if (assetType) {
      whereClause.assetType = assetType
    }

    const assets = await prisma.schoolAsset.findMany({
      where: whereClause,
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Error fetching school assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { assetType, name, fileName, fileUrl, fileSize, fileId } = body

    // Validate required fields
    if (!assetType || !name || !fileName || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: assetType, name, fileName, fileUrl' },
        { status: 400 }
      )
    }

    // Determine MIME type from file extension
    const extension = fileName.split('.').pop()?.toLowerCase()
    const mimeTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
    const mimeType = mimeTypeMap[extension || ''] || 'application/octet-stream'

    // Create asset record
    const asset = await prisma.schoolAsset.create({
      data: {
        schoolId,
        assetType,
        name,
        fileName,
        fileUrl,
        fileSize: fileSize || 0,
        mimeType,
        fileId: fileId || null,
        uploadedBy: userId,
      },
    })

    // Log audit event
    await auditService.log({
      schoolId,
      userId,
      action: AuditAction.CREATE,
      resource: AuditResource.SCHOOL,
      resourceId: asset.id,
      newValue: {
        assetType,
        name,
        fileName,
        uploadedBy: userName,
      },
    })

    return NextResponse.json({
      id: asset.id,
      assetType: asset.assetType,
      name: asset.name,
      fileName: asset.fileName,
      fileUrl: asset.fileUrl,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      uploadedAt: asset.uploadedAt,
      uploadedBy: userName,
    })
  } catch (error) {
    console.error('Error creating school asset:', error)
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    )
  }
}
