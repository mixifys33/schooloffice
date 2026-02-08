'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  HubAlert,
  HubAlertSeverity,
  AlertSettings,
  AlertFilters,
  AlertType
} from '@/types/communication-hub'

/**
 * Alerts Tab Component
 * Requirements: 6.1-6.8, 10.12, 10.13
 * - Active alerts list with severity indicators
 * - Acknowledge/dismiss buttons
 * - Alert history view
 * - Alert settings form
 */

interface AlertsTabProps {
  activeAlerts: HubAlert[]
  onAcknowledge: (id: string) => void
  onDismiss: (id: string) => void
  onRefresh: () => void
}

function SeverityBadge({ severity }: { severity: HubAlertSeverity }) {
  const getSeverityColor = (severity: HubAlertSeverity) => {
    switch (severity) {
      case HubAlertSeverity.CRITICAL:
        return 'bg-[var(--danger-dark)]/50 text-[var(--danger)] border-[var(--chart-red)]'
      case HubAlertSeverity.WARNING:
        return 'bg-[var(--warning-dark)]/50 text-[var(--warning)] border-[var(--warning)]'
      case HubAlertSeverity.INFO:
        return 'bg-[var(--info-dark)]/50 text-[var(--chart-blue)] border-[var(--accent-hover)]'
      default:
        return 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-strong)]'
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(severity)}`}>
      {severity}
    </span>
  )
}

function AlertTypeIcon({ type }: { type: AlertType }) {
  switch (type) {
    case AlertType.DELIVERY_FAILURE:
      return (
        <svg className="w-5 h-5 text-[var(--danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case AlertType.QUEUE_STUCK:
      return (
        <svg className="w-5 h-5 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case AlertType.QUOTA_EXCEEDED:
      return (
        <svg className="w-5 h-5 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    case AlertType.LOW_BALANCE:
      return (
        <svg className="w-5 h-5 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}


function AlertCard({ 
  alert, 
  onAcknowledge, 
  onDismiss 
}: { 
  alert: HubAlert
  onAcknowledge: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const getSeverityBorder = (severity: HubAlertSeverity) => {
    switch (severity) {
      case HubAlertSeverity.CRITICAL:
        return 'border-l-[var(--chart-red)]'
      case HubAlertSeverity.WARNING:
        return 'border-l-[var(--warning)]'
      case HubAlertSeverity.INFO:
        return 'border-l-[var(--chart-blue)]'
      default:
        return 'border-l-[var(--border-strong)]'
    }
  }

  return (
    <div className={`bg-[var(--bg-surface)] border border-[var(--border-strong)] border-l-4 ${getSeverityBorder(alert.severity)} rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTypeIcon type={alert.type} />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</h4>
              <SeverityBadge severity={alert.severity} />
            </div>
            <p className="text-sm text-[var(--text-muted)]">{alert.message}</p>
            {alert.schoolName && (
              <p className="text-xs text-[var(--text-muted)] mt-1">School: {alert.schoolName}</p>
            )}
            {alert.channel && (
              <p className="text-xs text-[var(--text-muted)]">Channel: {alert.channel}</p>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {new Date(alert.createdAt).toLocaleString()}
            </p>
            {alert.acknowledgedAt && (
              <p className="text-xs text-[var(--success)] mt-1">
                Acknowledged at {new Date(alert.acknowledgedAt).toLocaleString()}
                {alert.acknowledgedBy && ` by ${alert.acknowledgedBy}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {!alert.acknowledgedAt && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcknowledge(alert.id)}
              className="bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--border-default)]"
            >
              Acknowledge
            </Button>
          )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDismiss(alert.id)}
              className="bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-muted)] hover:bg-[var(--border-default)]"
            >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}

function AlertSettingsPanel({ 
  settings, 
  onSave 
}: { 
  settings: AlertSettings | null
  onSave: (settings: AlertSettings) => void
}) {
  const [formData, setFormData] = useState<AlertSettings>({
    id: '',
    deliveryFailureThreshold: 10,
    queueStuckThreshold: 300,
    lowBalanceThreshold: 100,
    abnormalUsageMultiplier: 2.0,
    emailNotifications: true,
    slackNotifications: false,
    slackWebhookUrl: null,
    notificationEmails: [],
    updatedAt: new Date()
  })
  const [emailInput, setEmailInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const handleAddEmail = () => {
    if (emailInput && !formData.notificationEmails.includes(emailInput)) {
      setFormData(prev => ({
        ...prev,
        notificationEmails: [...prev.notificationEmails, emailInput]
      }))
      setEmailInput('')
    }
  }

  const handleRemoveEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      notificationEmails: prev.notificationEmails.filter(e => e !== email)
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(formData)
    setSaving(false)
  }


   return (
    <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
      <CardHeader>
        <CardTitle className="text-[var(--text-secondary)]">Alert Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Thresholds */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Delivery Failure Threshold (%)</label>
            <Input
              type="number"
              value={formData.deliveryFailureThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryFailureThreshold: parseInt(e.target.value) || 0 }))}
              className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Alert when failure rate exceeds this percentage</p>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Queue Stuck Threshold (seconds)</label>
            <Input
              type="number"
              value={formData.queueStuckThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, queueStuckThreshold: parseInt(e.target.value) || 0 }))}
              className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Alert when oldest message exceeds this age</p>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Low Balance Threshold</label>
            <Input
              type="number"
              value={formData.lowBalanceThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, lowBalanceThreshold: parseInt(e.target.value) || 0 }))}
              className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Alert when credits fall below this number</p>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Abnormal Usage Multiplier</label>
            <Input
              type="number"
              step="0.1"
              value={formData.abnormalUsageMultiplier}
              onChange={(e) => setFormData(prev => ({ ...prev, abnormalUsageMultiplier: parseFloat(e.target.value) || 1 }))}
              className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Alert when usage exceeds average by this factor</p>
          </div>
        </div>

        {/* Notification Toggles */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">Notification Channels</h4>
          <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)]/50 rounded-lg">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Email Notifications</p>
              <p className="text-xs text-[var(--text-muted)]">Send alerts to configured email addresses</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emailNotifications}
                onChange={(e) => setFormData(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-main)] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--chart-blue)]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--bg-surface)]/50 rounded-lg">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Slack Notifications</p>
              <p className="text-xs text-[var(--text-muted)]">Send alerts to Slack channel</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.slackNotifications}
                onChange={(e) => setFormData(prev => ({ ...prev, slackNotifications: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--border-strong)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-main)] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--chart-blue)]"></div>
            </label>
          </div>
        </div>


        {/* Slack Webhook URL */}
        {formData.slackNotifications && (
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Slack Webhook URL</label>
            <Input
              type="url"
              value={formData.slackWebhookUrl || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, slackWebhookUrl: e.target.value || null }))}
              placeholder="https://hooks.slack.com/services/..."
              className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
            />
          </div>
        )}

        {/* Email Recipients */}
        {formData.emailNotifications && (
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Notification Email Recipients</label>
            <div className="flex space-x-2 mb-2">
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@example.com"
                className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
              />
              <Button onClick={handleAddEmail} variant="outline"                   className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.notificationEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center px-2 py-1 bg-[var(--bg-surface)] rounded text-xs text-[var(--text-muted)]"
                >
                  {email}
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    className="ml-2 text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)] text-[var(--white-pure)]"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AlertsTab({
  activeAlerts,
  onAcknowledge,
  onDismiss,
  onRefresh
}: AlertsTabProps) {
  const [view, setView] = useState<'active' | 'history' | 'settings'>('active')
  const [alertHistory, setAlertHistory] = useState<HubAlert[]>([])
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [historyFilters, setHistoryFilters] = useState<AlertFilters>({})

  const fetchAlertHistory = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (historyFilters.type) params.append('type', historyFilters.type)
      if (historyFilters.severity) params.append('severity', historyFilters.severity)
      if (historyFilters.schoolId) params.append('schoolId', historyFilters.schoolId)
      if (historyFilters.startDate) params.append('startDate', historyFilters.startDate.toISOString())
      if (historyFilters.endDate) params.append('endDate', historyFilters.endDate.toISOString())

      const response = await fetch(`/api/admin/communication-hub/alerts/history?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAlertHistory(data)
      }
    } catch (error) {
      console.error('Failed to fetch alert history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAlertSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/communication-hub/alerts/settings')
      if (response.ok) {
        const data = await response.json()
        setAlertSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch alert settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (settings: AlertSettings) => {
    try {
      const response = await fetch('/api/admin/communication-hub/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (response.ok) {
        const data = await response.json()
        setAlertSettings(data)
      }
    } catch (error) {
      console.error('Failed to save alert settings:', error)
    }
  }

  useEffect(() => {
    if (view === 'history') {
      fetchAlertHistory()
    } else if (view === 'settings') {
      fetchAlertSettings()
    }
  }, [view, historyFilters])


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Alert Management</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Monitor, acknowledge, and configure system alerts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-[var(--bg-surface)] rounded-lg p-1">
            <button
              onClick={() => setView('active')}
              className={`px-3 py-1 text-sm rounded ${view === 'active' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              Active ({activeAlerts.length})
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-3 py-1 text-sm rounded ${view === 'history' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              History
            </button>
            <button
              onClick={() => setView('settings')}
              className={`px-3 py-1 text-sm rounded ${view === 'settings' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              Settings
            </button>
          </div>
          {view === 'active' && (
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-muted)]"
            >
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Active Alerts View */}
      {view === 'active' && (
        <div className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
              <CardContent className="py-12 text-center">
                <svg className="w-12 h-12 text-[var(--success)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[var(--text-secondary)] text-lg mb-2">No Active Alerts</p>
                <p className="text-[var(--text-muted)] text-sm">All systems are operating normally</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          )}

          {/* Alert Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold text-[var(--danger)]">
                  {activeAlerts.filter(a => a.severity === HubAlertSeverity.CRITICAL).length}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Critical</p>
              </CardContent>
            </Card>
            <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold text-[var(--warning)]">
                  {activeAlerts.filter(a => a.severity === HubAlertSeverity.WARNING).length}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Warning</p>
              </CardContent>
            </Card>
            <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold text-[var(--chart-blue)]">
                  {activeAlerts.filter(a => a.severity === HubAlertSeverity.INFO).length}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Info</p>
              </CardContent>
            </Card>
            <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
              <CardContent className="p-4">
                <div className="text-2xl font-semibold text-[var(--success)]">
                  {activeAlerts.filter(a => a.acknowledgedAt).length}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Acknowledged</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}


      {/* History View */}
      {view === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={historyFilters.type || ''}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, type: e.target.value as AlertType || undefined }))}
                  className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md text-[var(--text-muted)] text-sm"
                >
                  <option value="">All Types</option>
                  <option value={AlertType.DELIVERY_FAILURE}>Delivery Failure</option>
                  <option value={AlertType.QUEUE_STUCK}>Queue Stuck</option>
                  <option value={AlertType.QUOTA_EXCEEDED}>Quota Exceeded</option>
                  <option value={AlertType.LOW_BALANCE}>Low Balance</option>
                  <option value={AlertType.ABNORMAL_USAGE}>Abnormal Usage</option>
                  <option value={AlertType.SYSTEM_ERROR}>System Error</option>
                </select>
                <select
                  value={historyFilters.severity || ''}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, severity: e.target.value as HubAlertSeverity || undefined }))}
                  className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-md text-[var(--text-muted)] text-sm"
                >
                  <option value="">All Severities</option>
                  <option value={HubAlertSeverity.CRITICAL}>Critical</option>
                  <option value={HubAlertSeverity.WARNING}>Warning</option>
                  <option value={HubAlertSeverity.INFO}>Info</option>
                </select>
                <Input
                  type="date"
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value ? new Date(e.target.value) : undefined }))}
                  className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
                />
                <Input
                  type="date"
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value ? new Date(e.target.value) : undefined }))}
                  className="bg-[var(--bg-surface)] border-[var(--border-strong)]"
                />
              </div>
            </CardContent>
          </Card>

          {/* History List */}
          {loading ? (
            <SkeletonLoader variant="card" count={5} />
          ) : alertHistory.length > 0 ? (
            <div className="space-y-3">
              {alertHistory.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-[var(--bg-surface)] border-[var(--border-strong)]">
              <CardContent className="py-12 text-center">
                <svg className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-[var(--text-muted)] text-lg mb-2">No Alert History</p>
                <p className="text-[var(--text-muted)] text-sm">No alerts match your filter criteria</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Settings View */}
      {view === 'settings' && (
        loading ? (
          <SkeletonLoader variant="card" count={1} />
        ) : (
          <AlertSettingsPanel settings={alertSettings} onSave={handleSaveSettings} />
        )
      )}
    </div>
  )
}
