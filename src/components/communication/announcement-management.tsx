'use client'

/**
 * Announcement Management Component
 * Provides UI for creating, editing, and managing announcements with targeting,
 * scheduling, pinning, and delivery tracking.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Megaphone, Plus, Edit2, Trash2, Pin, PinOff, Send, Clock, Calendar,
  CheckCircle, XCircle, AlertTriangle, ChevronDown, X, Users, Mail,
  Smartphone, MessageSquare, BarChart3, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TargetType, MessageChannel } from '@/types/enums'

interface EnhancedAnnouncement {
  id: string
  title: string
  content: string
  targetType: string
  targetCriteria: Record<string, unknown>
  channels: MessageChannel[]
  isPinned: boolean
  pinnedUntil?: string
  scheduledAt?: string
  publishedAt?: string
  expiresAt?: string
  createdAt: string
}

interface DeliveryStats {
  total: number
  queued: number
  sent: number
  delivered: number
  read: number
  failed: number
}

interface ClassOption { id: string; name: string; studentCount: number }
interface StreamOption { id: string; name: string; className: string; studentCount: number }

interface AnnouncementManagementProps {
  onAnnouncementCreated?: (a: EnhancedAnnouncement) => void
  onAnnouncementUpdated?: (a: EnhancedAnnouncement) => void
  onAnnouncementDeleted?: (id: string) => void
}

const TARGET_OPTIONS = [
  { value: TargetType.ENTIRE_SCHOOL, label: 'Entire School' },
  { value: TargetType.CLASS, label: 'By Class' },
  { value: TargetType.STREAM, label: 'By Stream' },
  { value: TargetType.FEE_DEFAULTERS, label: 'Fee Defaulters' },
  { value: TargetType.STAFF_ROLE, label: 'Staff by Role' },
]

const CHANNEL_OPTIONS = [
  { value: MessageChannel.SMS, label: 'SMS', icon: Smartphone },
]

// SMS constraints for Uganda market
const SMS_MAX_CHARACTERS = 160
const SMS_COST_UGX = 45

type TabType = 'all' | 'published' | 'scheduled' | 'drafts' | 'pinned'

export function AnnouncementManagement({
  onAnnouncementCreated, onAnnouncementUpdated, onAnnouncementDeleted,
}: AnnouncementManagementProps) {
  const [announcements, setAnnouncements] = useState<EnhancedAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<EnhancedAnnouncement | null>(null)
  const [formData, setFormData] = useState({
    title: '', content: '', targetType: TargetType.ENTIRE_SCHOOL as TargetType,
    channels: [MessageChannel.SMS] as MessageChannel[], isPinned: false,
  })
  const [saving, setSaving] = useState(false)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [streams, setStreams] = useState<StreamOption[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedStreams, setSelectedStreams] = useState<string[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [scheduleAnnouncement, setScheduleAnnouncement] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [expiresDate, setExpiresDate] = useState('')
  const [pinnedUntilDate, setPinnedUntilDate] = useState('')
  const [selectedAnnouncementStats, setSelectedAnnouncementStats] = useState<string | null>(null)
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (activeTab === 'published') params.append('isPublished', 'true')
      if (activeTab === 'drafts') params.append('isPublished', 'false')
      if (activeTab === 'pinned') params.append('isPinned', 'true')
      if (activeTab === 'scheduled') params.append('scheduled', 'true')
      const response = await fetch(`/api/announcements?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch announcements')
      const data = await response.json()
      setAnnouncements(data.announcements || [])
      setError(null)
    } catch (err) {
      setError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  const fetchOptions = useCallback(async () => {
    try {
      setLoadingOptions(true)
      const [classesRes, streamsRes] = await Promise.all([fetch('/api/classes'), fetch('/api/streams')])
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
    } catch (err) { console.error('Error fetching options:', err) }
    finally { setLoadingOptions(false) }
  }, [])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])
  useEffect(() => { fetchOptions() }, [fetchOptions])

  const fetchDeliveryStats = useCallback(async (announcementId: string) => {
    try {
      setLoadingStats(true)
      const response = await fetch(`/api/announcements/${announcementId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch delivery stats')
      const data = await response.json()
      setDeliveryStats(data.stats)
    } catch (err) { console.error('Error fetching delivery stats:', err) }
    finally { setLoadingStats(false) }
  }, [])

  const handleShowStats = (announcementId: string) => {
    setSelectedAnnouncementStats(announcementId)
    fetchDeliveryStats(announcementId)
  }

  const resetForm = () => {
    setFormData({ title: '', content: '', targetType: TargetType.ENTIRE_SCHOOL, channels: [MessageChannel.SMS], isPinned: false })
    setSelectedClasses([]); setSelectedStreams([]); setScheduleAnnouncement(false)
    setScheduledDate(''); setScheduledTime(''); setExpiresDate(''); setPinnedUntilDate('')
  }

  const handleOpenForm = (announcement?: EnhancedAnnouncement) => {
    if (announcement) {
      setEditingAnnouncement(announcement)
      setFormData({
        title: announcement.title, content: announcement.content,
        targetType: announcement.targetType as TargetType, channels: announcement.channels, isPinned: announcement.isPinned,
      })
      if (announcement.targetCriteria?.classIds) setSelectedClasses(announcement.targetCriteria.classIds as string[])
      if (announcement.targetCriteria?.streamIds) setSelectedStreams(announcement.targetCriteria.streamIds as string[])
      if (announcement.scheduledAt) {
        setScheduleAnnouncement(true)
        const date = new Date(announcement.scheduledAt)
        setScheduledDate(date.toISOString().split('T')[0])
        setScheduledTime(date.toTimeString().slice(0, 5))
      }
      if (announcement.expiresAt) setExpiresDate(new Date(announcement.expiresAt).toISOString().split('T')[0])
      if (announcement.pinnedUntil) setPinnedUntilDate(new Date(announcement.pinnedUntil).toISOString().split('T')[0])
    } else { setEditingAnnouncement(null); resetForm() }
    setShowForm(true)
  }

  const handleCloseForm = () => { setShowForm(false); setEditingAnnouncement(null); resetForm() }

  const handleChannelToggle = (channel: MessageChannel) => {
    const current = formData.channels
    if (current.includes(channel)) {
      if (current.length > 1) setFormData(prev => ({ ...prev, channels: current.filter(c => c !== channel) }))
    } else { setFormData(prev => ({ ...prev, channels: [...current, channel] })) }
  }

  const handleSaveAnnouncement = async () => {
    if (!formData.title?.trim()) { setError('Title is required'); return }
    if (!formData.content?.trim()) { setError('Content is required'); return }
    if (formData.channels.length === 0) { setError('At least one channel is required'); return }
    try {
      setSaving(true); setError(null)
      const criteria: Record<string, unknown> = {}
      if (formData.targetType === TargetType.CLASS && selectedClasses.length > 0) criteria.classIds = selectedClasses
      else if (formData.targetType === TargetType.STREAM && selectedStreams.length > 0) criteria.streamIds = selectedStreams
      const payload: Record<string, unknown> = {
        title: formData.title, content: formData.content, targetType: formData.targetType,
        targetCriteria: criteria, channels: formData.channels, isPinned: formData.isPinned,
      }
      if (scheduleAnnouncement && scheduledDate && scheduledTime) payload.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      if (expiresDate) payload.expiresAt = new Date(expiresDate).toISOString()
      if (formData.isPinned && pinnedUntilDate) payload.pinnedUntil = new Date(pinnedUntilDate).toISOString()
      const url = editingAnnouncement ? `/api/announcements/${editingAnnouncement.id}` : '/api/announcements'
      const method = editingAnnouncement ? 'PUT' : 'POST'
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to save announcement') }
      const saved = await response.json()
      if (editingAnnouncement) { setAnnouncements(prev => prev.map(a => a.id === saved.id ? saved : a)); onAnnouncementUpdated?.(saved) }
      else { setAnnouncements(prev => [saved, ...prev]); onAnnouncementCreated?.(saved) }
      handleCloseForm()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save announcement') }
    finally { setSaving(false) }
  }

  const handlePublish = async (id: string) => {
    try {
      const response = await fetch(`/api/announcements/${id}/publish`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to publish')
      const published = await response.json()
      setAnnouncements(prev => prev.map(a => a.id === published.id ? published : a))
      onAnnouncementUpdated?.(published)
    } catch (err) { setError('Failed to publish announcement') }
  }

  const handleTogglePin = async (announcement: EnhancedAnnouncement) => {
    try {
      const endpoint = announcement.isPinned ? `/api/announcements/${announcement.id}/unpin` : `/api/announcements/${announcement.id}/pin`
      const response = await fetch(endpoint, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to update pin status')
      const updated = await response.json()
      setAnnouncements(prev => prev.map(a => a.id === updated.id ? updated : a))
      onAnnouncementUpdated?.(updated)
    } catch (err) { console.error('Error toggling pin:', err) }
  }

  const handleDeleteAnnouncement = async () => {
    if (!deletingAnnouncement) return
    try {
      const response = await fetch(`/api/announcements/${deletingAnnouncement}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      setAnnouncements(prev => prev.filter(a => a.id !== deletingAnnouncement))
      onAnnouncementDeleted?.(deletingAnnouncement)
      setDeletingAnnouncement(null); setConfirmDelete(false)
    } catch (err) { console.error('Error deleting:', err) }
  }

  const handleRetryFailed = async (id: string) => {
    try {
      const response = await fetch(`/api/announcements/${id}/retry`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to retry')
      fetchDeliveryStats(id)
    } catch (err) { console.error('Error retrying:', err) }
  }

  const getStatusBadge = (a: EnhancedAnnouncement) => {
    if (a.publishedAt) return <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)]/30 dark:text-[var(--success)]">Published</span>
    if (a.scheduledAt) return <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--info-light)] text-[var(--accent-hover)] dark:bg-[var(--info-dark)]/30 dark:text-[var(--chart-blue)]">Scheduled</span>
    return <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-muted)]">Draft</span>
  }

  const filteredAnnouncements = announcements.filter(a => {
    switch (activeTab) {
      case 'published': return !!a.publishedAt
      case 'scheduled': return !a.publishedAt && !!a.scheduledAt
      case 'drafts': return !a.publishedAt && !a.scheduledAt
      case 'pinned': return a.isPinned
      default: return true
    }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />Announcements</CardTitle>
          <Button onClick={() => handleOpenForm()} size="sm"><Plus className="h-4 w-4 mr-1" />New Announcement</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/20 dark:text-[var(--danger)]">
            <AlertTriangle className="h-4 w-4" /><span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
          </div>
        )}
        <div className="flex gap-1 border-b">
          {(['all', 'published', 'scheduled', 'drafts', 'pinned'] as TabType[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-md bg-muted animate-pulse" />)}</div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>No announcements found</p>
            <Button variant="outline" className="mt-4" onClick={() => handleOpenForm()}><Plus className="h-4 w-4 mr-1" />Create your first announcement</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map((announcement) => (
              <div key={announcement.id} className="p-4 rounded-md border bg-background">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{announcement.title}</h4>
                      {getStatusBadge(announcement)}
                      {announcement.isPinned && <Pin className="h-4 w-4 text-[var(--warning)]" />}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{announcement.targetType.replace(/_/g, ' ')}</span>
                      <span className="flex items-center gap-1">
                        {announcement.channels.map(ch => { const opt = CHANNEL_OPTIONS.find(o => o.value === ch); const Icon = opt?.icon || Smartphone; return <Icon key={ch} className="h-3 w-3" /> })}
                      </span>
                      {announcement.scheduledAt && !announcement.publishedAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(announcement.scheduledAt).toLocaleDateString()}</span>}
                      {announcement.publishedAt && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{new Date(announcement.publishedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {announcement.publishedAt && <Button variant="ghost" size="sm" onClick={() => handleShowStats(announcement.id)} title="View delivery stats"><BarChart3 className="h-4 w-4" /></Button>}
                    <Button variant="ghost" size="sm" onClick={() => handleTogglePin(announcement)} title={announcement.isPinned ? 'Unpin' : 'Pin'}>{announcement.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</Button>
                    {!announcement.publishedAt && (<><Button variant="ghost" size="sm" onClick={() => handlePublish(announcement.id)} title="Publish now"><Send className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleOpenForm(announcement)} title="Edit"><Edit2 className="h-4 w-4" /></Button></>)}
                    <Button variant="ghost" size="sm" onClick={() => { setDeletingAnnouncement(announcement.id); setConfirmDelete(true) }} title="Delete" className="text-[var(--danger)] hover:text-[var(--chart-red)]"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Announcement Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</h3>
                <button onClick={handleCloseForm}><X className="h-5 w-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Announcement title" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Content *</label>
                  <textarea 
                    value={formData.content} 
                    onChange={(e) => {
                      const newValue = e.target.value
                      if (newValue.length <= SMS_MAX_CHARACTERS) {
                        setFormData(prev => ({ ...prev, content: newValue }))
                      }
                    }}
                    placeholder={`Announcement content... (${SMS_MAX_CHARACTERS} characters max)`} 
                    rows={4} 
                    className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${
                      formData.content.length > SMS_MAX_CHARACTERS * 0.9 
                        ? 'border-[var(--warning)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/20' 
                        : 'border-input bg-background'
                    }`} 
                  />
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className={`${
                      formData.content.length > SMS_MAX_CHARACTERS * 0.9 
                        ? 'text-[var(--chart-yellow)]' 
                        : 'text-muted-foreground'
                    }`}>
                      {formData.content.length}/{SMS_MAX_CHARACTERS} characters
                    </span>
                    <span className="text-muted-foreground">
                      Cost: UGX {SMS_COST_UGX}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Recipients</label>
                  <div className="relative">
                    <select value={formData.targetType} onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value as TargetType }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none">
                      {TARGET_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
                  </div>
                </div>
                {formData.targetType === TargetType.CLASS && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Select Classes</label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                      {loadingOptions ? <p className="text-sm text-muted-foreground">Loading...</p> : classes.length === 0 ? <p className="text-sm text-muted-foreground">No classes found</p> : (
                        classes.map((cls) => (
                          <label key={cls.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-accent rounded">
                            <input type="checkbox" checked={selectedClasses.includes(cls.id)}
                              onChange={(e) => setSelectedClasses(e.target.checked ? [...selectedClasses, cls.id] : selectedClasses.filter(id => id !== cls.id))} className="rounded border-input" />
                            <span className="text-sm">{cls.name}</span><span className="text-xs text-muted-foreground">({cls.studentCount})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {formData.targetType === TargetType.STREAM && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Select Streams</label>
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                      {loadingOptions ? <p className="text-sm text-muted-foreground">Loading...</p> : streams.length === 0 ? <p className="text-sm text-muted-foreground">No streams found</p> : (
                        streams.map((stream) => (
                          <label key={stream.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-accent rounded">
                            <input type="checkbox" checked={selectedStreams.includes(stream.id)}
                              onChange={(e) => setSelectedStreams(e.target.checked ? [...selectedStreams, stream.id] : selectedStreams.filter(id => id !== stream.id))} className="rounded border-input" />
                            <span className="text-sm">{stream.className} - {stream.name}</span><span className="text-xs text-muted-foreground">({stream.studentCount})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Communication Channel</label>
                  <div className="p-3 rounded-md bg-muted/50 border">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span className="text-sm font-medium">SMS Only</span>
                      <span className="text-xs text-muted-foreground">UGX {SMS_COST_UGX} per message</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cost-effective SMS communication for universal accessibility.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isPinned" checked={formData.isPinned} onChange={(e) => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))} className="rounded border-input" />
                  <label htmlFor="isPinned" className="text-sm flex items-center gap-1"><Pin className="h-4 w-4" />Pin this announcement</label>
                </div>
                {formData.isPinned && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Pin Until (optional)</label>
                    <input type="date" value={pinnedUntilDate} onChange={(e) => setPinnedUntilDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="scheduleAnnouncement" checked={scheduleAnnouncement} onChange={(e) => setScheduleAnnouncement(e.target.checked)} className="rounded border-input" />
                  <label htmlFor="scheduleAnnouncement" className="text-sm flex items-center gap-1"><Calendar className="h-4 w-4" />Schedule for later</label>
                </div>
                {scheduleAnnouncement && (
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Expires On (optional)</label>
                  <input type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleCloseForm} className="flex-1">Cancel</Button>
                  <Button onClick={handleSaveAnnouncement} disabled={saving} className="flex-1">
                    {saving ? <><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />Saving...</> : editingAnnouncement ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Stats Modal */}
        {selectedAnnouncementStats && (
          <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-md w-full">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Delivery Statistics</h3>
                <button onClick={() => setSelectedAnnouncementStats(null)}><X className="h-5 w-5" /></button>
              </div>
              <div className="p-4">
                {loadingStats ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />)}</div>
                ) : deliveryStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-md bg-muted/50">
                        <div className="text-2xl font-bold">{deliveryStats.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center p-3 rounded-md bg-[var(--success-light)] dark:bg-[var(--success-dark)]/20">
                        <div className="text-2xl font-bold text-[var(--chart-green)]">{deliveryStats.delivered + deliveryStats.read}</div>
                        <div className="text-xs text-muted-foreground">Delivered</div>
                      </div>
                      <div className="text-center p-3 rounded-md bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20">
                        <div className="text-2xl font-bold text-[var(--chart-red)]">{deliveryStats.failed}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Queued</span><span>{deliveryStats.queued}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sent</span><span>{deliveryStats.sent}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivered</span><span>{deliveryStats.delivered}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Read</span><span>{deliveryStats.read}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Failed</span><span>{deliveryStats.failed}</span></div>
                    </div>
                    {deliveryStats.failed > 0 && (
                      <Button variant="outline" className="w-full" onClick={() => handleRetryFailed(selectedAnnouncementStats)}>
                        <RefreshCw className="h-4 w-4 mr-2" />Retry Failed Deliveries
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">No delivery data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && deletingAnnouncement && (
          <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/30"><AlertTriangle className="h-5 w-5" /></div>
                <h3 className="font-semibold">Delete Announcement?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">This action cannot be undone. The announcement and all its delivery records will be permanently deleted.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setConfirmDelete(false); setDeletingAnnouncement(null) }} className="flex-1">Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteAnnouncement} className="flex-1">Delete</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
