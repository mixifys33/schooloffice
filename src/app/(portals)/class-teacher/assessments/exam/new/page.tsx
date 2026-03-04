'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Plus, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'
import {
  cardStyles,
  typography,
  spacing,
  teacherColors,
  errorMessages
} from '@/lib/teacher-ui-standards'

/**
 * Create New Exam Entry Page for Class Teacher Portal
 * Requirements: 5.3, 5.4
 * - Create new exam entries with name, max score, type, and description
 */

interface ExamFormData {
  name: string
  maxScore: string
  type: string
  description: string
  classId: string
  streamId: string | null
}

interface ClassOption {
  id: string
  streamId: string | null
  name: string
  streamName: string | null
  displayName: string
}

export default function CreateClassTeacherExamEntryPage() {
  const [formData, setFormData] = useState<ExamFormData>({
    name: '',
    maxScore: '100',
    type: 'midterm',
    description: '',
    classId: '',
    streamId: null
  })
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch available classes
  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await fetch('/api/class-teacher/context')
        if (!response.ok) throw new Error('Failed to fetch classes')
        const data = await response.json()
        
        if (data.availableClasses && data.availableClasses.length > 0) {
          setAvailableClasses(data.availableClasses)
          // Set first class as default
          const firstClass = data.availableClasses[0]
          setFormData(prev => ({
            ...prev,
            classId: firstClass.id,
            streamId: firstClass.streamId
          }))
        }
      } catch (err) {
        console.error('Error fetching classes:', err)
        setError('Failed to load classes')
      } finally {
        setLoadingClasses(false)
      }
    }
    fetchClasses()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleClassChange = (value: string) => {
    const selected = availableClasses.find(
      cls => (cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id) === value
    )
    if (selected) {
      setFormData(prev => ({
        ...prev,
        classId: selected.id,
        streamId: selected.streamId
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Exam name is required')
      return
    }

    if (!formData.classId) {
      setError('Please select a class')
      return
    }
    
    const maxScoreNum = parseFloat(formData.maxScore)
    if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
      setError('Max score must be a positive number')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In a real app, you would make an API call here
      // const response = await fetch('/api/class-teacher/assessments/exam', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: formData.name,
      //     maxScore: maxScoreNum,
      //     type: formData.type,
      //     description: formData.description,
      //     classId: formData.classId,
      //     streamId: formData.streamId
      //   })
      // })
      
      setSuccess('Exam entry created successfully!')
      
      // Reset form to allow creating another entry
      setTimeout(() => {
        setFormData({
          name: '',
          maxScore: '100',
          type: 'midterm',
          description: '',
          classId: formData.classId, // Keep the same class selected
          streamId: formData.streamId
        })
        setSuccess(null)
      }, 2000)
    } catch (err) {
      setError('Failed to create exam entry')
    } finally {
      setLoading(false)
    }
  }

  if (loadingClasses) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/class-teacher/assessments"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--White-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assessments
      </Link>

      {/* Page Header */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
            <TrendingUp className="h-6 w-6 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              Create New Exam Entry
            </h1>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              Create a new Exam entry for your class (contributes 80% to final grade)
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-[var(--success-light)] dark:bg-[var(--success-dark)] border border-[var(--success-light)] dark:border-[var(--success-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-green)] dark:text-[var(--success)]">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Form Card */}
      <Card className={cn(cardStyles.base, cardStyles.normal)}>
        <CardHeader>
          <CardTitle className={cn(typography.sectionTitle)}>Exam Entry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Class Selection - Always show */}
            {availableClasses.length > 0 && (
              <div>
                <Label htmlFor="class-select">Select Class/Stream *</Label>
                <select
                  id="class-select"
                  value={formData.streamId ? `${formData.classId}-${formData.streamId}` : formData.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                >
                  {availableClasses.map((cls) => (
                    <option 
                      key={cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id} 
                      value={cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id}
                    >
                      {cls.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Show message if no classes available */}
            {availableClasses.length === 0 && !loadingClasses && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-5 w-5" />
                  <span>No classes available. Please contact your administrator.</span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="name">Exam Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Mid-Term Exam, End of Term Exam"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="maxScore">Max Score *</Label>
                <Input
                  id="maxScore"
                  name="maxScore"
                  type="number"
                  value={formData.maxScore}
                  onChange={handleInputChange}
                  min="1"
                  step="0.5"
                />
              </div>

              <div>
                <Label htmlFor="type">Exam Type</Label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                >
                  <option value="midterm">Mid-Term Exam</option>
                  <option value="endterm">End of Term Exam</option>
                  <option value="retest">Retest</option>
                  <option value="special">Special Exam</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                placeholder="Brief description of the exam..."
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="gap-2">
                <Plus className="h-4 w-4" />
                {loading ? 'Creating...' : 'Create Exam Entry'}
              </Button>
              
              <Link href="/class-teacher/assessments">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className={cn(cardStyles.base, cardStyles.normal)}>
        <CardHeader>
          <CardTitle className={cn(typography.sectionTitle)}>About Exam Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Info</Badge>
              <div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  Exams contribute 80% to the final grade
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Tip</Badge>
              <div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  Standard exam max score is 100 points
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Guidance</Badge>
              <div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  Common exam types include mid-term and end-of-term exams
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}