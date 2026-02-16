'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FolderOpen,
  Upload,
  FileText,
  Image,
  Video,
  File,
  Download,
  Eye,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'
import {
  cardStyles,
  typography,
  spacing,
  teacherColors,
  transitions,
  errorMessages
} from '@/lib/teacher-ui-standards'

/**
 * Learning Evidence Page for Teacher Portal
 * Requirements: 6.1, 6.2, 6.3
 * - Upload assignments, projects, practical work
 * - Link evidence to competencies and assessments
 * - Support multiple file types
 */

interface EvidenceFile {
  id: string
  fileName: string
  fileType: 'document' | 'image' | 'video' | 'other'
  fileSize: string
  uploadDate: string
  description: string
  linkedCompetencies: string[]
  linkedAssessments: string[]
  uploadedBy: string
}

interface ClassSubject {
  id: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
}

interface EvidenceData {
  classes: ClassSubject[]
  evidenceFiles: EvidenceFile[]
  isLoading: boolean
}

export default function LearningEvidencePage() {
  const [data, setData] = useState<EvidenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Upload form state
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [fileDescription, setFileDescription] = useState('')
  const [linkedCompetencies, setLinkedCompetencies] = useState<string[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/teacher/evidence')
        if (!response.ok) {
          throw new Error('Failed to fetch evidence data')
        }
        const evidenceData = await response.json()
        setData(evidenceData)
      } catch (err) {
        setError('Unable to load evidence data')
        console.error('Error fetching evidence data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files)
    }
  }

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !selectedClass || !selectedSubject) {
      setError('Please select files and class/subject')
      return
    }

    const formData = new FormData()
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i])
    }
    formData.append('classId', selectedClass)
    formData.append('subjectId', selectedSubject)
    formData.append('description', fileDescription)
    formData.append('linkedCompetencies', JSON.stringify(linkedCompetencies))

    try {
      const response = await fetch('/api/teacher/evidence/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload files')
      }

      // Refresh data
      const refreshResponse = await fetch('/api/teacher/evidence')
      if (refreshResponse.ok) {
        const evidenceData = await refreshResponse.json()
        setData(evidenceData)
      }

      // Reset form
      setSelectedFiles(null)
      setSelectedClass('')
      setSelectedSubject('')
      setFileDescription('')
      setLinkedCompetencies([])
      setShowUploadModal(false)

      setSuccessMessage('Files uploaded successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files')
    }
  }

  // Handle file deletion
  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this evidence file? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/teacher/evidence/${fileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete file')
      }

      // Refresh data
      const refreshResponse = await fetch('/api/teacher/evidence')
      if (refreshResponse.ok) {
        const evidenceData = await refreshResponse.json()
        setData(evidenceData)
      }

      setSuccessMessage('File deleted successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
    }
  }

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'image':
        return <Image className="h-5 w-5" />
      case 'video':
        return <Video className="h-5 w-5" />
      case 'document':
        return <FileText className="h-5 w-5" />
      default:
        return <File className="h-5 w-5" />
    }
  }

  // Get unique subjects for a class
  const getSubjectsForClass = (classId: string) => {
    if (!data) return []
    return Array.from(
      new Map(
        data.classes
          .filter(c => c.classId === classId)
          .map(c => [c.subjectId, { id: c.subjectId, name: c.subjectName }])
      ).values()
    )
  }

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Unable to load evidence data'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Success Message */}
      {successMessage && (
        <div className="bg-[var(--success-light)] dark:bg-[var(--success-dark)] border border-[var(--success-light)] dark:border-[var(--success-dark)] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-[var(--chart-green)] dark:text-[var(--success)]">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <FolderOpen className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Learning Evidence
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              Upload assignments, projects, and other evidence of learning for your assigned classes
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Total Files</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {data?.evidenceFiles?.length || 0}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                <FolderOpen className={cn('h-5 w-5', teacherColors.info.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Classes</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {Array.from(new Set(data?.classes?.map(c => c.classId) || [])).length}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.success.bg)}>
                <Users className={cn('h-5 w-5', teacherColors.success.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Subjects</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {Array.from(new Set(data?.classes?.map(c => c.subjectId) || [])).length}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                <BookOpen className={cn('h-5 w-5', teacherColors.info.text)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardStyles.base, cardStyles.compact)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>Recent Uploads</p>
                <p className={cn(typography.h2, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  {data?.evidenceFiles?.filter(f => 
                    new Date(f.uploadDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length || 0}
                </p>
              </div>
              <div className={cn('p-2 rounded-lg', teacherColors.warning.bg)}>
                <Clock className={cn('h-5 w-5', teacherColors.warning.text)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>Upload Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={() => setShowUploadModal(true)} 
                  className="w-full gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload New Evidence
                </Button>

                <div className="text-center py-4">
                  <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                    Supported formats: PDF, DOC, DOCX, JPG, PNG, MP4
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classes Summary */}
          <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle)}>My Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from(
                  new Map(
                    (data?.classes || []).map(c => [c.classId, { id: c.classId, name: c.className }])
                  ).values()
                ).map((cls) => (
                  <div 
                    key={cls.id} 
                    className="p-3 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                          {cls.name}
                        </h3>
                        <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                          {(data?.classes || []).filter(c => c.classId === cls.id).length} subjects
                        </p>
                      </div>
                      <Badge variant="outline">
                        {(data?.evidenceFiles || []).filter(f => f.fileName.includes(cls.name)).length} files
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evidence Files List */}
        <div className="lg:col-span-2">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(typography.sectionTitle)}>Uploaded Evidence</CardTitle>
              <Badge variant="outline">{data?.evidenceFiles?.length || 0} files</Badge>
            </CardHeader>
            <CardContent>
              {(data?.evidenceFiles?.length || 0) > 0 ? (
                <div className="space-y-4">
                  {(data?.evidenceFiles || []).map((file) => (
                    <div 
                      key={file.id} 
                      className="p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                            {getFileIcon(file.fileType)}
                          </div>
                          <div>
                            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                              {file.fileName}
                            </h3>
                            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
                              {file.description || 'No description provided'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {file.linkedCompetencies.slice(0, 3).map((comp, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {comp}
                                </Badge>
                              ))}
                              {file.linkedCompetencies.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{file.linkedCompetencies.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                              {new Date(file.uploadDate).toLocaleDateString('en-UG', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className={cn(typography.caption, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
                              {file.fileSize}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDelete(file.id)}
                              className="text-[var(--chart-red)] dark:text-[var(--danger)] hover:text-[var(--chart-red)] dark:hover:text-[var(--danger)]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
                    No Evidence Uploaded
                  </h3>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] max-w-md mx-auto')}>
                    You haven't uploaded any learning evidence yet. Click the button above to upload assignments, projects, or other evidence of learning.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn(typography.sectionTitle)}>Upload Learning Evidence</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* File Selection */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Select Files
                  </label>
                  <div className="border-2 border-dashed border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg p-6 text-center">
                    <Upload className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                      Drag and drop files here, or click to browse
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG, MP4
                    </p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block mt-3 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg cursor-pointer hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      Choose Files
                    </label>
                    {selectedFiles && (
                      <p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        {selectedFiles.length} file(s) selected
                      </p>
                    )}
                  </div>
                </div>

                {/* Class and Subject Selection */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                      Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    >
                      <option value="">Select a class</option>
                      {Array.from(
                        new Map(
                          (data?.classes || []).map(c => [c.classId, { id: c.classId, name: c.className }])
                        ).values()
                      ).map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                      Subject
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      disabled={!selectedClass}
                      className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a subject</option>
                      {getSubjectsForClass(selectedClass).map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    placeholder="Describe what this evidence represents..."
                  />
                </div>

                {/* Linked Competencies */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Linked Competencies (Optional)
                  </label>
                  <input
                    type="text"
                    value={linkedCompetencies.join(', ')}
                    onChange={(e) => setLinkedCompetencies(e.target.value.split(',').map(item => item.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    placeholder="Enter competencies separated by commas..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowUploadModal(false)
                      setSelectedFiles(null)
                      setSelectedClass('')
                      setSelectedSubject('')
                      setFileDescription('')
                      setLinkedCompetencies([])
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpload} disabled={!selectedFiles || !selectedClass || !selectedSubject}>
                    Upload Files
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Import X icon for the modal close button
const X = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)