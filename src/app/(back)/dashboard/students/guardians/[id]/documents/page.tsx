'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, Upload, FileText, Trash2, Download, 
  Loader2, File, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { GuardianDocumentType } from '@/types/enums'

/**
 * Document Upload UI
 * Upload documents with type selection, view and download documents, delete documents
 * Requirements: 7.1, 7.4
 */

interface GuardianDocument {
  id: string
  documentType: GuardianDocumentType
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  uploadedBy: string
}

interface GuardianBasic {
  id: string
  firstName: string
  lastName: string
  name: string
}

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// Max file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getDocumentTypeLabel(type: GuardianDocumentType): string {
  return type.replace(/_/g, ' ')
}

export default function GuardianDocumentsPage() {
  const params = useParams()
  const router = useRouter()
  const guardianId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [guardian, setGuardian] = useState<GuardianBasic | null>(null)
  const [documents, setDocuments] = useState<GuardianDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<GuardianDocumentType>(GuardianDocumentType.OTHER)
  const [fileError, setFileError] = useState<string | null>(null)
  
  // Delete dialog state
  const [deleteDocument, setDeleteDocument] = useState<GuardianDocument | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch guardian basic info
      const guardianRes = await fetch(`/api/guardians/${guardianId}`)
      if (!guardianRes.ok) throw new Error('Failed to fetch guardian')
      const guardianData = await guardianRes.json()
      setGuardian({
        id: guardianData.id,
        firstName: guardianData.firstName,
        lastName: guardianData.lastName,
        name: guardianData.name,
      })

      // Fetch documents
      const docsRes = await fetch(`/api/guardians/${guardianId}/documents`)
      if (docsRes.ok) {
        const docsData = await docsRes.json()
        setDocuments(docsData.documents || [])
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Unable to load documents')
    } finally {
      setLoading(false)
    }
  }, [guardianId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFileError(null)
    
    if (!file) {
      setSelectedFile(null)
      return
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Invalid file type. Allowed: PDF, Images, Word documents')
      setSelectedFile(null)
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('documentType', documentType)

      const response = await fetch(`/api/guardians/${guardianId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to upload document')
      }

      setSuccess('Document uploaded successfully')
      setShowUploadDialog(false)
      setSelectedFile(null)
      setDocumentType(GuardianDocumentType.OTHER)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchData()
    } catch (err) {
      console.error('Error uploading:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDocument) return

    try {
      setDeleting(true)
      setError(null)

      const response = await fetch(`/api/guardians/${guardianId}/documents/${deleteDocument.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete document')
      }

      setSuccess('Document deleted successfully')
      setDeleteDocument(null)
      await fetchData()
    } catch (err) {
      console.error('Error deleting:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setDeleting(false)
    }
  }

  const handleDownload = (doc: GuardianDocument) => {
    window.open(doc.fileUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <SkeletonLoader variant="card" count={2} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-sm text-muted-foreground">
              {guardian?.name} • {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Alerts */}
      {error && <AlertBanner type="danger" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      {/* Documents List - Requirement 7.4 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents
          </CardTitle>
          <CardDescription>
            Consent forms, agreements, legal documents, and ID copies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No documents uploaded</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowUploadDialog(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First Document
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <File className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getDocumentTypeLabel(doc.documentType)}
                        </Badge>
                        <span>•</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDocument(doc)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Types Info */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Document Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.values(GuardianDocumentType).map((type) => (
              <div key={type} className="p-3 border rounded-lg text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{getDocumentTypeLabel(type)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Allowed formats: PDF, JPEG, PNG, GIF, DOC, DOCX • Max size: {formatFileSize(MAX_FILE_SIZE)}
          </p>
        </CardContent>
      </Card>

      {/* Upload Dialog - Requirement 7.1 */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>
                Upload a document to this guardian's profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type *</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as GuardianDocumentType)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.values(GuardianDocumentType).map((type) => (
                    <option key={type} value={type}>{getDocumentTypeLabel(type)}</option>
                  ))}
                </select>
              </div>

              {/* File Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">File *</label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors ${
                    fileError ? 'border-red-500' : 'border-input'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div>
                      <File className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to select a file
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, Images, Word documents up to {formatFileSize(MAX_FILE_SIZE)}
                      </p>
                    </div>
                  )}
                </div>
                {fileError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {fileError}
                  </p>
                )}
              </div>
            </CardContent>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false)
                  setSelectedFile(null)
                  setFileError(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteDocument}
        onClose={() => setDeleteDocument(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteDocument?.fileName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
