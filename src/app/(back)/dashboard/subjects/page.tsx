'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Plus, BookOpen, Edit2, Trash2, Users, Building2, X, Upload } from 'lucide-react'
import { DataTable, Column } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Card, CardContent } from '@/components/ui/card'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { FormField } from '@/components/ui/form-field'
import { SelectField } from '@/components/ui/form-field'
import { SubjectBulkUpload } from '@/components/subjects/subject-bulk-upload'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

/**
 * Subjects Management Page
 * Requirements: 11.2 - Manage subjects for the school
 */

interface SubjectItem {
  id: string
  name: string
  code: string
  levelType?: 'O_LEVEL' | 'A_LEVEL'
  isCompulsory?: boolean
  teacherCount: number
  classCount: number
}

interface FormData {
  name: string
  code: string
  levelType: string
  isCompulsory: boolean
}

interface FormErrors {
  name?: string
  code?: string
  levelType?: string
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [filteredSubjects, setFilteredSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { toast, showToast, hideToast } = useLocalToast()

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null)
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<FormData>({ 
    name: '', 
    code: '', 
    levelType: '',
    isCompulsory: true 
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subjects')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subjects')
      }

      const data: SubjectItem[] = await response.json()
      setSubjects(data)
      setFilteredSubjects(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching subjects:', err)
      setError('Unable to load subjects. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  // Filter subjects based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSubjects(subjects)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = subjects.filter(
      (subject) =>
        subject.name.toLowerCase().includes(query) ||
        subject.code.toLowerCase().includes(query)
    )
    setFilteredSubjects(filtered)
  }, [searchQuery, subjects])

  const validateForm = (): boolean => {
    const errors: FormErrors = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Subject name is required'
    }
    
    if (!formData.code.trim()) {
      errors.code = 'Subject code is required'
    } else if (formData.code.length > 10) {
      errors.code = 'Code must be 10 characters or less'
    }

    if (!formData.levelType) {
      errors.levelType = 'Level type is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleOpenDialog = (subject?: SubjectItem) => {
    if (subject) {
      setEditingSubject(subject)
      setFormData({ 
        name: subject.name, 
        code: subject.code,
        levelType: (subject as any).levelType || '',
        isCompulsory: (subject as any).isCompulsory ?? true
      })
    } else {
      setEditingSubject(null)
      setFormData({ 
        name: '', 
        code: '',
        levelType: '',
        isCompulsory: true
      })
    }
    setFormErrors({})
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingSubject(null)
    setFormData({ 
      name: '', 
      code: '',
      levelType: '',
      isCompulsory: true
    })
    setFormErrors({})
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const url = editingSubject 
        ? `/api/subjects/${editingSubject.id}` 
        : '/api/subjects'
      const method = editingSubject ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save subject')
      }

      showToast('success', editingSubject ? 'Subject updated' : 'Subject created')
      handleCloseDialog()
      fetchSubjects()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save subject')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (subject: SubjectItem) => {
    setSubjectToDelete(subject)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/subjects/${subjectToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete subject')
      }

      showToast('success', 'Subject deleted')
      setDeleteDialogOpen(false)
      setSubjectToDelete(null)
      fetchSubjects()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete subject')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Column<SubjectItem>[] = [
    {
      key: 'name',
      header: 'Subject Name',
      render: (_value, subject) => (
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{subject.name}</span>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (_value, subject) => (
        <Badge variant="secondary">{subject.code}</Badge>
      ),
    },
    {
      key: 'levelType',
      header: 'Level',
      render: (_value, subject) => (
        subject.levelType ? (
          <Badge variant="outline">
            {subject.levelType === 'O_LEVEL' ? 'O-Level' : 'A-Level'}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'isCompulsory',
      header: 'Type',
      render: (_value, subject) => (
        subject.levelType === 'O_LEVEL' ? (
          <Badge variant={subject.isCompulsory ? 'default' : 'secondary'} className="text-xs">
            {subject.isCompulsory ? 'Compulsory' : 'Optional'}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'teacherCount',
      header: 'Teachers',
      render: (_value, subject) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{subject.teacherCount}</span>
        </div>
      ),
    },
    {
      key: 'classCount',
      header: 'Classes',
      render: (_value, subject) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{subject.classCount}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_value, subject) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenDialog(subject)
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteClick(subject)
            }}
            className="text-[var(--chart-red)] hover:text-[var(--chart-red)] hover:bg-[var(--danger-light)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Subjects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage school subjects
            </p>
          </div>
        </div>
        <SkeletonLoader variant="table" count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={hideToast} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowBulkUpload(true)} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Subject</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: fetchSubjects }}
        />
      )}

      {/* Search */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search subjects by name or code..."
      />

      {/* Empty State */}
      {subjects.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Subjects Yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Get started by creating your first subject.
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Subjects Table */}
      {filteredSubjects.length > 0 && (
        <DataTable
          data={filteredSubjects}
          columns={columns}
          keyExtractor={(subject) => subject.id}
        />
      )}

      {/* No Results */}
      {subjects.length > 0 && filteredSubjects.length === 0 && searchQuery && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              No subjects match your search.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <DialogPrimitive.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/20 dark:bg-black/40',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-50 w-full max-w-md',
              'translate-x-[-50%] translate-y-[-50%]',
              'bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg shadow-lg p-6',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'duration-200'
            )}
          >
            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
              onClick={handleCloseDialog}
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>

            <DialogPrimitive.Title className="text-lg font-semibold mb-4">
              {editingSubject ? 'Edit Subject' : 'Add Subject'}
            </DialogPrimitive.Title>

            <div className="space-y-4">
              <FormField
                label="Subject Name"
                name="name"
                type="text"
                placeholder="e.g., Mathematics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                required
                touchFriendly
              />
              <FormField
                label="Subject Code"
                name="code"
                type="text"
                placeholder="e.g., MATH"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                error={formErrors.code}
                helpText="A short unique identifier (e.g., MATH, ENG, SCI)"
                required
                touchFriendly
              />
              <SelectField
                label="Level Type"
                name="levelType"
                options={[
                  { value: 'O_LEVEL', label: 'O-Level (S1-S4)' },
                  { value: 'A_LEVEL', label: 'A-Level (S5-S6)' }
                ]}
                placeholder="Select level type"
                value={formData.levelType}
                onChange={(e) => setFormData({ ...formData, levelType: e.target.value })}
                error={formErrors.levelType}
                required
                helpText="Select whether this is an O-Level or A-Level subject"
              />
              {formData.levelType === 'O_LEVEL' && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <input
                    type="checkbox"
                    id="isCompulsory"
                    checked={formData.isCompulsory}
                    onChange={(e) => setFormData({ ...formData, isCompulsory: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <label htmlFor="isCompulsory" className="text-sm font-medium cursor-pointer">
                      Compulsory Subject
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check if this subject is compulsory for all O-Level students
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleCloseDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        actionType="delete"
        title="Delete Subject"
        itemName={subjectToDelete?.name}
        description={
          subjectToDelete && (subjectToDelete.teacherCount > 0 || subjectToDelete.classCount > 0)
            ? `This subject is assigned to ${subjectToDelete.teacherCount} teacher(s) and ${subjectToDelete.classCount} class(es). These assignments will be removed.`
            : 'This action cannot be undone. The subject will be permanently removed.'
        }
        onConfirm={handleConfirmDelete}
        isLoading={submitting}
      />

      {/* Bulk Upload Dialog */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <SubjectBulkUpload
              onUploadComplete={(result) => {
                if (result.success > 0) {
                  showToast('success', `${result.success} subject${result.success !== 1 ? 's' : ''} created successfully`)
                  fetchSubjects()
                }
                if (result.failed > 0) {
                  showToast('error', `${result.failed} subject${result.failed !== 1 ? 's' : ''} failed to create`)
                }
                setShowBulkUpload(false)
              }}
              onCancel={() => setShowBulkUpload(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
