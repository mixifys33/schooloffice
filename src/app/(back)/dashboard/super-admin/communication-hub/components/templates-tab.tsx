'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  HubTemplate,
  TemplateVersion,
  CreateTemplateInput,
  UpdateTemplateInput,
  MessageChannel
} from '@/types/communication-hub'

/**
 * Templates Tab Component
 * Requirements: 5.1-5.7, 10.14, 10.15
 */

interface TemplatesTabProps {
  templates: HubTemplate[]
  onCreateTemplate: (template: CreateTemplateInput) => void
  onUpdateTemplate: (id: string, updates: UpdateTemplateInput) => void
  onRefresh: () => void
}

function ChannelBadge({ channel }: { channel: MessageChannel }) {
  const colors: Record<MessageChannel, string> = {
    [MessageChannel.SMS]: 'bg-[var(--info-dark)]/50 text-[var(--chart-blue)]',
    [MessageChannel.WHATSAPP]: 'bg-[var(--success-dark)]/50 text-[var(--success)]',
    [MessageChannel.EMAIL]: 'bg-[var(--info-dark)]/50 text-[var(--chart-purple)]'
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[channel] || 'bg-slate-900/50 text-[var(--text-muted)]'}`}>
      {channel}
    </span>
  )
}

function VariableHighlighter({ content }: { content: string }) {
  const parts = content.split(/(\{\{[^}]+\}\})/g)
  return (
    <div className="font-mono text-sm whitespace-pre-wrap">
      {parts.map((part, i) => 
        part.match(/^\{\{[^}]+\}\}$/) 
          ? <span key={i} className="bg-[var(--info-dark)]/50 text-[var(--info)] px-1 rounded">{part}</span>
          : <span key={i} className="text-[var(--text-muted)]">{part}</span>
      )}
    </div>
  )
}


function TemplateEditor({ 
  template, 
  onSave, 
  onCancel, 
  isNew 
}: { 
  template?: HubTemplate | null
  onSave: (t: CreateTemplateInput) => void
  onCancel: () => void
  isNew: boolean
}) {
  const [formData, setFormData] = useState<CreateTemplateInput>({
    name: template?.name || '',
    channel: template?.channel || MessageChannel.SMS,
    content: template?.content || '',
    isMandatory: template?.isMandatory || false
  })
  const [previewData, setPreviewData] = useState<Record<string, string>>({})
  const [previewContent, setPreviewContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  const variables = [...new Set((formData.content.match(/\{\{([^}]+)\}\}/g) || []).map(m => m.replace(/\{\{|\}\}/g, '').trim()))]

  const handlePreview = () => {
    let preview = formData.content
    Object.entries(previewData).forEach(([k, v]) => {
      preview = preview.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || `[${k}]`)
    })
    setPreviewContent(preview)
    setShowPreview(true)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(formData)
    setSaving(false)
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-[var(--text-secondary)]">
          {isNew ? 'Create New Template' : `Edit: ${template?.name}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Name</label>
            <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="bg-slate-700 border-slate-600" />
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)] block mb-1">Channel</label>
            <select value={formData.channel} onChange={(e) => setFormData(p => ({ ...p, channel: e.target.value as MessageChannel }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)]" disabled={!isNew}>
              <option value={MessageChannel.SMS}>SMS</option>
              <option value={MessageChannel.WHATSAPP}>WhatsApp</option>
              <option value={MessageChannel.EMAIL}>Email</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)] block mb-1">Content</label>
          <textarea value={formData.content} onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))} rows={6} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)] font-mono text-sm" placeholder="Dear {{name}}, your payment of {{amount}} is due." />
        </div>
        {variables.length > 0 && (
          <div className="border border-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Preview</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {variables.map(v => (
                <Input key={v} placeholder={v} value={previewData[v] || ''} onChange={(e) => setPreviewData(p => ({ ...p, [v]: e.target.value }))} className="bg-slate-700 border-slate-600 text-sm" />
              ))}
            </div>
            <Button onClick={handlePreview} variant="outline" size="sm" className="bg-slate-700 border-slate-600">Preview</Button>
            {showPreview && <div className="mt-3 p-3 bg-slate-900/50 rounded text-sm text-[var(--text-secondary)]">{previewContent}</div>}
          </div>
        )}
        <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Mandatory</p>
            <p className="text-xs text-[var(--text-muted)]">Schools must use this template</p>
          </div>
          <input type="checkbox" checked={formData.isMandatory} onChange={(e) => setFormData(p => ({ ...p, isMandatory: e.target.checked }))} className="w-5 h-5" />
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !formData.name || !formData.content} className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)] text-[var(--white-pure)]">
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


function VersionHistory({ templateId, onRevert }: { templateId: string; onRevert: (id: string) => void }) {
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/communication-hub/templates/${templateId}/versions`)
      .then(r => r.ok ? r.json() : [])
      .then(setVersions)
      .finally(() => setLoading(false))
  }, [templateId])

  if (loading) return <SkeletonLoader variant="list" count={3} />

  return (
    <div className="space-y-2">
      {versions.map(v => (
        <div key={v.id} className="border border-slate-700 rounded-lg p-3 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-[var(--text-secondary)]">v{v.version}</span>
              <span className="text-xs text-[var(--text-muted)] ml-2">{new Date(v.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === v.id ? null : v.id)} className="bg-slate-700 border-slate-600 text-xs">
                {expanded === v.id ? 'Hide' : 'View'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onRevert(v.id)} className="bg-slate-700 border-slate-600 text-xs">Revert</Button>
            </div>
          </div>
          {expanded === v.id && <div className="mt-3 p-3 bg-slate-900/50 rounded"><VariableHighlighter content={v.content} /></div>}
        </div>
      ))}
      {versions.length === 0 && <p className="text-[var(--text-muted)] text-sm text-center py-4">No version history</p>}
    </div>
  )
}

export default function TemplatesTab({ templates, onCreateTemplate, onUpdateTemplate, onRefresh }: TemplatesTabProps) {
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'versions'>('list')
  const [selected, setSelected] = useState<HubTemplate | null>(null)
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<MessageChannel | ''>('')

  const filtered = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) && 
    (!channelFilter || t.channel === channelFilter)
  )

  const handleCreate = async (t: CreateTemplateInput) => {
    await onCreateTemplate(t)
    setView('list')
    onRefresh()
  }

  const handleUpdate = async (t: CreateTemplateInput) => {
    if (selected) {
      await onUpdateTemplate(selected.id, t as UpdateTemplateInput)
      setView('list')
      setSelected(null)
      onRefresh()
    }
  }

  const handleRevert = async (versionId: string) => {
    if (selected) {
      await fetch(`/api/admin/communication-hub/templates/${selected.id}/versions/${versionId}/revert`, { method: 'POST' })
      onRefresh()
      setView('list')
      setSelected(null)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Template Management</h2>
          <p className="text-sm text-[var(--text-muted)]">Create and manage message templates</p>
        </div>
        {view === 'list' && (
          <Button onClick={() => setView('create')} className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)] text-[var(--white-pure)]">New Template</Button>
        )}
      </div>

      {view === 'list' && (
        <>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-slate-700 border-slate-600" />
                </div>
                <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value as MessageChannel | '')} className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-[var(--text-muted)]">
                  <option value="">All Channels</option>
                  <option value={MessageChannel.SMS}>SMS</option>
                  <option value={MessageChannel.WHATSAPP}>WhatsApp</option>
                  <option value={MessageChannel.EMAIL}>Email</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(t => (
              <Card key={t.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">{t.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <ChannelBadge channel={t.channel} />
                        {t.isMandatory && <span className="text-xs text-[var(--warning)]">Mandatory</span>}
                        <span className="text-xs text-[var(--text-muted)]">v{t.version}</span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button onClick={() => { setSelected(t); setView('edit') }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => { setSelected(t); setView('versions') }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" title="History">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2 mb-3">
                    <VariableHighlighter content={t.content.substring(0, 100) + (t.content.length > 100 ? '...' : '')} />
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>{t.variables.length} variable(s)</span>
                    <span>{t.assignedSchools.length} school(s)</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <p className="text-[var(--text-muted)]">No templates found</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {view === 'create' && <TemplateEditor isNew onSave={handleCreate} onCancel={() => setView('list')} />}
      {view === 'edit' && <TemplateEditor template={selected} isNew={false} onSave={handleUpdate} onCancel={() => { setView('list'); setSelected(null) }} />}
      {view === 'versions' && selected && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[var(--text-secondary)]">Version History: {selected.name}</CardTitle>
              <Button variant="outline" onClick={() => { setView('list'); setSelected(null) }}>Back</Button>
            </div>
          </CardHeader>
          <CardContent>
            <VersionHistory templateId={selected.id} onRevert={handleRevert} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
