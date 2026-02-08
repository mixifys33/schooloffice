'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { FileText, Trash2, Download, Eye, Plus, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageKitUpload } from '@/components/ui/imagekit-upload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TeacherDocumentType } from '@/types/teacher'

/**
 * Teacher Document Upload Component
 * Requirements: 7.1-7.7
 * - Upload and manage teacher documents
 * - Support for multiple document types
 * - Integration with ImageKit for storage
 */

export interface TeacherDocument {
  id: string
  documentType: TeacherDocumentType
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: Date
}

export interface TeacherDocumentUploadProps {
  /** Teacher ID */
  teacherId: string
  /** Existing documents */
  documents?: TeacherDocument[]
  /** Callback when document is uploaded */
  onDocumentUploaded?: (document: TeacherDocument) => void
  /** Callback when document is deleted */
  onDocumentDeleted?: (documentId: string) => void
  /** Whether the component is in read-only mode */
  readOnly?: boolean
  /** Custom class name */
  className?: string
}

const DOCUMENT_TYPE_LABELS: Record<TeacherDocumentType, string> = {
  [TeacherDocumentType.APPOINTMENT_LETTER]: 'Appointment Letter',
  [TeacherDocumentType.CERTIFICATE]: 'Certificate',
  [TeacherDocumentType.NATIONAL_ID]: 'National ID',
  [TeacherDocumentType.CONTRACT]: 'Contract',
  [TeacherDocumentType.OTHER]: 'Other Document',
}

const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function TeacherDocumentUpload({
  teacherId,
  documents = [],
  onDocumentUploaded,
  onDocumentDeleted,
  readOnly = false,
  className,
}: TeacherDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<TeacherDocumentType>(TeacherDocumentType.OTHER)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleUploadComplete = useCallback(async (result: {
    fileId: string
    name: string
    url: string
    size: number
    filePath: string
  }) => {
    setIsUploading(true)
    setError(null)

    try {
      // Save document to database via API
      const response = await fetch(`/api/teachers/${teacherId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedType,
          fileName: result.name,
          fileUrl: result.url,
          fileSize: result.size,
          mimeType: result.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          fileId: result.fileId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save document')
      }

      const savedDocument = await response.json()
      
      onDocumentUploaded?.({
        id: savedDocument.id,
        documentType: selectedType,
        fileName: result.name,
        fileUrl: result.url,
        fileSize: result.size,
        mimeType: savedDocument.mimeType,
        uploadedAt: new Date(),
      })

      setShowUploadForm(false)
      setSelectedType(TeacherDocumentType.OTHER)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document')
    } finally {
      setIsUploading(false)
    }
  }, [teacherId, selectedType, onDocumentUploaded])

  const handleDelete = useCallback(async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    setDeletingId(documentId)
    setError(null)

    try {
      const response = await fetch(`/api/teachers/${teacherId}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete document')
      }

      onDocumentDeleted?.(documentId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }, [teacherId, onDocumentDeleted])

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents
        </CardTitle>
        {!readOnly && !showUploadForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowUploadForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Document
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-[var(--danger-light)] text-[var(--chart-red)] rounded-lg text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Upload Form */}
        {showUploadForm && !readOnly && (
          <div className="p-4 border rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--text-primary)] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Upload New Document</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowUploadForm(false)}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Document Type</label>
                <Select
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as TeacherDocumentType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ImageKitUpload
                uploadType="teacher_document"
                entityId={teacherId}
                documentType={selectedType}
                onUploadComplete={handleUploadComplete}
                onUploadError={(err) => setError(err)}
                label="Select File"
                helpText="PDF, JPG, PNG, DOC, DOCX up to 10MB"
                maxSizeMB={10}
              />
            </div>

            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-[var(--chart-blue)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving document...
              </div>
            )}
          </div>
        )}

        {/* Document List */}
        {documents.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No documents uploaded yet
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--text-primary)]"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-[var(--chart-blue)]" />
                  <div>
                    <p className="font-medium text-sm">{doc.fileName}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {DOCUMENT_TYPE_LABELS[doc.documentType]} • {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(doc.fileUrl, '_blank')}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = doc.fileUrl
                      a.download = doc.fileName
                      a.click()
                    }}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      title="Delete"
                      className="text-[var(--danger)] hover:text-[var(--chart-red)]"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TeacherDocumentUpload
