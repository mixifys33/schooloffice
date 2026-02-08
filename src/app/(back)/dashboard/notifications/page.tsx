'use client'

/**
 * Admin Notifications Page
 * Displays support requests and system notifications for admins
 * Requirements: Admin notification management, support request handling
 */

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Bell,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  Calendar,
  Filter,
  Search,
  Eye,
  MessageCircle,
  CheckCheck,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationCenter } from '@/components/communication/notification-center'

interface SupportRequest {
  id: string
  name: string
  email: string
  phone?: string
  issueType: string
  message: string
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  priority: number
  createdAt: string
  updatedAt: string
  school?: {
    name: string
    code: string
  }
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  ACCOUNT_ACCESS: 'Account Access',
  PASSWORD_RESET: 'Password Reset',
  TECHNICAL_ISSUE: 'Technical Issue',
  BILLING_INQUIRY: 'Billing Inquiry',
  GENERAL_INQUIRY: 'General Inquiry',
  OTHER: 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)]/30 dark:text-[var(--warning)]',
  IN_PROGRESS: 'bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)]/30 dark:text-[var(--chart-blue)]',
  RESOLVED: 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)]/30 dark:text-[var(--success)]',
  CLOSED: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--text-primary)]/30 dark:text-[var(--text-muted)]',
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'border-l-gray-300',
  2: 'border-l-yellow-400',
  3: 'border-l-red-500',
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchSupportRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (issueTypeFilter && issueTypeFilter !== 'all') params.set('issueType', issueTypeFilter)
      if (searchTerm) params.set('search', searchTerm)

      const response = await fetch(`/api/admin/support-requests?${params}`)
      
      if (!response.ok) {
        // Handle different error cases
        if (response.status === 403) {
          throw new Error('You do not have permission to view support requests')
        } else if (response.status === 401) {
          throw new Error('Please log in to view support requests')
        } else {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch support requests (${response.status})`)
        }
      }

      const data = await response.json()
      setSupportRequests(data.requests || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching support requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load support requests')
      setSupportRequests([]) // Clear existing data on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSupportRequests()
  }, [statusFilter, issueTypeFilter])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchSupportRequests()
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      setUpdating(requestId)
      const response = await fetch(`/api/admin/support-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      setSupportRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: newStatus as any, updatedAt: new Date().toISOString() } : req
      ))
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setUpdating(null)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const pendingCount = supportRequests.filter(req => req.status === 'PENDING').length
  const inProgressCount = supportRequests.filter(req => req.status === 'IN_PROGRESS').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications & Support</h1>
          <p className="text-muted-foreground">
            Manage system notifications and support requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {pendingCount} Pending
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {inProgressCount} In Progress
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="support-requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="support-requests" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Support Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system-notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            System Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="support-requests" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or message..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Support Requests List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4 text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-[var(--danger)]" />
                  <div>
                    <h3 className="font-semibold text-[var(--chart-red)] mb-2">Unable to Load Support Requests</h3>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <Button onClick={fetchSupportRequests} size="sm">
                      Try Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : supportRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No support requests found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {supportRequests.map((request) => (
                <Card key={request.id} className={`border-l-4 ${PRIORITY_COLORS[request.priority]}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={STATUS_COLORS[request.status]}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {ISSUE_TYPE_LABELS[request.issueType]}
                          </Badge>
                          {request.priority > 1 && (
                            <Badge variant="destructive">
                              {request.priority === 3 ? 'High Priority' : 'Medium Priority'}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {getTimeAgo(request.createdAt)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{request.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{request.email}</span>
                            </div>
                            {request.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{request.phone}</span>
                              </div>
                            )}
                            {request.school && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span>{request.school.name} ({request.school.code})</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Message:</p>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {request.message}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {request.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(request.id, 'IN_PROGRESS')}
                            disabled={updating === request.id}
                          >
                            {updating === request.id ? (
                              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <>
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Start
                              </>
                            )}
                          </Button>
                        )}
                        {request.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusUpdate(request.id, 'RESOLVED')}
                            disabled={updating === request.id}
                          >
                            {updating === request.id ? (
                              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Resolve
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="system-notifications">
          <NotificationCenter />
        </TabsContent>
      </Tabs>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-[var(--text-primary)]/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Support Request Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(value) => {
                      handleStatusUpdate(selectedRequest.id, value)
                      setSelectedRequest({ ...selectedRequest, status: value as any })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Issue Type</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ISSUE_TYPE_LABELS[selectedRequest.issueType]}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Requester Information</label>
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <p><strong>Name:</strong> {selectedRequest.name}</p>
                  <p><strong>Email:</strong> {selectedRequest.email}</p>
                  {selectedRequest.phone && <p><strong>Phone:</strong> {selectedRequest.phone}</p>}
                  {selectedRequest.school && (
                    <p><strong>School:</strong> {selectedRequest.school.name} ({selectedRequest.school.code})</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <strong>Created:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Updated:</strong> {new Date(selectedRequest.updatedAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}