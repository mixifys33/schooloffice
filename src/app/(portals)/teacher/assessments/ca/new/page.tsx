'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Plus, AlertCircle, CheckCircle } from 'lucide-react'
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
 * Create New CA Entry Page for Teacher Portal
 * Requirements: 5.3, 5.4
 * - Create new CA entries with name, max score, type, and description
 */

interface CAFormData {
  name: string
  maxScore: string
  type: string
  description: string
}

export default function CreateCAEntryPage() {
  const [formData, setFormData] = useState<CAFormData>({
    name: '',
    maxScore: '10',
    type: 'assignment',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('CA name is required')
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
      // const response = await fetch('/api/teacher/assessments/ca', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: formData.name,
      //     maxScore: maxScoreNum,
      //     type: formData.type,
      //     description: formData.description
      //   })
      // })
      
      setSuccess('CA entry created successfully!')
      setTimeout(() => {
        window.history.back()
      }, 1500)
    } catch (err) {
      setError('Failed to create CA entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/teacher/assessments"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assessments
      </Link>

      {/* Page Header */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
            <FileText className="h-6 w-6 text-[var(--chart-green)] dark:text-[var(--chart-green)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              Create New CA Entry
            </h1>
            <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
              Create a new Continuous Assessment entry for your class
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
          <CardTitle className={cn(typography.sectionTitle)}>CA Entry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">CA Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Assignment 1, Quiz 2, Project"
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
                <Label htmlFor="type">CA Type</Label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="project">Project</option>
                  <option value="test">Test</option>
                  <option value="practical">Practical</option>
                  <option value="observation">Observation</option>
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
                placeholder="Brief description of the CA..."
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="gap-2">
                <Plus className="h-4 w-4" />
                {loading ? 'Creating...' : 'Create CA Entry'}
              </Button>
              
              <Link href="/teacher/assessments">
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
          <CardTitle className={cn(typography.sectionTitle)}>About CA Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Info</Badge>
              <div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  CA (Continuous Assessment) contributes 20% to the final grade
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Tip</Badge>
              <div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  You can create multiple CA entries per subject to track different types of assessments
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">Guidance</Badge>
              <div>
                <p className={cn(typography.body, 'text-[var(--text-primary)] dark:text-[var(--white-pure)]')}>
                  Common CA types include assignments, quizzes, projects, and practical work
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}