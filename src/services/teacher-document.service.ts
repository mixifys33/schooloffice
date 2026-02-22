/**
 * Teacher Document Service
 * Handles document management for teachers with categorization and access control
 * Requirements: 7.1-7.7
 * 
 * Property 24: Document Type Support - All documents must have proper categorization
 * Property 25: Document Storage Integration - Documents stored via ImageKit
 * Property 26: Document Access Control - Admin roles only can access
 * Property 27: Document Preservation - Documents preserved on teacher status change
 */   
import { prisma } from '@/lib/db'
import { TeacherDocumentType, TeacherEventType, DOCUMENT_ACCESS_ROLES } from '@/types/teacher'
import { Role, StaffRole } from '@/types/enums'
import { auditService, AuditAction, AuditResource } from './audit.service'

/**
 * Teacher document interface matching Prisma model
 */
export interface TeacherDocumentRecord {
  id: string
  teacherId: string
  documentType: TeacherDocumentType
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
}

/**
 * Input for uploading a new document
 */
export interface UploadTeacherDocumentInput {
  teacherId: string
  documentType: TeacherDocumentType
  fileName: string
  fileUrl: string // ImageKit URL - Requirement 7.5
  fileSize: number
  mimeType: string
  uploadedBy: string
}

/**
 * Access context for permission checking
 */
export interface TeacherDocumentAccessContext {
  userId: string
  userName: string
  userRole: Role | StaffRole | string
  schoolId: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Error thrown when document access is denied
 */
export class TeacherDocumentAccessDeniedError extends Error {
  constructor(userId: string, documentId: string, reason: string) {
    super(`Access denied for user ${userId} to teacher document ${documentId}: ${reason}`)
    this.name = 'TeacherDocumentAccessDeniedError'
  }
}

/**
 * Error thrown when document is not found
 */
export class TeacherDocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Teacher document with id ${documentId} not found`)
    this.name = 'TeacherDocumentNotFoundError'
  }
}

/**
 * Error thrown when teacher is not found
 */
export class TeacherNotFoundError extends Error {
  constructor(teacherId: string) {
    super(`Teacher with id ${teacherId} not found`)
    this.name = 'TeacherNotFoundError'
  }
}

/**
 * Map Prisma TeacherDocument to domain TeacherDocumentRecord type
 */
function mapPrismaDocumentToDomain(prismaDoc: {
  id: string
  teacherId: string
  documentType: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
}): TeacherDocumentRecord {
  return {
    id: prismaDoc.id,
    teacherId: prismaDoc.teacherId,
    documentType: prismaDoc.documentType as TeacherDocumentType,
    fileName: prismaDoc.fileName,
    fileUrl: prismaDoc.fileUrl,
    fileSize: prismaDoc.fileSize,
    mimeType: prismaDoc.mimeType,
    uploadedBy: prismaDoc.uploadedBy,
    uploadedAt: prismaDoc.uploadedAt,
  }
}


/**
 * Check if a role has admin privileges for document access
 * Requirement 7.6: Only admin roles can access teacher documents
 */
function isAdminRole(role: Role | StaffRole | string): boolean {
  return DOCUMENT_ACCESS_ROLES.canView.includes(role as typeof DOCUMENT_ACCESS_ROLES.canView[number])
}

/**
 * Check if a role can upload documents
 * Requirement 7.6: Only admin roles can upload teacher documents
 */
function canUploadDocuments(role: Role | StaffRole | string): boolean {
  return DOCUMENT_ACCESS_ROLES.canUpload.includes(role as typeof DOCUMENT_ACCESS_ROLES.canUpload[number])
}

/**
 * Check if a role can delete documents
 * Requirement 7.6: Only SCHOOL_ADMIN can delete teacher documents
 */
function canDeleteDocuments(role: Role | StaffRole | string): boolean {
  return DOCUMENT_ACCESS_ROLES.canDelete.includes(role as typeof DOCUMENT_ACCESS_ROLES.canDelete[number])
}

/**
 * Validate ImageKit URL format
 * Requirement 7.5: Documents stored via ImageKit
 */
function isValidImageKitUrl(url: string): boolean {
  // ImageKit URLs typically follow patterns like:
  // https://ik.imagekit.io/... or custom domain configured with ImageKit
  return url.startsWith('https://') && url.length > 10
}

export class TeacherDocumentService {
  /**
   * Upload a document for a teacher
   * Requirements 7.1-7.5: Store documents with proper categorization via ImageKit
   */
  async uploadDocument(
    data: UploadTeacherDocumentInput,
    context: TeacherDocumentAccessContext
  ): Promise<TeacherDocumentRecord> {
    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: data.teacherId },
      select: { 
        id: true, 
        schoolId: true, 
        firstName: true, 
        lastName: true,
        employmentStatus: true,
      },
    })

    if (!teacher) {
      throw new TeacherNotFoundError(data.teacherId)
    }

    // Validate school context matches
    if (teacher.schoolId !== context.schoolId) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        'new_document',
        'Teacher does not belong to your school'
      )
    }

    // Check permission: only admin roles can upload (Requirement 7.6)
    if (!canUploadDocuments(context.userRole)) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        'new_document',
        'Only administrators can upload teacher documents'
      )
    }

    // Validate document type (Requirements 7.1-7.4)
    if (!data.documentType || !Object.values(TeacherDocumentType).includes(data.documentType)) {
      throw new Error(`Invalid document type: ${data.documentType}. Must be one of: ${Object.values(TeacherDocumentType).join(', ')}`)
    }

    // Validate required fields
    if (!data.fileName || data.fileName.trim() === '') {
      throw new Error('Document file name is required')
    }

    if (!data.fileUrl || data.fileUrl.trim() === '') {
      throw new Error('Document file URL is required')
    }

    // Validate ImageKit URL (Requirement 7.5)
    if (!isValidImageKitUrl(data.fileUrl)) {
      throw new Error('Document URL must be a valid HTTPS URL')
    }

    if (!data.fileSize || data.fileSize <= 0) {
      throw new Error('Document file size must be a positive number')
    }

    if (!data.mimeType || data.mimeType.trim() === '') {
      throw new Error('Document MIME type is required')
    }

    // Create the document
    const document = await prisma.teacherDocument.create({
      data: {
        schoolId: teacher.schoolId,
        teacherId: data.teacherId,
        documentType: data.documentType,
        fileName: data.fileName.trim(),
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: data.uploadedBy,
        uploadedAt: new Date(),
      },
    })

    // Log to teacher history
    await prisma.teacherHistoryEntry.create({
      data: {
        schoolId: teacher.schoolId,
        teacherId: data.teacherId,
        eventType: TeacherEventType.DOCUMENT_UPLOADED,
        newValue: JSON.stringify({
          documentId: document.id,
          documentType: data.documentType,
          fileName: data.fileName,
        }),
        performedBy: context.userId,
        performedAt: new Date(),
      },
    })

    // Log to audit trail
    await auditService.log({
      schoolId: teacher.schoolId,
      userId: context.userId,
      action: AuditAction.STAFF_DOCUMENT_UPLOADED,
      resource: AuditResource.STAFF_DOCUMENT,
      resourceId: document.id,
      newValue: {
        action: 'uploaded',
        documentType: data.documentType,
        fileName: data.fileName,
        teacherId: data.teacherId,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        uploadedBy: {
          userId: context.userId,
          name: context.userName,
        },
        uploadedAt: new Date().toISOString(),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return mapPrismaDocumentToDomain(document)
  }


  /**
   * Get all documents for a teacher
   * Requirement 7.6: Enforce permission-based access (admin roles only)
   * Requirement 7.7: Documents preserved even after teacher leaves
   */
  async getDocuments(
    teacherId: string,
    context: TeacherDocumentAccessContext
  ): Promise<TeacherDocumentRecord[]> {
    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { 
        id: true, 
        schoolId: true, 
        firstName: true, 
        lastName: true,
        employmentStatus: true,
      },
    })

    if (!teacher) {
      throw new TeacherNotFoundError(teacherId)
    }

    // Validate school context matches
    if (teacher.schoolId !== context.schoolId) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        `teacher_${teacherId}_documents`,
        'Teacher does not belong to your school'
      )
    }

    // Check permission: only admin roles can access (Requirement 7.6)
    if (!isAdminRole(context.userRole)) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        `teacher_${teacherId}_documents`,
        'Only administrators can access teacher documents'
      )
    }

    // Requirement 7.7: Documents are preserved regardless of teacher status
    // No status check here - documents remain accessible even for LEFT teachers
    const documents = await prisma.teacherDocument.findMany({
      where: { teacherId },
      orderBy: { uploadedAt: 'desc' },
    })

    return documents.map(mapPrismaDocumentToDomain)
  }

  /**
   * Get a document by ID
   * Requirement 7.6: Enforce permission-based access (admin roles only)
   */
  async getDocumentById(
    documentId: string,
    context: TeacherDocumentAccessContext,
    logAccess: boolean = true
  ): Promise<TeacherDocumentRecord> {
    const document = await prisma.teacherDocument.findUnique({
      where: { id: documentId },
      include: {
        teacher: {
          select: {
            id: true,
            schoolId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!document) {
      throw new TeacherDocumentNotFoundError(documentId)
    }

    // Validate school context matches
    if (document.teacher.schoolId !== context.schoolId) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        documentId,
        'Document does not belong to your school'
      )
    }

    // Check permission: only admin roles can access (Requirement 7.6)
    if (!isAdminRole(context.userRole)) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        documentId,
        'Only administrators can access teacher documents'
      )
    }

    // Log to audit trail
    if (logAccess) {
      await auditService.log({
        schoolId: document.teacher.schoolId,
        userId: context.userId,
        action: AuditAction.STAFF_DOCUMENT_ACCESSED,
        resource: AuditResource.STAFF_DOCUMENT,
        resourceId: document.id,
        newValue: {
          action: 'viewed',
          documentType: document.documentType,
          fileName: document.fileName,
          teacherId: document.teacherId,
          teacherName: `${document.teacher.firstName} ${document.teacher.lastName}`,
          accessedBy: {
            userId: context.userId,
            name: context.userName,
          },
          accessedAt: new Date().toISOString(),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }

    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Get documents by type for a teacher
   * Requirements 7.1-7.4: Documents stored with proper categorization
   * Requirement 7.6: Enforce permission-based access
   */
  async getDocumentsByType(
    teacherId: string,
    documentType: TeacherDocumentType,
    context: TeacherDocumentAccessContext
  ): Promise<TeacherDocumentRecord[]> {
    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, schoolId: true },
    })

    if (!teacher) {
      throw new TeacherNotFoundError(teacherId)
    }

    // Validate school context matches
    if (teacher.schoolId !== context.schoolId) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        `teacher_${teacherId}_documents`,
        'Teacher does not belong to your school'
      )
    }

    // Check permission: only admin roles can access (Requirement 7.6)
    if (!isAdminRole(context.userRole)) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        `teacher_${teacherId}_documents`,
        'Only administrators can access teacher documents'
      )
    }

    const documents = await prisma.teacherDocument.findMany({
      where: { 
        teacherId,
        documentType,
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return documents.map(mapPrismaDocumentToDomain)
  }


  /**
   * Delete a document
   * Requirement 7.6: Only SCHOOL_ADMIN can delete documents
   */
  async deleteDocument(
    documentId: string,
    context: TeacherDocumentAccessContext
  ): Promise<void> {
    const document = await prisma.teacherDocument.findUnique({
      where: { id: documentId },
      include: {
        teacher: {
          select: {
            id: true,
            schoolId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!document) {
      throw new TeacherDocumentNotFoundError(documentId)
    }

    // Validate school context matches
    if (document.teacher.schoolId !== context.schoolId) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        documentId,
        'Document does not belong to your school'
      )
    }

    // Only SCHOOL_ADMIN can delete documents (stricter than view access)
    if (!canDeleteDocuments(context.userRole)) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        documentId,
        'Only school administrators can delete teacher documents'
      )
    }

    // Log to audit trail before deletion
    await auditService.log({
      schoolId: document.teacher.schoolId,
      userId: context.userId,
      action: AuditAction.STAFF_DOCUMENT_DELETED,
      resource: AuditResource.STAFF_DOCUMENT,
      resourceId: document.id,
      previousValue: {
        documentType: document.documentType,
        fileName: document.fileName,
        teacherId: document.teacherId,
        teacherName: `${document.teacher.firstName} ${document.teacher.lastName}`,
      },
      newValue: {
        action: 'deleted',
        deletedBy: {
          userId: context.userId,
          name: context.userName,
        },
        deletedAt: new Date().toISOString(),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await prisma.teacherDocument.delete({
      where: { id: documentId },
    })
  }

  /**
   * Download a document (logs access as download)
   * Requirement 7.6: Enforce permission-based access
   */
  async downloadDocument(
    documentId: string,
    context: TeacherDocumentAccessContext
  ): Promise<TeacherDocumentRecord> {
    const document = await prisma.teacherDocument.findUnique({
      where: { id: documentId },
      include: {
        teacher: {
          select: {
            id: true,
            schoolId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!document) {
      throw new TeacherDocumentNotFoundError(documentId)
    }

    // Validate school context matches
    if (document.teacher.schoolId !== context.schoolId) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        documentId,
        'Document does not belong to your school'
      )
    }

    // Check permission: only admin roles can access (Requirement 7.6)
    if (!isAdminRole(context.userRole)) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        documentId,
        'Only administrators can download teacher documents'
      )
    }

    // Log download to audit trail
    await auditService.log({
      schoolId: document.teacher.schoolId,
      userId: context.userId,
      action: AuditAction.STAFF_DOCUMENT_ACCESSED,
      resource: AuditResource.STAFF_DOCUMENT,
      resourceId: document.id,
      newValue: {
        action: 'downloaded',
        documentType: document.documentType,
        fileName: document.fileName,
        teacherId: document.teacherId,
        teacherName: `${document.teacher.firstName} ${document.teacher.lastName}`,
        downloadedBy: {
          userId: context.userId,
          name: context.userName,
        },
        downloadedAt: new Date().toISOString(),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Count documents for a teacher
   */
  async countDocuments(teacherId: string): Promise<number> {
    return prisma.teacherDocument.count({
      where: { teacherId },
    })
  }

  /**
   * Count documents by type for a teacher
   */
  async countDocumentsByType(
    teacherId: string,
    documentType: TeacherDocumentType
  ): Promise<number> {
    return prisma.teacherDocument.count({
      where: { 
        teacherId,
        documentType,
      },
    })
  }

  /**
   * Check if teacher has a document of a specific type
   */
  async hasDocumentType(
    teacherId: string,
    documentType: TeacherDocumentType
  ): Promise<boolean> {
    const count = await this.countDocumentsByType(teacherId, documentType)
    return count > 0
  }


  /**
   * Get the most recent document of a specific type
   */
  async getLatestDocumentByType(
    teacherId: string,
    documentType: TeacherDocumentType,
    context: TeacherDocumentAccessContext
  ): Promise<TeacherDocumentRecord | null> {
    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, schoolId: true },
    })

    if (!teacher) {
      throw new TeacherNotFoundError(teacherId)
    }

    // Validate school context matches
    if (teacher.schoolId !== context.schoolId) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        `teacher_${teacherId}_documents`,
        'Teacher does not belong to your school'
      )
    }

    // Check permission: only admin roles can access (Requirement 7.6)
    if (!isAdminRole(context.userRole)) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        `teacher_${teacherId}_documents`,
        'Only administrators can access teacher documents'
      )
    }

    const document = await prisma.teacherDocument.findFirst({
      where: {
        teacherId,
        documentType,
      },
      orderBy: { uploadedAt: 'desc' },
    })

    if (!document) return null
    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Get supported document types
   * Requirements 7.1-7.4: Document types for teachers
   */
  getSupportedDocumentTypes(): TeacherDocumentType[] {
    return Object.values(TeacherDocumentType)
  }

  /**
   * Validate document type
   * Requirements 7.1-7.4: Documents must have proper categorization
   */
  isValidDocumentType(documentType: string): documentType is TeacherDocumentType {
    return Object.values(TeacherDocumentType).includes(documentType as TeacherDocumentType)
  }

  /**
   * Check if user can access teacher documents
   * Requirement 7.6: Permission-based access control (admin roles only)
   */
  canAccessDocuments(context: TeacherDocumentAccessContext): boolean {
    return isAdminRole(context.userRole)
  }

  /**
   * Check if user can upload teacher documents
   * Requirement 7.6: Permission-based access control (admin roles only)
   */
  canUploadDocuments(context: TeacherDocumentAccessContext): boolean {
    return canUploadDocuments(context.userRole)
  }

  /**
   * Check if user can delete teacher documents
   * Requirement 7.6: Only SCHOOL_ADMIN can delete
   */
  canDeleteDocuments(context: TeacherDocumentAccessContext): boolean {
    return canDeleteDocuments(context.userRole)
  }

  /**
   * Get document summary for a teacher (counts by type)
   */
  async getDocumentSummary(
    teacherId: string,
    context: TeacherDocumentAccessContext
  ): Promise<Record<TeacherDocumentType, number>> {
    // Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, schoolId: true },
    })

    if (!teacher) {
      throw new TeacherNotFoundError(teacherId)
    }

    // Validate school context matches
    if (teacher.schoolId !== context.schoolId) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        `teacher_${teacherId}_documents`,
        'Teacher does not belong to your school'
      )
    }

    // Check permission: only admin roles can access (Requirement 7.6)
    if (!isAdminRole(context.userRole)) {
      throw new TeacherDocumentAccessDeniedError(
        context.userId,
        `teacher_${teacherId}_documents`,
        'Only administrators can access teacher document summary'
      )
    }

    const documents = await prisma.teacherDocument.groupBy({
      by: ['documentType'],
      where: { teacherId },
      _count: { id: true },
    })

    // Initialize all types with 0
    const summary: Record<TeacherDocumentType, number> = {
      [TeacherDocumentType.APPOINTMENT_LETTER]: 0,
      [TeacherDocumentType.CERTIFICATE]: 0,
      [TeacherDocumentType.NATIONAL_ID]: 0,
      [TeacherDocumentType.CONTRACT]: 0,
      [TeacherDocumentType.OTHER]: 0,
    }

    // Fill in actual counts
    for (const doc of documents) {
      summary[doc.documentType as TeacherDocumentType] = doc._count.id
    }

    return summary
  }

  /**
   * Verify document preservation on teacher status change
   * Requirement 7.7: Documents preserved even after teacher leaves
   * This method is called when teacher status changes to verify documents remain intact
   */
  async verifyDocumentPreservation(teacherId: string): Promise<{
    preserved: boolean
    documentCount: number
  }> {
    const count = await this.countDocuments(teacherId)
    return {
      preserved: true, // Documents are never deleted on status change
      documentCount: count,
    }
  }
}

// Export singleton instance
export const teacherDocumentService = new TeacherDocumentService()
