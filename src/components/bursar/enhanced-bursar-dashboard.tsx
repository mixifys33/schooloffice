'use client'

import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Calendar,
  CreditCard,
  PieChart,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  Receipt,
  Send,
  Wallet,
  PiggyBank,
  Coins,
  Activity,
  Target,
  Scale,
  Settings,
  Bell,
  Phone,
  MessageSquare,
  Pause,
  Play
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  getResponsiveGridClasses,
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
  getTouchFriendlyClasses,
} from '@/lib/responsive'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ============================================
// TYPES & INTERFACES
// ============================================

interface BursarMetrics {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  collectionRate: number
  outstandingFees: number
  cashFlow: number
  budgetVariance: number
  studentsWithOutstandingFees: number
  totalStudents: number
  monthlyTrend: Array<{ month: string; collected: number; outstanding: number }>
  paymentMethods: Array<{ method: string; amount: number; percentage: number; count: number }>
  alerts: Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string; timestamp: string }>
}

interface Defaulter {
  id: string
  studentId: string
  name: string
  className: string
  stream: string | null
  totalDue: number
  totalPaid: number
  balance: number
  daysOverdue: number
  lastPaymentDate: string | null
  contactInfo: {
    parentName: string
    parentPhone: string
    parentEmail: string
  }
  reminderCount: number
  lastReminderSent: string | null
  wouldSend: boolean
  skipReason?: string
}

interface AutomationSettings {
  enableAutomatedReminders: boolean
  automationFrequency: 'WEEKLY' | 'BIWEEKLY' | 'TRI_WEEKLY'
  automationDayOfWeek: number
  gracePeriodDays: number
  maxRemindersPerMilestone: number
  paymentMilestones: Array<{ week: number; percentage: number }>
  lastAutomationRunAt: string | null
  lockedAt: string | null
}

// ============================================
// CHART COMPONENTS
// ============================================

interface SimpleLineChartProps {
  data: Array<{ month: string; collected: number; outstanding: number }>
  title: string
}

function SimpleLineChart({ data, title }: SimpleLineChartProps) {
  const maxValue = Math.max(
    ...data.flatMap(d => [d.collected, d.outstanding]),
    1
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const collectedWidth = (item.collected / maxValue) * 100
            const outstandingWidth = (item.outstanding / maxValue) * 100

            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">
                    {item.month}
                  </span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-[var(--chart-green)]">
                      Collected: UGX {item.collected.toLocaleString()}
                    </span>
                    <span className="text-[var(--chart-red)]">
                      Outstanding: UGX {item.outstanding.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-[var(--success)] transition-all duration-300"
                      style={{ width: `${collectedWidth}%` }}
                    />
                  </div>
                  <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-[var(--danger)] transition-all duration-300"
                      style={{ width: `${outstandingWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

interface PaymentMethodChartProps {
  data: Array<{ method: string; amount: number; percentage: number; count: number }>
  title: string
}

function PaymentMethodChart({ data, title }: PaymentMethodChartProps) {
  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return <Wallet className="h-4 w-4" />
      case 'mobile_money': return <Coins className="h-4 w-4" />
      case 'bank': return <PiggyBank className="h-4 w-4" />
      default: return <CreditCard className="h-4 w-4" />
    }
  }

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return 'bg-[var(--success)]'
      case 'mobile_money': return 'bg-[var(--accent-primary)]'
      case 'bank': return 'bg-[var(--info)]'
      default: return 'bg-[var(--text-muted)]'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getMethodColor(item.method)}`}>
                  {getMethodIcon(item.method)}
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {item.method.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {item.count} transactions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  UGX {item.amount.toLocaleString()}
                </p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  {item.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// DEFAULTER TABLE COMPONENT
// ============================================

interface DefaulterTableProps {
  defaulters: Defaulter[]
  onSendMessage: (defaulter: Defaulter) => void
  onCall: (defaulter: Defaulter) => void
  onPauseReminder: (defaulter: Defaulter) => void
  onResumeReminder: (defaulter: Defaulter) => void
}

function DefaulterTable({ defaulters, onSendMessage, onCall, onPauseReminder, onResumeReminder }: DefaulterTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Fee Defaulters</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search defaulters..."
              className="max-w-xs"
            />
            <Button size="sm" variant="outline">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Student
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Class
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Balance
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Days Overdue
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Last Payment
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Reminders
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Parent Contact
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {defaulters.map((defaulter) => (
                <tr key={defaulter.id} className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <td className="py-3 px-4">
                    <div className="font-medium">
                      {defaulter.name}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">
                      {defaulter.className} {defaulter.stream ? `(${defaulter.stream})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-[var(--danger)]">
                    {formatCurrency(defaulter.balance)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={defaulter.daysOverdue > 30 ? "destructive" : defaulter.daysOverdue > 15 ? "default" : "secondary"}>
                      {defaulter.daysOverdue} days
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {defaulter.lastPaymentDate ? new Date(defaulter.lastPaymentDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{defaulter.reminderCount}</span>
                      {defaulter.skipReason && (
                        <Badge variant="outline" className="text-xs">
                          {defaulter.skipReason}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div>{defaulter.contactInfo.parentName}</div>
                      <div className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{defaulter.contactInfo.parentPhone}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => onSendMessage(defaulter)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onCall(defaulter)}>
                        <Phone className="h-4 w-4" />
                      </Button>
                      {defaulter.wouldSend ? (
                        <Button size="sm" variant="outline" onClick={() => onPauseReminder(defaulter)}>
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => onResumeReminder(defaulter)}>
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// AUTOMATION SETTINGS PANEL
// ============================================

interface AutomationSettingsPanelProps {
  settings: AutomationSettings | null
  onSave: (settings: AutomationSettings) => void
  onRunPreview: () => void
  onRunNow: () => void
  loading: boolean
}

function AutomationSettingsPanel({ settings, onSave, onRunPreview, onRunNow, loading }: AutomationSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<AutomationSettings | null>(settings)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    if (localSettings) {
      onSave(localSettings)
      setEditing(false)
    }
  }

  if (!localSettings) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Automation Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Automated Fee Reminders</h4>
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                Send automatic SMS reminders to parents
              </p>
            </div>
            <Switch
              checked={localSettings.enableAutomatedReminders}
              onCheckedChange={(checked) => setLocalSettings({...localSettings, enableAutomatedReminders: checked})}
              disabled={!editing}
            />
          </div>

          {editing && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <Select 
                    value={localSettings.automationFrequency} 
                    onValueChange={(value: 'WEEKLY' | 'BIWEEKLY' | 'TRI_WEEKLY') => setLocalSettings({...localSettings, automationFrequency: value})}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                      <SelectItem value="TRI_WEEKLY">Tri-weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Day of Week</label>
                  <Select 
                    value={localSettings.automationDayOfWeek.toString()} 
                    onValueChange={(value) => setLocalSettings({...localSettings, automationDayOfWeek: parseInt(value)})}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                      <SelectItem value="7">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Grace Period (days)</label>
                  <Input
                    type="number"
                    value={localSettings.gracePeriodDays}
                    onChange={(e) => setLocalSettings({...localSettings, gracePeriodDays: parseInt(e.target.value)})}
                    disabled={!editing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Max Reminders per Milestone</label>
                  <Input
                    type="number"
                    value={localSettings.maxRemindersPerMilestone}
                    onChange={(e) => setLocalSettings({...localSettings, maxRemindersPerMilestone: parseInt(e.target.value)})}
                    disabled={!editing}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Milestones</label>
                <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                  Define percentage targets for each academic week
                </div>
                <div className="space-y-2">
                  {localSettings.paymentMilestones.map((milestone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Week"
                        value={milestone.week}
                        onChange={(e) => {
                          const newMilestones = [...localSettings.paymentMilestones]
                          newMilestones[index] = {...milestone, week: parseInt(e.target.value)}
                          setLocalSettings({...localSettings, paymentMilestones: newMilestones})
                        }}
                        disabled={!editing}
                        className="w-24"
                      />
                      <span>→</span>
                      <Input
                        type="number"
                        placeholder="Percentage"
                        value={milestone.percentage}
                        onChange={(e) => {
                          const newMilestones = [...localSettings.paymentMilestones]
                          newMilestones[index] = {...milestone, percentage: parseInt(e.target.value)}
                          setLocalSettings({...localSettings, paymentMilestones: newMilestones})
                        }}
                        disabled={!editing}
                        className="w-24"
                      />
                      <span>%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {!editing ? (
              <Button onClick={() => setEditing(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
            ) : (
              <>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onRunPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={onRunNow}>
              <Send className="h-4 w-4 mr-2" />
              Run Now
            </Button>
          </div>

          {localSettings.lastAutomationRunAt && (
            <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              Last run: {new Date(localSettings.lastAutomationRunAt).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EnhancedBursarDashboard() {
  const [metrics, setMetrics] = useState<BursarMetrics | null>(null)
  const [defaulters, setDefaulters] = useState<Defaulter[]>([])
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'defaulters' | 'automation'>('dashboard')

  const fetchMetrics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Get current term
      const termResponse = await fetch('/api/terms/current')
      const termData = await termResponse.json()
      const termId = termData.term?.id

      if (!termId) {
        // Handle different scenarios for missing term without throwing errors
        let userFriendlyMessage = ''
        
        if (termResponse.status === 404) {
          userFriendlyMessage = 'Academic setup required. Please set up an active academic year and term before accessing the bursar dashboard.'
        } else if (!termResponse.ok) {
          userFriendlyMessage = 'Unable to retrieve term information. Please check your connection and try again.'
        } else {
          userFriendlyMessage = 'No active term found. Please ensure there is an active academic term configured for the current period.'
        }
        
        setError(userFriendlyMessage)
        return
      }

      const [metricsResponse, defaultersResponse, settingsResponse] = await Promise.all([
        fetch(`/api/bursar/dashboard?termId=${termId}`),
        fetch(`/api/bursar/defaulters?termId=${termId}`),
        fetch(`/api/bursar/automation-settings?termId=${termId}`)
      ])

      if (!metricsResponse.ok || !defaultersResponse.ok || !settingsResponse.ok) {
        const failedRequests = []
        if (!metricsResponse.ok) failedRequests.push('financial metrics')
        if (!defaultersResponse.ok) failedRequests.push('defaulter information')
        if (!settingsResponse.ok) failedRequests.push('automation settings')
        
        throw new Error(`Failed to load ${failedRequests.join(', ')}. Please try again.`)
      }

      const [metricsData, defaultersData, settingsData] = await Promise.all([
        metricsResponse.json(),
        defaultersResponse.json(),
        settingsResponse.json()
      ])

      if (!metricsData.success || !defaultersData.success || !settingsData.success) {
        const failedData = []
        if (!metricsData.success) failedData.push('financial metrics')
        if (!defaultersData.success) failedData.push('defaulter information')
        if (!settingsData.success) failedData.push('automation settings')
        
        throw new Error(`Invalid data received for ${failedData.join(', ')}. Please contact support.`)
      }

      setMetrics(metricsData.data)
      setDefaulters(defaultersData.defaulters)
      setAutomationSettings(settingsData.settings)
    } catch (err) {
      console.error('Error fetching bursar data:', err)
      
      // Provide user-friendly error messages for remaining errors
      let userFriendlyMessage = 'Failed to fetch data'
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to load')) {
          userFriendlyMessage = err.message // Already user-friendly
        } else if (err.message.includes('Invalid data received')) {
          userFriendlyMessage = err.message // Already user-friendly
        } else if (err.message.includes('fetch')) {
          userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
        } else {
          userFriendlyMessage = 'Unable to load financial data. Please check your connection and try again.'
        }
      }
      
      setError(userFriendlyMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  const handleRefresh = () => {
    fetchMetrics(true)
  }

  const handleSendMessage = (defaulter: Defaulter) => {
    console.log('Sending message to:', defaulter)
    // In real app, this would open a message modal
  }

  const handleCall = (defaulter: Defaulter) => {
    console.log('Calling:', defaulter.contactInfo.parentPhone)
    // In real app, this would initiate a call
  }

  const handlePauseReminder = (defaulter: Defaulter) => {
    // Call API to pause reminders for this student
    fetch('/api/bursar/manual-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pause',
        studentId: defaulter.studentId,
        reason: 'Manually paused by bursar'
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update local state
        setDefaulters(prev => prev.map(d => 
          d.id === defaulter.id ? {...d, wouldSend: false, skipReason: 'Manually paused'} : d
        ))
      }
    })
  }

  const handleResumeReminder = (defaulter: Defaulter) => {
    // Call API to resume reminders for this student
    fetch('/api/bursar/manual-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resume',
        studentId: defaulter.studentId
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update local state
        setDefaulters(prev => prev.map(d => 
          d.id === defaulter.id ? {...d, wouldSend: true, skipReason: undefined} : d
        ))
      }
    })
  }

  const handleSaveAutomationSettings = (settings: AutomationSettings) => {
    fetch('/api/bursar/automation-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setAutomationSettings(data.settings)
      }
    })
  }

  const handleRunPreview = () => {
    // Call API to get preview of automation
    fetch('/api/bursar/automation-preview')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Show preview results
        alert(`Preview: ${data.students.filter((s: any) => s.wouldSend).length} students would receive reminders`)
      }
    })
  }

  const handleRunNow = () => {
    // Call API to run automation now
    fetch('/api/automation/finance-reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: false })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert(`Automation run complete: ${data.result.sent} sent, ${data.result.failed} failed`)
        // Refresh data
        fetchMetrics()
      }
    })
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
              Enhanced Bursar Dashboard
            </h1>
            <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Financial management and fee tracking
            </p>
          </div>
        </div>

        <div className="flex space-x-4 mb-6 border-b">
          <button className="pb-2 px-1 border-b-2 border-[var(--accent-primary)] text-[var(--text-primary)] font-medium">
            Dashboard
          </button>
          <button className="pb-2 px-1 text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Defaulters
          </button>
          <button className="pb-2 px-1 text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Automation
          </button>
        </div>

        <div className={getResponsiveGridClasses('statsGrid')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
              Enhanced Bursar Dashboard
            </h1>
            <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
              Financial management and fee tracking
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className={getTouchFriendlyClasses('button', 'w-full sm:w-auto')}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>

        <ErrorMessage
          title="Failed to load financial metrics"
          message={error}
          suggestedActions={
            error.includes('Academic setup required') 
              ? [
                  'Go to Settings → Academic Years to set up an academic year',
                  'Create and activate a term for the current period',
                  'Ensure the term dates cover the current date',
                  'Contact your system administrator if you need help'
                ]
              : error.includes('No active term found')
              ? [
                  'Go to Settings → Academic Years to manage terms',
                  'Create a new term for the current period',
                  'Ensure the term start and end dates are correct',
                  'Activate the term if it\'s not already active'
                ]
              : error.includes('Unable to retrieve term information')
              ? [
                  'Check your internet connection',
                  'Try refreshing the page',
                  'Contact support if the problem persists'
                ]
              : [
                  'Check your internet connection',
                  'Try refreshing the page',
                  'Contact support if the problem persists'
                ]
          }
        />
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Enhanced Bursar Dashboard
          </h1>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Financial management and fee tracking
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className={cn(
              getTouchFriendlyClasses('button'),
              'w-full sm:w-auto'
            )}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className={getTouchFriendlyClasses('button', 'w-full sm:w-auto')}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b">
        <button 
          className={`pb-2 px-1 ${activeTab === 'dashboard' ? 'border-b-2 border-[var(--accent-primary)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`pb-2 px-1 ${activeTab === 'defaulters' ? 'border-b-2 border-[var(--accent-primary)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]'}`}
          onClick={() => setActiveTab('defaulters')}
        >
          Defaulters
        </button>
        <button 
          className={`pb-2 px-1 ${activeTab === 'automation' ? 'border-b-2 border-[var(--accent-primary)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]'}`}
          onClick={() => setActiveTab('automation')}
        >
          Automation
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(metrics.totalRevenue)}
              subtitle="This term"
              color="green"
              icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
            />
            <StatCard
              title="Outstanding Fees"
              value={formatCurrency(metrics.outstandingFees)}
              subtitle={`${metrics.studentsWithOutstandingFees} students`}
              color="red"
              icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
            />
            <StatCard
              title="Collection Rate"
              value={formatPercentage(metrics.collectionRate)}
              subtitle="Fee collection efficiency"
              color={metrics.collectionRate >= 80 ? "green" : metrics.collectionRate >= 60 ? "yellow" : "red"}
              icon={<Target className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
            />
            <StatCard
              title="Net Income"
              value={formatCurrency(metrics.netIncome)}
              subtitle="Revenue - Expenses"
              color={metrics.netIncome >= 0 ? "green" : "red"}
              icon={metrics.netIncome >= 0 ?
                <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" /> :
                <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              }
            />
            <StatCard
              title="Cash Flow"
              value={formatCurrency(metrics.cashFlow)}
              subtitle="Available funds"
              color={metrics.cashFlow >= 0 ? "blue" : "red"}
              icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
            />
            <StatCard
              title="Budget Variance"
              value={formatPercentage(metrics.budgetVariance)}
              subtitle="Budget vs Actual"
              color={Math.abs(metrics.budgetVariance) <= 10 ? "green" : Math.abs(metrics.budgetVariance) <= 20 ? "yellow" : "red"}
              icon={<Scale className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
            />
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <SimpleLineChart
              data={metrics.monthlyTrend}
              title="Monthly Collection Trend"
            />
            <PaymentMethodChart
              data={metrics.paymentMethods}
              title="Payment Methods Distribution"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className={cn(
                getTouchFriendlyClasses('button'),
                'h-auto p-4 flex flex-col items-start gap-2 text-left'
              )}
              onClick={() => window.location.href = '/dashboard/bursar/payment-tracking'}
            >
              <div className="p-2 rounded-lg bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)] dark:text-[var(--success)]">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Record Payment</p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Add new payment from student/parent</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className={cn(
                getTouchFriendlyClasses('button'),
                'h-auto p-4 flex flex-col items-start gap-2 text-left'
              )}
              onClick={() => window.location.href = '/dashboard/bursar/fee-structures'}
            >
              <div className="p-2 rounded-lg bg-[var(--info-light)] text-[var(--chart-blue)] dark:bg-[var(--info-dark)] dark:text-[var(--chart-blue)]">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Fee Structures</p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Manage class fee structures</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className={cn(
                getTouchFriendlyClasses('button'),
                'h-auto p-4 flex flex-col items-start gap-2 text-left'
              )}
              onClick={() => setActiveTab('defaulters')}
            >
              <div className="p-2 rounded-lg bg-[var(--warning-light)] text-[var(--chart-yellow)] dark:bg-[var(--warning-dark)] dark:text-[var(--warning)]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Send Reminders</p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">SMS fee reminders to parents</p>
              </div>
            </Button>

            <Button
              variant="outline"
              className={cn(
                getTouchFriendlyClasses('button'),
                'h-auto p-4 flex flex-col items-start gap-2 text-left'
              )}
              onClick={() => setActiveTab('automation')}
            >
              <div className="p-2 rounded-lg bg-[var(--info-light)] text-[var(--chart-purple)] dark:bg-[var(--info-dark)] dark:text-[var(--chart-purple)]">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Automation</p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Configure fee reminders</p>
              </div>
            </Button>
          </div>

          {/* Alerts and Notifications */}
          {metrics.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Financial Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'p-4 rounded-lg border-l-4 flex items-start gap-3',
                        alert.type === 'error' && 'bg-[var(--danger-light)] border-[var(--danger)] dark:bg-[var(--danger-dark)]',
                        alert.type === 'warning' && 'bg-[var(--warning-light)] border-[var(--warning)] dark:bg-[var(--warning-dark)]',
                        alert.type === 'info' && 'bg-[var(--info-light)] border-[var(--accent-primary)] dark:bg-[var(--info-dark)]'
                      )}
                    >
                      <AlertTriangle className={cn(
                        'h-5 w-5 mt-0.5',
                        alert.type === 'error' && 'text-[var(--chart-red)]',
                        alert.type === 'warning' && 'text-[var(--chart-yellow)]',
                        alert.type === 'info' && 'text-[var(--chart-blue)]'
                      )} />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {alert.message}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Defaulters Tab */}
      {activeTab === 'defaulters' && (
        <div className="space-y-6">
          <DefaulterTable
            defaulters={defaulters}
            onSendMessage={handleSendMessage}
            onCall={handleCall}
            onPauseReminder={handlePauseReminder}
            onResumeReminder={handleResumeReminder}
          />
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <AutomationSettingsPanel
            settings={automationSettings}
            onSave={handleSaveAutomationSettings}
            onRunPreview={handleRunPreview}
            onRunNow={handleRunNow}
            loading={false}
          />
        </div>
      )}
    </div>
  )
}