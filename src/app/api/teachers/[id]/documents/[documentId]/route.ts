/**
 * Teacher Document Detail API Route
 * Requirements: 7.1-7.7
 * 
 * Handles individual document operations:
 * - GET: Get document details
 * - DELETE: Remove a document (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { 
  teacherDocumentService,
  TeacherDocumentAccessDeniedError,
  TeacherDocumentNotFoundError,
} from '@/services/teacher-document.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { 
  canViewTeacherDocuments, 
  canDeleteTeacherDocuments,
  createTeacherManagementAuditEntry,
} from '@/lib/rbac'

interface RouteParams {
  params: Promise<{ id: string; documentId: string }>
}

/**
 * GET: Get a specific document
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
    const userName = (session.user as { name?: string }).name || 'Unknown'

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC
    if (!canViewTeacherDocuments(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to teacher documents' },
        { status: 403 }
      )
    }

    const { documentId } = await params

    const context = {
      userId,
      userName,
      userRole,
      schoolId,
    }

    const document = await teacherDocumentService.getDocumentById(documentId, context)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    if (error instanceof TeacherDocumentAccessDeniedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error('Error fetching teacher document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Remove a document
 * Requirement 7.6: Only SCHOOL_ADMIN can delete documents
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
    const userName = (session.user as { name?: string }).name || 'Unknown'

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
        resourceId: 'unauthorized',
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Only school administrators can delete teacher documents' },
        { status: 403 }
      )
    }

    const { documentId } = await params

    const context = {
      userId,
      userName,
      userRole,
      schoolId,
    }

    // Get document first to check for ImageKit fileId
    const document = await teacherDocumentService.getDocumentById(documentId, context)
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete from database
    await teacherDocumentService.deleteDocument(documentId, context)

    // Try to delete from ImageKit if we have a fileId
    // Note: The document service doesn't store fileId, so we can't delete from ImageKit
    // This would need to be added to the TeacherDocument model

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

    if (error instanceof TeacherDocumentNotFoundError) {
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
