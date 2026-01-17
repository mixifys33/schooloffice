'use client'

import React, { useState } from 'react'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  ActionButton, 
  ErrorMessagePanel, 
  ButtonGroup 
} from '@/components/teacher'
import { 
  cardStyles, 
  typography, 
  spacing, 
  transitions 
} from '@/lib/teacher-ui-standards'

/**
 * Assignment Creation Form
 * Requirement 7.1: Create assignment with subject, class, title, description, deadline, attachments
 */

interface AssignedClass {
  classId: string
  className: string
  subjectId: string
  subjectName: string
}

interface AssignmentFormProps {
  assignedClasses: AssignedClass[]
  onSuccess: () => void
  onCancel: () => void
}

export function AssignmentForm({ assignedClasses, onSuccess, onCancel }: AssignmentFormProps) {
  const [formData, setFormData] = useState({
    classSubject: '',
    title: '',
    description: '',
    deadline: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Parse class and subject from combined value
    const [classId, subjectId] = formData.classSubject.split('|')
    
    if (!classId || !subjectId) {
      setError('Please select a class and subject')
      return
    }

    if (!formData.title.trim()) {
      setError('Please enter a title')
      return
    }

    if (!formData.description.trim()) {
      setError('Please enter a description')
      return
    }

    if (!formData.deadline) {
      setError('Please set a deadline')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          subjectId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          deadline: new Date(formData.deadline).toISOString(),
          attachments: [],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create assignment')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      <div className="flex items-center gap-4 mb-4">
        <ActionButton
          label="Back"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={onCancel}
          variant="outline"
          size="sm"
        />
        <h1 className={typography.pageTitle}>
          Create Assignment
        </h1>
      </div>

      <div className={cn(cardStyles.base, cardStyles.normal)}>
        <div className={cn(cardStyles.header, 'mb-4')}>
          <h2 className={typography.sectionTitle}>Assignment Details</h2>
        </div>
        
        <form onSubmit={handleSubmit} className={spacing.form}>
          {/* Error display - Requirement 12.4: Clear error messages */}
          {error && (
            <ErrorMessagePanel
              config={{
                title: 'Form Error',
                message: error,
                nextSteps: ['Check all required fields', 'Ensure deadline is in the future']
              }}
              onRetry={() => setError(null)}
            />
          )}

          {/* Class & Subject Selection */}
          <div>
            <label htmlFor="classSubject" className={cn(typography.label, 'block mb-1')}>
              Class & Subject *
            </label>
            <select
              id="classSubject"
              value={formData.classSubject}
              onChange={(e) => setFormData({ ...formData, classSubject: e.target.value })}
              className={cn(
                'w-full px-3 py-2 rounded-md border',
                'bg-white dark:bg-slate-800',
                'border-slate-300 dark:border-slate-600',
                'text-slate-900 dark:text-white',
                'focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
                transitions.color
              )}
              required
            >
              <option value="">Select class and subject</option>
              {assignedClasses.map((c) => (
                <option key={`${c.classId}-${c.subjectId}`} value={`${c.classId}|${c.subjectId}`}>
                  {c.className} - {c.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className={cn(typography.label, 'block mb-1')}>
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Chapter 5 Homework"
              className={cn(
                'w-full px-3 py-2 rounded-md border',
                'bg-white dark:bg-slate-800',
                'border-slate-300 dark:border-slate-600',
                'text-slate-900 dark:text-white',
                'focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
                transitions.color
              )}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={cn(typography.label, 'block mb-1')}>
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the assignment requirements..."
              className={cn(
                'w-full px-3 py-2 rounded-md border min-h-[120px]',
                'bg-white dark:bg-slate-800',
                'border-slate-300 dark:border-slate-600',
                'text-slate-900 dark:text-white',
                'focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
                transitions.color
              )}
              required
            />
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className={cn(typography.label, 'block mb-1')}>
              Deadline *
            </label>
            <input
              id="deadline"
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              min={getMinDate()}
              className={cn(
                'w-full px-3 py-2 rounded-md border',
                'bg-white dark:bg-slate-800',
                'border-slate-300 dark:border-slate-600',
                'text-slate-900 dark:text-white',
                'focus:ring-2 focus:ring-slate-500 focus:border-slate-500',
                transitions.color
              )}
              required
            />
            <p className={cn(typography.caption, 'mt-1')}>
              Note: Deadline cannot be modified after it passes
            </p>
          </div>

          {/* Actions - Requirements 12.2, 12.3 */}
          <ButtonGroup className="justify-end pt-2">
            <ActionButton
              label="Cancel"
              onClick={onCancel}
              variant="outline"
            />
            <ActionButton
              label="Create Assignment"
              type="submit"
              isLoading={loading}
              loadingLabel="Creating..."
              variant="primary"
            />
          </ButtonGroup>
        </form>
      </div>
    </div>
  )
}
