'use client'

/**
 * Message Composer Component
 * Provides UI for composing and sending messages with targeting, templates, and scheduling
 * Requirements: 5.1-5.8, 13.1
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Send,
  Users,
  Clock,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  X,
  Calendar,
  MessageSquare,
  Mail,
  Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TargetType, MessageChannel } from '@/types/enums'

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
  channel: MessageChannel
}

interface RecipientPreview {
  total: number
  students: number
  guardians: number
  staff: number
}

interface MessageComposerProps {
  schoolId?: string
  onSendSuccess?: (messageId: string) => void
  onSendError?: (error: string) => void
}

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

export function MessageComposer({ onSendSuccess, onSendError }: MessageComposerProps) {
  const [targetType, setTargetType] = useState<TargetType>(TargetType.ENTIRE_SCHOOL)
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
  const [recipientPreview, setRecipientPreview] = useState<RecipientPreview | null>(null)

  const [loadingOptions, setLoadingOptions] = useState<boolean>(false)
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false)
  const [sending, setSending] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchOptions = useCallback(async () => {
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
        setTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('Error fetching options:', err)
    } finally {
      setLoadingOptions(false)
    }
  }, [])

  useEffect(() => { fetchOptions() }, [fetchOptions])

  const previewRecipients = useCallback(async () => {
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
        setRecipientPreview(await response.json())
      }
    } catch (err) {
      console.error('Error previewing recipients:', err)
    } finally {
      setLoadingPreview(false)
    }
  }, [targetType, selectedClasses, selectedStreams, feeThreshold, attendanceThreshold])

  useEffect(() => {
    const timer = setTimeout(() => previewRecipients(), 500)
    return () => clearTimeout(timer)
  }, [previewRecipients])

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
        targetType, targetCriteria: criteria, channel: selectedChannel, priority,
      }

      if (useCustomContent) payload.customContent = customContent
      else payload.templateId = selectedTemplate

      if (scheduleMessage && scheduledDate && scheduledTime) {
        payload.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }

      const response = await fetch('/api/communication/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to send message')

      if (result.success) {
        setSuccess(`Message ${scheduleMessage ? 'scheduled' : 'sent'} successfully!`)
        onSendSuccess?.(result.messageId)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Compose Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}

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

        {targetType === TargetType.FEE_DEFAULTERS && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Minimum Outstanding Balance (UGX)</label>
            <input
              type="number"
              value={feeThreshold}
              onChange={(e) => setFeeThreshold(Number(e.target.value))}
              min={0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        )}

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
          </div>
        )}

        {recipientPreview && (
          <div className="p-3 rounded-md bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Users className="h-4 w-4" />
              Recipients: {recipientPreview.total}
              {loadingPreview && <span className="text-xs text-muted-foreground">(updating...)</span>}
            </div>
          </div>
        )}

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

        {!useCustomContent && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">Select Template</label>
            <div className="relative">
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none"
              >
                <option value="">Select a template...</option>
                {templates.filter(t => t.channel === selectedChannel).map((t) => (
                  <option key={t.id} value={t.id}>{t.type.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
            </div>
          </div>
        )}

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
              <span>{smsSegments} segment{smsSegments > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Priority</label>
          <div className="flex gap-2">
            {(['normal', 'high', 'critical'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-4 py-2 rounded-md border text-sm capitalize ${
                  priority === p
                    ? p === 'critical' ? 'bg-red-500 text-white'
                      : p === 'high' ? 'bg-yellow-500 text-white'
                      : 'bg-primary text-primary-foreground'
                    : 'bg-background border-input hover:bg-accent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={scheduleMessage} onChange={(e) => setScheduleMessage(e.target.checked)} />
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Schedule for later</span>
          </label>
          {scheduleMessage && (
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          )}
        </div>

        <Button onClick={handleSend} disabled={sending} className="w-full gap-2" size="lg">
          {sending ? (
            <><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              {scheduleMessage ? 'Scheduling...' : 'Sending...'}</>
          ) : (
            <><Send className="h-4 w-4" />{scheduleMessage ? 'Schedule Message' : 'Send Message'}</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
