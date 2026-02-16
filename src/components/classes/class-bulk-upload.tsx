'use client'

import * as React from 'react'
import { useState, useCallback, useRef } from 'react'
import { Upload, Download, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ParsedRow {
  rowNumber: number
  name: string
  level: string
  levelType: string
  isValid: boolean
  errors: string[]
}

interface BulkUploadResult {
  success: number
  failed: number
  errors: string[]
}

export interface ClassBulkUploadProps {
  onUploadComplete?: (result: BulkUploadResult) => void
  onCancel?: () => void
}

export function ClassBulkUpload({ onUploadComplete, onCancel }: ClassBulkUploadProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'uploading' | 'complete'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = useCallback(() => {
    const headers = ['Class Name', 'Level', 'Level Type']
    const sampleData = [
      ['S1 East', '8', 'O_LEVEL'],
      ['S2 West', '9', 'O_LEVEL'],
      ['S5 Science', '12', 'A_LEVEL']
    ]
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'classes_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const parseCSV = useCallback((text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(line => line.trim())
    const rows: ParsedRow[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const [name, level, levelType] = values
      
      const errors: string[] = []
      if (!name) errors.push('Class name is required')
      if (!level) errors.push('Level is required')
      if (level && (isNaN(parseInt(level)) || parseInt(level) < 8 || parseInt(level) > 13)) {
        errors.push('Level must be between 8 (S1) and 13 (S6)')
      }
      if (!levelType) errors.push('Level type is required')
      if (levelType && !['O_LEVEL', 'A_LEVEL'].includes(levelType.toUpperCase())) {
        errors.push('Level type must be O_LEVEL or A_LEVEL')
      }
      
      rows.push({
        rowNumber: i + 1,
        name: name || '',
        level: level || '',
        levelType: levelType ? levelType.toUpperCase() : '',
        isValid: errors.length === 0,
        errors
      })
    }
    
    return rows
  }, [])

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }
    
    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setParsedRows(rows)
      setStep('preview')
    }
    reader.readAsText(selectedFile)
  }, [parseCSV])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleBulkUpload = useCallback(async () => {
    const validRows = parsedRows.filter(r => r.isValid)
    if (validRows.length === 0) return
    
    setStep('uploading')
    
    const results: BulkUploadResult = { success: 0, failed: 0, errors: [] }
    
    try {
      const response = await fetch('/api/classes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classes: validRows.map(row => ({
            name: row.name,
            level: parseInt(row.level, 10),
            levelType: row.levelType
          }))
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload classes')
      }
      
      const data = await response.json()
      results.success = data.created || 0
      results.failed = data.failed || 0
      results.errors = data.errors || []
      
    } catch (error) {
      results.failed = validRows.length
      results.errors = [error instanceof Error ? error.message : 'Upload failed']
    }
    
    setUploadResult(results)
    setStep('complete')
    onUploadComplete?.(results)
  }, [parsedRows, onUploadComplete])

  const validCount = parsedRows.filter(r => r.isValid).length
  const invalidCount = parsedRows.length - validCount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Upload Classes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with class data
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Drag and drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mb-4">or</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                Select File
              </Button>
            </div>
            
            {onCancel && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {validCount} valid, {invalidCount} invalid
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Row</th>
                    <th className="p-2 text-left">Class Name</th>
                    <th className="p-2 text-left">Level</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr key={row.rowNumber} className="border-t">
                      <td className="p-2">{row.rowNumber}</td>
                      <td className="p-2">{row.name}</td>
                      <td className="p-2">{row.level}</td>
                      <td className="p-2">
                        <Badge variant="secondary">
                          {row.levelType === 'O_LEVEL' ? 'O-Level' : row.levelType === 'A_LEVEL' ? 'A-Level' : row.levelType}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {row.isValid ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {row.errors[0]}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleBulkUpload} disabled={validCount === 0}>
                Upload {validCount} Class{validCount !== 1 ? 'es' : ''}
              </Button>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm font-medium">Uploading classes...</p>
          </div>
        )}

        {step === 'complete' && uploadResult && (
          <div className="space-y-4">
            <div className="text-center py-8">
              {uploadResult.success > 0 ? (
                <>
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-2">Upload Complete!</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadResult.success} class{uploadResult.success !== 1 ? 'es' : ''} created
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                  <p className="text-lg font-medium mb-2">Upload Failed</p>
                </>
              )}
            </div>
            
            {uploadResult.errors.length > 0 && (
              <div className="border rounded-lg p-4 bg-destructive/5">
                <p className="text-sm font-medium mb-2">Errors:</p>
                <ul className="text-xs space-y-1">
                  {uploadResult.errors.map((error, i) => (
                    <li key={i} className="text-destructive">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setStep('upload')
                setFile(null)
                setParsedRows([])
                setUploadResult(null)
              }}>
                Upload More
              </Button>
              <Button onClick={onCancel}>Done</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
