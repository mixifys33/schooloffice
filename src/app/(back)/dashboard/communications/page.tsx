'use client'

/**
 * Communications Hub - Institutional Communication Center
 * The school's voice, memory, proof, and control center.
 * 
 * Core Channels: SMS, Email, In-App Notifications
 * Key Features: Targeted messaging, automation, templates, delivery tracking, permissions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  MessageSquare, Send, History, AlertTriangle,
  Users, Smartphone, Mail, Clock, RefreshCw,
  CheckCircle, XCircle, Zap, FileText, BarChart3,
  Calendar, Megaphone, AlertCircle, TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageHistory } from '@/components/communication/message-history'
import { AnnouncementManagement } from '@/components/communication/announcement-management'
import { AutomationRules } from '@/components/communication/automation-rules'
import { TemplatesSection } from '@/components/communication/templates-section'
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
          channels: ['SMS', 'EMAIL'], // Removed WhatsApp
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
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
            Communications
          </h1>
          <p className="text-sm text-muted-foreground">
            Reach the right people, at the right time, with proof it happened.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingStats ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEmergencyModal(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Emergency</span>
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
              <Send className="h-8 w-8 text-[var(--accent-primary)] opacity-50" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-[var(--chart-green)]">{stats?.today.delivered || 0} delivered</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-[var(--chart-red)]">{stats?.today.failed || 0} failed</span>
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
              <TrendingUp className="h-8 w-8 text-[var(--success)] opacity-50" />
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--success)] rounded-full"
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
              <BarChart3 className="h-8 w-8 text-[var(--chart-purple)] opacity-50" />
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
              <Smartphone className="h-8 w-8 text-[var(--warning)] opacity-50" />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`flex flex-col items-center gap-2 p-3 md:p-4 rounded-lg border transition-colors text-center ${
                    action.variant === 'destructive'
                      ? 'border-[var(--danger-light)] bg-[var(--danger-light)] hover:bg-[var(--danger-light)] dark:border-[var(--danger-dark)] dark:bg-[var(--danger-dark)] dark:hover:bg-[var(--danger-dark)]'
                      : 'border-input bg-background hover:bg-accent'
                  }`}
                >
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 ${action.variant === 'destructive' ? 'text-[var(--chart-red)]' : 'text-primary'}`} />
                  <div>
                    <p className={`text-xs md:text-sm font-medium ${action.variant === 'destructive' ? 'text-[var(--chart-red)] dark:text-[var(--danger)]' : ''}`}>
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">{action.description}</p>
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
        <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full">
            <div className="p-4 border-b bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-semibold">Emergency Alert</h3>
                </div>
                <button 
                  onClick={() => setShowEmergencyModal(false)}
                  className="text-[var(--danger)] hover:text-[var(--chart-red)]"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-[var(--chart-red)] dark:text-[var(--danger)] mt-1">
                This will immediately notify ALL parents, students, and staff via SMS and Email.
              </p>
            </div>
            <div className="p-4 space-y-4">
              {emergencySuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-16 w-16 text-[var(--success)] mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-[var(--chart-green)]">Emergency Alert Sent!</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    All recipients are being notified across all channels.
                  </p>
                </div>
              ) : (
                <>
                  {emergencyError && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/30 dark:text-[var(--danger)]">
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
                  <div className="p-3 rounded-md bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] text-[var(--warning-dark)] dark:text-[var(--warning)] text-sm">
                    <p className="font-medium">This action:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                      <li>Overrides quiet hours and normal rules</li>
                      <li>Sends immediately to entire school</li>
                      <li>Uses all available channels (SMS, Email)</li>
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

  const getInitialTemplateType = useCallback(() => {
    switch (preset) {
      case 'fee-reminder': return 'FEES_REMINDER'
      case 'attendance-alert': return 'ATTENDANCE_ALERT'
      default: return ''
    }
  }, [preset])

  const [targetType, setTargetType] = useState<TargetType>(getInitialTargetType())
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedStreams, setSelectedStreams] = useState<string[]>([])
  const [feeThreshold, setFeeThreshold] = useState<number>(0)
  const [attendanceThreshold, setAttendanceThreshold] = useState<number>(75)
  const [selectedChannel] = useState<MessageChannel>(MessageChannel.SMS)
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
  const [recipientBreakdown, setRecipientBreakdown] = useState<string | null>(null)

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
            console.log('[Template Debug] Looking for template type:', presetTemplateType)
            console.log('[Template Debug] Available templates:', fetchedTemplates.map((t: TemplateOption) => ({ id: t.id, type: t.type })))
            
            const matchingTemplate = fetchedTemplates.find((t: TemplateOption) => t.type === presetTemplateType)
            if (matchingTemplate) {
              console.log('[Template Debug] Found matching template:', matchingTemplate)
              setSelectedTemplate(matchingTemplate.id)
              setCustomContent(matchingTemplate.content)
            } else {
              console.warn('[Template Debug] No matching template found for type:', presetTemplateType)
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
  }, [getInitialTemplateType])

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
          setRecipientCount(data.smsRecipients || 0) // Use SMS recipients count
          setRecipientBreakdown(data.breakdown?.message || null)
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
    if (useCustomContent && selectedChannel === MessageChannel.SMS && customContent.length > 160) {
      setError(`SMS message exceeds 160 character limit (${customContent.length} characters)`)
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

  // const CHANNEL_OPTIONS = [
  //   { value: MessageChannel.SMS, label: 'SMS', icon: Smartphone },
  // ]

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
          <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/20 dark:text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><XCircle className="h-4 w-4" /></button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)]/20 dark:text-[var(--success)]">
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
            <p className="text-xs text-muted-foreground">
              Set to 0 to include all students with any outstanding balance. Students who have paid all fees will NOT receive reminders.
            </p>
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
          <div className="p-3 rounded-md bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Users className="h-4 w-4" />
              SMS Recipients: {recipientCount}
              {loadingPreview && <span className="text-xs text-muted-foreground">(updating...)</span>}
            </div>
            {recipientBreakdown && (
              <p className="text-xs text-muted-foreground ml-6">
                {recipientBreakdown}
              </p>
            )}
          </div>
        )}

        {/* Channel Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Channel</label>
          <div className="p-3 rounded-md bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="text-sm font-medium">SMS Only</span>
              <span className="text-xs text-muted-foreground">UGX 45 per message</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Email integration is available for important notifications, while SMS remains the primary channel for universal accessibility.
            </p>
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
              {templates.filter(t => t.channel === 'SMS').map((t) => (
                <option key={t.id} value={t.id}>{t.type.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {/* Template count info */}
            {templates.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {templates.filter(t => t.channel === 'SMS').length} SMS templates available
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">{useCustomContent ? 'Message' : 'Preview'}</label>
          <textarea
            value={customContent}
            onChange={(e) => {
              const newValue = e.target.value
              // Strictly enforce 160 character limit for SMS
              if (selectedChannel === MessageChannel.SMS && newValue.length <= 160) {
                setCustomContent(newValue)
              } else if (selectedChannel !== MessageChannel.SMS) {
                setCustomContent(newValue)
              }
            }}
            onPaste={(e) => {
              // Handle paste events to enforce character limit for SMS
              if (selectedChannel === MessageChannel.SMS) {
                e.preventDefault()
                const pastedText = e.clipboardData.getData('text')
                const currentText = customContent
                const availableSpace = 160 - currentText.length
                const textToAdd = pastedText.slice(0, availableSpace)
                setCustomContent(currentText + textToAdd)
              }
            }}
            placeholder={useCustomContent ? 'Type your message... (160 characters max for SMS)' : 'Select a template'}
            rows={4}
            readOnly={!useCustomContent}
            maxLength={selectedChannel === MessageChannel.SMS ? 160 : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${
              !useCustomContent ? 'bg-muted/50 border-input' : 
              selectedChannel === MessageChannel.SMS && characterCount > 160 ? 'border-[var(--danger)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20' :
              selectedChannel === MessageChannel.SMS && characterCount > 140 ? 'border-[var(--warning)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/20' :
              'border-input bg-background'
            }`}
          />
          {selectedChannel === MessageChannel.SMS && (
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`${
                  characterCount > 160 ? 'text-[var(--chart-red)]' : 
                  characterCount > 140 ? 'text-[var(--chart-yellow)]' : 
                  'text-muted-foreground'
                }`}>
                  {characterCount}/160 characters
                </span>
                {characterCount > 160 && (
                  <span className="text-[var(--chart-red)] font-medium">
                    ({characterCount - 160} over limit)
                  </span>
                )}
                {characterCount > 140 && characterCount <= 160 && (
                  <span className="text-[var(--chart-yellow)]">
                    ({160 - characterCount} remaining)
                  </span>
                )}
              </div>
              <div className="text-muted-foreground">
                Cost: UGX 45
              </div>
            </div>
          )}
          {selectedChannel === MessageChannel.SMS && characterCount > 160 && (
            <div className="text-xs text-[var(--chart-red)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20 p-2 rounded">
              Message exceeds 160 character limit. Please shorten your message to avoid additional charges.
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
                    ? p === 'critical' ? 'bg-[var(--danger)] text-[var(--white-pure)] border-[var(--danger)]'
                      : p === 'high' ? 'bg-[var(--warning)] text-[var(--white-pure)] border-[var(--warning)]'
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


