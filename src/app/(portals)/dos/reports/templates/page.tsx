'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Trash2, CheckCircle2, Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Template {
  id: string
  name: string
  type: string
  content: string
  variables: any
  isDefault: boolean
  isActive: boolean
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
  creator: { id: string; firstName: string; lastName: string }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({ name: '', type: 'NEW_CURRICULUM', content: '', isDefault: false })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [typeFilter])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      const res = await fetch(`/api/dos/reports/templates?${params}`)
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (err) {
      setError('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/dos/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Template created successfully!')
        setShowDialog(false)
        setFormData({ name: '', type: 'NEW_CURRICULUM', content: '', isDefault: false })
        fetchTemplates()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to create template')
    }
  }

  const handleUpdate = async () => {
    if (!editingTemplate) return
    try {
      const res = await fetch(`/api/dos/reports/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Template updated successfully!')
        setShowDialog(false)
        setEditingTemplate(null)
        fetchTemplates()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to update template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      const res = await fetch(`/api/dos/reports/templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccess('Template deleted successfully!')
        fetchTemplates()
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to delete template')
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/dos/reports/templates/${id}/set-default`, { method: 'POST' })
      if (res.ok) {
        setSuccess('Template set as default!')
        fetchTemplates()
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to set default template')
    }
  }

  const openCreateDialog = () => {
    setFormData({ name: '', type: 'NEW_CURRICULUM', content: '', isDefault: false })
    setEditingTemplate(null)
    setShowDialog(true)
  }

  const openEditDialog = (template: Template) => {
    setFormData({ name: template.name, type: template.type, content: template.content, isDefault: template.isDefault })
    setEditingTemplate(template)
    setShowDialog(true)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Card Templates</h1>
          <p className="text-muted-foreground mt-2">Manage report card templates</p>
        </div>
        <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" />Create Template</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Filter</CardTitle></CardHeader>
        <CardContent>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="NEW_CURRICULUM">New Curriculum</SelectItem>
              <SelectItem value="LEGACY">Legacy</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-green-500 bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-600">{success}</AlertDescription></Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    {template.isDefault && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    <Badge variant="outline">{template.type}</Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Used:</span> <span className="font-medium">{template.usageCount} times</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Created:</span> <span className="font-medium">{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">By:</span> <span className="font-medium">{template.creator.firstName} {template.creator.lastName}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(template)}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                  {!template.isDefault && <Button size="sm" variant="outline" onClick={() => handleSetDefault(template.id)}><Star className="h-3 w-3 mr-1" />Set Default</Button>}
                  {!template.isDefault && <Button size="sm" variant="destructive" onClick={() => handleDelete(template.id)}><Trash2 className="h-3 w-3" /></Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {!loading && templates.length === 0 && (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">No Templates Found</h3></CardContent></Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>Configure report card template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Template name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={formData.type} onValueChange={type => setFormData({ ...formData, type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW_CURRICULUM">New Curriculum</SelectItem>
                  <SelectItem value="LEGACY">Legacy</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content (Handlebars HTML)</label>
              <Textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} placeholder="<html>...</html>" rows={10} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({ ...formData, isDefault: e.target.checked })} />
              <label className="text-sm">Set as default template</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={editingTemplate ? handleUpdate : handleCreate}>{editingTemplate ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
