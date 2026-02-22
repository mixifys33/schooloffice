'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Plus, Edit, Trash2, Eye, Copy, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'

interface Template {
  id: string
  name: string
  category: string
  type: string
  channel: string
  subject: string
  message: string
  variables: string[]
  isActive: boolean
}

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'reminder',
    type: 'PAYMENT_REMINDER',
    channel: 'BOTH',
    subject: '',
    message: '',
    variables: [] as string[]
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bursar/communications/templates')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId 
        ? `/api/bursar/communications/templates/${editingId}`
        : '/api/bursar/communications/templates'
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) throw new Error('Failed to save')
      
      setSuccess(editingId ? 'Template updated!' : 'Template created!')
      setShowForm(false)
      setEditingId(null)
      resetForm()
      fetchTemplates()
    } catch (err) {
      console.error(err)
    }
  }

  const handleEdit = (template: Template) => {
    setFormData({
      name: template.name,
      category: template.category,
      type: template.type,
      channel: template.channel,
      subject: template.subject,
      message: template.message,
      variables: template.variables
    })
    setEditingId(template.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return
    try {
      const response = await fetch(`/api/bursar/communications/templates/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      setSuccess('Template deleted!')
      fetchTemplates()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDuplicate = (template: Template) => {
    setFormData({
      name: `${template.name} (Copy)`,
      category: template.category,
      type: template.type,
      channel: template.channel,
      subject: template.subject,
      message: template.message,
      variables: template.variables
    })
    setEditingId(null)
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'reminder',
      type: 'PAYMENT_REMINDER',
      channel: 'BOTH',
      subject: '',
      message: '',
      variables: []
    })
  }

  const filteredTemplates = templates.filter(t => categoryFilter === 'all' || t.category === categoryFilter)
  const activeTemplates = templates.filter(t => t.isActive).length

  if (loading) return <div className="p-6"><h1 className="text-2xl font-bold mb-4">Message Templates</h1><p>Loading...</p></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message Templates</h1>
          <p className="text-gray-600">Manage reusable message templates</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); setEditingId(null); }}>
          <Plus className="h-4 w-4 mr-2" />New Template
        </Button>
      </div>

      {success && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-900">{success}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Templates" value={String(templates.length)} subtitle="All templates" color="blue" icon={<FileText className="h-6 w-6" />} />
        <StatCard title="Active Templates" value={String(activeTemplates)} subtitle="In use" color="green" icon={<CheckCircle className="h-6 w-6" />} />
        <StatCard title="Categories" value={String(new Set(templates.map(t => t.category)).size)} subtitle="Template types" color="purple" icon={<FileText className="h-6 w-6" />} />
      </div>

      {showForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm">{editingId ? 'Edit Template' : 'New Template'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">Payment Reminder</SelectItem>
                      <SelectItem value="notification">Fee Notification</SelectItem>
                      <SelectItem value="receipt">Receipt Confirmation</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAYMENT_REMINDER">Payment Reminder</SelectItem>
                      <SelectItem value="FEE_NOTIFICATION">Fee Notification</SelectItem>
                      <SelectItem value="RECEIPT_CONFIRMATION">Receipt Confirmation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Channel</Label>
                  <Select value={formData.channel} onValueChange={(v) => setFormData({...formData, channel: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">SMS Only</SelectItem>
                      <SelectItem value="EMAIL">Email Only</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} rows={5} required />
                <p className="text-xs text-gray-500 mt-1">Available variables: {'{parentName}'}, {'{studentName}'}, {'{balance}'}, {'{className}'}, {'{termName}'}</p>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? 'Update' : 'Create'} Template</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Templates ({filteredTemplates.length})</CardTitle>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="reminder">Payment Reminders</SelectItem>
                <SelectItem value="notification">Fee Notifications</SelectItem>
                <SelectItem value="receipt">Receipt Confirmations</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTemplates.map(template => (
              <div key={template.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="outline">{template.category}</Badge>
                      <Badge variant="outline">{template.channel}</Badge>
                      {template.isActive && <Badge variant="default">Active</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{template.message}</p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(template)}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
