'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Users, GraduationCap, BookOpen, Calendar, MessageSquare, Settings,
  FileText, TrendingUp, DollarSign, AlertCircle, Plus, Edit, Trash2,
  Check, X, ChevronDown, ChevronUp, Mail, Clock, RefreshCw,
} from 'lucide-react'
import { DashboardHeader, DashboardSection, ResponsiveGrid } from '@/components/layout'
import { StatCard, StatsGrid } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// Types
interface DashboardData {
  schoolId: string
  schoolName: string
  overview: {
    totalStudents: number
    activeStudents: number
    totalStaff: number
    activeStaff: number
    totalClasses: number
    currentTerm: string | null
    currentAcademicYear: string | null
  }
  staffSummary: { totalStaff: number; activeStaff: number; inactiveStaff: number; byRole: { role: string; count: number }[] }
  academicCalendar: {
    currentYear: { id: string; name: string; startDate: string; endDate: string } | null
    currentTerm: { id: string; name: string; startDate: string; endDate: string; currentWeek: number } | null
    upcomingTerms: { id: string; name: string; startDate: string }[]
  }
  communicationReport: { totalMessages: number; sentCount: number; deliveredCount: number; failedCount: number; readCount: number; byChannel: { channel: string; count: number }[]; deliveryRate: number }
  financeSummary: { totalExpected: number; totalCollected: number; totalOutstanding: number; collectionRate: number }
  supportRequests: { pending: number; inProgress: number; total: number }
}

interface AcademicYear { id: string; name: string; startDate: string; endDate: string; isActive: boolean; terms: Term[] }
interface Term { id: string; name: string; startDate: string; endDate: string; weekCount: number }
interface FeeStructure { id: string; classId: string; className: string; termId: string; termName: string; academicYear: string; studentType: 'DAY' | 'BOARDING'; totalAmount: number; dueDate: string | null; isActive: boolean; items: FeeItem[]; createdAt: string }
interface FeeItem { id?: string; name: string; category: string; amount: number; isOptional: boolean; isOneTime: boolean; description?: string }
interface SupportRequest { id: string; name: string; email: string; phone: string | null; issueType: string; message: string; status: string; priority: number; resolution: string | null; createdAt: string; resolvedAt: string | null }
interface ClassOption { id: string; name: string }

const FEE_CATEGORIES = ['TUITION', 'BOARDING', 'TRANSPORT', 'MEALS', 'UNIFORM', 'BOOKS', 'EXAMINATION', 'ACTIVITY', 'OTHER']

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' })
}

function SectionCard({ title, children, icon, action }: { title: string; children: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-blue-600">{icon}</span>}
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function SchoolAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [showTermModal, setShowTermModal] = useState(false)
  const [showYearModal, setShowYearModal] = useState(false)
  const [showFeeModal, setShowFeeModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [selectedSupportRequest, setSelectedSupportRequest] = useState<SupportRequest | null>(null)
  const [resolutionText, setResolutionText] = useState('')

  const [termForm, setTermForm] = useState({ academicYearId: '', name: '', startDate: '', endDate: '', weekCount: 12 })
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isActive: false })
  const [feeForm, setFeeForm] = useState({
    classId: '', termId: '', studentType: 'DAY' as 'DAY' | 'BOARDING', dueDate: '',
    items: [{ name: '', category: 'TUITION', amount: 0, isOptional: false, isOneTime: false }] as FeeItem[],
  })
  const [activeTab, setActiveTab] = useState('overview')

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/school-admin/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const result = await response.json()
      setData(result)
    } catch (err) { console.error('Error fetching dashboard:', err); setError('Failed to load dashboard data') }
  }, [])

  const fetchAcademicYears = useCallback(async () => {
    try {
      const response = await fetch('/api/school-admin/academic-years')
      if (!response.ok) throw new Error('Failed to fetch academic years')
      const result = await response.json()
      setAcademicYears(result.academicYears || [])
    } catch (err) { console.error('Error fetching academic years:', err) }
  }, [])

  const fetchFeeStructures = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/fee-structures')
      if (!response.ok) throw new Error('Failed to fetch fee structures')
      const result = await response.json()
      setFeeStructures(result.feeStructures || [])
    } catch (err) { console.error('Error fetching fee structures:', err) }
  }, [])

  const fetchSupportRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/school-admin/support-requests')
      if (!response.ok) throw new Error('Failed to fetch support requests')
      const result = await response.json()
      setSupportRequests(result.requests || [])
    } catch (err) { console.error('Error fetching support requests:', err) }
  }, [])

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch('/api/classes')
      if (!response.ok) throw new Error('Failed to fetch classes')
      const result = await response.json()
      setClasses(result.classes || [])
    } catch (err) { console.error('Error fetching classes:', err) }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchDashboardData(), fetchAcademicYears(), fetchFeeStructures(), fetchSupportRequests(), fetchClasses()])
      setLoading(false)
    }
    loadData()
  }, [fetchDashboardData, fetchAcademicYears, fetchFeeStructures, fetchSupportRequests, fetchClasses])

  const handleCreateYear = async () => {
    try {
      const response = await fetch('/api/school-admin/academic-years', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yearForm) })
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to create academic year') }
      showToast('Academic year created successfully', 'success')
      setShowYearModal(false); setYearForm({ name: '', startDate: '', endDate: '', isActive: false })
      fetchAcademicYears(); fetchDashboardData()
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const handleCreateTerm = async () => {
    try {
      const response = await fetch('/api/school-admin/terms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(termForm) })
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to create term') }
      showToast('Term created successfully', 'success')
      setShowTermModal(false); setTermForm({ academicYearId: '', name: '', startDate: '', endDate: '', weekCount: 12 })
      fetchAcademicYears(); fetchDashboardData()
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const handleCreateFeeStructure = async () => {
    try {
      const response = await fetch('/api/finance/fee-structures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...feeForm, dueDate: feeForm.dueDate || undefined }) })
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to create fee structure') }
      showToast('Fee structure created successfully', 'success')
      setShowFeeModal(false); setFeeForm({ classId: '', termId: '', studentType: 'DAY', dueDate: '', items: [{ name: '', category: 'TUITION', amount: 0, isOptional: false, isOneTime: false }] })
      fetchFeeStructures(); fetchDashboardData()
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const handleUpdateSupportRequest = async (id: string, status: string, resolution?: string) => {
    try {
      const response = await fetch(`/api/school-admin/support-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, resolution }) })
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to update support request') }
      showToast('Support request updated', 'success')
      setShowSupportModal(false); setSelectedSupportRequest(null); setResolutionText('')
      fetchSupportRequests(); fetchDashboardData()
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const addFeeItem = () => { setFeeForm({ ...feeForm, items: [...feeForm.items, { name: '', category: 'OTHER', amount: 0, isOptional: false, isOneTime: false }] }) }
  const removeFeeItem = (index: number) => { setFeeForm({ ...feeForm, items: feeForm.items.filter((_, i) => i !== index) }) }
  const updateFeeItem = (index: number, field: keyof FeeItem, value: any) => {
    const newItems = [...feeForm.items]; newItems[index] = { ...newItems[index], [field]: value }; setFeeForm({ ...feeForm, items: newItems })
  }
  const calculateTotalFees = () => feeForm.items.reduce((sum, item) => sum + (item.amount || 0), 0)

  const allTerms = academicYears.flatMap(ay => ay.terms.map(t => ({ ...t, academicYearName: ay.name, academicYearId: ay.id })))

  if (loading) return <div className="p-6"><SkeletonLoader variant="dashboard" /></div>
  if (error || !data) return (
    <div className="p-6">
      <AlertBanner type="error" title="Error Loading Dashboard" message={error || 'Failed to load dashboard data'}
        action={<Button onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>} />
    </div>
  )

  return (
    <div>
      <DashboardHeader title={data.schoolName} description="School Admin Dashboard"
        actions={<Button size="touch-sm" onClick={() => window.location.href = '/dashboard/settings'}><Settings className="h-4 w-4 mr-2" />Settings</Button>} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="fees">Fee Structure</TabsTrigger>
          <TabsTrigger value="support">Support ({data.supportRequests.pending})</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <DashboardSection>
            <StatsGrid>
              <StatCard title="Total Students" value={data.overview.totalStudents} subtitle={`${data.overview.activeStudents} active`} color="blue" icon={<GraduationCap className="h-6 w-6" />} />
              <StatCard title="Total Staff" value={data.overview.totalStaff} subtitle={`${data.overview.activeStaff} active`} color="green" icon={<Users className="h-6 w-6" />} />
              <StatCard title="Classes" value={data.overview.totalClasses} color="purple" icon={<BookOpen className="h-6 w-6" />} />
              <StatCard title="Current Term" value={data.overview.currentTerm || 'N/A'} subtitle={data.overview.currentAcademicYear} color="yellow" icon={<Calendar className="h-6 w-6" />} />
              <StatCard title="Expected Revenue" value={formatCurrency(data.financeSummary.totalExpected)} subtitle={`${data.financeSummary.collectionRate.toFixed(1)}% collected`} color="green" icon={<DollarSign className="h-6 w-6" />} />
              <StatCard title="Outstanding" value={formatCurrency(data.financeSummary.totalOutstanding)} subtitle="Unpaid fees" color="red" icon={<AlertCircle className="h-6 w-6" />} />
            </StatsGrid>
          </DashboardSection>

          <ResponsiveGrid cols={1} colsMd={2} colsLg={2} gap="md">
            <SectionCard title="Staff Management" icon={<Users className="h-5 w-5" />}
              action={<Button size="sm" variant="outline" onClick={() => window.location.href = '/dashboard/teachers'}><Users className="h-4 w-4 mr-1" />Manage</Button>}>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b"><span className="text-gray-600">Active Staff</span><span className="font-semibold text-green-600">{data.staffSummary.activeStaff}</span></div>
                <div className="flex justify-between items-center pb-2 border-b"><span className="text-gray-600">Inactive Staff</span><span className="font-semibold text-red-600">{data.staffSummary.inactiveStaff}</span></div>
                <div className="mt-4"><p className="text-sm font-medium text-gray-700 mb-2">By Role</p>
                  <div className="space-y-2">{data.staffSummary.byRole.map((item) => (<div key={item.role} className="flex justify-between items-center text-sm"><span className="text-gray-600">{item.role}</span><span className="font-medium">{item.count}</span></div>))}</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Academic Calendar" icon={<Calendar className="h-5 w-5" />}
              action={<Button size="sm" variant="outline" onClick={() => setShowYearModal(true)}><Plus className="h-4 w-4 mr-1" />Add Year</Button>}>
              <div className="space-y-4">
                {data.academicCalendar.currentYear && (<div className="pb-3 border-b"><p className="text-sm text-gray-600">Current Academic Year</p><p className="font-semibold">{data.academicCalendar.currentYear.name}</p><p className="text-xs text-gray-500">{formatDate(data.academicCalendar.currentYear.startDate)} - {formatDate(data.academicCalendar.currentYear.endDate)}</p></div>)}
                {data.academicCalendar.currentTerm && (<div className="pb-3 border-b"><p className="text-sm text-gray-600">Current Term</p><p className="font-semibold">{data.academicCalendar.currentTerm.name}</p><p className="text-xs text-gray-500">Week {data.academicCalendar.currentTerm.currentWeek}</p></div>)}
                {data.academicCalendar.upcomingTerms.length > 0 && (<div><p className="text-sm font-medium text-gray-700 mb-2">Upcoming Terms</p><div className="space-y-2">{data.academicCalendar.upcomingTerms.map((term) => (<div key={term.id} className="flex justify-between text-sm"><span className="text-gray-600">{term.name}</span><span className="text-gray-500">{formatDate(term.startDate)}</span></div>))}</div></div>)}
              </div>
            </SectionCard>

            <SectionCard title="Finance Summary" icon={<DollarSign className="h-5 w-5" />}
              action={<Button size="sm" variant="outline" onClick={() => window.location.href = '/dashboard/fees'}><FileText className="h-4 w-4 mr-1" />View Fees</Button>}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded"><p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(data.financeSummary.totalCollected)}</p><p className="text-xs text-gray-600">Collected</p></div>
                  <div className="text-center p-3 bg-red-50 rounded"><p className="text-xl sm:text-2xl font-bold text-red-600">{formatCurrency(data.financeSummary.totalOutstanding)}</p><p className="text-xs text-gray-600">Outstanding</p></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Expected Revenue</span><span className="font-medium">{formatCurrency(data.financeSummary.totalExpected)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Collection Rate</span><span className="font-medium text-green-600">{data.financeSummary.collectionRate.toFixed(1)}%</span></div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${Math.min(data.financeSummary.collectionRate, 100)}%` }}></div></div>
              </div>
            </SectionCard>

            <SectionCard title="Communication Reports" icon={<MessageSquare className="h-5 w-5" />}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded"><p className="text-xl sm:text-2xl font-bold text-blue-600">{data.communicationReport.totalMessages}</p><p className="text-xs text-gray-600">Total Messages</p></div>
                  <div className="text-center p-3 bg-gray-50 rounded"><p className="text-xl sm:text-2xl font-bold text-green-600">{data.communicationReport.deliveryRate}%</p><p className="text-xs text-gray-600">Delivery Rate</p></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Delivered</span><span className="font-medium text-green-600">{data.communicationReport.deliveredCount}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Failed</span><span className="font-medium text-red-600">{data.communicationReport.failedCount}</span></div>
                </div>
              </div>
            </SectionCard>
          </ResponsiveGrid>
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="terms">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Academic Years & Terms</h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowYearModal(true)}><Plus className="h-4 w-4 mr-2" />Add Academic Year</Button>
                <Button variant="outline" onClick={() => setShowTermModal(true)}><Plus className="h-4 w-4 mr-2" />Add Term</Button>
              </div>
            </div>
            {academicYears.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-gray-500">No academic years configured. Create one to get started.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {academicYears.map((year) => (
                  <Card key={year.id} className={year.isActive ? 'border-green-500 border-2' : ''}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">{year.name}{year.isActive && <Badge variant="default" className="bg-green-500">Active</Badge>}</CardTitle>
                        <p className="text-sm text-gray-500">{formatDate(year.startDate)} - {formatDate(year.endDate)}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {year.terms.length === 0 ? (<p className="text-gray-500 text-sm">No terms added yet</p>) : (
                        <div className="grid gap-3 md:grid-cols-3">
                          {year.terms.map((term) => (
                            <div key={term.id} className="p-3 bg-gray-50 rounded-lg">
                              <p className="font-medium">{term.name}</p>
                              <p className="text-sm text-gray-500">{formatDate(term.startDate)} - {formatDate(term.endDate)}</p>
                              <p className="text-xs text-gray-400">{term.weekCount} weeks</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Fee Structure Tab */}
        <TabsContent value="fees">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Fee Structures</h2>
              <Button onClick={() => setShowFeeModal(true)}><Plus className="h-4 w-4 mr-2" />Create Fee Structure</Button>
            </div>
            {feeStructures.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-gray-500">No fee structures configured. Create one to set fees for each class.</CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {feeStructures.map((fs) => (
                  <Card key={fs.id} className={fs.isActive ? 'border-green-500' : 'border-gray-200'}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{fs.className}</CardTitle>
                          <p className="text-sm text-gray-500">{fs.termName} - {fs.academicYear}</p>
                        </div>
                        <Badge variant={fs.studentType === 'BOARDING' ? 'secondary' : 'outline'}>{fs.studentType}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(fs.totalAmount)}</div>
                        {fs.dueDate && <p className="text-sm text-gray-500">Due: {formatDate(fs.dueDate)}</p>}
                        <div className="space-y-1">
                          {fs.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm"><span className="text-gray-600">{item.name}</span><span>{formatCurrency(item.amount)}</span></div>
                          ))}
                          {fs.items.length > 3 && <p className="text-xs text-gray-400">+{fs.items.length - 3} more items</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Support Requests Tab */}
        <TabsContent value="support">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Support Requests</h2>
              <div className="flex gap-2">
                <Badge variant="destructive">{data.supportRequests.pending} Pending</Badge>
                <Badge variant="secondary">{data.supportRequests.inProgress} In Progress</Badge>
              </div>
            </div>
            {supportRequests.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-gray-500">No support requests at this time.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {supportRequests.map((req) => (
                  <Card key={req.id} className={req.status === 'PENDING' ? 'border-yellow-500' : req.status === 'IN_PROGRESS' ? 'border-blue-500' : 'border-green-500'}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{req.name}</span>
                            <Badge variant={req.status === 'PENDING' ? 'destructive' : req.status === 'IN_PROGRESS' ? 'secondary' : 'default'}>{req.status}</Badge>
                            <Badge variant="outline">{req.issueType}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">{req.email} {req.phone && `• ${req.phone}`}</p>
                          <p className="text-sm mt-2">{req.message}</p>
                          <p className="text-xs text-gray-400 mt-2"><Clock className="h-3 w-3 inline mr-1" />{formatDate(req.createdAt)}</p>
                          {req.resolution && <p className="text-sm text-green-600 mt-2">Resolution: {req.resolution}</p>}
                        </div>
                        <div className="flex gap-2">
                          {req.status === 'PENDING' && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateSupportRequest(req.id, 'IN_PROGRESS')}>Start</Button>
                          )}
                          {req.status !== 'RESOLVED' && (
                            <Button size="sm" onClick={() => { setSelectedSupportRequest(req); setShowSupportModal(true) }}>Resolve</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Quick Reports</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-24 flex-col" onClick={() => window.location.href = '/dashboard/fees'}><FileText className="h-8 w-8 mb-2" />Fee Collection Report</Button>
              <Button variant="outline" className="h-24 flex-col" onClick={() => window.location.href = '/dashboard/students'}><GraduationCap className="h-8 w-8 mb-2" />Student Report</Button>
              <Button variant="outline" className="h-24 flex-col" onClick={() => window.location.href = '/dashboard/attendance'}><Calendar className="h-8 w-8 mb-2" />Attendance Report</Button>
              <Button variant="outline" className="h-24 flex-col" onClick={() => window.location.href = '/dashboard/communications'}><MessageSquare className="h-8 w-8 mb-2" />Communication Report</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Academic Year Modal */}
      <Dialog open={showYearModal} onOpenChange={setShowYearModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Academic Year</DialogTitle><DialogDescription>Add a new academic year for your school.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label htmlFor="yearName">Year Name</Label><Input id="yearName" placeholder="e.g., 2025" value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="yearStart">Start Date</Label><Input id="yearStart" type="date" value={yearForm.startDate} onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })} /></div>
              <div><Label htmlFor="yearEnd">End Date</Label><Input id="yearEnd" type="date" value={yearForm.endDate} onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" id="yearActive" checked={yearForm.isActive} onChange={(e) => setYearForm({ ...yearForm, isActive: e.target.checked })} /><Label htmlFor="yearActive">Set as active year</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowYearModal(false)}>Cancel</Button><Button onClick={handleCreateYear}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Term Modal */}
      <Dialog open={showTermModal} onOpenChange={setShowTermModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Term</DialogTitle><DialogDescription>Add a new term to an academic year.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Academic Year</Label>
              <Select value={termForm.academicYearId} onValueChange={(v) => setTermForm({ ...termForm, academicYearId: v })}>
                <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
                <SelectContent>{academicYears.map((ay) => (<SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="termName">Term Name</Label><Input id="termName" placeholder="e.g., Term 1" value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="termStart">Start Date</Label><Input id="termStart" type="date" value={termForm.startDate} onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })} /></div>
              <div><Label htmlFor="termEnd">End Date</Label><Input id="termEnd" type="date" value={termForm.endDate} onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })} /></div>
            </div>
            <div><Label htmlFor="weekCount">Week Count</Label><Input id="weekCount" type="number" value={termForm.weekCount} onChange={(e) => setTermForm({ ...termForm, weekCount: parseInt(e.target.value) || 12 })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowTermModal(false)}>Cancel</Button><Button onClick={handleCreateTerm}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Structure Modal */}
      <Dialog open={showFeeModal} onOpenChange={setShowFeeModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Fee Structure</DialogTitle><DialogDescription>Define fees for a class and term.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Class</Label>
                <Select value={feeForm.classId} onValueChange={(v) => setFeeForm({ ...feeForm, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Term</Label>
                <Select value={feeForm.termId} onValueChange={(v) => setFeeForm({ ...feeForm, termId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>{allTerms.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name} ({t.academicYearName})</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Student Type</Label>
                <Select value={feeForm.studentType} onValueChange={(v: 'DAY' | 'BOARDING') => setFeeForm({ ...feeForm, studentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="DAY">Day Scholar</SelectItem><SelectItem value="BOARDING">Boarding</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="dueDate">Due Date (Optional)</Label><Input id="dueDate" type="date" value={feeForm.dueDate} onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })} /></div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><Label>Fee Items</Label><Button type="button" size="sm" variant="outline" onClick={addFeeItem}><Plus className="h-4 w-4 mr-1" />Add Item</Button></div>
              {feeForm.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded">
                  <div className="col-span-4"><Label className="text-xs">Name</Label><Input placeholder="Fee name" value={item.name} onChange={(e) => updateFeeItem(index, 'name', e.target.value)} /></div>
                  <div className="col-span-3"><Label className="text-xs">Category</Label>
                    <Select value={item.category} onValueChange={(v) => updateFeeItem(index, 'category', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FEE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3"><Label className="text-xs">Amount</Label><Input type="number" placeholder="0" value={item.amount || ''} onChange={(e) => updateFeeItem(index, 'amount', parseFloat(e.target.value) || 0)} /></div>
                  <div className="col-span-2 flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => updateFeeItem(index, 'isOptional', !item.isOptional)} className={item.isOptional ? 'text-blue-600' : ''}>{item.isOptional ? 'Opt' : 'Req'}</Button>
                    {feeForm.items.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removeFeeItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                  </div>
                </div>
              ))}
              <div className="text-right font-semibold text-lg">Total: {formatCurrency(calculateTotalFees())}</div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowFeeModal(false)}>Cancel</Button><Button onClick={handleCreateFeeStructure}>Create Fee Structure</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support Request Resolution Modal */}
      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Support Request</DialogTitle><DialogDescription>Provide a resolution for this support request.</DialogDescription></DialogHeader>
          {selectedSupportRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">{selectedSupportRequest.name}</p>
                <p className="text-sm text-gray-500">{selectedSupportRequest.email}</p>
                <p className="text-sm mt-2">{selectedSupportRequest.message}</p>
              </div>
              <div><Label htmlFor="resolution">Resolution Notes</Label><Textarea id="resolution" placeholder="Describe how the issue was resolved..." value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} rows={4} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSupportModal(false); setSelectedSupportRequest(null); setResolutionText('') }}>Cancel</Button>
            <Button onClick={() => selectedSupportRequest && handleUpdateSupportRequest(selectedSupportRequest.id, 'RESOLVED', resolutionText)}>Mark as Resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
