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
  ChevronLeft
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

interface Student {
  id: string
  name: string
  classId: string
  className: string
  stream: string | null
  status: 'active' | 'transferred' | 'left'
  totalDue: number
  totalPaid: number
  balance: number
  lastPaymentDate: string | null
  paymentStatus: 'not_paid' | 'partially_paid' | 'fully_paid'
}

// ============================================
// COMPONENTS
// ============================================

interface StudentFeesTableProps {
  students: Student[]
  onStudentClick: (student: Student) => void
}

function StudentFeesTable({ students, onStudentClick }: StudentFeesTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: Student['paymentStatus']) => {
    switch (status) {
      case 'not_paid':
        return <Badge variant="destructive">Not Paid</Badge>
      case 'partially_paid':
        return <Badge variant="default">Partial</Badge>
      case 'fully_paid':
        return <Badge variant="success">Cleared</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Student Fees Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search students..."
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
                  Total Due
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Paid
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Balance
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Status
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Last Payment
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr 
                  key={student.id} 
                  className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] cursor-pointer"
                  onClick={() => onStudentClick(student)}
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                      {student.name}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">
                      {student.className} {student.stream ? `(${student.stream})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {formatCurrency(student.totalDue)}
                  </td>
                  <td className="py-3 px-4 text-[var(--success)]">
                    {formatCurrency(student.totalPaid)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={student.balance > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>
                      {formatCurrency(student.balance)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(student.paymentStatus)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {student.lastPaymentDate ? new Date(student.lastPaymentDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
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

export default function StudentFeesIndexPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedTerm, setSelectedTerm] = useState<string>('current')

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/bursar/students')
        
        if (!response.ok) {
          throw new Error('Failed to fetch student data')
        }

        const data = await response.json()
        
        setStudents(data.students)
      } catch (err) {
        console.error('Error fetching student data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch student data')
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [selectedClass, selectedTerm])

  const handleStudentClick = (student: Student) => {
    window.location.href = `/dashboard/bursar/student-fees/${student.id}`
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
            Student Fees
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
            Student Fees
          </h1>
        </div>

        <ErrorMessage
          title="Failed to load student data"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page', 'Go back to dashboard']}
        />
      </div>
    )
  }

  // Calculate summary stats
  const totalStudents = students.length
  const fullyPaid = students.filter(s => s.paymentStatus === 'fully_paid').length
  const partiallyPaid = students.filter(s => s.paymentStatus === 'partially_paid').length
  const notPaid = students.filter(s => s.paymentStatus === 'not_paid').length
  const totalExpected = students.reduce((sum, s) => sum + s.totalDue, 0)
  const totalPaid = students.reduce((sum, s) => sum + s.totalPaid, 0)
  const totalOutstanding = totalExpected - totalPaid

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Student Fees
          </h1>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            View and manage individual student fee records
          </p>
        </div>
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
        
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select Term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Term</SelectItem>
            <SelectItem value="t1">Term 1</SelectItem>
            <SelectItem value="t2">Term 2</SelectItem>
            <SelectItem value="t3">Term 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Student Financial Summary */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Students"
          value={String(totalStudents)}
          subtitle="Enrolled"
          color="blue"
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Total Expected"
          value={formatCurrency(totalExpected)}
          subtitle="Fees"
          color="blue"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(totalPaid)}
          subtitle="Paid"
          color="green"
          icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="Balance"
          color="red"
          icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />}
        />
      </div>

      {/* Student Fees Table */}
      <StudentFeesTable 
        students={students} 
        onStudentClick={handleStudentClick}
      />
    </div>
  )
}