'use client'

/**
 * Communications Hub - Institutional Communication Center
 * The school's voice, memory, proof, and control center.
 * 
 * Core Channels: SMS, WhatsApp (Business API), Email, In-App Notifications
 * Key Features: Targeted messaging, automation, templates, delivery tracking, permissions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  MessageSquare, Send, History, Bell, Settings, AlertTriangle,
  Users, Smartphone, Mail, Clock, Filter, Search, RefreshCw,
  CheckCircle, XCircle, Zap, FileText, BarChart3, Shield,
  Calendar, Target, Megaphone, AlertCircle, TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageHistory } from '@/components/communication/message-history'
import { AnnouncementManagement } from '@/components/communication/announcement-management'
import { AutomationRules } from '@/components/communication/automation-rules'
import { TargetType, MessageChannel } from '@/types/enums'

interface CommunicationStats {
  today: {
    sent: number
    delivered: number
    failed: number
    pending: number
  }
  thisMonth: {
    sms: number
    whatsapp: number
    email: number
    total: number
  }
  deliveryRate: number
  smsBalance: number
}

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ElementType
  action: () => void
  variant?: 'default' | 'destructive' | 'outline'
}

// Preset configurations for quick actions
type QuickActionPreset = 'fee-reminder' | 'attendance-alert' | 'announcement' | null

export default function CommunicationsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('compose')
  const [stats, setStats] = useState<CommunicationStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [emergencyContent, setEmergencyContent] = useState('')
  const [sendingEmergency, setSendingEmergency] = useState(false)
  const [emergencyError, setEmergencyError] = useState<string | null>(null)
  const [emergencySuccess, setEmergencySuccess] = useState(false)
  
  // Quick action preset state
  const [activePreset, setActivePreset] = useState<QuickActionPreset>(null)
  const composerKeyRef = useRef(0)

  const userRole = (session?.user as { role?: string })?.role || ''
  const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(userRole)

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true)
      const response = await fetch('/api/communication/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching communication stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSendEmergency = async () => {
    if (!emergencyContent.trim()) {
      setEmergencyError('Please enter an alert message')
      return
    }

    try {
      setSendingEmergency(true)
      setEmergencyError(null)
      
      const response = await fetch('/api/communication/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: emergencyContent,
          channels: ['SMS', 'WHATSAPP', 'EMAIL'],
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setEmergencySuccess(true)
        setEmergencyContent('')
        fetchStats()
        // Auto-close after success
        setTimeout(() => {
          setShowEmergencyModal(false)
          setEmergencySuccess(false)
        }, 2000)
      } else {
        setEmergencyError(result.error || 'Failed to send emergency alert')
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error)
      setEmergencyError('Network error. Please try again.')
    } finally {
      setSendingEmergency(false)
    }
  }

  const handleQuickAction = (preset: QuickActionPreset) => {
    setActivePreset(preset)
    composerKeyRef.current += 1 // Force re-render of composer with new preset
    
    if (preset === 'announcement') {
      setActiveTab('announcements')
    } else {
      setActiveTab('compose')
    }
  }

  const quickActions: QuickAction[] = [
    {
      id: 'fee-reminder',
      label: 'Fee Reminder',
      description: 'Send to all fee defaulters',
      icon: FileText,
      action: () => handleQuickAction('fee-reminder'),
    },
    {
      id: 'attendance-alert',
      label: 'Absence Alerts',
      description: "Today's absentees",
      icon: Clock,
      action: () => handleQuickAction('attendance-alert'),
    },
    {
      id: 'announcement',
      label: 'Announcement',
      description: 'School-wide message',
      icon: Megaphone,
      action: () => handleQuickAction('announcement'),
    },
  ]

  if (isAdmin) {
    quickActions.push({
      id: 'emergency',
      label: 'Emergency Alert',
      description: 'Immediate broadcast',
      icon: AlertTriangle,
      action: () => {
        setEmergencyError(null)
        setEmergencySuccess(false)
        setShowEmergencyModal(true)
      },
      variant: 'destructive',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Communications
          </h1>
          <p className="text-muted-foreground">
            Reach the right people, at the right time, with proof it happened.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingStats ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEmergencyModal(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Emergency
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Today Sent</p>
                <p className="text-2xl font-bold">{stats?.today.sent || 0}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-green-600">{stats?.today.delivered || 0} delivered</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-red-600">{stats?.today.failed || 0} failed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Delivery Rate</p>
                <p className="text-2xl font-bold">{stats?.deliveryRate || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${stats?.deliveryRate || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
                <p className="text-2xl font-bold">{stats?.thisMonth.total || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Smartphone className="h-3 w-3" /> {stats?.thisMonth.sms || 0}
              <MessageSquare className="h-3 w-3 ml-1" /> {stats?.thisMonth.whatsapp || 0}
              <Mail className="h-3 w-3 ml-1" /> {stats?.thisMonth.email || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">SMS Balance</p>
                <p className="text-2xl font-bold">{stats?.smsBalance?.toLocaleString() || 0}</p>
              </div>
              <Smartphone className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Credits remaining
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors text-center ${
                    action.variant === 'destructive'
                      ? 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:hover:bg-red-900'
                      : 'border-input bg-background hover:bg-accent'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${action.variant === 'destructive' ? 'text-red-600' : 'text-primary'}`} />
                  <div>
                    <p className={`text-sm font-medium ${action.variant === 'destructive' ? 'text-red-700 dark:text-red-400' : ''}`}>
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Compose</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automation</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <InlineMessageComposer
            key={composerKeyRef.current}
            preset={activePreset}
            onSendSuccess={() => {
              fetchStats()
              setActivePreset(null)
            }}
            onSendError={(error) => console.error('Send error:', error)}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <MessageHistory onRetrySuccess={() => fetchStats()} />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <AnnouncementManagement />
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <AutomationRules />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesSection />
        </TabsContent>
      </Tabs>

      {/* Emergency Alert Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b bg-red-50 dark:bg-red-950 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-semibold">Emergency Alert</h3>
                </div>
                <button 
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                This will immediately notify ALL parents, students, and staff via SMS, WhatsApp, and Email.
              </p>
            </div>
            <div className="p-4 space-y-4">
              {emergencySuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-green-700">Emergency Alert Sent!</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    All recipients are being notified across all channels.
                  </p>
                </div>
              ) : (
                <>
                  {emergencyError && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{emergencyError}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Alert Message *</label>
                    <textarea
                      value={emergencyContent}
                      onChange={(e) => setEmergencyContent(e.target.value)}
                      placeholder="Describe the emergency situation clearly. Example: School closing early today at 12pm due to severe weather. Please pick up your children immediately."
                      rows={4}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {emergencyContent.length} characters
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 text-sm">
                    <p className="font-medium">This action:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                      <li>Overrides quiet hours and normal rules</li>
                      <li>Sends immediately to entire school</li>
                      <li>Uses all available channels (SMS, WhatsApp, Email)</li>
                      <li>Is logged for audit purposes</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowEmergencyModal(false)}
                      className="flex-1"
                      disabled={sendingEmergency}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleSendEmergency}
                      disabled={sendingEmergency || !emergencyContent.trim()}
                      className="flex-1"
                    >
                      {sendingEmergency ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                          Sending to all...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Send Emergency Alert
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline Message Composer with Preset Support
 * Supports quick action presets for fee reminders, attendance alerts, etc.
 */
interface InlineMessageComposerProps {
  preset: QuickActionPreset
  onSendSuccess?: () => void
  onSendError?: (error: string) => void
}

interface ClassOption {
  id: string
  name: string
  studentCount: number
}

interface StreamOption {
  id: string
  name: string
  className: string
  studentCount: number
}

interface TemplateOption {
  id: string
  type: string
  content: string
  channel: string
}

function InlineMessageComposer({ preset, onSendSuccess, onSendError }: InlineMessageComposerProps) {
  // Initialize state based on preset
  const getInitialTargetType = () => {
    switch (preset) {
      case 'fee-reminder': return TargetType.FEE_DEFAULTERS
      case 'attendance-alert': return TargetType.ATTENDANCE_BELOW
      default: return TargetType.ENTIRE_SCHOOL
    }
  }

  const getInitialTemplateType = () => {
    switch (preset) {
      case 'fee-reminder': return 'FEES_REMINDER'
      case 'attendance-alert': return 'ATTENDANCE_ALERT'
      default: return ''
    }
  }

  const [targetType, setTargetType] = useState<TargetType>(getInitialTargetType())
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedStreams, setSelectedStreams] = useState<string[]>([])
  const [feeThreshold, setFeeThreshold] = useState<number>(0)
  const [attendanceThreshold, setAttendanceThreshold] = useState<number>(75)
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>(MessageChannel.SMS)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customContent, setCustomContent] = useState<string>('')
  const [useCustomContent, setUseCustomContent] = useState<boolean>(false)
  const [scheduleMessage, setScheduleMessage] = useState<boolean>(false)
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [priority, setPriority] = useState<'normal' | 'high' | 'critical'>('normal')

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [streams, setStreams] = useState<StreamOption[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [recipientCount, setRecipientCount] = useState<number | null>(null)

  const [loadingOptions, setLoadingOptions] = useState<boolean>(false)
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false)
  const [sending, setSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true)
        const [classesRes, streamsRes, templatesRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/streams'),
          fetch('/api/sms/templates'),
        ])

        if (classesRes.ok) {
          const data = await classesRes.json()
          setClasses(data.classes?.map((c: { id: string; name: string; _count?: { students: number } }) => ({
            id: c.id, name: c.name, studentCount: c._count?.students || 0,
          })) || [])
        }

        if (streamsRes.ok) {
          const data = await streamsRes.json()
          setStreams(data.streams?.map((s: { id: string; name: string; class?: { name: string }; _count?: { students: number } }) => ({
            id: s.id, name: s.name, className: s.class?.name || '', studentCount: s._count?.students || 0,
          })) || [])
        }

        if (templatesRes.ok) {
          const data = await templatesRes.json()
          const fetchedTemplates = data.templates || []
          setTemplates(fetchedTemplates)
          
          // Auto-select template based on preset
          const presetTemplateType = getInitialTemplateType()
          if (presetTemplateType) {
            const matchingTemplate = fetchedTemplates.find((t: TemplateOption) => t.type === presetTemplateType)
            if (matchingTemplate) {
              setSelectedTemplate(matchingTemplate.id)
              setCustomContent(matchingTemplate.content)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching options:', err)
      } finally {
        setLoadingOptions(false)
      }
    }
    fetchOptions()
  }, [])

  // Preview recipient count
  useEffect(() => {
    const previewRecipients = async () => {
      try {
        setLoadingPreview(true)
        const criteria: Record<string, unknown> = {}
        
        if (targetType === TargetType.CLASS && selectedClasses.length > 0) {
          criteria.classIds = selectedClasses
        } else if (targetType === TargetType.STREAM && selectedStreams.length > 0) {
          criteria.streamIds = selectedStreams
        } else if (targetType === TargetType.FEE_DEFAULTERS) {
          criteria.feeThreshold = feeThreshold
        } else if (targetType === TargetType.ATTENDANCE_BELOW) {
          criteria.attendanceThreshold = attendanceThreshold
        }

        const response = await fetch('/api/communication/targeting/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetType, criteria }),
        })

        if (response.ok) {
          const data = await response.json()
          setRecipientCount(data.total || 0)
        }
      } catch (err) {
        console.error('Error previewing recipients:', err)
      } finally {
        setLoadingPreview(false)
      }
    }

    const timer = setTimeout(previewRecipients, 500)
    return () => clearTimeout(timer)
  }, [targetType, selectedClasses, selectedStreams, feeThreshold, attendanceThreshold])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    if (template) setCustomContent(template.content)
  }

  const handleSend = async () => {
    setError(null)
    setSuccess(null)

    if (!useCustomContent && !selectedTemplate) {
      setError('Please select a template or write a custom message')
      return
    }
    if (useCustomContent && !customContent.trim()) {
      setError('Please enter a message')
      return
    }
    if (targetType === TargetType.CLASS && selectedClasses.length === 0) {
      setError('Please select at least one class')
      return
    }
    if (targetType === TargetType.STREAM && selectedStreams.length === 0) {
      setError('Please select at least one stream')
      return
    }
    if (scheduleMessage && (!scheduledDate || !scheduledTime)) {
      setError('Please select a date and time for scheduled message')
      return
    }

    try {
      setSending(true)
      const criteria: Record<string, unknown> = {}
      
      if (targetType === TargetType.CLASS) criteria.classIds = selectedClasses
      else if (targetType === TargetType.STREAM) criteria.streamIds = selectedStreams
      else if (targetType === TargetType.FEE_DEFAULTERS) criteria.feeThreshold = feeThreshold
      else if (targetType === TargetType.ATTENDANCE_BELOW) criteria.attendanceThreshold = attendanceThreshold

      const payload: Record<string, unknown> = {
        targetType, 
        targetCriteria: criteria, 
        channel: selectedChannel, 
        priority,
      }

      if (useCustomContent) payload.customContent = customContent
      else payload.templateId = selectedTemplate

      if (scheduleMessage && scheduledDate && scheduledTime) {
        payload.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const response = await fetch('/api/communication/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to send message')

      if (result.success) {
        setSuccess(`Message ${scheduleMessage ? 'scheduled' : 'queued'} for ${result.totalRecipients || 0} recipients!`)
        onSendSuccess?.()
        // Reset form
        setCustomContent('')
        setSelectedTemplate('')
        setScheduleMessage(false)
        setScheduledDate('')
        setScheduledTime('')
      } else {
        throw new Error(result.error || 'Failed to send message')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message'
      setError(msg)
      onSendError?.(msg)
    } finally {
      setSending(false)
    }
  }

  const characterCount = customContent.length
  const smsSegments = Math.ceil(characterCount / 160) || 1

  const TARGET_TYPE_OPTIONS = [
    { value: TargetType.ENTIRE_SCHOOL, label: 'Entire School', icon: Users },
    { value: TargetType.CLASS, label: 'By Class', icon: Users },
    { value: TargetType.STREAM, label: 'By Stream', icon: Users },
    { value: TargetType.FEE_DEFAULTERS, label: 'Fee Defaulters', icon: AlertTriangle },
    { value: TargetType.ATTENDANCE_BELOW, label: 'Low Attendance', icon: Clock },
    { value: TargetType.STAFF_ROLE, label: 'Staff by Role', icon: Users },
  ]

  const CHANNEL_OPTIONS = [
    { value: MessageChannel.SMS, label: 'SMS', icon: Smartphone },
    { value: MessageChannel.WHATSAPP, label: 'WhatsApp', icon: MessageSquare },
    { value: MessageChannel.EMAIL, label: 'Email', icon: Mail },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          {preset === 'fee-reminder' ? 'Send Fee Reminder' : 
           preset === 'attendance-alert' ? 'Send Attendance Alert' : 
           'Compose Message'}
        </CardTitle>
        {preset && (
          <CardDescription>
            {preset === 'fee-reminder' && 'Send fee reminders to guardians with outstanding balances'}
            {preset === 'attendance-alert' && 'Notify guardians about student attendance issues'}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><XCircle className="h-4 w-4" /></button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto"><XCircle className="h-4 w-4" /></button>
          </div>
        )}

        {/* Target Recipients */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">Target Recipients</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TARGET_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setTargetType(option.value)}
                  className={`flex items-center gap-2 p-3 rounded-md border text-sm transition-colors ${
                    targetType === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Class Selection */}
        {targetType === TargetType.CLASS && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Select Classes</label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {loadingOptions ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes found</p>
              ) : (
                classes.map((cls) => (
                  <label key={cls.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-accent rounded">
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={(e) => setSelectedClasses(e.target.checked 
                        ? [...selectedClasses, cls.id] 
                        : selectedClasses.filter(id => id !== cls.id))}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{cls.name}</span>
                    <span className="text-xs text-muted-foreground">({cls.studentCount})</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Stream Selection */}
        {targetType === TargetType.STREAM && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Select Streams</label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
              {loadingOptions ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : streams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No streams found</p>
              ) : (
                streams.map((stream) => (
                  <label key={stream.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-accent rounded">
                    <input
                      type="checkbox"
                      checked={selectedStreams.includes(stream.id)}
                      onChange={(e) => setSelectedStreams(e.target.checked
                        ? [...selectedStreams, stream.id]
                        : selectedStreams.filter(id => id !== stream.id))}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{stream.className} - {stream.name}</span>
                    <span className="text-xs text-muted-foreground">({stream.studentCount})</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Fee Threshold */}
        {targetType === TargetType.FEE_DEFAULTERS && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Minimum Outstanding Balance (UGX)</label>
            <input
              type="number"
              value={feeThreshold}
              onChange={(e) => setFeeThreshold(Number(e.target.value))}
              min={0}
              placeholder="0 = all with any balance"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">Set to 0 to include all students with any outstanding balance</p>
          </div>
        )}

        {/* Attendance Threshold */}
        {targetType === TargetType.ATTENDANCE_BELOW && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Attendance Below (%)</label>
            <input
              type="number"
              value={attendanceThreshold}
              onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">Students with attendance below this percentage</p>
          </div>
        )}

        {/* Recipient Preview */}
        {recipientCount !== null && (
          <div className="p-3 rounded-md bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Recipients: {recipientCount}
              {loadingPreview && <span className="text-xs text-muted-foreground">(updating...)</span>}
            </div>
          </div>
        )}

        {/* Channel Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Channel</label>
          <div className="flex gap-2">
            {CHANNEL_OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedChannel(option.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm ${
                    selectedChannel === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Template vs Custom */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!useCustomContent} onChange={() => setUseCustomContent(false)} />
            <span className="text-sm">Use Template</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={useCustomContent} onChange={() => setUseCustomContent(true)} />
            <span className="text-sm">Custom Message</span>
          </label>
        </div>

        {/* Template Selection */}
        {!useCustomContent && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Select Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a template...</option>
              {templates.filter(t => t.channel === selectedChannel).map((t) => (
                <option key={t.id} value={t.id}>{t.type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">{useCustomContent ? 'Message' : 'Preview'}</label>
          <textarea
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            placeholder={useCustomContent ? 'Type your message...' : 'Select a template'}
            rows={4}
            readOnly={!useCustomContent}
            className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none ${!useCustomContent ? 'bg-muted/50' : ''}`}
          />
          {selectedChannel === MessageChannel.SMS && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{characterCount} chars</span>
              <span>{smsSegments} segment{smsSegments > 1 ? 's' : ''} {smsSegments > 1 && '(higher cost)'}</span>
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Priority</label>
          <div className="flex gap-2">
            {(['normal', 'high', 'critical'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-4 py-2 rounded-md border text-sm capitalize ${
                  priority === p
                    ? p === 'critical' ? 'bg-red-500 text-white border-red-500'
                      : p === 'high' ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-accent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={scheduleMessage} onChange={(e) => setScheduleMessage(e.target.checked)} className="rounded" />
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Schedule for later</span>
          </label>
          {scheduleMessage && (
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="date" 
                value={scheduledDate} 
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm" 
              />
              <input 
                type="time" 
                value={scheduledTime} 
                onChange={(e) => setScheduledTime(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm" 
              />
            </div>
          )}
        </div>

        {/* Send Button */}
        <Button onClick={handleSend} disabled={sending} className="w-full gap-2" size="lg">
          {sending ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              {scheduleMessage ? 'Scheduling...' : 'Sending...'}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {scheduleMessage ? 'Schedule Message' : `Send to ${recipientCount || 0} Recipients`}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Templates Section Component
 * Manages message templates with placeholders
 */
function TemplatesSection() {
  const [templates, setTemplates] = useState<Array<{
    id: string
    type: string
    channel: string
    content: string
    isActive: boolean
  }>>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sms/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/sms/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })

      if (response.ok) {
        setEditingTemplate(null)
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }

  const templateTypes = [
    { type: 'TERM_START', label: 'Term Start', description: 'Sent when term begins' },
    { type: 'ATTENDANCE_ALERT', label: 'Attendance Alert', description: 'Absence/late notifications' },
    { type: 'FEES_REMINDER', label: 'Fee Reminder', description: 'Outstanding balance alerts' },
    { type: 'MID_TERM_PROGRESS', label: 'Mid-Term Progress', description: 'Progress reports' },
    { type: 'REPORT_READY', label: 'Report Ready', description: 'Report card availability' },
    { type: 'TERM_SUMMARY', label: 'Term Summary', description: 'End of term results' },
    { type: 'DISCIPLINE_NOTICE', label: 'Discipline Notice', description: 'Behavioral alerts' },
    { type: 'GENERAL_ANNOUNCEMENT', label: 'General', description: 'Custom messages' },
  ]

  const placeholders = [
    { key: '{{studentName}}', desc: 'Student full name' },
    { key: '{{className}}', desc: 'Class name' },
    { key: '{{date}}', desc: 'Current date' },
    { key: '{{balance}}', desc: 'Fee balance' },
    { key: '{{average}}', desc: 'Average score' },
    { key: '{{position}}', desc: 'Class position' },
    { key: '{{link}}', desc: 'Portal link' },
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Message Templates
            </CardTitle>
            <CardDescription>
              Pre-written templates with variables. Edit to customize for your school.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {templateTypes.map((type) => {
              const template = templates.find(t => t.type === type.type)
              const isEditing = editingTemplate === template?.id

              return (
                <div key={type.type} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{type.label}</h4>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                    {template && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          template.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {template.channel}
                        </span>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none font-mono"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTemplate(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveTemplate(template!.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm bg-muted/50 p-2 rounded font-mono">
                        {template?.content || 'No template configured'}
                      </p>
                      {template && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTemplate(template.id)
                            setEditContent(template.content)
                          }}
                        >
                          Edit Template
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available Placeholders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {placeholders.map((p) => (
                <div key={p.key} className="flex items-center justify-between text-sm">
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">{p.key}</code>
                  <span className="text-xs text-muted-foreground">{p.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">SMS Character Limits</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-muted-foreground">
              Keep messages concise for cost efficiency:
            </p>
            <ul className="space-y-1 text-xs">
              <li className="flex justify-between">
                <span>1 segment</span>
                <span className="font-mono">≤ 160 chars</span>
              </li>
              <li className="flex justify-between">
                <span>2 segments</span>
                <span className="font-mono">≤ 306 chars</span>
              </li>
              <li className="flex justify-between">
                <span>3 segments</span>
                <span className="font-mono">≤ 459 chars</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
