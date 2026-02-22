'use client'

import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  Users,
  AlertTriangle,
  Calendar,
  CreditCard,
  PieChart,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  Receipt,
  Send,
  Mail,
  Phone,
  MessageSquare,
  Printer,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { cn } from '@/lib/utils'
import {
  getResponsiveGridClasses,
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
  getTouchFriendlyClasses,
} from '@/lib/responsive'
import { Label } from '@/components/ui/label'
import { PrintDefaulterList } from '@/components/bursar/print-defaulter-list'
import { PrintReminderLetters } from '@/components/bursar/print-reminder-letters'
import { PrintStudentStatement } from '@/components/bursar/print-student-statement'
import { PrintSummaryReport } from '@/components/bursar/print-summary-report'
import { downloadExcel, formatCurrencyForExport, formatDateForExport, triggerPrint } from '@/lib/export-utils'
import { generatePDFFromElement } from '@/lib/pdf-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ============================================
// TYPES & INTERFACES
// ============================================

interface Defaulter {
  id: string
  studentId: string
  name: string
  className: string
  stream: string | null
  studentType: 'DAY' | 'BOARDING'
  totalDue: number
  totalPaid: number
  balance: number
  daysOverdue: number
  lastPaymentDate: string | null
  contactInfo: {
    parentName: string
    parentPhone: string
    parentEmail: string
  }
}

interface ClassOption {
  id: string
  name: string
}

interface DefaultersResponse {
  success: boolean
  defaulters: Defaulter[]
  availableClasses: ClassOption[]
  currentTerm: {
    id: string
    name: string
    academicYear: string
  }
}

// ============================================
// COMPONENTS
// ============================================

interface DefaulterTableProps {
  defaulters: Defaulter[]
  onSendMessage: (defaulter: Defaulter) => void
  onCall: (defaulter: Defaulter) => void
  searchTerm: string
  setSearchTerm: (value: string) => void
}

function DefaulterTable({ defaulters, onSendMessage, onCall, searchTerm, setSearchTerm }: DefaulterTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Defaulter List</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search defaulters..."
              className="max-w-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button size="sm" variant="outline">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Student
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Class
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Balance
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Days Overdue
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Last Payment
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Parent Contact
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {defaulters.map((defaulter) => (
                <tr key={defaulter.id} className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <td className="py-3 px-4">
                    <div className="font-medium">
                      {defaulter.name}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">
                      {defaulter.className} {defaulter.stream ? `(${defaulter.stream})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-[var(--danger)]">
                    {formatCurrency(defaulter.balance)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={defaulter.daysOverdue > 30 ? "destructive" : defaulter.daysOverdue > 15 ? "default" : "secondary"}>
                      {defaulter.daysOverdue} days
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {defaulter.lastPaymentDate ? new Date(defaulter.lastPaymentDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      <div>{defaulter.contactInfo.parentName}</div>
                      <div className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">{defaulter.contactInfo.parentPhone}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => onSendMessage(defaulter)}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onCall(defaulter)}>
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DefaulterListPage() {
  const [defaulters, setDefaulters] = useState<Defaulter[]>([])
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedStudentType, setSelectedStudentType] = useState<string>('all')
  const [minBalance, setMinBalance] = useState<string>('')
  const [maxBalance, setMaxBalance] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('balance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    const fetchDefaulterData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (selectedClass !== 'all') params.append('class', selectedClass)
        if (selectedSeverity !== 'all') params.append('severity', selectedSeverity)
        if (selectedStudentType !== 'all') params.append('studentType', selectedStudentType)
        if (minBalance) params.append('minBalance', minBalance)
        if (maxBalance) params.append('maxBalance', maxBalance)
        params.append('sortBy', sortBy)
        params.append('sortOrder', sortOrder)

        const response = await fetch(`/api/bursar/defaulters?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch defaulter data')
        }

        const data: DefaultersResponse = await response.json()
        
        setDefaulters(data.defaulters)
        setAvailableClasses(data.availableClasses || [])
      } catch (err) {
        console.error('Error fetching defaulter data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch defaulter data')
      } finally {
        setLoading(false)
      }
    }

    fetchDefaulterData()
  }, [selectedClass, selectedSeverity, selectedStudentType, minBalance, maxBalance, sortBy, sortOrder])

  const handleSendMessage = (defaulter: Defaulter) => {
    console.log('Sending message to:', defaulter)
    // In real app, this would open a message modal
  }

  const handleCall = (defaulter: Defaulter) => {
    console.log('Calling:', defaulter.contactInfo.parentPhone)
    // In real app, this would initiate a call
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Export and Print Handlers
  const handleExportExcel = () => {
    const exportData = filteredDefaulters.map(d => ({
      'Student Name': d.name,
      'Class': `${d.className}${d.stream ? ` (${d.stream})` : ''}`,
      'Student Type': d.studentType,
      'Total Due': d.totalDue,
      'Amount Paid': d.totalPaid,
      'Outstanding Balance': d.balance,
      'Days Overdue': d.daysOverdue,
      'Last Payment Date': formatDateForExport(d.lastPaymentDate),
      'Parent Name': d.contactInfo.parentName,
      'Parent Phone': d.contactInfo.parentPhone,
      'Parent Email': d.contactInfo.parentEmail,
    }))

    const filename = `Defaulters_List_${new Date().toISOString().split('T')[0]}`
    downloadExcel(exportData, filename)
  }

  const handlePrintList = () => {
    triggerPrint()
  }

  const handlePrintReminderLetters = () => {
    // Show reminder letters for printing
    const printElement = document.getElementById('print-reminder-letters')
    if (printElement) {
      printElement.classList.remove('hidden')
      setTimeout(() => {
        triggerPrint()
        printElement.classList.add('hidden')
      }, 100)
    }
  }

  const handlePrintSummaryReport = () => {
    // Show summary report for printing
    const printElement = document.getElementById('print-summary-report')
    if (printElement) {
      printElement.classList.remove('hidden')
      setTimeout(() => {
        triggerPrint()
        printElement.classList.add('hidden')
      }, 100)
    }
  }

  const handleDownloadPDF = async (type: 'list' | 'summary' | 'letters') => {
    try {
      let elementId = ''
      let filename = ''

      switch (type) {
        case 'list':
          elementId = 'print-defaulter-list'
          filename = `Defaulters_List_${new Date().toISOString().split('T')[0]}.pdf`
          break
        case 'summary':
          elementId = 'print-summary-report'
          filename = `Defaulters_Summary_${new Date().toISOString().split('T')[0]}.pdf`
          break
        case 'letters':
          elementId = 'print-reminder-letters'
          filename = `Reminder_Letters_${new Date().toISOString().split('T')[0]}.pdf`
          break
      }

      // Show the element temporarily
      const element = document.getElementById(elementId)
      if (element) {
        element.classList.remove('hidden')
        await generatePDFFromElement(elementId, filename, { orientation: type === 'list' ? 'landscape' : 'portrait' })
        element.classList.add('hidden')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Defaulter List
          </h1>
        </div>

        <div className={getResponsiveGridClasses('statsGrid')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="stat" />
          ))}
        </div>

        <SkeletonLoader variant="table" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Defaulter List
          </h1>
        </div>

        <ErrorMessage
          title="Failed to load defaulter data"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page', 'Contact support if the problem persists']}
        />
      </div>
    )
  }

  // Filter by search term (client-side)
  const filteredDefaulters = defaulters.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.contactInfo.parentName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate summary stats
  const totalDefaulters = filteredDefaulters.length
  const totalOutstanding = filteredDefaulters.reduce((sum, d) => sum + d.balance, 0)
  const highRisk = filteredDefaulters.filter(d => d.daysOverdue > 30).length
  const critical = filteredDefaulters.filter(d => d.balance > 500000).length

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Defaulter List
          </h1>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Students with outstanding fee balances
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Print Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrintList}>
                <FileText className="h-4 w-4 mr-2" />
                Print Current List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintReminderLetters}>
                <Mail className="h-4 w-4 mr-2" />
                Print Reminder Letters
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrintSummaryReport}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Print Summary Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export to Excel/CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadPDF('list')}>
                <FileText className="h-4 w-4 mr-2" />
                Download List PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadPDF('summary')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Download Summary PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadPDF('letters')}>
                <Mail className="h-4 w-4 mr-2" />
                Download Reminder Letters PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button>
            <Send className="h-4 w-4 mr-2" />
            Send Bulk Reminders
          </Button>
        </div>
      </div>

      {/* Top Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger>
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {availableClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
          <SelectTrigger>
            <SelectValue placeholder="Severity Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="low">Low Risk (&lt; 30 days)</SelectItem>
            <SelectItem value="medium">Medium Risk (30-60 days)</SelectItem>
            <SelectItem value="high">High Risk (&gt; 60 days)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStudentType} onValueChange={setSelectedStudentType}>
          <SelectTrigger>
            <SelectValue placeholder="Student Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="DAY">Day Students</SelectItem>
            <SelectItem value="BOARDING">Boarding Students</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="balance">Balance</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="className">Class</SelectItem>
            <SelectItem value="daysOverdue">Days Overdue</SelectItem>
            <SelectItem value="totalDue">Total Due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Balance Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Balance Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <Label htmlFor="minBalance" className="text-sm">Minimum Balance</Label>
              <Input
                id="minBalance"
                type="number"
                placeholder="e.g., 100000"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="maxBalance" className="text-sm">Maximum Balance</Label>
              <Input
                id="maxBalance"
                type="number"
                placeholder="e.g., 500000"
                value={maxBalance}
                onChange={(e) => setMaxBalance(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMinBalance('')
                  setMaxBalance('')
                }}
                className="flex-1"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex-1"
              >
                {sortOrder === 'asc' ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defaulter Summary Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Defaulters"
          value={String(totalDefaulters)}
          subtitle="Students"
          color="red"
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="Amount owed"
          color="red"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="High Risk"
          value={String(highRisk)}
          subtitle="Over 30 days"
          color="red"
          icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Critical"
          value={String(critical)}
          subtitle="Over 500k UGX"
          color="red"
          icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
      </div>

      {/* Defaulter Table */}
      <DefaulterTable
        defaulters={filteredDefaulters}
        onSendMessage={handleSendMessage}
        onCall={handleCall}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Hidden Print Components */}
      <PrintDefaulterList
        defaulters={filteredDefaulters}
        schoolName="School Name"
        termName="Current Term"
        academicYear="2024/2025"
        totalOutstanding={totalOutstanding}
        highRisk={highRisk}
        critical={critical}
      />

      <PrintReminderLetters
        defaulters={filteredDefaulters}
        schoolName="School Name"
        schoolAddress="School Address"
        schoolPhone="School Phone"
        schoolEmail="School Email"
        termName="Current Term"
        paymentDeadline="End of Term"
      />

      <PrintSummaryReport
        defaulters={filteredDefaulters}
        schoolName="School Name"
        termName="Current Term"
        academicYear="2024/2025"
        totalOutstanding={totalOutstanding}
        highRisk={highRisk}
        critical={critical}
      />
    </div>
  )
}