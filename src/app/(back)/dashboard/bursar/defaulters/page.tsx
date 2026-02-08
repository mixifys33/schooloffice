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
  MessageSquare
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

// ============================================
// TYPES & INTERFACES
// ============================================

interface Defaulter {
  id: string
  studentId: string
  name: string
  className: string
  stream: string | null
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

// ============================================
// COMPONENTS
// ============================================

interface DefaulterTableProps {
  defaulters: Defaulter[]
  onSendMessage: (defaulter: Defaulter) => void
  onCall: (defaulter: Defaulter) => void
}

function DefaulterTable({ defaulters, onSendMessage, onCall }: DefaulterTableProps) {
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<{ key: keyof Defaulter; direction: 'asc' | 'desc' }>({
    key: 'balance',
    direction: 'desc'
  })

  useEffect(() => {
    const fetchDefaulterData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/bursar/defaulters')
        
        if (!response.ok) {
          throw new Error('Failed to fetch defaulter data')
        }

        const data = await response.json()
        
        setDefaulters(data.defaulters)
      } catch (err) {
        console.error('Error fetching defaulter data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch defaulter data')
      } finally {
        setLoading(false)
      }
    }

    fetchDefaulterData()
  }, [])

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

  // Calculate summary stats
  const totalDefaulters = defaulters.length
  const totalOutstanding = defaulters.reduce((sum, d) => sum + d.balance, 0)
  const highRisk = defaulters.filter(d => d.daysOverdue > 30).length
  const critical = defaulters.filter(d => d.balance > 500000).length

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
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Send Bulk Reminders
        </Button>
      </div>

      {/* Top Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="s1">S1</SelectItem>
            <SelectItem value="s2">S2</SelectItem>
            <SelectItem value="s3">S3</SelectItem>
            <SelectItem value="s4">S4</SelectItem>
            <SelectItem value="s5">S5</SelectItem>
            <SelectItem value="s6">S6</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Severity Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="low">Low Risk (&lt; 30 days)</SelectItem>
            <SelectItem value="medium">Medium Risk (30-60 days)</SelectItem>
            <SelectItem value="high">High Risk (&gt; 60 days)</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
        defaulters={defaulters}
        onSendMessage={handleSendMessage}
        onCall={handleCall}
      />
    </div>
  )
}