/**
 * Guardian Document Management API
 * DELETE - Delete guardian document
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: guardianId, documentId } = await params
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    // Verify guardian belongs to school
    const guardian = await prisma.guardian.findFirst({
      where: {
        id: guardianId,
        schoolId,
      },
    })

    if (!guardian) {
      return NextResponse.json({ error: 'Guardian not found' }, { status: 404 })
    }

    // Find the document
    const document = await prisma.guardianDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        guardianId: true,
        schoolId: true,
        fileName: true,
        fileUrl: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify document belongs to guardian and school
    if (document.guardianId !== guardianId || document.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // TODO: Delete file from storage service
    // Example with ImageKit:
    // const fileId = extractFileIdFromUrl(document.fileUrl)
    // await imagekit.deleteFile(fileId)

    // Delete the document record
    await prisma.guardianDocument.delete({
      where: { id: documentId },
    })

    // Log the action
    await prisma.guardianAuditLog.create({
      data: {
        schoolId,
        guardianId,
        action: 'DOCUMENT_DELETED',
        field: 'documents',
        previousValue: document.fileName,
        newValue: null,
        performedBy: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      deletedFile: document.fileName,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/guardians/[id]/documents/[documentId] - DELETE - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete document', details: error.message },
      { status: 500 }
    )
  }
}
