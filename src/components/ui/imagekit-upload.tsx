'use client'

import * as React from 'react'
import { useState, useCallback, useRef } from 'react'
import { Upload, X, Loader2, Image as ImageIcon, FileText, AlertCircle, Check } from 'lucide-react'
import Image from 'next/image'
import { Button } from './button'
import { cn } from '@/lib/utils'

/**
 * ImageKit Upload Component
 * 
 * Provides client-side file upload with server-side authentication.
 * Supports images and documents with preview and progress tracking.
 */

export interface ImageKitUploadResult {
  fileId: string
  name: string
  url: string
  thumbnailUrl: string
  size: number
  filePath: string
}

export interface ImageKitUploadProps {
  /** Upload type determines folder and validation */
  uploadType: 'teacher_photo' | 'teacher_document' | 'student_photo' | 'school_logo' | 'school_asset'
  /** Entity ID (teacher ID, student ID, etc.) */
  entityId?: string
  /** Document type for document uploads */
  documentType?: string
  /** Callback when upload completes successfully */
  onUploadComplete: (result: ImageKitUploadResult) => void
  /** Callback when upload fails */
  onUploadError?: (error: string) => void
  /** Current file URL (for showing existing file) */
  currentFileUrl?: string
  /** Accept specific file types */
  accept?: string
  /** Maximum file size in MB */
  maxSizeMB?: number
  /** Custom class name */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Label text */
  label?: string
  /** Help text */
  helpText?: string
  /** Show preview for images */
  showPreview?: boolean
  /** Compact mode for inline usage */
  compact?: boolean
}

const DEFAULT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp'
const DEFAULT_DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function ImageKitUpload({
  uploadType,
  entityId,
  documentType,
  onUploadComplete,
  onUploadError,
  currentFileUrl,
  accept,
  maxSizeMB = 10,
  className,
  disabled = false,
  label,
  helpText,
  showPreview = true,
  compact = false,
}: ImageKitUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFileUrl || null)
  const [uploadedFile, setUploadedFile] = useState<ImageKitUploadResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isImageUpload = ['teacher_photo', 'student_photo', 'school_logo'].includes(uploadType)
  const defaultAccept = isImageUpload ? DEFAULT_IMAGE_ACCEPT : DEFAULT_DOCUMENT_ACCEPT
  const finalAccept = accept || defaultAccept

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`
    }

    // Check file type
    const acceptedTypes = finalAccept.split(',').map(t => t.trim())
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`
    }

    return null
  }, [maxSizeMB, finalAccept])

  const uploadFile = useCallback(async (file: File) => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      onUploadError?.(validationError)
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    // Create preview for images
    if (isImageUpload && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', uploadType)
      if (entityId) {
        formData.append('entityId', entityId)
      }
      if (documentType) {
        formData.append('documentType', documentType)
      }

      // Simulate progress (since fetch doesn't support progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Upload to server
      const response = await fetch('/api/imagekit/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setUploadProgress(100)
      
      const uploadResult: ImageKitUploadResult = {
        fileId: result.file.fileId,
        name: result.file.name,
        url: result.file.url,
        thumbnailUrl: result.file.thumbnailUrl,
        size: result.file.size,
        filePath: result.file.filePath,
      }

      setUploadedFile(uploadResult)
      setPreviewUrl(result.file.url)
      onUploadComplete(uploadResult)
    } catch (err) {
      let errorMessage = 'Upload failed'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      // Log the full error for debugging
      console.error('ImageKit upload error details:', err)
      
      setError(errorMessage)
      onUploadError?.(`Failed to upload file: ${errorMessage}`)
      setPreviewUrl(currentFileUrl || null)
    } finally {
      setIsUploading(false)
    }
  }, [uploadType, entityId, documentType, validateFile, isImageUpload, onUploadComplete, onUploadError, currentFileUrl])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }, [uploadFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const clearFile = useCallback(() => {
    setPreviewUrl(null)
    setUploadedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Compact mode for inline usage
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept={finalAccept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        {previewUrl && isImageUpload ? (
          <div className="relative h-10 w-10 rounded-full overflow-hidden border">
            <Image src={previewUrl} alt="Preview" fill className="object-cover" unoptimized />
          </div>
        ) : previewUrl ? (
          <div className="flex items-center gap-1 text-sm text-[var(--chart-green)]">
            <Check className="h-4 w-4" />
            <span>Uploaded</span>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileSelect}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-1" />
              {previewUrl ? 'Change' : 'Upload'}
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFile}
            disabled={disabled || isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {error && (
          <span className="text-sm text-[var(--danger)]">{error}</span>
        )}
      </div>
    )
  }

  // Full mode with drag & drop
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium">{label}</label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={finalAccept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          isDragging ? 'border-[var(--accent-primary)] bg-[var(--info-light)] dark:bg-[var(--info-dark)]' : 'border-[var(--border-default)] dark:border-[var(--border-strong)]',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--border-default)]',
          error && 'border-[var(--danger)]'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!disabled && !isUploading ? triggerFileSelect : undefined}
      >
        {isUploading ? (
          <div className="text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-[var(--chart-blue)]" />
            <p className="text-sm font-medium">Uploading... {uploadProgress}%</p>
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-2 mt-2">
              <div
                className="bg-[var(--chart-blue)] h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : previewUrl && showPreview ? (
          <div className="text-center">
            {isImageUpload ? (
              <div className="relative inline-block">
                <div className="relative max-h-32 max-w-full mx-auto rounded-lg overflow-hidden" style={{ width: '200px', height: '128px' }}>
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile()
                  }}
                  className="absolute -top-2 -right-2 p-1 bg-[var(--danger)] text-[var(--white-pure)] rounded-full hover:bg-[var(--chart-red)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-8 w-8 text-[var(--chart-green)]" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--chart-green)]">File uploaded</p>
                  <p className="text-xs text-[var(--text-muted)]">{uploadedFile?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile()
                  }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-2">Click to replace</p>
          </div>
        ) : (
          <div className="text-center">
            {isImageUpload ? (
              <ImageIcon className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)]" />
            ) : (
              <FileText className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)]" />
            )}
            <p className="text-sm font-medium mb-1">
              Drop your file here, or click to browse
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {isImageUpload ? 'JPG, PNG, GIF, WebP' : 'PDF, JPG, PNG, DOC, DOCX'} up to {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-[var(--danger)]">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {helpText && !error && (
        <p className="text-xs text-[var(--text-muted)]">{helpText}</p>
      )}
    </div>
  )
}

export default ImageKitUpload
