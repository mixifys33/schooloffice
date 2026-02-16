'use client'

import { useState, useEffect } from 'react'
import { FileText, CheckCircle2, Eye, Download, Send, Shield, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ClassReports {
  classId: string
  className: string
  termId: string
  termName: string
  reports: any[]
  stats: { total: number; generated: number; approved: number; published: number }
}

export default function ReviewReportsPage() {
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [classesData, setClassesData] = useState<ClassReports[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/terms').then(res => res.json()).then(data => {
      setTerms(data.terms || [])
      const current = data.terms?.find((t: any) => t.isCurrent)
      if (current) setSelectedTerm(current.id)
    })
  }, [])

  useEffect(() => {
    if (selectedTerm) fetchReports()
  }, [selectedTerm, statusFilter])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ termId: selectedTerm })
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())
      const res = await fetch(`/api/dos/reports/review?${params}`)
      const data = await res.json()
      setClassesData(data.classes || [])
    } catch (err) {
      setError('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (classId: string, termId: string) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/dos/reports/review/${classId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Approved ${data.successCount} reports!`)
        fetchReports()
      } else {
        setError(data.error)
      }
    } finally {
      setProcessing(false)
    }
  }

  const handlePublish = async (classId: string, termId: string) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/dos/reports/review/${classId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId, linkExpiryDays: 90 }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`Published ${data.successCount} reports!`)
        fetchReports()
      } else {
        setError(data.error)
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Review Report Cards</h1>
        <p className="text-muted-foreground mt-2">Review, approve, and publish report cards</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                <SelectContent>
                  {terms.map(term => <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert className="border-green-500 bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-600">{success}</AlertDescription></Alert>}

      {classesData.map(classData => (
        <Card key={classData.classId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{classData.className}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{classData.stats.total} students</span>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {classData.stats.generated > 0 && (
                  <Button size="sm" variant="outline" onClick={() => handleApprove(classData.classId, classData.termId)} disabled={processing}>
                    <Shield className="h-4 w-4 mr-2" />Approve ({classData.stats.generated})
                  </Button>
                )}
                {classData.stats.approved > 0 && (
                  <Button size="sm" onClick={() => handlePublish(classData.classId, classData.termId)} disabled={processing}>
                    <Send className="h-4 w-4 mr-2" />Publish ({classData.stats.approved})
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <div className="text-sm"><span className="text-muted-foreground">Generated:</span> <span className="font-medium text-blue-600">{classData.stats.generated}</span></div>
              <div className="text-sm"><span className="text-muted-foreground">Approved:</span> <span className="font-medium text-green-600">{classData.stats.approved}</span></div>
              <div className="text-sm"><span className="text-muted-foreground">Published:</span> <span className="font-medium text-purple-600">{classData.stats.published}</span></div>
            </div>
          </CardHeader>
        </Card>
      ))}

      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
      {!loading && classesData.length === 0 && selectedTerm && (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-medium mb-2">No Reports Found</h3></CardContent></Card>
      )}
    </div>
  )
}
