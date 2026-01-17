/**
 * Teacher Documents API Route
 * Requirements: 7.1-7.7
 * 
 * Implements document management for teachers:
 * - GET: List documents for a teacher
 * - POST: Upload a new document
 * - DELETE: Remove a document (admin only)
 * 
 * Core principle: Documents are preserved even after teacher leaves.
 * Only admin roles can access teacher documents.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { TeacherDocumentType } from '@/types/teacher'
import { 
  teacherDocumentService,
  TeacherDocumentAccessDeniedError,
  TeacherNotFoundError,
} from '@/services/teacher-document.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { 
  canViewTeacherDocuments, 
  canDeleteTeacherDocuments,
  createTeacherManagementAuditEntry,
} from '@/lib/rbac'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET: List documents for a teacher
 * Requirements 7.6, 7.7: Admin-only access, documents preserved on status change
 * 
 * Query params:
 * - type: Optional filter by document type
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
    const userRole = session.user.role as string
    const userId = session.user.id as string
    const userName = session.user.name || 'Unknown'

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC
    if (!canViewTeacherDocuments(userRole)) {
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'list_teacher_documents',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF_DOCUMENT,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to teacher documents' },
        { status: 403 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('type') as TeacherDocumentType | null

    const context = {
      userId,
      userName,
      userRole,
      schoolId,
    }

    let documents
    if (documentType && Object.values(TeacherDocumentType).includes(documentType)) {
      documents = await teacherDocumentService.getDocumentsByType(id, documentType, context)
    } else {
      documents = await teacherDocumentService.getDocuments(id, context)
    }

    return NextResponse.json({
      teacherId: id,
      documents,
      count: documents.length,
    })
  } catch (error) {
    if (error instanceof TeacherDocumentAccessDeniedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    if (error instanceof TeacherNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    console.error('Error fetching teacher documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}


/**
 * POST: Upload a document for a teacher
 * Requirements 7.1-7.5: Document upload with categorization via ImageKit
 * 
 * Request body:
 * {
 *   documentType: "APPOINTMENT_LETTER" | "CERTIFICATE" | "NATIONAL_ID" | "CONTRACT" | "OTHER",
 *   fileName: string,
 *   fileUrl: string,  // ImageKit URL
 *   fileSize: number,
 *   mimeType: string
 * }
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
    const userRole = session.user.role as string
    const userId = session.user.id as string
    const userName = session.user.name || 'Unknown'

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC
    if (!canViewTeacherDocuments(userRole)) {
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'upload_teacher_document',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF_DOCUMENT,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to upload teacher documents' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { documentType, fileName, fileUrl, fileSize, mimeType } = body

    // Validate required fields
    if (!documentType) {
      return NextResponse.json(
        { error: 'Document type is required', field: 'documentType' },
        { status: 400 }
      )
    }

    if (!Object.values(TeacherDocumentType).includes(documentType)) {
      return NextResponse.json(
        { 
          error: 'Invalid document type', 
          field: 'documentType',
          validValues: Object.values(TeacherDocumentType),
        },
        { status: 400 }
      )
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json(
        { error: 'File name is required', field: 'fileName' },
        { status: 400 }
      )
    }

    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json(
        { error: 'File URL is required', field: 'fileUrl' },
        { status: 400 }
      )
    }

    if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
      return NextResponse.json(
        { error: 'Valid file size is required', field: 'fileSize' },
        { status: 400 }
      )
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return NextResponse.json(
        { error: 'MIME type is required', field: 'mimeType' },
        { status: 400 }
      )
    }

    const context = {
      userId,
      userName,
      userRole,
      schoolId,
    }

    const document = await teacherDocumentService.uploadDocument(
      {
        teacherId: id,
        documentType,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        uploadedBy: userId,
      },
      context
    )

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    if (error instanceof TeacherDocumentAccessDeniedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    if (error instanceof TeacherNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.error('Error uploading teacher document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Remove a document
 * Requirement 7.6: Only SCHOOL_ADMIN can delete documents
 * 
 * Query params:
 * - documentId: The ID of the document to delete
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
    const userRole = session.user.role as string
    const userId = session.user.id as string
    const userName = session.user.name || 'Unknown'

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Only SCHOOL_ADMIN can delete documents using RBAC
    if (!canDeleteTeacherDocuments(userRole)) {
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'delete_teacher_document',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF_DOCUMENT,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Only school administrators can delete teacher documents' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required', field: 'documentId' },
        { status: 400 }
      )
    }

    const context = {
      userId,
      userName,
      userRole,
      schoolId,
    }

    await teacherDocumentService.deleteDocument(documentId, context)

    return NextResponse.json({ 
      success: true, 
      message: 'Document deleted successfully' 
    })
  } catch (error) {
    if (error instanceof TeacherDocumentAccessDeniedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.name === 'TeacherDocumentNotFoundError') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    console.error('Error deleting teacher document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
