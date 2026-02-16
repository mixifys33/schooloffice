/**
 * Staff Document Service
 * Handles document management for staff members with categorization and access control
 * Requirements: 14.1, 14.2, 14.3
 * 
 * Property 38: Document Categorization - All documents must have proper categorization
 * Property 39: Document Access Control - Permission-based access enforcement
 */   
import { prisma } from '@/lib/db'
import { StaffDocumentCategory, Role, StaffRole } from '@/types/enums'
import { auditService } from './audit.service'

/**
 * Staff document interface matching Prisma model
 */
export interface StaffDocument {
  id: string
  staffId: string
  category: StaffDocumentCategory
  fileName: string
  fileUrl: string
  fileSize?: number | null
  mimeType?: string | null
  uploadedBy: string
  uploadedAt: Date
  createdAt: Date
}

/**
 * Input for uploading a new document
 */
export interface UploadDocumentInput {
  staffId: string
  category: StaffDocumentCategory
  fileName: string
  fileUrl: string
  fileSize?: number
  mimeType?: string
  uploadedBy: string
}

/**
 * Access context for permission checking
 */
export interface DocumentAccessContext {
  userId: string
  userName: string
  userRole: Role | StaffRole
  staffId?: string // The staff ID of the accessing user (if they are staff)
  schoolId: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Error thrown when document access is denied
 */
export class DocumentAccessDeniedError extends Error {
  constructor(userId: string, documentId: string, reason: string) {
    super(`Access denied for user ${userId} to document ${documentId}: ${reason}`)
    this.name = 'DocumentAccessDeniedError'
  }
}

/**
 * Error thrown when document is not found
 */
export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document with id ${documentId} not found`)
    this.name = 'DocumentNotFoundError'
  }
}


/**
 * Map Prisma StaffDocument to domain StaffDocument type
 */
function mapPrismaDocumentToDomain(prismaDoc: {
  id: string
  staffId: string
  category: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  uploadedBy: string
  uploadedAt: Date
  createdAt: Date
}): StaffDocument {
  return {
    id: prismaDoc.id,
    staffId: prismaDoc.staffId,
    category: prismaDoc.category as StaffDocumentCategory,
    fileName: prismaDoc.fileName,
    fileUrl: prismaDoc.fileUrl,
    fileSize: prismaDoc.fileSize,
    mimeType: prismaDoc.mimeType,
    uploadedBy: prismaDoc.uploadedBy,
    uploadedAt: prismaDoc.uploadedAt,
    createdAt: prismaDoc.createdAt,
  }
}

/**
 * Check if a role has admin privileges for document access
 * Requirement 14.2: Only admin and document owner can access
 */
function isAdminRole(role: Role | StaffRole): boolean {
  return role === Role.SUPER_ADMIN || 
         role === Role.SCHOOL_ADMIN || 
         role === Role.DEPUTY
}

export class StaffDocumentService {
  /**
   * Upload a document for a staff member
   * Requirement 14.1: Store documents with proper categorization
   * Requirement 14.3: Log all document uploads to audit trail
   */
  async uploadDocument(
    data: UploadDocumentInput,
    context: DocumentAccessContext
  ): Promise<StaffDocument> {
    // Validate staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: { 
        id: true, 
        schoolId: true, 
        firstName: true, 
        lastName: true 
      },
    })

    if (!staff) {
      throw new Error(`Staff with id ${data.staffId} not found`)
    }

    // Validate category is provided (Requirement 14.1)
    if (!data.category || !Object.values(StaffDocumentCategory).includes(data.category)) {
      throw new Error(`Invalid document category: ${data.category}. Must be one of: ${Object.values(StaffDocumentCategory).join(', ')}`)
    }

    // Validate required fields
    if (!data.fileName || data.fileName.trim() === '') {
      throw new Error('Document file name is required')
    }

    if (!data.fileUrl || data.fileUrl.trim() === '') {
      throw new Error('Document file URL is required')
    }

    // Check permission: only admin or the staff member themselves can upload
    const canUpload = isAdminRole(context.userRole) || context.staffId === data.staffId
    if (!canUpload) {
      throw new DocumentAccessDeniedError(
        context.userId,
        'new_document',
        'Only administrators or the document owner can upload documents'
      )
    }

    // Create the document
    const document = await prisma.staffDocument.create({
      data: {
        staffId: data.staffId,
        schoolId: staff.schoolId,
        category: data.category,
        fileName: data.fileName.trim(),
        fileUrl: data.fileUrl,
        fileSize: data.fileSize ?? null,
        mimeType: data.mimeType ?? null,
        uploadedBy: data.uploadedBy,
        uploadedAt: new Date(),
      },
    })

    // Log to audit trail (Requirement 14.3)
    await auditService.log({
      schoolId: staff.schoolId,
      userId: context.userId,
      action: 'UPLOAD',
      resource: 'STAFF_DOCUMENT',
      resourceId: document.id,
      newValue: JSON.stringify({ fileName: data.fileName, category: data.category }),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return mapPrismaDocumentToDomain(document)
  }


  /**
   * Get all documents for a staff member
   * Requirement 14.2: Enforce permission-based access
   * Requirement 14.3: Log all document access to audit trail
   */
  async getDocuments(
    staffId: string,
    context: DocumentAccessContext
  ): Promise<StaffDocument[]> {
    // Validate staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { 
        id: true, 
        schoolId: true, 
        firstName: true, 
        lastName: true 
      },
    })

    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    // Check permission: only admin or the staff member themselves can access
    const canAccess = isAdminRole(context.userRole) || context.staffId === staffId
    if (!canAccess) {
      throw new DocumentAccessDeniedError(
        context.userId,
        `staff_${staffId}_documents`,
        'Only administrators or the document owner can access documents'
      )
    }

    const documents = await prisma.staffDocument.findMany({
      where: { staffId },
      orderBy: { uploadedAt: 'desc' },
    })

    return documents.map(mapPrismaDocumentToDomain)
  }

  /**
   * Get a document by ID
   * Requirement 14.2: Enforce permission-based access
   * Requirement 14.3: Log all document access to audit trail
   */
  async getDocumentById(
    documentId: string,
    context: DocumentAccessContext,
    logAccess: boolean = true
  ): Promise<StaffDocument> {
    const document = await prisma.staffDocument.findUnique({
      where: { id: documentId },
      include: {
        staff: {
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
      throw new DocumentNotFoundError(documentId)
    }

    // Check permission: only admin or the staff member themselves can access
    const canAccess = isAdminRole(context.userRole) || context.staffId === document.staffId
    if (!canAccess) {
      throw new DocumentAccessDeniedError(
        context.userId,
        documentId,
        'Only administrators or the document owner can access this document'
      )
    }

    // Log to audit trail (Requirement 14.3)
    if (logAccess) {
      await auditService.log({
        schoolId: document.staff.schoolId,
        userId: context.userId,
        action: 'VIEW',
        resource: 'STAFF_DOCUMENT',
        resourceId: document.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      })
    }

    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Get documents by category for a staff member
   * Requirement 14.1: Documents stored with proper categorization
   * Requirement 14.2: Enforce permission-based access
   */
  async getDocumentsByCategory(
    staffId: string,
    category: StaffDocumentCategory,
    context: DocumentAccessContext
  ): Promise<StaffDocument[]> {
    // Validate staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, schoolId: true },
    })

    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    // Check permission
    const canAccess = isAdminRole(context.userRole) || context.staffId === staffId
    if (!canAccess) {
      throw new DocumentAccessDeniedError(
        context.userId,
        `staff_${staffId}_documents`,
        'Only administrators or the document owner can access documents'
      )
    }

    const documents = await prisma.staffDocument.findMany({
      where: { 
        staffId,
        category,
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return documents.map(mapPrismaDocumentToDomain)
  }


  /**
   * Delete a document
   * Requirement 14.2: Enforce permission-based access (admin only for deletion)
   * Requirement 14.3: Log all document deletions to audit trail
   */
  async deleteDocument(
    documentId: string,
    context: DocumentAccessContext
  ): Promise<void> {
    const document = await prisma.staffDocument.findUnique({
      where: { id: documentId },
      include: {
        staff: {
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
      throw new DocumentNotFoundError(documentId)
    }

    // Only admins can delete documents (stricter than view access)
    if (!isAdminRole(context.userRole)) {
      throw new DocumentAccessDeniedError(
        context.userId,
        documentId,
        'Only administrators can delete documents'
      )
    }

    // Log to audit trail before deletion (Requirement 14.3)
    await auditService.log({
      schoolId: document.staff.schoolId,
      userId: context.userId,
      action: 'DELETE',
      resource: 'STAFF_DOCUMENT',
      resourceId: document.id,
      previousValue: JSON.stringify({ fileName: document.fileName, category: document.category }),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    await prisma.staffDocument.delete({
      where: { id: documentId },
    })
  }

  /**
   * Download a document (logs access as download)
   * Requirement 14.2: Enforce permission-based access
   * Requirement 14.3: Log all document downloads to audit trail
   */
  async downloadDocument(
    documentId: string,
    context: DocumentAccessContext
  ): Promise<StaffDocument> {
    const document = await prisma.staffDocument.findUnique({
      where: { id: documentId },
      include: {
        staff: {
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
      throw new DocumentNotFoundError(documentId)
    }

    // Check permission
    const canAccess = isAdminRole(context.userRole) || context.staffId === document.staffId
    if (!canAccess) {
      throw new DocumentAccessDeniedError(
        context.userId,
        documentId,
        'Only administrators or the document owner can download this document'
      )
    }

    // Log download to audit trail (Requirement 14.3)
    await auditService.logDocumentAccess({
      schoolId: document.staff.schoolId,
      accessedByUserId: context.userId,
      accessedByName: context.userName,
      staffId: document.staffId,
      staffName: `${document.staff.firstName} ${document.staff.lastName}`,
      documentId: document.id,
      documentName: document.fileName,
      documentCategory: document.category as StaffDocumentCategory,
      action: 'downloaded',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })

    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Count documents for a staff member
   */
  async countDocuments(staffId: string): Promise<number> {
    return prisma.staffDocument.count({
      where: { staffId },
    })
  }

  /**
   * Count documents by category for a staff member
   */
  async countDocumentsByCategory(
    staffId: string,
    category: StaffDocumentCategory
  ): Promise<number> {
    return prisma.staffDocument.count({
      where: { 
        staffId,
        category,
      },
    })
  }

  /**
   * Check if staff has a document of a specific category
   */
  async hasDocumentCategory(
    staffId: string,
    category: StaffDocumentCategory
  ): Promise<boolean> {
    const count = await this.countDocumentsByCategory(staffId, category)
    return count > 0
  }

  /**
   * Get the most recent document of a specific category
   */
  async getLatestDocumentByCategory(
    staffId: string,
    category: StaffDocumentCategory,
    context: DocumentAccessContext
  ): Promise<StaffDocument | null> {
    // Check permission
    const canAccess = isAdminRole(context.userRole) || context.staffId === staffId
    if (!canAccess) {
      throw new DocumentAccessDeniedError(
        context.userId,
        `staff_${staffId}_documents`,
        'Only administrators or the document owner can access documents'
      )
    }

    const document = await prisma.staffDocument.findFirst({
      where: {
        staffId,
        category,
      },
      orderBy: { uploadedAt: 'desc' },
    })

    if (!document) return null
    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Get supported document categories
   * Requirement 14.1: Documents stored with proper categorization
   */
  getSupportedCategories(): StaffDocumentCategory[] {
    return Object.values(StaffDocumentCategory)
  }

  /**
   * Validate document category
   * Requirement 14.1: Documents must have proper categorization
   */
  isValidCategory(category: string): category is StaffDocumentCategory {
    return Object.values(StaffDocumentCategory).includes(category as StaffDocumentCategory)
  }

  /**
   * Check if user can access a document
   * Requirement 14.2: Permission-based access control
   */
  canAccessDocument(
    documentStaffId: string,
    context: DocumentAccessContext
  ): boolean {
    return isAdminRole(context.userRole) || context.staffId === documentStaffId
  }

  /**
   * Check if user can delete a document
   * Requirement 14.2: Only admins can delete
   */
  canDeleteDocument(context: DocumentAccessContext): boolean {
    return isAdminRole(context.userRole)
  }

  /**
   * Get document summary for a staff member (counts by category)
   */
  async getDocumentSummary(
    staffId: string,
    context: DocumentAccessContext
  ): Promise<Record<StaffDocumentCategory, number>> {
    // Check permission
    const canAccess = isAdminRole(context.userRole) || context.staffId === staffId
    if (!canAccess) {
      throw new DocumentAccessDeniedError(
        context.userId,
        `staff_${staffId}_documents`,
        'Only administrators or the document owner can access document summary'
      )
    }

    const documents = await prisma.staffDocument.groupBy({
      by: ['category'],
      where: { staffId },
      _count: { id: true },
    })

    // Initialize all categories with 0
    const summary: Record<StaffDocumentCategory, number> = {
      [StaffDocumentCategory.CONTRACT]: 0,
      [StaffDocumentCategory.CERTIFICATION]: 0,
      [StaffDocumentCategory.EVALUATION]: 0,
      [StaffDocumentCategory.ID_DOCUMENT]: 0,
      [StaffDocumentCategory.QUALIFICATION]: 0,
      [StaffDocumentCategory.OTHER]: 0,
    }

    // Fill in actual counts
    for (const doc of documents) {
      summary[doc.category as StaffDocumentCategory] = doc._count.id
    }

    return summary
  }
}

// Export singleton instance
export const staffDocumentService = new StaffDocumentService()
