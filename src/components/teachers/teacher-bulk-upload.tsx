'use client'

import * as React from 'react'
import { useState, useCallback, useRef } from 'react'
import { Upload, Download, FileSpreadsheet, X, Check, AlertCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EmploymentType, TeacherJobTitle } from '@/types/teacher'
import { Gender } from '@/types/enums'

/**
 * Teacher Bulk Upload Component
 * Features:
 * - CSV/Excel file upload
 * - Field mapping interface
 * - Template download
 * - Validation preview
 * - Bulk creation
 */

interface FieldMapping {
  csvColumn: string
  systemField: string
}

interface ParsedRow {
  rowNumber: number
  data: Record<string, string>
  errors: string[]
  isValid: boolean
}

interface BulkUploadResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

// System fields that can be mapped
const SYSTEM_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'gender', label: 'Gender', required: true },
  { key: 'nationalId', label: 'National ID', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'dateOfBirth', label: 'Date of Birth', required: true },
  { key: 'employmentType', label: 'Employment Type', required: true },
  { key: 'jobTitle', label: 'Job Title', required: true },
  { key: 'department', label: 'Department', required: true },
  { key: 'dateOfAppointment', label: 'Date of Appointment', required: true },
  { key: 'address', label: 'Address', required: false },
]

const TEMPLATE_HEADERS = SYSTEM_FIELDS.map(f => f.label)

export interface TeacherBulkUploadProps {
  onUploadComplete?: (result: BulkUploadResult) => void
  onCancel?: () => void
}

export function TeacherBulkUpload({ onUploadComplete, onCancel }: TeacherBulkUploadProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'uploading' | 'complete'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvData, setCsvData] = useState<string[][]>([])
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null)
  const [showMappingHelp, setShowMappingHelp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse CSV content
  const parseCSV = useCallback((content: string): { headers: string[]; data: string[][] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim())
    if (lines.length === 0) return { headers: [], data: [] }

    const parseRow = (row: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < row.length; i++) {
        const char = row[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseRow(lines[0])
    const data = lines.slice(1).map(parseRow)

    return { headers, data }
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)

    const content = await selectedFile.text()
    const { headers, data } = parseCSV(content)

    setCsvHeaders(headers)
    setCsvData(data)

    // Auto-map fields based on header names
    const autoMappings: FieldMapping[] = []
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '')
      const matchedField = SYSTEM_FIELDS.find(field => {
        const normalizedField = field.label.toLowerCase().replace(/[_\s-]/g, '')
        const normalizedKey = field.key.toLowerCase()
        return normalizedHeader === normalizedField || 
               normalizedHeader === normalizedKey ||
               normalizedHeader.includes(normalizedField) ||
               normalizedField.includes(normalizedHeader)
      })
      if (matchedField) {
        autoMappings.push({ csvColumn: header, systemField: matchedField.key })
      }
    })
    setFieldMappings(autoMappings)
    setStep('mapping')
  }, [parseCSV])

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      handleFileSelect(droppedFile)
    }
  }, [handleFileSelect])

  // Update field mapping
  const updateMapping = useCallback((csvColumn: string, systemField: string) => {
    setFieldMappings(prev => {
      const existing = prev.find(m => m.csvColumn === csvColumn)
      if (existing) {
        if (systemField === '') {
          return prev.filter(m => m.csvColumn !== csvColumn)
        }
        return prev.map(m => m.csvColumn === csvColumn ? { ...m, systemField } : m)
      }
      if (systemField) {
        return [...prev, { csvColumn, systemField }]
      }
      return prev
    })
  }, [])

  // Validate and parse rows based on mappings
  const validateAndParseRows = useCallback(() => {
    const rows: ParsedRow[] = csvData.map((row, index) => {
      const data: Record<string, string> = {}
      const errors: string[] = []

      // Map CSV columns to system fields
      fieldMappings.forEach(mapping => {
        const colIndex = csvHeaders.indexOf(mapping.csvColumn)
        if (colIndex !== -1) {
          data[mapping.systemField] = row[colIndex] || ''
        }
      })

      // Validate required fields
      SYSTEM_FIELDS.filter(f => f.required).forEach(field => {
        if (!data[field.key] || data[field.key].trim() === '') {
          errors.push(`${field.label} is required`)
        }
      })

      // Validate email format
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email format')
      }

      // Validate gender
      if (data.gender) {
        const normalizedGender = data.gender.toUpperCase()
        if (!['MALE', 'FEMALE', 'M', 'F'].includes(normalizedGender)) {
          errors.push('Gender must be Male or Female')
        }
      }

      // Validate employment type
      if (data.employmentType) {
        const normalizedType = data.employmentType.toUpperCase().replace(/[\s-]/g, '_')
        if (!Object.values(EmploymentType).includes(normalizedType as EmploymentType)) {
          errors.push('Invalid employment type')
        }
      }

      return {
        rowNumber: index + 2, // +2 for 1-based index and header row
        data,
        errors,
        isValid: errors.length === 0,
      }
    })

    setParsedRows(rows)
    setStep('preview')
  }, [csvData, csvHeaders, fieldMappings])

  // Download template
  const downloadTemplate = useCallback(() => {
    const csvContent = [
      TEMPLATE_HEADERS.join(','),
      'John,Doe,Male,ID123456,+256700000000,john.doe@school.com,1990-01-15,FULL_TIME,CLASS_TEACHER,Sciences,2024-01-01,123 Main Street',
      'Jane,Smith,Female,ID789012,+256700000001,jane.smith@school.com,1985-06-20,PART_TIME,SUBJECT_TEACHER,Languages,2024-02-15,456 Oak Avenue',
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'teacher_upload_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Download current data as CSV
  const downloadCurrentData = useCallback(async () => {
    try {
      const response = await fetch('/api/teachers?format=csv')
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'teachers_export.csv'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download teachers:', error)
    }
  }, [])

  // Submit bulk upload
  const handleBulkUpload = useCallback(async () => {
    const validRows = parsedRows.filter(r => r.isValid)
    if (validRows.length === 0) return

    setStep('uploading')

    const results: BulkUploadResult = { success: 0, failed: 0, errors: [] }

    for (const row of validRows) {
      try {
        // Normalize data
        const teacherData = {
          firstName: row.data.firstName,
          lastName: row.data.lastName,
          gender: normalizeGender(row.data.gender),
          nationalId: row.data.nationalId,
          phone: row.data.phone,
          email: row.data.email,
          dateOfBirth: row.data.dateOfBirth,
          employmentType: normalizeEmploymentType(row.data.employmentType),
          jobTitle: normalizeJobTitle(row.data.jobTitle),
          department: row.data.department,
          dateOfAppointment: row.data.dateOfAppointment,
          address: row.data.address || undefined,
        }

        const response = await fetch('/api/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teacherData),
        })

        if (response.ok) {
          results.success++
        } else {
          const errorData = await response.json()
          results.failed++
          results.errors.push({ row: row.rowNumber, error: errorData.error || 'Unknown error' })
        }
      } catch {
        results.failed++
        results.errors.push({ row: row.rowNumber, error: 'Network error' })
      }
    }

    setUploadResult(results)
    setStep('complete')
    onUploadComplete?.(results)
  }, [parsedRows, onUploadComplete])

  // Reset to start
  const resetUpload = useCallback(() => {
    setStep('upload')
    setFile(null)
    setCsvHeaders([])
    setCsvData([])
    setFieldMappings([])
    setParsedRows([])
    setUploadResult(null)
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Upload Teachers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCurrentData}>
                <Download className="h-4 w-4 mr-2" />
                Export Current Teachers
              </Button>
            </div>

            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                'hover:border-[var(--info)] hover:bg-[var(--info-light)] dark:hover:bg-[var(--info-dark)]'
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
              <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports CSV files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>

            {onCancel && (
              <div className="flex justify-end">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
              </div>
            )}
          </div>
        )}

        {/* Step: Field Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Map CSV Columns to System Fields</p>
                <p className="text-sm text-muted-foreground">
                  File: {file?.name} ({csvData.length} rows)
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMappingHelp(!showMappingHelp)}
              >
                {showMappingHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Help
              </Button>
            </div>

            {showMappingHelp && (
              <div className="p-4 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg text-sm">
                <p className="font-medium mb-2">Field Mapping Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Required fields are marked with *</li>
                  <li>Gender: Use &quot;Male&quot;, &quot;Female&quot;, &quot;M&quot;, or &quot;F&quot;</li>
                  <li>Employment Type: FULL_TIME, PART_TIME, CONTRACT, VOLUNTEER</li>
                  <li>Job Title: CLASS_TEACHER, SUBJECT_TEACHER, HEAD_OF_DEPARTMENT, etc.</li>
                  <li>Dates: Use YYYY-MM-DD format</li>
                </ul>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                  <tr>
                    <th className="px-4 py-2 text-left">CSV Column</th>
                    <th className="px-4 py-2 text-left">Maps To</th>
                    <th className="px-4 py-2 text-left">Sample Data</th>
                  </tr>
                </thead>
                <tbody>
                  {csvHeaders.map((header, index) => {
                    const mapping = fieldMappings.find(m => m.csvColumn === header)
                    const sampleValue = csvData[0]?.[index] || ''
                    return (
                      <tr key={header} className="border-t">
                        <td className="px-4 py-2 font-medium">{header}</td>
                        <td className="px-4 py-2">
                          <select
                            className="w-full p-2 border rounded"
                            value={mapping?.systemField || ''}
                            onChange={(e) => updateMapping(header, e.target.value)}
                          >
                            <option value="">-- Skip --</option>
                            {SYSTEM_FIELDS.map(field => (
                              <option key={field.key} value={field.key}>
                                {field.label} {field.required ? '*' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]">
                          {sampleValue}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetUpload}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={validateAndParseRows}>
                Continue to Preview
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Preview & Validate</p>
                <p className="text-sm text-muted-foreground">
                  {parsedRows.filter(r => r.isValid).length} valid, {parsedRows.filter(r => !r.isValid).length} with errors
                </p>
              </div>
            </div>

            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-12">Row</th>
                    <th className="px-3 py-2 text-left w-12">Status</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-left">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr key={row.rowNumber} className={cn('border-t', !row.isValid && 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]')}>
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        {row.isValid ? (
                          <Check className="h-4 w-4 text-[var(--chart-green)]" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-[var(--chart-red)]" />
                        )}
                      </td>
                      <td className="px-3 py-2">{row.data.firstName} {row.data.lastName}</td>
                      <td className="px-3 py-2">{row.data.email}</td>
                      <td className="px-3 py-2">{row.data.department}</td>
                      <td className="px-3 py-2 text-[var(--chart-red)] text-xs">
                        {row.errors.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={parsedRows.filter(r => r.isValid).length === 0}
              >
                Upload {parsedRows.filter(r => r.isValid).length} Teachers
              </Button>
            </div>
          </div>
        )}

        {/* Step: Uploading */}
        {step === 'uploading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-[var(--chart-blue)]" />
            <p className="text-lg font-medium">Uploading teachers...</p>
            <p className="text-sm text-muted-foreground">Please wait while we process your data</p>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && uploadResult && (
          <div className="space-y-4">
            <div className="py-8 text-center">
              {uploadResult.success > 0 ? (
                <Check className="h-12 w-12 mx-auto mb-4 text-[var(--chart-green)]" />
              ) : (
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-[var(--chart-red)]" />
              )}
              <p className="text-lg font-medium">Upload Complete</p>
              <p className="text-sm text-muted-foreground">
                {uploadResult.success} teachers created successfully
                {uploadResult.failed > 0 && `, ${uploadResult.failed} failed`}
              </p>
            </div>

            {uploadResult.errors.length > 0 && (
              <div className="border rounded-lg p-4 bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]">
                <p className="font-medium text-[var(--chart-red)] mb-2">Errors:</p>
                <ul className="text-sm space-y-1">
                  {uploadResult.errors.map((err, i) => (
                    <li key={i}>Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={resetUpload}>
                Upload More
              </Button>
              {onCancel && (
                <Button onClick={onCancel}>Done</Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper functions for normalizing data
function normalizeGender(value: string): Gender {
  const normalized = value?.toUpperCase().trim()
  if (normalized === 'M' || normalized === 'MALE') return 'MALE' as Gender
  if (normalized === 'F' || normalized === 'FEMALE') return 'FEMALE' as Gender
  return 'MALE' as Gender
}

function normalizeEmploymentType(value: string): EmploymentType {
  const normalized = value?.toUpperCase().replace(/[\s-]/g, '_').trim()
  if (Object.values(EmploymentType).includes(normalized as EmploymentType)) {
    return normalized as EmploymentType
  }
  return EmploymentType.FULL_TIME
}

function normalizeJobTitle(value: string): TeacherJobTitle {
  const normalized = value?.toUpperCase().replace(/[\s-]/g, '_').trim()
  if (Object.values(TeacherJobTitle).includes(normalized as TeacherJobTitle)) {
    return normalized as TeacherJobTitle
  }
  return TeacherJobTitle.SUBJECT_TEACHER
}

export default TeacherBulkUpload
