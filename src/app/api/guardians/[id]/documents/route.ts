/**
 * Guardian Documents API Route
 * GET: Return documents for guardian
 * POST: Upload document to guardian profile
 * Requirements: 7.1, 7.4 - Guardian document management
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, GuardianDocumentType } from '@/types/enums'
import { canRead, canWrite, RoleAccessError } from '@/lib/rbac'
import { TenantIsolationError } from '@/services/tenant-isolation.service'
import { guardianDocumentService } from '@/services/guardian-document.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^[a-fA-F0-9]{24}$/.test(id)
}

/**
 * GET: Get documents for a guardian
 * Requirement 7.4: Allow downloading and viewing attached documents
 */
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
    const userRole = session.user.role as Role

    // Check role-based access
    if (!canRead(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to guardian documents' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Invalid guardian ID format' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('documentType') as GuardianDocumentType | null
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))

    // Verify guardian belongs to school (tenant isolation)
    const guardian = await prisma.guardian.findFirst({
      where: {
        id,
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

    // Get documents using service - Requirement 7.4
    const documents = await guardianDocumentService.getDocuments(id, {
      documentType: documentType || undefined,
      limit,
      offset,
    })

    // Get document summary
    const summary = await guardianDocumentService.getDocumentSummary(id)

    return NextResponse.json({
      guardianId: id,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      totalCount: summary.totalCount,
      byType: summary.byType,
      documents: documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt,
      })),
    })
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
        { error: 'GUARDIAN_NOT_FOUND', message: error.message },
        { status: 404 }
      )
    }
    console.error('Error fetching guardian documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

/**
 * POST: Upload document to guardian profile
 * Requirement 7.1: Allow uploading documents to guardian profiles
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
        { error: 'Forbidden', message: 'Your role does not have permission to upload documents' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Invalid guardian ID format' },
        { status: 400 }
      )
    }

    // Verify guardian belongs to school (tenant isolation)
    const guardian = await prisma.guardian.findFirst({
      where: {
        id,
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

    const body = await request.json()

    // Validate required fields
    if (!body.documentType) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'Document type is required' },
        { status: 400 }
      )
    }

    if (!body.fileName) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'File name is required' },
        { status: 400 }
      )
    }

    if (!body.fileUrl) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'File URL is required' },
        { status: 400 }
      )
    }

    if (!body.fileSize || body.fileSize <= 0) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'Valid file size is required' },
        { status: 400 }
      )
    }

    if (!body.mimeType) {
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: 'MIME type is required' },
        { status: 400 }
      )
    }

    // Get IP address for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      undefined

    // Upload document using service - Requirement 7.1
    const result = await guardianDocumentService.uploadDocument({
      guardianId: id,
      documentType: body.documentType as GuardianDocumentType,
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      uploadedBy: userId,
    }, ipAddress ?? undefined)

    if (!result.success) {
      // Check for file restriction errors
      if (result.error?.includes('File type') || result.error?.includes('File size')) {
        return NextResponse.json(
          { error: 'GUARDIAN_DOCUMENT_TOO_LARGE', message: result.error },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'GUARDIAN_VALIDATION_ERROR', message: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.document, { status: 201 })
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
    console.error('Error uploading guardian document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}
