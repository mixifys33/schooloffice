/**
 * Guardian Document Service
 * Handles document management for guardian profiles
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
import { prisma } from '@/lib/db'
import { GuardianDocumentType } from '@/types/enums'
import {
  GuardianDocument,
  UploadGuardianDocumentInput,
  GuardianDocumentQueryOptions,
  GuardianDocumentUploadResult,
  FileRestrictionConfig,
  FileValidationResult,
} from '@/types'
import { GuardianAuditService, GuardianAuditAction } from './guardian-audit.service'

// ============================================
// DEFAULT FILE RESTRICTIONS
// Requirement 7.5: Enforce file type and size restrictions
// ============================================

/**
 * Default allowed MIME types for guardian documents
 */
const DEFAULT_ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Scanned documents
  'image/tiff',
]

/**
 * Default maximum file size (10MB)
 */
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma GuardianDocument to domain type
 */
function mapPrismaDocumentToDomain(prismaDoc: {
  id: string
  guardianId: string
  documentType: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
}): GuardianDocument {
  return {
    id: prismaDoc.id,
    guardianId: prismaDoc.guardianId,
    documentType: prismaDoc.documentType as GuardianDocumentType,
    fileName: prismaDoc.fileName,
    fileUrl: prismaDoc.fileUrl,
    fileSize: prismaDoc.fileSize,
    mimeType: prismaDoc.mimeType,
    uploadedBy: prismaDoc.uploadedBy,
    uploadedAt: prismaDoc.uploadedAt,
  }
}

// ============================================
// GUARDIAN DOCUMENT SERVICE CLASS
// ============================================

/**
 * Guardian Document Service
 * Handles document management for guardian profiles
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class GuardianDocumentService {
  private auditService: GuardianAuditService
  private fileRestrictions: FileRestrictionConfig

  constructor(
    auditService?: GuardianAuditService,
    fileRestrictions?: FileRestrictionConfig
  ) {
    this.auditService = auditService ?? new GuardianAuditService()
    this.fileRestrictions = fileRestrictions ?? {
      allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
      maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
    }
  }

  /**
   * Validate file against restrictions
   * Requirement 7.5: Enforce file type and size restrictions
   */
  validateFile(mimeType: string, fileSize: number): FileValidationResult {
    const errors: string[] = []

    // Validate MIME type
    if (!this.fileRestrictions.allowedMimeTypes.includes(mimeType)) {
      errors.push(
        `File type '${mimeType}' is not allowed. Allowed types: ${this.fileRestrictions.allowedMimeTypes.join(', ')}`
      )
    }

    // Validate file size
    if (fileSize > this.fileRestrictions.maxFileSizeBytes) {
      const maxSizeMB = this.fileRestrictions.maxFileSizeBytes / (1024 * 1024)
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)
      errors.push(
        `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
      )
    }

    // Validate file size is positive
    if (fileSize <= 0) {
      errors.push('File size must be greater than 0')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Upload a document to a guardian profile
   * Requirement 7.1: Allow uploading documents to guardian profiles
   * Requirement 7.3: Record upload date, uploader, and document type
   * Requirement 7.5: Enforce file type and size restrictions
   */
  async uploadDocument(
    input: UploadGuardianDocumentInput,
    ipAddress?: string
  ): Promise<GuardianDocumentUploadResult> {
    // Validate guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: input.guardianId },
      select: { id: true },
    })

    if (!guardian) {
      return {
        success: false,
        error: `Guardian with id ${input.guardianId} not found`,
      }
    }

    // Validate document type
    if (!Object.values(GuardianDocumentType).includes(input.documentType)) {
      return {
        success: false,
        error: `Invalid document type: ${input.documentType}. Allowed types: ${Object.values(GuardianDocumentType).join(', ')}`,
      }
    }

    // Validate file restrictions
    const validation = this.validateFile(input.mimeType, input.fileSize)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; '),
      }
    }

    // Validate required fields
    if (!input.fileName || input.fileName.trim().length === 0) {
      return {
        success: false,
        error: 'File name is required',
      }
    }

    if (!input.fileUrl || input.fileUrl.trim().length === 0) {
      return {
        success: false,
        error: 'File URL is required',
      }
    }

    if (!input.uploadedBy || input.uploadedBy.trim().length === 0) {
      return {
        success: false,
        error: 'Uploader ID is required',
      }
    }

    // Create document record
    const document = await prisma.guardianDocument.create({
      data: {
        guardianId: input.guardianId,
        documentType: input.documentType,
        fileName: input.fileName.trim(),
        fileUrl: input.fileUrl.trim(),
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        uploadedBy: input.uploadedBy,
      },
    })

    // Log audit entry
    await this.auditService.logChange({
      guardianId: input.guardianId,
      action: GuardianAuditAction.DOCUMENT_UPLOADED,
      field: 'documents',
      previousValue: undefined,
      newValue: JSON.stringify({
        documentId: document.id,
        documentType: input.documentType,
        fileName: input.fileName,
      }),
      performedBy: input.uploadedBy,
      ipAddress,
    })

    return {
      success: true,
      document: mapPrismaDocumentToDomain(document),
    }
  }

  /**
   * Get documents for a guardian
   * Requirement 7.4: Allow downloading and viewing attached documents
   */
  async getDocuments(
    guardianId: string,
    options?: GuardianDocumentQueryOptions
  ): Promise<GuardianDocument[]> {
    // Validate guardian exists
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
      select: { id: true },
    })

    if (!guardian) {
      throw new Error(`Guardian with id ${guardianId} not found`)
    }

    // Build where clause
    const where: Record<string, unknown> = { guardianId }

    if (options?.documentType) {
      where.documentType = options.documentType
    }

    // Query documents
    const documents = await prisma.guardianDocument.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      skip: options?.offset ?? 0,
      take: options?.limit,
    })

    return documents.map(mapPrismaDocumentToDomain)
  }

  /**
   * Get a single document by ID
   * Requirement 7.4: Allow downloading and viewing attached documents
   */
  async getDocumentById(documentId: string): Promise<GuardianDocument | null> {
    const document = await prisma.guardianDocument.findUnique({
      where: { id: documentId },
    })

    if (!document) return null
    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Delete a document from a guardian profile
   * Requirement 7.4: Allow managing attached documents
   */
  async deleteDocument(
    documentId: string,
    performedBy: string,
    ipAddress?: string
  ): Promise<boolean> {
    // Get document to verify it exists and get guardian ID for audit
    const document = await prisma.guardianDocument.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      throw new Error(`Document with id ${documentId} not found`)
    }

    // Delete the document
    await prisma.guardianDocument.delete({
      where: { id: documentId },
    })

    // Log audit entry
    await this.auditService.logChange({
      guardianId: document.guardianId,
      action: GuardianAuditAction.DOCUMENT_DELETED,
      field: 'documents',
      previousValue: JSON.stringify({
        documentId: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
      }),
      newValue: undefined,
      performedBy,
      ipAddress,
    })

    return true
  }

  /**
   * Count documents for a guardian
   */
  async countDocuments(
    guardianId: string,
    documentType?: GuardianDocumentType
  ): Promise<number> {
    const where: Record<string, unknown> = { guardianId }

    if (documentType) {
      where.documentType = documentType
    }

    return prisma.guardianDocument.count({ where })
  }

  /**
   * Get documents by type for a guardian
   * Requirement 7.2: Support document types
   */
  async getDocumentsByType(
    guardianId: string,
    documentType: GuardianDocumentType
  ): Promise<GuardianDocument[]> {
    return this.getDocuments(guardianId, { documentType })
  }

  /**
   * Check if guardian has a specific document type
   */
  async hasDocumentType(
    guardianId: string,
    documentType: GuardianDocumentType
  ): Promise<boolean> {
    const count = await this.countDocuments(guardianId, documentType)
    return count > 0
  }

  /**
   * Get file restrictions configuration
   * Requirement 7.5: Enforce file type and size restrictions
   */
  getFileRestrictions(): FileRestrictionConfig {
    return { ...this.fileRestrictions }
  }

  /**
   * Update file restrictions configuration
   * Requirement 7.5: Enforce file type and size restrictions
   */
  setFileRestrictions(config: Partial<FileRestrictionConfig>): void {
    if (config.allowedMimeTypes) {
      this.fileRestrictions.allowedMimeTypes = config.allowedMimeTypes
    }
    if (config.maxFileSizeBytes !== undefined) {
      this.fileRestrictions.maxFileSizeBytes = config.maxFileSizeBytes
    }
  }

  /**
   * Get all document types
   * Requirement 7.2: Support document types
   */
  getSupportedDocumentTypes(): GuardianDocumentType[] {
    return Object.values(GuardianDocumentType)
  }

  /**
   * Get document summary for a guardian
   */
  async getDocumentSummary(guardianId: string): Promise<{
    totalCount: number
    byType: Record<GuardianDocumentType, number>
  }> {
    const documents = await prisma.guardianDocument.findMany({
      where: { guardianId },
      select: { documentType: true },
    })

    const byType: Record<GuardianDocumentType, number> = {
      [GuardianDocumentType.CONSENT_FORM]: 0,
      [GuardianDocumentType.AGREEMENT]: 0,
      [GuardianDocumentType.LEGAL_LETTER]: 0,
      [GuardianDocumentType.ID_COPY]: 0,
      [GuardianDocumentType.OTHER]: 0,
    }

    for (const doc of documents) {
      const docType = doc.documentType as GuardianDocumentType
      byType[docType] = (byType[docType] || 0) + 1
    }

    return {
      totalCount: documents.length,
      byType,
    }
  }
}

// Export singleton instance
export const guardianDocumentService = new GuardianDocumentService()
