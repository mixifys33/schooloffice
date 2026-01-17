'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, AlertCircle, Download, Upload, FileSpreadsheet, FileText, Database, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { SelectField } from '@/components/ui/form-field'

/**
 * Bulk Student Upload Page
 * Supports: CSV, JSON, Excel (xlsx/xls), ODS, PDF, DOCX, SQL, Access DB
 */

interface UploadResult {
  success: number
  failed: number
  errors: string[]
  createdClasses?: string[] // Classes that were auto-created during upload
}

interface UploadProgress {
  processed: number
  total: number
  percentage: number
  currentStudent?: string
}

interface ExistingStudent {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string | null
  dateOfBirth: string | null
  className: string
  streamName: string | null
  parentName: string | null
  parentPhone: string | null
  parentEmail: string | null
}

const TEMPLATE_COLUMNS = [
  { key: 'admissionNumber', label: 'LIN (Learner ID)', required: true, example: 'LIN/2024/001' },
  { key: 'firstName', label: 'First Name', required: true, example: 'John' },
  { key: 'lastName', label: 'Last Name', required: true, example: 'Doe' },
  { key: 'gender', label: 'Gender', required: false, example: 'MALE or FEMALE' },
  { key: 'dateOfBirth', label: 'Date of Birth', required: false, example: '2015-01-15' },
  { key: 'className', label: 'Class Name', required: true, example: 'P1' },
  { key: 'streamName', label: 'Stream Name', required: false, example: 'A' },
  { key: 'parentName', label: 'Parent Name', required: false, example: 'Jane Doe' },
  { key: 'parentPhone', label: 'Parent Phone', required: false, example: '+256700000000' },
  { key: 'parentEmail', label: 'Parent Email', required: false, example: 'parent@email.com' },
]

const SUPPORTED_FORMATS = [
  { value: 'csv', label: 'CSV (.csv)', icon: FileSpreadsheet, ext: '.csv' },
  { value: 'json', label: 'JSON (.json)', icon: FileText, ext: '.json' },
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, ext: '.xlsx' },
  { value: 'xls', label: 'Excel 97-2003 (.xls)', icon: FileSpreadsheet, ext: '.xls' },
  { value: 'ods', label: 'OpenDocument (.ods)', icon: FileSpreadsheet, ext: '.ods' },
  { value: 'pdf', label: 'PDF (.pdf)', icon: FileText, ext: '.pdf' },
  { value: 'docx', label: 'Word (.docx)', icon: FileText, ext: '.docx' },
  { value: 'sql', label: 'SQL Dump (.sql)', icon: Database, ext: '.sql' },
  { value: 'mdb', label: 'Access (.mdb/.accdb)', icon: Database, ext: '.mdb' },
]


export default function StudentUploadPage() {
  const router = useRouter()
  const { toast, showToast, hideToast } = useLocalToast()
  
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadFormat, setDownloadFormat] = useState('csv')
  const [existingStudents, setExistingStudents] = useState<ExistingStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleBack = () => router.push('/dashboard/students')

  const fetchExistingStudents = useCallback(async () => {
    try {
      setLoadingStudents(true)
      const response = await fetch('/api/students?includeGuardians=true')
      if (response.ok) {
        const data = await response.json()
        setExistingStudents(data.students || [])
      }
    } catch (err) {
      console.error('Error fetching students:', err)
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useEffect(() => { fetchExistingStudents() }, [fetchExistingStudents])

  const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const generateCSV = (headers: string[], rows: string[][]) => {
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  }

  const generateJSON = (headers: string[], rows: string[][]) => {
    const data = rows.map(row => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = row[i] || '' })
      return obj
    })
    return new Blob([JSON.stringify({ students: data }, null, 2)], { type: 'application/json' })
  }

  const generateSpreadsheetXML = (headers: string[], rows: string[][]) => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Students"><Table>
<Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
${rows.map(row => `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`
    return new Blob([xmlContent], { type: 'application/vnd.ms-excel' })
  }

  const generatePDFContent = (headers: string[], rows: string[][]) => {
    const content = `STUDENT BULK UPLOAD TEMPLATE
============================
Required Fields: LIN, First Name, Last Name, Class Name

COLUMNS:
${headers.map((h, i) => `${i + 1}. ${TEMPLATE_COLUMNS[i].label} ${TEMPLATE_COLUMNS[i].required ? '(Required)' : '(Optional)'}`).join('\n')}

SAMPLE DATA:
${headers.join(' | ')}
${rows.map(r => r.join(' | ')).join('\n')}

INSTRUCTIONS:
- Fill in the data following the format above
- Save as CSV or Excel format for upload
- Gender: MALE or FEMALE | Date: YYYY-MM-DD | Phone: +256700000000
`
    return new Blob([content], { type: 'text/plain' })
  }

  const generateSQL = (headers: string[], rows: string[][]) => {
    const tableName = 'students_import'
    const createTable = `-- SQL Dump for Student Import\n-- Generated: ${new Date().toISOString()}\n\nCREATE TABLE IF NOT EXISTS ${tableName} (\n  ${headers.map((h, i) => `${h} VARCHAR(255)${TEMPLATE_COLUMNS[i].required ? ' NOT NULL' : ''}`).join(',\n  ')}\n);\n\n`
    const inserts = rows.map(row => `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${row.map(v => `'${v.replace(/'/g, "''")}'`).join(', ')});`).join('\n')
    return new Blob([createTable + inserts], { type: 'application/sql' })
  }

  const generateAccessSQL = (headers: string[], rows: string[][]) => {
    const tableName = 'tblStudentsImport'
    const content = `-- Microsoft Access Compatible SQL\n\nCREATE TABLE ${tableName} (\n  ID AUTOINCREMENT PRIMARY KEY,\n  ${headers.map((h, i) => `[${h}] TEXT(255)${TEMPLATE_COLUMNS[i].required ? ' NOT NULL' : ''}`).join(',\n  ')}\n);\n\n${rows.map(row => `INSERT INTO ${tableName} ([${headers.join('], [')}]) VALUES (${row.map(v => `"${v.replace(/"/g, '""')}"`).join(', ')});`).join('\n')}`
    return new Blob([content], { type: 'application/sql' })
  }

  const generateTemplateContent = (format: string, includeData: boolean = false) => {
    const headers = TEMPLATE_COLUMNS.map(c => c.key)
    const sampleRow = TEMPLATE_COLUMNS.map(c => c.example)
    const dataRows = includeData 
      ? existingStudents.map(s => [s.admissionNumber, s.firstName, s.lastName, s.gender || '', s.dateOfBirth || '', s.className, s.streamName || '', s.parentName || '', s.parentPhone || '', s.parentEmail || ''])
      : [sampleRow]

    switch (format) {
      case 'csv': return generateCSV(headers, dataRows)
      case 'json': return generateJSON(headers, dataRows)
      case 'xlsx': case 'xls': case 'ods': return generateSpreadsheetXML(headers, dataRows)
      case 'pdf': case 'docx': return generatePDFContent(headers, dataRows)
      case 'sql': return generateSQL(headers, dataRows)
      case 'mdb': return generateAccessSQL(headers, dataRows)
      default: return generateCSV(headers, dataRows)
    }
  }

  const downloadTemplate = (includeData: boolean = false) => {
    const format = SUPPORTED_FORMATS.find(f => f.value === downloadFormat)
    if (!format) return
    const blob = generateTemplateContent(downloadFormat, includeData)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `student_${includeData ? 'export' : 'template'}${format.ext}`
    a.click()
    URL.revokeObjectURL(url)
    showToast('success', `${includeData ? 'Student data' : 'Template'} downloaded!`)
  }


  // Field mapping for different possible header names
  const FIELD_MAPPINGS: Record<string, string> = {
    // Standard field names
    'admissionNumber': 'admissionNumber',
    'firstName': 'firstName', 
    'lastName': 'lastName',
    'gender': 'gender',
    'dateOfBirth': 'dateOfBirth',
    'className': 'className',
    'streamName': 'streamName',
    'parentName': 'parentName',
    'parentPhone': 'parentPhone',
    'parentEmail': 'parentEmail',
    
    // Alternative field names (case insensitive)
    'registrationnumber': 'admissionNumber',
    'registration number': 'admissionNumber',
    'registration_number': 'admissionNumber',
    'lin': 'admissionNumber',
    'learner id': 'admissionNumber',
    'admission number': 'admissionNumber',
    'admission_number': 'admissionNumber',
    
    'fullname': 'fullName', // Special handling needed
    'full name': 'fullName',
    'full_name': 'fullName',
    'name': 'fullName',
    
    'first name': 'firstName',
    'first_name': 'firstName',
    'firstname': 'firstName',
    'last name': 'lastName',
    'last_name': 'lastName',
    'lastname': 'lastName',
    'surname': 'lastName',
    
    'class name': 'className',
    'class_name': 'className',
    'classname': 'className',
    'class': 'className',
    'stream name': 'streamName',
    'stream_name': 'streamName',
    'streamname': 'streamName',
    'stream': 'streamName',
    
    'guardianrelation': 'parentName',
    'guardian relation': 'parentName',
    'guardian_relation': 'parentName',
    'parent name': 'parentName',
    'parent_name': 'parentName',
    'parentname': 'parentName',
    'guardian name': 'parentName',
    'guardian_name': 'parentName',
    'guardianname': 'parentName',
    
    'guardianphone': 'parentPhone',
    'guardian phone': 'parentPhone',
    'guardian_phone': 'parentPhone',
    'parent phone': 'parentPhone',
    'parent_phone': 'parentPhone',
    'parentphone': 'parentPhone',
    'phone': 'parentPhone',
    
    'parent email': 'parentEmail',
    'parent_email': 'parentEmail',
    'parentemail': 'parentEmail',
    'guardian email': 'parentEmail',
    'guardian_email': 'parentEmail',
    'guardianemail': 'parentEmail',
    'email': 'parentEmail',
    
    'date of birth': 'dateOfBirth',
    'date_of_birth': 'dateOfBirth',
    'dateofbirth': 'dateOfBirth',
    'dob': 'dateOfBirth',
    'birth date': 'dateOfBirth',
    'age': 'age', // We'll handle age conversion
    'village': 'village', // Extra field we can ignore
  }

  const normalizeFieldName = (fieldName: string): string => {
    const normalized = fieldName.toLowerCase().trim()
    return FIELD_MAPPINGS[normalized] || fieldName
  }

  const parseCSV = (text: string): Record<string, string>[] => {
    // Clean the text - remove BOM and normalize line endings
    const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = cleanText.trim().split('\n').filter(line => line.trim())
    
    if (lines.length < 2) throw new Error('CSV must have headers and at least one data row')
    
    console.log('Total lines found:', lines.length)
    console.log('First line (headers):', lines[0])
    console.log('Second line (first data):', lines[1])
    
    // Parse CSV line handling quoted values properly
    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"'
            i++
          } else {
            // Toggle quote state
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }
    
    const rawHeaders = parseLine(lines[0])
    console.log('Raw headers parsed:', rawHeaders)
    
    // Normalize headers to match expected field names
    const normalizedHeaders = rawHeaders.map(h => {
      const cleaned = h.trim().replace(/^"|"$/g, '') // Remove quotes
      const normalized = normalizeFieldName(cleaned)
      console.log(`Header "${cleaned}" -> "${normalized}"`)
      return normalized
    })
    
    console.log('Final normalized headers:', normalizedHeaders)
    
    const dataRows = lines.slice(1).map((line, idx) => {
      const values = parseLine(line)
      const row: Record<string, string> = {}
      
      // Use normalized headers for mapping
      normalizedHeaders.forEach((header, colIdx) => { 
        row[header] = (values[colIdx] || '').trim()
      })
      
      // Special handling for fullName - split into firstName and lastName
      if (row.fullName && !row.firstName && !row.lastName) {
        const nameParts = row.fullName.trim().split(/\s+/)
        if (nameParts.length >= 2) {
          row.firstName = nameParts[0]
          row.lastName = nameParts.slice(1).join(' ')
        } else if (nameParts.length === 1) {
          row.firstName = nameParts[0]
          row.lastName = nameParts[0] // Use same name for both if only one name provided
        }
        delete row.fullName // Remove the original fullName field
      }
      
      if (idx === 0) {
        console.log('First data row values:', values)
        console.log('First row mapped (before fullName processing):', { ...row })
        console.log('First row mapped (after fullName processing):', row)
        console.log('Required fields check:', {
          firstName: `"${row.firstName}" (${typeof row.firstName})`,
          lastName: `"${row.lastName}" (${typeof row.lastName})`,
          admissionNumber: `"${row.admissionNumber}" (${typeof row.admissionNumber})`,
          className: `"${row.className}" (${typeof row.className})`
        })
      }
      
      return row
    })
    
    console.log('Total data rows parsed:', dataRows.length)
    return dataRows
  }

  const parseJSON = (text: string): Record<string, string>[] => {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
    if (parsed.students && Array.isArray(parsed.students)) return parsed.students
    throw new Error('JSON must be an array or have a "students" array property')
  }

  const parseSpreadsheetXML = (text: string): Record<string, string>[] => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/xml')
    const rows = doc.querySelectorAll('Row')
    if (rows.length < 2) throw new Error('Spreadsheet must have headers and data')
    const headerCells = rows[0].querySelectorAll('Cell Data')
    const headers = Array.from(headerCells).map(c => c.textContent || '')
    return Array.from(rows).slice(1).map(row => {
      const cells = row.querySelectorAll('Cell Data')
      const obj: Record<string, string> = {}
      headers.forEach((h, idx) => { obj[h] = cells[idx]?.textContent || '' })
      return obj
    })
  }

  const parseFile = async (file: File): Promise<Record<string, string>[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const text = await file.text()
    switch (ext) {
      case 'csv': return parseCSV(text)
      case 'json': return parseJSON(text)
      case 'xlsx': case 'xls': case 'ods': return parseSpreadsheetXML(text)
      default: throw new Error(`Unsupported format: .${ext}. Use CSV, JSON, or Excel.`)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true)
      setUploadProgress(null)
      setError(null)
      setResult(null)
      
      // Read file content first for debugging
      const fileContent = await file.text()
      console.log('Raw file content (first 500 chars):', fileContent.substring(0, 500))
      
      const data = await parseFile(file)
      if (data.length === 0) throw new Error('No data found in file')

      console.log('Parsed data sample:', data[0])
      console.log('Data keys:', Object.keys(data[0]))
      console.log('Total rows parsed:', data.length)

      // Validate data before sending to API
      const validationErrors: string[] = []
      data.forEach((row, idx) => {
        const rowNum = idx + 2 // Account for header row
        if (!row.firstName?.trim()) {
          validationErrors.push(`Row ${rowNum}: Missing first name. Row data: ${JSON.stringify(row)}`)
        }
        if (!row.lastName?.trim()) {
          validationErrors.push(`Row ${rowNum}: Missing last name. Row data: ${JSON.stringify(row)}`)
        }
        if (!row.admissionNumber?.trim()) {
          validationErrors.push(`Row ${rowNum}: Missing admission number. Row data: ${JSON.stringify(row)}`)
        }
        if (!row.className?.trim()) {
          validationErrors.push(`Row ${rowNum}: Missing class name. Row data: ${JSON.stringify(row)}`)
        }
      })

      if (validationErrors.length > 0) {
        console.error('Validation errors:', validationErrors.slice(0, 5))
        throw new Error(`Data validation failed: ${validationErrors.slice(0, 3).join('; ')}${validationErrors.length > 3 ? ` and ${validationErrors.length - 3} more errors` : ''}`)
      }

      // Process in batches for better performance and progress tracking
      const BATCH_SIZE = 25 // Reduced batch size for better reliability
      const totalStudents = data.length
      let totalCreated = 0
      let totalFailed = 0
      const allErrors: string[] = []
      const allCreatedClasses: string[] = []

      setUploadProgress({ processed: 0, total: totalStudents, percentage: 0 })

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE)
        const batchStart = i + 1
        const batchEnd = Math.min(i + BATCH_SIZE, data.length)
        
        setUploadProgress({
          processed: i,
          total: totalStudents,
          percentage: Math.round((i / totalStudents) * 100),
          currentStudent: `Processing students ${batchStart}-${batchEnd} of ${totalStudents}`
        })

        try {
          // Add timeout to fetch request
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

          const response = await fetch('/api/students/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students: batch }),
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          const responseData = await response.json()
          
          if (response.ok) {
            totalCreated += responseData.created || 0
            totalFailed += responseData.failed || 0
            if (responseData.errors) {
              allErrors.push(...responseData.errors)
            }
            if (responseData.createdClasses) {
              // Add unique classes only
              responseData.createdClasses.forEach((className: string) => {
                if (!allCreatedClasses.includes(className)) {
                  allCreatedClasses.push(className)
                }
              })
            }
          } else {
            // If batch fails, count all as failed and show detailed error
            totalFailed += batch.length
            console.error(`Batch ${batchStart}-${batchEnd} failed:`, {
              status: response.status,
              statusText: response.statusText,
              error: responseData.error,
              details: responseData
            })
            allErrors.push(`Batch ${batchStart}-${batchEnd}: ${response.status} ${response.statusText} - ${responseData.error || 'Unknown error'}`)
          }
        } catch (batchError) {
          totalFailed += batch.length
          console.error(`Batch ${batchStart}-${batchEnd} network error:`, batchError)
          
          if (batchError instanceof Error && batchError.name === 'AbortError') {
            allErrors.push(`Batch ${batchStart}-${batchEnd}: Request timeout (30s)`)
          } else {
            allErrors.push(`Batch ${batchStart}-${batchEnd}: Network error - ${batchError instanceof Error ? batchError.message : 'Unknown network error'}`)
          }
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Final progress update
      setUploadProgress({
        processed: totalStudents,
        total: totalStudents,
        percentage: 100,
        currentStudent: 'Upload complete!'
      })

      setResult({ 
        success: totalCreated, 
        failed: totalFailed, 
        errors: allErrors, 
        createdClasses: allCreatedClasses 
      })

      if (totalCreated > 0) {
        showToast('success', `Uploaded ${totalCreated} students!`)
        fetchExistingStudents()
      }

      // Clear progress after 2 seconds
      setTimeout(() => setUploadProgress(null), 2000)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload')
      setUploadProgress(null)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0])
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
  }


  return (
    <div className="space-y-6 p-4 sm:p-6">
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />}

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bulk Student Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Download templates, export students, or upload bulk data</p>
        </div>
      </div>

      {uploadProgress && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-blue-800 dark:text-blue-200">Upload Progress</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">{uploadProgress.percentage}%</p>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 dark:bg-blue-800">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${uploadProgress.percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {uploadProgress.currentStudent || `${uploadProgress.processed} of ${uploadProgress.total} students processed`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <AlertBanner type="danger" message={error} dismissible />}

      {result && result.success > 0 && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Upload Complete</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {result.success} student{result.success !== 1 ? 's' : ''} created{result.failed > 0 && `, ${result.failed} failed`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.createdClasses && result.createdClasses.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">New Classes Created</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The following classes were not found and have been automatically created: {result.createdClasses.join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.errors.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">Some rows failed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
              {result.errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
              {result.errors.length > 10 && <li>...and {result.errors.length - 10} more errors</li>}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Download Templates & Export</CardTitle>
          <CardDescription>Download empty template or export existing student data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="w-full sm:w-64">
              <SelectField label="File Format" name="downloadFormat" value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value)}
                options={SUPPORTED_FORMATS.map(f => ({ value: f.value, label: f.label }))} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => downloadTemplate(false)} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />Empty Template
              </Button>
              <Button variant="outline" onClick={() => downloadTemplate(true)} disabled={existingStudents.length === 0 || loadingStudents} className="gap-2">
                <Users className="h-4 w-4" />{loadingStudents ? 'Loading...' : `Export ${existingStudents.length} Students`}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 pt-2">
            {SUPPORTED_FORMATS.map(format => {
              const Icon = format.icon
              return (
                <div key={format.value} className={`flex items-center gap-1 p-2 rounded border text-xs cursor-pointer ${downloadFormat === format.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'}`}
                  onClick={() => setDownloadFormat(format.value)}>
                  <Icon className="h-3 w-3" /><span>{format.ext}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Upload Student Data</CardTitle>
          <CardDescription>Supported: CSV, JSON, Excel (.xlsx, .xls), ODS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-600'}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">Drag and drop your file here, or click to browse</p>
            <input type="file" accept=".csv,.json,.xlsx,.xls,.ods" onChange={handleFileInput} className="hidden" id="file-upload" disabled={uploading} />
            <label htmlFor="file-upload">
              <Button variant="outline" disabled={uploading} asChild><span>{uploading ? 'Uploading...' : 'Select File'}</span></Button>
            </label>
            <p className="text-xs text-muted-foreground mt-2">Max 500 students per upload</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Template Fields</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 px-3">Field</th><th className="text-left py-2 px-3">Column</th><th className="text-left py-2 px-3">Required</th><th className="text-left py-2 px-3">Example</th></tr></thead>
              <tbody>
                {TEMPLATE_COLUMNS.map(col => (
                  <tr key={col.key} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium">{col.label}</td>
                    <td className="py-2 px-3 font-mono text-xs">{col.key}</td>
                    <td className="py-2 px-3">{col.required ? <span className="text-red-600">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                    <td className="py-2 px-3 text-muted-foreground">{col.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Instructions</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Download a template in your preferred format</li>
            <li>Required: LIN, First Name, Last Name, Class Name</li>
            <li>Optional: Gender, DOB, Stream, Parent info</li>
            <li>Gender: MALE/FEMALE | Date: YYYY-MM-DD | Phone: +256...</li>
            <li>Use "Export Students" to backup existing data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
