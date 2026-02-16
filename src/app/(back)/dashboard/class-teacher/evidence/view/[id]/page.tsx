'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  AlertCircle,
  Loader2,
  ExternalLink,
  Calendar,
  User,
  BookOpen,
  Users,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  cardStyles,
  typography,
  spacing,
  teacherColors,
} from '@/lib/teacher-ui-standards'

interface EvidenceFile {
  id: string
  fileName: string
  fileType: 'document' | 'image' | 'video' | 'other'
  fileSize: string
  fileUrl: string
  uploadDate: string
  description: string
  linkedCompetencies: string[]
  linkedAssessments: string[]
  uploadedBy: string
  className: string
  subjectName: string
}

export default function EvidenceViewPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.id as string

  const [file, setFile] = useState<EvidenceFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFile() {
      try {
        const response = await fetch('/api/class-teacher/evidence')
        if (!response.ok) {
          throw new Error('Failed to fetch evidence data')
        }
        const data = await response.json()
        const foundFile = data.evidenceFiles.find((f: EvidenceFile) => f.id === fileId)
        
        if (!foundFile) {
          throw new Error('File not found')
        }
        
        setFile(foundFile)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setLoading(false)
      }
    }

    fetchFile()
  }, [fileId])

  const handleDownload = async () => {
    if (!file) return
    try {
      // Fetch the file
      const response = await fetch(file.fileUrl)
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.fileName
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      // Fallback: open in new tab
      window.open(file.fileUrl, '_blank')
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'image':
        return <ImageIcon className="h-6 w-6" />
      case 'video':
        return <Video className="h-6 w-6" />
      case 'document':
        return <FileText className="h-6 w-6" />
      default:
        return <File className="h-6 w-6" />
    }
  }

  const renderFilePreview = () => {
    if (!file) return null

    const fileType = file.fileType.toLowerCase()
    const fileName = file.fileName.toLowerCase()

    // Image preview
    if (fileType === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) {
      return (
        <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4 flex items-center justify-center min-h-[400px]">
          <img
            src={file.fileUrl}
            alt={file.fileName}
            className="max-w-full max-h-[600px] object-contain rounded-lg"
          />
        </div>
      )
    }

    // Video preview
    if (fileType === 'video' || /\.(mp4|webm|ogg|mov)$/i.test(fileName)) {
      return (
        <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4">
          <video
            controls
            className="w-full max-h-[600px] rounded-lg"
            src={file.fileUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )
    }

    // PDF preview
    if (/\.pdf$/i.test(fileName)) {
      return (
        <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4">
          <iframe
            src={file.fileUrl}
            className="w-full h-[600px] rounded-lg border-0"
            title={file.fileName}
          />
        </div>
      )
    }

    // Audio preview
    if (/\.(mp3|wav|ogg|m4a)$/i.test(fileName)) {
      return (
        <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className={cn('p-6 rounded-full mb-6', teacherColors.info.bg)}>
            <FileText className={cn('h-16 w-16', teacherColors.info.text)} />
          </div>
          <audio controls className="w-full max-w-md">
            <source src={file.fileUrl} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      )
    }

    // Text/Code files
    if (/\.(txt|csv|json|xml|html|css|js|ts|tsx|jsx|md)$/i.test(fileName)) {
      return (
        <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4">
          <iframe
            src={file.fileUrl}
            className="w-full h-[600px] rounded-lg border-0"
            title={file.fileName}
          />
        </div>
      )
    }

    // Office documents (Word, Excel, PowerPoint) - Use Google Docs Viewer
    if (/\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(fileName)) {
      return (
        <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.fileUrl)}&embedded=true`}
            className="w-full h-[600px] rounded-lg border-0"
            title={file.fileName}
          />
        </div>
      )
    }

    // Default: Show download option
    return (
      <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className={cn('p-6 rounded-full mb-6', teacherColors.info.bg)}>
          {getFileIcon(file.fileType)}
        </div>
        <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
          Preview not available
        </h3>
        <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-6 text-center max-w-md')}>
          This file type cannot be previewed in the browser. Click the button below to download and view it on your device.
        </p>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download File
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--accent-primary)] mx-auto mb-4" />
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Loading file...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !file) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-6">
          <div className="flex items-center gap-3 text-[var(--chart-red)] dark:text-[var(--danger)] mb-4">
            <AlertCircle className="h-6 w-6" />
            <h2 className={typography.h2}>File Not Found</h2>
          </div>
          <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4')}>
            {error || 'The file you are looking for could not be found.'}
          </p>
          <Link href="/dashboard/class-teacher/evidence">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Evidence
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mb-6')}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/class-teacher/evidence">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className={typography.pageTitle}>View Evidence</h1>
              <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
                {file.fileName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* File Preview */}
        <div className="lg:col-span-2">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>File Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {renderFilePreview()}
            </CardContent>
          </Card>
        </div>

        {/* File Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* File Information */}
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>File Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">File Name</span>
                </div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] break-all')}>
                  {file.fileName}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                  <File className="h-4 w-4" />
                  <span className="text-sm font-medium">File Size</span>
                </div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {file.fileSize}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Upload Date</span>
                </div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {new Date(file.uploadDate).toLocaleDateString('en-UG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">Uploaded By</span>
                </div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {file.uploadedBy}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Class</span>
                </div>
                <Badge variant="outline">{file.className}</Badge>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Subject</span>
                </div>
                <Badge variant="outline">{file.subjectName}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {file.description && (
            <Card className={cn(cardStyles.base, cardStyles.normal)}>
              <CardHeader>
                <CardTitle className={cn(typography.sectionTitle)}>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {file.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Linked Competencies */}
          {file.linkedCompetencies.length > 0 && (
            <Card className={cn(cardStyles.base, cardStyles.normal)}>
              <CardHeader>
                <CardTitle className={cn(typography.sectionTitle, 'flex items-center gap-2')}>
                  <Tag className="h-4 w-4" />
                  Linked Competencies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {file.linkedCompetencies.map((comp, idx) => (
                    <Badge key={idx} variant="secondary">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
