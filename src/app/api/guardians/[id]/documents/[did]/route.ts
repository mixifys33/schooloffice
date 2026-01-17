/**
 * Individual Guardian Document API Route
 * DELETE: Delete document from guardian profile
 * Requirements: 7.4 - Guardian document management
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { canWrite, RoleAccessError } from '@/lib/rbac'
import { TenantIsolationError } from '@/services/tenant-isolation.service'
import { guardianDocumentService } from '@/services/guardian-document.service'

interface RouteParams {
  params: Promise<{ id: string; did: string }>
}

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^[a-fA-F0-9]{24}$/.test(id)
}

/**
 * DELETE: Delete document from guardian profile
 * Requirement 7.4: Allow managing attached documents
 */
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
    const userRole = session.user.role as Role
    const userId = session.user.id as string

    // Check role-based access
    if (!canWrite(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to delete documents' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id: guardianId, did: documentId } = await params

    // Validate ObjectId formats
    if (!isValidObjectId(guardianId)) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Invalid guardian ID format' },
        { status: 400 }
      )
    }

    if (!isValidObjectId(documentId)) {
      return NextResponse.json(
        { error: 'Document not found', message: 'Invalid document ID format' },
        { status: 400 }
      )
    }

    // Verify guardian belongs to school (tenant isolation)
    const guardian = await prisma.guardian.findFirst({
      where: {
        id: guardianId,
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
      },
    })

    if (!guardian) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Guardian not found' },
        { status: 404 }
      )
    }

    // Verify document belongs to this guardian
    const document = await guardianDocumentService.getDocumentById(documentId)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found', message: 'Document not found' },
        { status: 404 }
      )
    }

    if (document.guardianId !== guardianId) {
      return NextResponse.json(
        { error: 'Document not found', message: 'Document does not belong to this guardian' },
        { status: 404 }
      )
    }

    // Get IP address for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      undefined

    // Delete document using service - Requirement 7.4
    await guardianDocumentService.deleteDocument(documentId, userId, ipAddress ?? undefined)

    return NextResponse.json({ success: true, message: 'Document deleted successfully' })
  } catch (error) {
    if (error instanceof RoleAccessError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: error.statusCode }
      )
    }
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Document not found', message: error.message },
        { status: 404 }
      )
    }
    console.error('Error deleting guardian document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
