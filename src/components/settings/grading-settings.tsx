'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, Award, Calculator, Trophy, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * Grading Settings Component
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 * - Grading scale, pass marks, exam weights, ranking rules
 */

interface ExamWeight {
  type: string
  weight: number
}

interface TermContribution {
  term: number
  weight: number
}

interface GradingSettingsData {
  gradingScaleType: 'LETTER' | 'PERCENTAGE' | 'POINTS'
  passMarkPercentage: number
  examWeights: ExamWeight[]
  termContributionRules: TermContribution[]
  enableClassRanking: boolean
  enableSubjectRanking: boolean
}

const GRADING_SCALE_TYPES = [
  { value: 'LETTER', label: 'Letter Grades (A, B, C, D, F)' },
  { value: 'PERCENTAGE', label: 'Percentage (0-100%)' },
  { value: 'POINTS', label: 'Points System' },
]

const DEFAULT_EXAM_WEIGHTS: ExamWeight[] = [
  { type: 'BOT', weight: 20 },
  { type: 'MID', weight: 30 },
  { type: 'EOT', weight: 50 },
]

export function GradingSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<GradingSettingsData>({
    gradingScaleType: 'PERCENTAGE',
    passMarkPercentage: 50,
    examWeights: DEFAULT_EXAM_WEIGHTS,
    termContributionRules: [],
    enableClassRanking: true,
    enableSubjectRanking: true,
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/grading')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: GradingSettingsData = await response.json()
      setFormData({
        gradingScaleType: data.gradingScaleType || 'PERCENTAGE',
        passMarkPercentage: data.passMarkPercentage || 50,
        examWeights: data.examWeights?.length ? data.examWeights : DEFAULT_EXAM_WEIGHTS,
        termContributionRules: data.termContributionRules || [],
        enableClassRanking: data.enableClassRanking ?? true,
        enableSubjectRanking: data.enableSubjectRanking ?? true,
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Unable to load grading settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleExamWeightChange = (index: number, field: 'type' | 'weight', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      examWeights: prev.examWeights.map((w, i) => 
        i === index ? { ...w, [field]: field === 'weight' ? Number(value) : value } : w
      )
    }))
  }

  const addExamWeight = () => {
    setFormData(prev => ({
      ...prev,
      examWeights: [...prev.examWeights, { type: '', weight: 0 }]
    }))
  }

  const removeExamWeight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      examWeights: prev.examWeights.filter((_, i) => i !== index)
    }))
  }

  const getTotalWeight = () => formData.examWeights.reduce((sum, w) => sum + w.weight, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const totalWeight = getTotalWeight()
    if (totalWeight !== 100) {
      showToast('error', `Exam weights must sum to 100 (currently ${totalWeight})`)
      return
    }
    try {
      setSaving(true)
      const response = await fetch('/api/settings/grading', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      showToast('success', 'Grading settings saved successfully')
      fetchSettings()
    } catch (err) {
      console.error('Error saving settings:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SkeletonLoader variant="card" count={2} />
  }

  if (error) {
    return <AlertBanner type="danger" message={error} action={{ label: 'Retry', onClick: fetchSettings }} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Grading Scale
            </CardTitle>
            <CardDescription>Configure grading system and pass marks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Grading Scale Type</label>
              <select name="gradingScaleType" value={formData.gradingScaleType} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {GRADING_SCALE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <FormField 
              label="Pass Mark (%)" 
              name="passMarkPercentage" 
              type="number" 
              value={formData.passMarkPercentage.toString()} 
              onChange={handleInputChange} 
              helpText="Minimum percentage to pass"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ranking Options
            </CardTitle>
            <CardDescription>Configure ranking display options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="enableClassRanking" name="enableClassRanking" checked={formData.enableClassRanking} onChange={handleInputChange} className="rounded border-input" />
              <label htmlFor="enableClassRanking" className="text-sm font-medium">Enable Class Ranking</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="enableSubjectRanking" name="enableSubjectRanking" checked={formData.enableSubjectRanking} onChange={handleInputChange} className="rounded border-input" />
              <label htmlFor="enableSubjectRanking" className="text-sm font-medium">Enable Subject Ranking</label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Exam Weights
          </CardTitle>
          <CardDescription>
            Configure how different exam types contribute to final grades (must sum to 100)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {formData.examWeights.map((weight, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={weight.type}
                  onChange={(e) => handleExamWeightChange(index, 'type', e.target.value)}
                  placeholder="Exam Type (e.g., BOT, MID, EOT)"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  value={weight.weight}
                  onChange={(e) => handleExamWeightChange(index, 'weight', e.target.value)}
                  placeholder="Weight %"
                  min="0"
                  max="100"
                  className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeExamWeight(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addExamWeight} className="gap-2">
              <Plus className="h-4 w-4" /> Add Exam Type
            </Button>
            <div className={`text-sm font-medium ${getTotalWeight() === 100 ? 'text-[var(--chart-green)]' : 'text-[var(--chart-red)]'}`}>
              Total: {getTotalWeight()}%
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
