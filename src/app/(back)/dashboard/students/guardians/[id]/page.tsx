'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, Phone, Mail, MapPin, User, Users, CreditCard, 
  MessageSquare, FileText, Shield, AlertTriangle, Edit, 
  Calendar, Clock, Globe, Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GuardianStatus, GuardianFlag, GuardianDocumentType } from '@/types/enums'

/**
 * Guardian Detail Page
 * Display full profile with linked students, communication history, financial summary, documents
 * Requirements: 1.2, 2.4, 3.1, 4.4, 7.4
 */

interface LinkedStudent {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  name: string
  className?: string
  streamName?: string
  relationshipType: string
  isPrimary: boolean
  isFinanciallyResponsible: boolean
  receivesAcademicMessages: boolean
  receivesFinanceMessages: boolean
}

interface PortalAccess {
  isEnabled: boolean
  canViewAttendance: boolean
  canViewResults: boolean
  canViewFees: boolean
  canDownloadReports: boolean
  lastLogin: string | null
}

interface RecentDocument {
  id: string
  documentType: GuardianDocumentType
  fileName: string
  uploadedAt: string
}

interface GuardianDetail {
  id: string
  firstName: string
  lastName: string
  name: string
  phone: string
  secondaryPhone: string | null
  phoneVerified: boolean
  email: string | null
  emailVerified: boolean
  whatsappNumber: string | null
  nationalId: string | null
  address: string | null
  relationship: string
  preferredChannel: string
  languagePreference: string
  status: GuardianStatus
  flags: GuardianFlag[]
  optOutNonCritical: boolean
  lastContactDate: string | null
  consentGiven: boolean
  consentDate: string | null
  createdAt: string
  updatedAt: string
  studentCount: number
  students: LinkedStudent[]
  portalAccess: PortalAccess | null
  recentDocuments: RecentDocument[]
  dataQualityScore: number
  dataQualityIssues?: string[]
}

interface FinancialSummary {
  totalBalance: number
  students: {
    studentId: string
    studentName: string
    balance: number
    lastPaymentDate: string | null
  }[]
}

interface MessageHistoryItem {
  id: string
  channel: string
  status: string
  content: string
  sentAt: string
  messageType: string
}

// Status badge color mapping
const statusColors: Record<GuardianStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [GuardianStatus.ACTIVE]: 'default',
  [GuardianStatus.INACTIVE]: 'secondary',
  [GuardianStatus.BLOCKED]: 'destructive',
  [GuardianStatus.RESTRICTED]: 'outline',
}

// Flag badge color mapping
const flagColors: Record<GuardianFlag, 'destructive' | 'secondary' | 'outline'> = {
  [GuardianFlag.FEE_DEFAULTER]: 'destructive',
  [GuardianFlag.HIGH_CONFLICT]: 'secondary',
  [GuardianFlag.LEGAL_RESTRICTION]: 'outline',
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function GuardianDetailPage() {
  const params = useParams()
  const router = useRouter()
  const guardianId = params.id as string

  const [guardian, setGuardian] = useState<GuardianDetail | null>(null)
  const [financial, setFinancial] = useState<FinancialSummary | null>(null)
  const [messages, setMessages] = useState<MessageHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchGuardian = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/guardians/${guardianId}`)
      if (!response.ok) {
        if (response.status === 404) throw new Error('Guardian not found')
        throw new Error('Failed to fetch guardian')
      }
      const data = await response.json()
      setGuardian(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching guardian:', err)
      setError(err instanceof Error ? err.message : 'Unable to load guardian')
    } finally {
      setLoading(false)
    }
  }, [guardianId])

  const fetchFinancial = useCallback(async () => {
    try {
      const response = await fetch(`/api/guardians/${guardianId}/financial`)
      if (response.ok) {
        const data = await response.json()
        setFinancial(data)
      }
    } catch (err) {
      console.error('Error fetching financial:', err)
    }
  }, [guardianId])

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/guardians/${guardianId}/messages?limit=10`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }, [guardianId])

  useEffect(() => {
    fetchGuardian()
    fetchFinancial()
    fetchMessages()
  }, [fetchGuardian, fetchFinancial, fetchMessages])

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  if (error || !guardian) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <AlertBanner
          type="danger"
          message={error || 'Guardian not found'}
          action={{ label: 'Go Back', onClick: () => router.push('/dashboard/students/guardians') }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{guardian.name}</h1>
              <Badge variant={statusColors[guardian.status]}>{guardian.status}</Badge>
            </div>
            {guardian.flags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {guardian.flags.map((flag) => (
                  <Badge key={flag} variant={flagColors[flag]} className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {flag.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => router.push(`/dashboard/students/guardians/${guardianId}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Guardian
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students ({guardian.studentCount})</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="portal">Portal Access</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{guardian.phone}</p>
                    <p className="text-xs text-muted-foreground">Primary Phone</p>
                  </div>
                  {guardian.phoneVerified && (
                    <Badge variant="outline" className="text-xs">Verified</Badge>
                  )}
                </div>
                {guardian.secondaryPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{guardian.secondaryPhone}</p>
                      <p className="text-xs text-muted-foreground">Secondary Phone</p>
                    </div>
                  </div>
                )}
                {guardian.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{guardian.email}</p>
                      <p className="text-xs text-muted-foreground">Email</p>
                    </div>
                    {guardian.emailVerified && (
                      <Badge variant="outline" className="text-xs">Verified</Badge>
                    )}
                  </div>
                )}
                {guardian.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{guardian.address}</p>
                      <p className="text-xs text-muted-foreground">Address</p>
                    </div>
                  </div>
                )}
                {guardian.nationalId && (
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{guardian.nationalId}</p>
                      <p className="text-xs text-muted-foreground">National ID</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preferences & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Preferences & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{guardian.preferredChannel}</p>
                    <p className="text-xs text-muted-foreground">Preferred Channel</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{guardian.languagePreference || 'English'}</p>
                    <p className="text-xs text-muted-foreground">Language</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatDate(guardian.lastContactDate)}</p>
                    <p className="text-xs text-muted-foreground">Last Contact</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatDate(guardian.createdAt)}</p>
                    <p className="text-xs text-muted-foreground">Registered</p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Opt-out Non-Critical</span>
                    <Badge variant={guardian.optOutNonCritical ? 'secondary' : 'outline'}>
                      {guardian.optOutNonCritical ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Consent Given</span>
                  <Badge variant={guardian.consentGiven ? 'default' : 'secondary'}>
                    {guardian.consentGiven ? 'Yes' : 'Pending'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Data Quality */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Data Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-3xl font-bold">
                    {guardian.dataQualityScore}%
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          guardian.dataQualityScore >= 75 ? 'bg-green-500' :
                          guardian.dataQualityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${guardian.dataQualityScore}%` }}
                      />
                    </div>
                  </div>
                </div>
                {guardian.dataQualityIssues && guardian.dataQualityIssues.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Issues:</p>
                    <ul className="space-y-1">
                      {guardian.dataQualityIssues.map((issue, idx) => (
                        <li key={idx} className="text-sm flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Students Tab - Requirement 2.4 */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Linked Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guardian.students.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No students linked</p>
              ) : (
                <div className="space-y-4">
                  {guardian.students.map((student) => (
                    <div 
                      key={student.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/students/${student.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.admissionNumber} • {student.className}
                            {student.streamName && ` - ${student.streamName}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{student.relationshipType}</Badge>
                        {student.isPrimary && <Badge variant="default">Primary</Badge>}
                        {student.isFinanciallyResponsible && (
                          <Badge variant="secondary">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Financial
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab - Requirement 4.4 */}
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {financial ? (
                <div className="space-y-6">
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className={`text-3xl font-bold ${financial.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(financial.totalBalance)}
                    </p>
                  </div>
                  {financial.students.length > 0 && (
                    <div className="space-y-3">
                      <p className="font-medium">Per Student Breakdown</p>
                      {financial.students.map((student) => (
                        <div key={student.studentId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{student.studentName}</p>
                            <p className="text-xs text-muted-foreground">
                              Last payment: {formatDate(student.lastPaymentDate)}
                            </p>
                          </div>
                          <p className={`font-medium ${student.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(student.balance)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No financial data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab - Requirement 3.1 */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Communication History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No messages sent</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{msg.channel}</Badge>
                          <Badge variant={msg.status === 'DELIVERED' ? 'default' : 'secondary'}>
                            {msg.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(msg.sentAt)}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab - Requirement 7.4 */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <Button size="sm" onClick={() => router.push(`/dashboard/students/guardians/${guardianId}/documents`)}>
                Manage Documents
              </Button>
            </CardHeader>
            <CardContent>
              {guardian.recentDocuments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No documents uploaded</p>
              ) : (
                <div className="space-y-3">
                  {guardian.recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType.replace('_', ' ')} • {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portal Access Tab */}
        <TabsContent value="portal" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Portal Access
              </CardTitle>
              <Button size="sm" onClick={() => router.push(`/dashboard/students/guardians/${guardianId}/portal`)}>
                Manage Access
              </Button>
            </CardHeader>
            <CardContent>
              {guardian.portalAccess ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="font-medium">Portal Access</span>
                    <Badge variant={guardian.portalAccess.isEnabled ? 'default' : 'secondary'}>
                      {guardian.portalAccess.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">View Attendance</span>
                      <Badge variant={guardian.portalAccess.canViewAttendance ? 'default' : 'outline'}>
                        {guardian.portalAccess.canViewAttendance ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">View Results</span>
                      <Badge variant={guardian.portalAccess.canViewResults ? 'default' : 'outline'}>
                        {guardian.portalAccess.canViewResults ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">View Fees</span>
                      <Badge variant={guardian.portalAccess.canViewFees ? 'default' : 'outline'}>
                        {guardian.portalAccess.canViewFees ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Download Reports</span>
                      <Badge variant={guardian.portalAccess.canDownloadReports ? 'default' : 'outline'}>
                        {guardian.portalAccess.canDownloadReports ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  {guardian.portalAccess.lastLogin && (
                    <p className="text-sm text-muted-foreground">
                      Last login: {formatDate(guardian.portalAccess.lastLogin)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Portal access not configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
