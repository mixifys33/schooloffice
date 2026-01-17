'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { FileText, Trash2, Download, Eye, Plus, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageKitUpload } from '@/components/ui/imagekit-upload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * School Document Upload Component
 * 
 * Provides document and asset management for school administrators.
 * Supports school logos, letterheads, certificates, and general documents.
 */

export type SchoolAssetType = 'logo' | 'letterhead' | 'certificate_template' | 'report_template' | 'general'

export interface SchoolAsset {
  id: string
  assetType: SchoolAssetType
  name: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedAt: Date
  uploadedBy: string
}

export interface SchoolDocumentUploadProps {
  /** Current school logo URL */
  currentLogoUrl?: string
  /** Existing assets */
  assets?: SchoolAsset[]
  /** Callback when logo is uploaded */
  onLogoUploaded?: (url: string) => void
  /** Callback when asset is uploaded */
  onAssetUploaded?: (asset: SchoolAsset) => void
  /** Callback when asset is deleted */
  onAssetDeleted?: (assetId: string) => void
  /** Whether the component is in read-only mode */
  readOnly?: boolean
  /** Custom class name */
  className?: string
}

const ASSET_TYPE_LABELS: Record<SchoolAssetType, string> = {
  logo: 'School Logo',
  letterhead: 'Letterhead Template',
  certificate_template: 'Certificate Template',
  report_template: 'Report Template',
  general: 'General Document',
}

const ASSET_TYPE_OPTIONS = Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => ({
  value: value as SchoolAssetType,
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

export function SchoolDocumentUpload({
  currentLogoUrl,
  assets = [],
  onLogoUploaded,
  onAssetUploaded,
  onAssetDeleted,
  readOnly = false,
  className,
}: SchoolDocumentUploadProps) {
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedType, setSelectedType] = useState<SchoolAssetType>('general')
  const [assetName, setAssetName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleLogoUpload = useCallback((result: { url: string }) => {
    onLogoUploaded?.(result.url)
  }, [onLogoUploaded])

  const handleAssetUpload = useCallback(async (result: {
    fileId: string
    name: string
    url: string
    size: number
    filePath: string
  }) => {
    if (!assetName.trim()) {
      setError('Please enter a name for the asset')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Save asset to database via API
      const response = await fetch('/api/school-admin/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetType: selectedType,
          name: assetName,
          fileName: result.name,
          fileUrl: result.url,
          fileSize: result.size,
          fileId: result.fileId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save asset')
      }

      const savedAsset = await response.json()
      
      onAssetUploaded?.({
        id: savedAsset.id,
        assetType: selectedType,
        name: assetName,
        fileName: result.name,
        fileUrl: result.url,
        fileSize: result.size,
        mimeType: savedAsset.mimeType || 'application/octet-stream',
        uploadedAt: new Date(),
        uploadedBy: savedAsset.uploadedBy || 'Unknown',
      })

      setShowUploadForm(false)
      setAssetName('')
      setSelectedType('general')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save asset')
    } finally {
      setIsUploading(false)
    }
  }, [selectedType, assetName, onAssetUploaded])

  const handleDelete = useCallback(async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return

    setDeletingId(assetId)
    setError(null)

    try {
      const response = await fetch(`/api/school-admin/assets/${assetId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete asset')
      }

      onAssetDeleted?.(assetId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete asset')
    } finally {
      setDeletingId(null)
    }
  }, [onAssetDeleted])

  return (
    <div className={className}>
      {/* School Logo Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            School Logo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Current Logo Preview */}
            <div className="flex-shrink-0">
              {currentLogoUrl ? (
                <img
                  src={currentLogoUrl}
                  alt="School Logo"
                  className="h-24 w-24 object-contain border rounded-lg"
                />
              ) : (
                <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Logo Upload */}
            {!readOnly && (
              <div className="flex-1">
                <ImageKitUpload
                  uploadType="school_logo"
                  onUploadComplete={handleLogoUpload}
                  onUploadError={(err) => setError(err)}
                  currentFileUrl={currentLogoUrl}
                  label={currentLogoUrl ? 'Update Logo' : 'Upload Logo'}
                  helpText="Recommended: Square image, at least 200x200px. PNG or JPG."
                  maxSizeMB={5}
                  compact
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* School Assets Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            School Documents & Templates
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
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Upload Form */}
          {showUploadForm && !readOnly && (
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Upload New Document</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowUploadForm(false)
                    setAssetName('')
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assetName">Document Name</Label>
                  <Input
                    id="assetName"
                    placeholder="e.g., 2025 Report Card Template"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Document Type</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(value) => setSelectedType(value as SchoolAssetType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPE_OPTIONS.filter(o => o.value !== 'logo').map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ImageKitUpload
                uploadType="school_asset"
                documentType={selectedType}
                onUploadComplete={handleAssetUpload}
                onUploadError={(err) => setError(err)}
                label="Select File"
                helpText="PDF, JPG, PNG, DOC, DOCX up to 10MB"
                maxSizeMB={10}
              />

              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving document...
                </div>
              )}
            </div>
          )}

          {/* Asset List */}
          {assets.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No documents uploaded yet
            </p>
          ) : (
            <div className="space-y-2">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">{asset.name}</p>
                      <p className="text-xs text-gray-500">
                        {ASSET_TYPE_LABELS[asset.assetType]} • {formatFileSize(asset.fileSize)} • {formatDate(asset.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(asset.fileUrl, '_blank')}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = asset.fileUrl
                        a.download = asset.fileName
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
                        onClick={() => handleDelete(asset.id)}
                        disabled={deletingId === asset.id}
                        title="Delete"
                        className="text-red-500 hover:text-red-700"
                      >
                        {deletingId === asset.id ? (
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
    </div>
  )
}

export default SchoolDocumentUpload
