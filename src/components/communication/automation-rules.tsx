'use client'

/**
 * Automation Rules Management Component
 * Provides UI for creating, editing, and managing automation rules with execution history
 * Requirements: 11.4
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  X,
  History,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TriggerType,
  ExecutionStatus,
  TargetType,
  MessageChannel,
} from '@/types/enums'

interface AutomationRule {
  id: string
  name: string
  description?: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  targetType: TargetType
  targetCriteria: Record<string, unknown>
  templateId?: string
  channel: MessageChannel
  isActive: boolean
  lastExecutedAt?: string
  executionCount: number
  createdAt: string
  updatedAt: string
}

interface TriggerConfig {
  cronExpression?: string
  scheduledDates?: string[]
  eventConditions?: EventCondition[]
  delayMinutes?: number
}

interface EventCondition {
  field: string
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan'
  value: string | number
}

interface AutomationExecution {
  id: string
  ruleId: string
  triggeredAt: string
  completedAt?: string
  status: ExecutionStatus
  recipientCount: number
  successCount: number
  failureCount: number
  errorMessage?: string
}

interface TemplateOption {
  id: string
  type: string
  content: string
  channel: MessageChannel
}

interface AutomationRulesProps {
  schoolId?: string
  onRuleCreated?: (rule: AutomationRule) => void
  onRuleUpdated?: (rule: AutomationRule) => void
  onRuleDeleted?: (ruleId: string) => void
}

const TRIGGER_TYPE_CONFIG: Record<TriggerType, { label: string; icon: React.ElementType; description: string }> = {
  [TriggerType.SCHEDULED]: { label: 'Scheduled', icon: Calendar, description: 'Run at specific times' },
  [TriggerType.EVENT_ATTENDANCE]: { label: 'Attendance Event', icon: Clock, description: 'When attendance is marked' },
  [TriggerType.EVENT_PAYMENT]: { label: 'Payment Event', icon: CheckCircle, description: 'When payment is received' },
  [TriggerType.EVENT_RESULTS]: { label: 'Results Event', icon: Zap, description: 'When results are published' },
  [TriggerType.EVENT_FEE_DUE]: { label: 'Fee Due Event', icon: AlertTriangle, description: 'When fees become due' },
  [TriggerType.MANUAL]: { label: 'Manual', icon: Play, description: 'Triggered manually' },
}

const EXECUTION_STATUS_CONFIG: Record<ExecutionStatus, { color: string; icon: React.ElementType }> = {
  [ExecutionStatus.PENDING]: { color: 'text-[var(--text-muted)]', icon: Clock },
  [ExecutionStatus.RUNNING]: { color: 'text-[var(--accent-primary)]', icon: RefreshCw },
  [ExecutionStatus.COMPLETED]: { color: 'text-[var(--success)]', icon: CheckCircle },
  [ExecutionStatus.FAILED]: { color: 'text-[var(--danger)]', icon: XCircle },
  [ExecutionStatus.CANCELLED]: { color: 'text-[var(--warning)]', icon: XCircle },
}

const TARGET_TYPE_OPTIONS = [
  { value: TargetType.ENTIRE_SCHOOL, label: 'Entire School' },
  { value: TargetType.CLASS, label: 'By Class' },
  { value: TargetType.STREAM, label: 'By Stream' },
  { value: TargetType.FEE_DEFAULTERS, label: 'Fee Defaulters' },
  { value: TargetType.ATTENDANCE_BELOW, label: 'Low Attendance' },
  { value: TargetType.STAFF_ROLE, label: 'Staff by Role' },
]

export function AutomationRules({ onRuleCreated, onRuleUpdated, onRuleDeleted }: AutomationRulesProps) {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<TemplateOption[]>([])

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [formData, setFormData] = useState<Partial<AutomationRule>>({
    name: '',
    description: '',
    triggerType: TriggerType.SCHEDULED,
    triggerConfig: {},
    targetType: TargetType.ENTIRE_SCHOOL,
    targetCriteria: {},
    channel: MessageChannel.SMS,
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  // Execution history
  const [selectedRuleHistory, setSelectedRuleHistory] = useState<string | null>(null)
  const [executions, setExecutions] = useState<AutomationExecution[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Delete confirmation
  const [deletingRule, setDeletingRule] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/communication/automation')
      if (!response.ok) throw new Error('Failed to fetch automation rules')
      const data = await response.json()
      setRules(data.rules || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching rules:', err)
      setError('Failed to load automation rules')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/sms/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
    }
  }, [])

  useEffect(() => {
    fetchRules()
    fetchTemplates()
  }, [fetchRules, fetchTemplates])

  const fetchExecutionHistory = useCallback(async (ruleId: string) => {
    try {
      setLoadingHistory(true)
      const response = await fetch(`/api/communication/automation/${ruleId}/executions`)
      if (!response.ok) throw new Error('Failed to fetch execution history')
      const data = await response.json()
      setExecutions(data.executions || [])
    } catch (err) {
      console.error('Error fetching execution history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const handleShowHistory = (ruleId: string) => {
    setSelectedRuleHistory(ruleId)
    fetchExecutionHistory(ruleId)
  }

  const handleOpenForm = (rule?: AutomationRule) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        description: rule.description,
        triggerType: rule.triggerType,
        triggerConfig: rule.triggerConfig,
        targetType: rule.targetType,
        targetCriteria: rule.targetCriteria,
        templateId: rule.templateId,
        channel: rule.channel,
        isActive: rule.isActive,
      })
    } else {
      setEditingRule(null)
      setFormData({
        name: '',
        description: '',
        triggerType: TriggerType.SCHEDULED,
        triggerConfig: {},
        targetType: TargetType.ENTIRE_SCHOOL,
        targetCriteria: {},
        channel: MessageChannel.SMS,
        isActive: true,
      })
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRule(null)
    setFormData({
      name: '',
      description: '',
      triggerType: TriggerType.SCHEDULED,
      triggerConfig: {},
      targetType: TargetType.ENTIRE_SCHOOL,
      targetCriteria: {},
      channel: MessageChannel.SMS,
      isActive: true,
    })
  }

  const handleSaveRule = async () => {
    if (!formData.name?.trim()) {
      setError('Rule name is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const payload = {
        ...formData,
        triggerConfig: formData.triggerConfig || {},
        targetCriteria: formData.targetCriteria || {},
      }

      let response: Response
      if (editingRule) {
        response = await fetch(`/api/communication/automation/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch('/api/communication/automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save rule')
      }

      const savedRule = await response.json()
      
      if (editingRule) {
        setRules(prev => prev.map(r => r.id === savedRule.id ? savedRule : r))
        onRuleUpdated?.(savedRule)
      } else {
        setRules(prev => [...prev, savedRule])
        onRuleCreated?.(savedRule)
      }

      handleCloseForm()
    } catch (err) {
      console.error('Error saving rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      const response = await fetch(`/api/communication/automation/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })

      if (!response.ok) throw new Error('Failed to update rule')

      const updatedRule = await response.json()
      setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r))
      onRuleUpdated?.(updatedRule)
    } catch (err) {
      console.error('Error toggling rule:', err)
    }
  }

  const handleDeleteRule = async () => {
    if (!deletingRule) return

    try {
      const response = await fetch(`/api/communication/automation/${deletingRule}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete rule')

      setRules(prev => prev.filter(r => r.id !== deletingRule))
      onRuleDeleted?.(deletingRule)
      setDeletingRule(null)
      setConfirmDelete(false)
    } catch (err) {
      console.error('Error deleting rule:', err)
    }
  }

  const handleExecuteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/communication/automation/${ruleId}/execute`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to execute rule')

      fetchRules()
    } catch (err) {
      console.error('Error executing rule:', err)
    }
  }

  const updateTriggerConfig = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      triggerConfig: { ...prev.triggerConfig, [key]: value },
    }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Rules
          </CardTitle>
          <Button onClick={() => handleOpenForm()} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/20 dark:text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No automation rules configured</p>
            <Button variant="outline" className="mt-4" onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-1" />
              Create your first rule
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const triggerConfig = TRIGGER_TYPE_CONFIG[rule.triggerType]
              const TriggerIcon = triggerConfig?.icon || Zap

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-md border ${
                    rule.isActive ? 'bg-background' : 'bg-muted/50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${rule.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <TriggerIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            rule.isActive
                              ? 'bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)]/30 dark:text-[var(--success)]'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-muted)]'
                          }`}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TriggerIcon className="h-3 w-3" />
                            {triggerConfig?.label}
                          </span>
                          <span>Channel: {rule.channel}</span>
                          <span>Runs: {rule.executionCount}</span>
                          {rule.lastExecutedAt && (
                            <span>Last: {new Date(rule.lastExecutedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(rule)}
                        title={rule.isActive ? 'Pause rule' : 'Activate rule'}
                      >
                        {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExecuteRule(rule.id)}
                        title="Run now"
                        disabled={!rule.isActive}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowHistory(rule.id)}
                        title="View history"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenForm(rule)}
                        title="Edit rule"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDeletingRule(rule.id); setConfirmDelete(true) }}
                        title="Delete rule"
                        className="text-[var(--danger)] hover:text-[var(--chart-red)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Rule Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">{editingRule ? 'Edit Rule' : 'Create Rule'}</h3>
                <button onClick={handleCloseForm}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rule Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Daily Absence Notifications"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this rule does..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Trigger Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(TRIGGER_TYPE_CONFIG).map(([type, config]) => {
                      const Icon = config.icon
                      return (
                        <button
                          key={type}
                          onClick={() => setFormData(prev => ({ ...prev, triggerType: type as TriggerType }))}
                          className={`flex items-center gap-2 p-3 rounded-md border text-left text-sm ${
                            formData.triggerType === type
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-input hover:bg-accent'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{config.label}</div>
                            <div className="text-xs opacity-75">{config.description}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {formData.triggerType === TriggerType.SCHEDULED && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Cron Expression</label>
                    <input
                      type="text"
                      value={formData.triggerConfig?.cronExpression || ''}
                      onChange={(e) => updateTriggerConfig('cronExpression', e.target.value)}
                      placeholder="0 8 * * 1-5 (8am weekdays)"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: minute hour day month weekday
                    </p>
                  </div>
                )}

                {(formData.triggerType === TriggerType.EVENT_ATTENDANCE ||
                  formData.triggerType === TriggerType.EVENT_PAYMENT) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Delay (minutes)</label>
                    <input
                      type="number"
                      value={formData.triggerConfig?.delayMinutes || 0}
                      onChange={(e) => updateTriggerConfig('delayMinutes', parseInt(e.target.value))}
                      min={0}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Target Recipients</label>
                  <div className="relative">
                    <select
                      value={formData.targetType || TargetType.ENTIRE_SCHOOL}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value as TargetType }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none"
                    >
                      {TARGET_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Channel</label>
                  <div className="flex gap-2">
                    {Object.values(MessageChannel).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setFormData(prev => ({ ...prev, channel: ch }))}
                        className={`px-4 py-2 rounded-md border text-sm ${
                          formData.channel === ch
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-input hover:bg-accent'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Message Template</label>
                  <div className="relative">
                    <select
                      value={formData.templateId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none"
                    >
                      <option value="">Select a template...</option>
                      {templates.filter(t => t.channel === formData.channel).map((t) => (
                        <option key={t.id} value={t.id}>{t.type.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-input"
                  />
                  <label htmlFor="isActive" className="text-sm">Enable rule immediately</label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleCloseForm} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRule} disabled={saving} className="flex-1">
                    {saving ? (
                      <><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        Saving...</>
                    ) : (
                      editingRule ? 'Update Rule' : 'Create Rule'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Execution History Modal */}
        {selectedRuleHistory && (
          <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Execution History
                </h3>
                <button onClick={() => setSelectedRuleHistory(null)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : executions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No execution history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executions.map((exec) => {
                      const statusConfig = EXECUTION_STATUS_CONFIG[exec.status]
                      const StatusIcon = statusConfig?.icon || Clock

                      return (
                        <div key={exec.id} className="p-3 rounded-md border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${statusConfig?.color}`} />
                              <span className="font-medium text-sm">{exec.status}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(exec.triggeredAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Recipients:</span>
                              <span className="ml-1 font-medium">{exec.recipientCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Success:</span>
                              <span className="ml-1 font-medium text-[var(--chart-green)]">{exec.successCount}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Failed:</span>
                              <span className="ml-1 font-medium text-[var(--chart-red)]">{exec.failureCount}</span>
                            </div>
                          </div>
                          {exec.errorMessage && (
                            <p className="mt-2 text-xs text-[var(--chart-red)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20 p-2 rounded">
                              {exec.errorMessage}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && deletingRule && (
          <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/30">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">Delete Rule?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                This action cannot be undone. The rule and all its execution history will be permanently deleted.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setConfirmDelete(false); setDeletingRule(null) }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteRule}
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
