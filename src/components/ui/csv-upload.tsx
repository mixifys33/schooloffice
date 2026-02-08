'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Upload, FileText, X, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { Button } from './button'

/**
 * CSVUpload Component
 * Requirements: 3.7 - Validate and create multiple student records via CSV bulk upload
 */

export interface CSVUploadProps {
  /** Callback when CSV data is uploaded and validated */
  onUpload: (data: Record<string, string>[]) => Promise<void>
  /** Expected column names for the CSV template */
  templateColumns: string[]
  /** Required columns that must have values */
  requiredColumns: string[]
  /** Callback when validation errors occur */
  onValidationError?: (errors: string[]) => void
  /** Maximum number of rows allowed (default 500) */
  maxRows?: number
  /** Additional class names */
  className?: string
}

interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
}

function parseCSV(content: string): ParsedCSV {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted values with commas
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.replace(/^"|"$/g, '') || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

function generateTemplate(columns: string[]): string {
  return columns.join(',') + '\n'
}

export function CSVUpload({
  onUpload,
  templateColumns,
  requiredColumns,
  onValidationError,
  maxRows = 500,
  className,
}: CSVUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [parsedData, setParsedData] = React.useState<ParsedCSV | null>(null)
  const [errors, setErrors] = React.useState<string[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadSuccess, setUploadSuccess] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const validateCSV = (data: ParsedCSV): string[] => {
    const validationErrors: string[] = []

    // Check for required columns
    const missingColumns = templateColumns.filter(
      (col) => !data.headers.includes(col)
    )
    if (missingColumns.length > 0) {
      validationErrors.push(`Missing columns: ${missingColumns.join(', ')}`)
    }

    // Check row count
    if (data.rows.length > maxRows) {
      validationErrors.push(`Too many rows. Maximum allowed: ${maxRows}`)
    }

    if (data.rows.length === 0) {
      validationErrors.push('No data rows found in CSV')
    }

    // Check required fields in each row
    data.rows.forEach((row, index) => {
      requiredColumns.forEach((col) => {
        if (!row[col] || row[col].trim() === '') {
          validationErrors.push(`Row ${index + 2}: Missing required field "${col}"`)
        }
      })
    })

    return validationErrors
  }

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setErrors([])
    setUploadSuccess(false)

    try {
      const content = await selectedFile.text()
      const parsed = parseCSV(content)
      setParsedData(parsed)

      const validationErrors = validateCSV(parsed)
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        onValidationError?.(validationErrors)
      }
    } catch {
      const error = ['Failed to parse CSV file']
      setErrors(error)
      onValidationError?.(error)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      handleFile(droppedFile)
    } else {
      setErrors(['Please upload a CSV file'])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!parsedData || errors.length > 0) return

    setIsUploading(true)
    try {
      await onUpload(parsedData.rows)
      setUploadSuccess(true)
    } catch {
      setErrors(['Upload failed. Please try again.'])
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const template = generateTemplate(templateColumns)
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setFile(null)
    setParsedData(null)
    setErrors([])
    setUploadSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Template download */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Upload a CSV file with student data
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          file && 'border-solid'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {parsedData?.rows.length || 0} rows found
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              Drop your CSV file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum {maxRows} rows
            </p>
          </>
        )}
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[var(--danger-dark)] dark:text-[var(--danger)]">
                Validation Errors
              </p>
              <ul className="mt-2 text-sm text-[var(--chart-red)] dark:text-[var(--danger)] space-y-1">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {errors.length > 5 && (
                  <li className="text-[var(--chart-red)]">
                    ...and {errors.length - 5} more errors
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {uploadSuccess && (
        <div className="bg-[var(--success-light)] dark:bg-[var(--success-dark)] border border-[var(--success-light)] dark:border-[var(--success-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-[var(--success)]" />
            <p className="font-medium text-[var(--success-dark)] dark:text-[var(--success)]">
              Upload successful! {parsedData?.rows.length} records processed.
            </p>
          </div>
        </div>
      )}

      {/* Upload button */}
      {file && errors.length === 0 && !uploadSuccess && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : `Upload ${parsedData?.rows.length || 0} Records`}
        </Button>
      )}
    </div>
  )
}
