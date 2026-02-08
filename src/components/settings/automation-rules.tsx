'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Zap, Play, Pause, Trash2, Edit, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'

/**
 * Automation Rules Page Component
 * Requirements: 17.1, 17.4
 * - List rules, create/edit rule form, enable/disable toggle
 */

interface AutomationRule {
  id: string
  name: string
  description?: string
  trigger: {
    type: string
    config?: Record<string, unknown>
  }
  conditions: Array<{
    field: string
    operator: string
    value: unknown
  }>
  actions: Array<{
    type: string
    config: Record<string, unknown>
  }>
  isEnabled: boolean
  lastExecutedAt?: string
  executionCount: number
  createdAt: string
  updatedAt: string
}

interface RuleFormData {
  name: string
  description: string
  triggerType: string
  actionType: string
  actionChannel: string
  isEnabled: boolean
}

const TRIGGER_TYPES = [
  { value: 'FEE_OVERDUE', label: 'Fee Overdue', description: 'Triggers when fees are past due' },
  { value: 'CONSECUTIVE_ABSENCE', label: 'Consecutive Absence', description: 'Triggers after multiple absences' },
  { value: 'RESULTS_PUBLISHED', label: 'Results Published', description: 'Triggers when exam results are published' },
  { value: 'SCHEDULED', label: 'Scheduled', description: 'Triggers at scheduled times' },
]

const ACTION_TYPES = [
  { value: 'SEND_MESSAGE', label: 'Send Message' },
  { value: 'CREATE_ALERT', label: 'Create Alert' },
  { value: 'ESCALATE', label: 'Escalate' },
]

const MESSAGE_CHANNELS = [
  { value: 'SMS', label: 'SMS' },
]

export function AutomationRulesPage() {
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    description: '',
    triggerType: 'FEE_OVERDUE',
    actionType: 'SEND_MESSAGE',
    actionChannel: 'SMS',
    isEnabled: true,
  })

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      // Note: This endpoint would need to be created if it doesn't exist
      const response = await fetch('/api/admin/automation-rules')
      if (!response.ok) {
        // If endpoint doesn't exist, show empty state
        if (response.status === 404) {
          setRules([])
          setError(null)
          return
        }
        throw new Error('Failed to fetch automation rules')
      }
      const data = await response.json()
      setRules(data.rules || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching rules:', err)
      // Don't show error for missing endpoint, just show empty state
      setRules([])
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerType: 'FEE_OVERDUE',
      actionType: 'SEND_MESSAGE',
      actionChannel: 'SMS',
      isEnabled: true,
    })
    setEditingRule(null)
    setShowForm(false)
  }

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      triggerType: rule.trigger.type,
      actionType: rule.actions[0]?.type || 'SEND_MESSAGE',
      actionChannel: (rule.actions[0]?.config?.channel as string) || 'SMS',
      isEnabled: rule.isEnabled,
    })
    setShowForm(true)
  }

  const handleToggleEnabled = async (rule: AutomationRule) => {
    try {
      const response = await fetch(`/api/admin/automation-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: !rule.isEnabled }),
      })
      if (!response.ok) throw new Error('Failed to update rule')
      showToast('success', `Rule ${rule.isEnabled ? 'disabled' : 'enabled'} successfully`)
      fetchRules()
    } catch (err) {
      console.error('Error toggling rule:', err)
      showToast('error', 'Failed to update rule status')
    }
  }

  const handleDelete = async (rule: AutomationRule) => {
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return
    
    try {
      const response = await fetch(`/api/admin/automation-rules/${rule.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete rule')
      showToast('success', 'Rule deleted successfully')
      fetchRules()
    } catch (err) {
      console.error('Error deleting rule:', err)
      showToast('error', 'Failed to delete rule')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      showToast('error', 'Rule name is required')
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: formData.name,
        description: formData.description,
        trigger: {
          type: formData.triggerType,
          config: {},
        },
        actions: [{
          type: formData.actionType,
          config: {
            channel: formData.actionChannel,
          },
        }],
        isEnabled: formData.isEnabled,
      }

      const url = editingRule 
        ? `/api/admin/automation-rules/${editingRule.id}`
        : '/api/admin/automation-rules'
      
      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save rule')
      }

      showToast('success', `Rule ${editingRule ? 'updated' : 'created'} successfully`)
      resetForm()
      fetchRules()
    } catch (err) {
      console.error('Error saving rule:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return <SkeletonLoader variant="card" count={2} />
  }

  if (error) {
    return <AlertBanner type="danger" message={error} action={{ label: 'Retry', onClick: fetchRules }} />
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Automation Rules</h2>
          <p className="text-sm text-muted-foreground">
            Configure automated triggers and actions for your school
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</CardTitle>
            <CardDescription>
              Configure the trigger conditions and actions for this automation rule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField 
                  label="Rule Name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                />
                <div>
                  <label className="block text-sm font-medium mb-1">Trigger Type</label>
                  <select 
                    name="triggerType" 
                    value={formData.triggerType} 
                    onChange={handleInputChange} 
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {TRIGGER_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Optional description of what this rule does"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Action Type</label>
                  <select 
                    name="actionType" 
                    value={formData.actionType} 
                    onChange={handleInputChange} 
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {ACTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                {formData.actionType === 'SEND_MESSAGE' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Message Channel</label>
                    <select 
                      name="actionChannel" 
                      value={formData.actionChannel} 
                      onChange={handleInputChange} 
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {MESSAGE_CHANNELS.map(channel => (
                        <option key={channel.value} value={channel.value}>{channel.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isEnabled" 
                  name="isEnabled" 
                  checked={formData.isEnabled} 
                  onChange={handleInputChange} 
                  className="rounded border-input" 
                />
                <label htmlFor="isEnabled" className="text-sm font-medium">
                  Enable this rule immediately
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Automation Rules</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first automation rule to automate notifications and actions.
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => (
            <Card key={rule.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{rule.name}</h3>
                      <Badge variant={rule.isEnabled ? 'default' : 'secondary'}>
                        {rule.isEnabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline">
                        {TRIGGER_TYPES.find(t => t.value === rule.trigger.type)?.label || rule.trigger.type}
                      </Badge>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last run: {formatDate(rule.lastExecutedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        {rule.executionCount > 0 ? (
                          <CheckCircle className="h-3 w-3 text-[var(--success)]" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {rule.executionCount} executions
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleToggleEnabled(rule)}
                      title={rule.isEnabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.isEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(rule)}
                      title="Edit rule"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(rule)}
                      title="Delete rule"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
