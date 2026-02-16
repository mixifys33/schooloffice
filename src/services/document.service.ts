/**
 * Document Service
 * Handles document upload and management for students
 * Requirements: 4.3
 */
import { prisma } from '@/lib/db'
import {
  StudentDocument,
  CreateStudentDocumentInput,
} from '@/types'

/**     
 * Supported document types for student profiles
 */
export const SUPPORTED_DOCUMENT_TYPES = [
  'birth_certificate',
  'passport',
  'national_id',
  'medical_record',
  'previous_school_report',
  'transfer_letter',
  'admission_letter',
  'photo',
  'other',
] as const

export type DocumentType = typeof SUPPORTED_DOCUMENT_TYPES[number]

/**
 * Map Prisma StudentDocument to domain StudentDocument type
 */
function mapPrismaDocumentToDomain(prismaDoc: {
  id: string
  studentId: string
  name: string
  type: string
  url: string
  metadata: unknown
  uploadedAt: Date
}): StudentDocument {
  return {
    id: prismaDoc.id,
    studentId: prismaDoc.studentId,
    name: prismaDoc.name,
    type: prismaDoc.type,
    url: prismaDoc.url,
    metadata: prismaDoc.metadata as Record<string, unknown> | undefined,
    uploadedAt: prismaDoc.uploadedAt,
  }
}

export class DocumentService {
  /**
   * Upload a document for a student
   * Requirement 4.3: Store documents with metadata and associate with student profile
   */
  async uploadDocument(data: CreateStudentDocumentInput): Promise<StudentDocument> {
    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    })

    if (!student) {
      throw new Error(`Student with id ${data.studentId} not found`)
    }

    // Validate document type if it's one of the supported types
    if (data.type && !this.isValidDocumentType(data.type) && data.type !== 'other') {
      // Allow custom types but log a warning in production
      console.warn(`Custom document type used: ${data.type}`)
    }

    // Validate URL is provided
    if (!data.url || data.url.trim() === '') {
      throw new Error('Document URL is required')
    }

    // Validate name is provided
    if (!data.name || data.name.trim() === '') {
      throw new Error('Document name is required')
    }

    const document = await prisma.studentDocument.create({
      data: {
        studentId: data.studentId,
        name: data.name.trim(),
        type: data.type,
        url: data.url,
        metadata: data.metadata ?? undefined,
        uploadedAt: new Date(),
      },
    })

    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Get a document by ID
   */
  async getDocumentById(id: string): Promise<StudentDocument | null> {
    const document = await prisma.studentDocument.findUnique({
      where: { id },
    })

    if (!document) return null
    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Get all documents for a student
   * Requirement 4.3: Associate documents with student profiles
   */
  async getDocumentsByStudent(studentId: string): Promise<StudentDocument[]> {
    const documents = await prisma.studentDocument.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' },
    })

    return documents.map(mapPrismaDocumentToDomain)
  }

  /**
   * Get documents by type for a student
   */
  async getDocumentsByType(studentId: string, type: string): Promise<StudentDocument[]> {
    const documents = await prisma.studentDocument.findMany({
      where: {
        studentId,
        type,
      },
      orderBy: { uploadedAt: 'desc' },
    })

    return documents.map(mapPrismaDocumentToDomain)
  }


  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    id: string,
    metadata: Record<string, unknown>
  ): Promise<StudentDocument> {
    const existingDoc = await prisma.studentDocument.findUnique({
      where: { id },
    })

    if (!existingDoc) {
      throw new Error(`Document with id ${id} not found`)
    }

    const document = await prisma.studentDocument.update({
      where: { id },
      data: {
        metadata: {
          ...(existingDoc.metadata as Record<string, unknown> ?? {}),
          ...metadata,
        },
      },
    })

    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Update document name
   */
  async updateDocumentName(id: string, name: string): Promise<StudentDocument> {
    if (!name || name.trim() === '') {
      throw new Error('Document name is required')
    }

    const existingDoc = await prisma.studentDocument.findUnique({
      where: { id },
    })

    if (!existingDoc) {
      throw new Error(`Document with id ${id} not found`)
    }

    const document = await prisma.studentDocument.update({
      where: { id },
      data: { name: name.trim() },
    })

    return mapPrismaDocumentToDomain(document)
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    const existingDoc = await prisma.studentDocument.findUnique({
      where: { id },
    })

    if (!existingDoc) {
      throw new Error(`Document with id ${id} not found`)
    }

    await prisma.studentDocument.delete({
      where: { id },
    })
  }

  /**
   * Delete all documents for a student
   */
  async deleteAllDocumentsForStudent(studentId: string): Promise<number> {
    const result = await prisma.studentDocument.deleteMany({
      where: { studentId },
    })

    return result.count
  }

  /**
   * Count documents for a student
   */
  async countDocumentsByStudent(studentId: string): Promise<number> {
    return prisma.studentDocument.count({
      where: { studentId },
    })
  }

  /**
   * Check if a document type is valid
   */
  isValidDocumentType(type: string): type is DocumentType {
    return SUPPORTED_DOCUMENT_TYPES.includes(type as DocumentType)
  }

  /**
   * Get supported document types
   */
  getSupportedDocumentTypes(): readonly string[] {
    return SUPPORTED_DOCUMENT_TYPES
  }

  /**
   * Check if student has a specific document type
   */
  async hasDocumentType(studentId: string, type: string): Promise<boolean> {
    const count = await prisma.studentDocument.count({
      where: {
        studentId,
        type,
      },
    })

    return count > 0
  }

  /**
   * Get the most recent document of a specific type for a student
   */
  async getLatestDocumentByType(studentId: string, type: string): Promise<StudentDocument | null> {
    const document = await prisma.studentDocument.findFirst({
      where: {
        studentId,
        type,
      },
      orderBy: { uploadedAt: 'desc' },
    })

    if (!document) return null
    return mapPrismaDocumentToDomain(document)
  }
}

// Export singleton instance
export const documentService = new DocumentService()
