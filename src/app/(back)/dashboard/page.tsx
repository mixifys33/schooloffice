'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, CreditCard, MessageSquare, Calendar, UserCheck, UserX, GraduationCap, BookOpen, BarChart3, Settings } from 'lucide-react'
import { StatCard, StatsGrid } from '@/components/ui/stat-card'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * School Admin Dashboard Home Page
 * Requirements: 13.1, 13.2, 13.3, 13.4
 * - School Name, Term, Academic Year always visible in top area
 * - Main sections as cards: Students, Staff, Academics, Finance, Communication, Reports
 * - Icon and short description for each section
 * - Maximum 7 main navigation items
 */

interface DashboardOverviewData {
  students: {
    total: number
    paid: number
    unpaid: number
  }
  sms: {
    sentThisTerm: number
    balance: number
  }
  attendance: {
    presentPercentage: number
    absentPercentage: number
    totalToday: number
    presentToday: number
    absentToday: number
  }
  alerts: {
    paymentOverdue: boolean
    smsBalanceLow: boolean
    termEndingSoon: boolean
    termEndDate?: string
    daysUntilTermEnd?: number
  }
  subscription?: {
    status: 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED'
    featuresRestricted: boolean
    smsEnabled: boolean
    reportsEnabled: boolean
  }
  context?: {
    schoolName: string
    currentTerm: string
    academicYear: string
  }
}

// Section card data for main navigation - Requirements: 13.2, 13.3
const sectionCards = [
  {
    title: 'Students',
    description: 'Manage student records and enrollment',
    icon: GraduationCap,
    href: '/dashboard/students',
    color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
  },
  {
    title: 'Staff',
    description: 'Manage teachers and staff accounts',
    icon: Users,
    href: '/dashboard/teachers',
    color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
  },
  {
    title: 'Academics',
    description: 'Classes, subjects, and timetables',
    icon: BookOpen,
    href: '/dashboard/classes',
    color: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400',
  },
  {
    title: 'Finance',
    description: 'Fees, payments, and financial reports',
    icon: CreditCard,
    href: '/dashboard/fees',
    color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  },
  {
    title: 'Communication',
    description: 'SMS and messaging to parents',
    icon: MessageSquare,
    href: '/dashboard/sms',
    color: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400',
  },
  {
    title: 'Reports',
    description: 'Generate and view reports',
    icon: BarChart3,
    href: '/dashboard/reports',
    color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400',
  },
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/overview')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const dashboardData = await response.json()
        setData(dashboardData)
        setError(null)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('Unable to load dashboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome to your school dashboard</p>
        </div>
        <div className="space-y-3">
          <SkeletonLoader variant="text" count={1} />
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonLoader key={i} variant="stat" count={1} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header with School Context - Requirements: 13.1 - School Name, Term, Academic Year always visible */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {data.context?.schoolName || 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {data.context?.currentTerm || 'Current Term'} • {data.context?.academicYear || 'Academic Year'}
            </p>
          </div>
          <Link 
            href="/dashboard/settings" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {data.subscription?.featuresRestricted && (
          <AlertBanner
            type="danger"
            message={`Features restricted due to unpaid subscription. ${!data.subscription.smsEnabled ? 'SMS disabled. ' : ''}${!data.subscription.reportsEnabled ? 'Reports disabled. ' : ''}Pay now to restore access.`}
            action={{ label: 'Pay Now', onClick: () => window.location.href = '/dashboard/settings/billing' }}
          />
        )}
        {data.alerts.paymentOverdue && !data.subscription?.featuresRestricted && (
          <AlertBanner
            type="danger"
            message="Payment overdue - features may be restricted"
            action={{ label: 'Pay Now', onClick: () => window.location.href = '/dashboard/settings/billing' }}
          />
        )}
        {data.alerts.smsBalanceLow && (
          <AlertBanner
            type="warning"
            message={`SMS balance low - ${data.sms.balance} messages remaining`}
            dismissible
          />
        )}
        {data.alerts.termEndingSoon && data.alerts.daysUntilTermEnd && (
          <AlertBanner
            type="info"
            message={`Term ending soon - ${data.alerts.daysUntilTermEnd} days remaining`}
            dismissible
          />
        )}
      </div>

      {/* Main Section Cards - Requirements: 13.2, 13.3 - Cards with icon and description */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sectionCards.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${section.color}`}>
                <section.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {section.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <StatsGrid>
        <StatCard
          title="Total Students"
          value={data.students.total}
          color="blue"
          icon={<Users className="h-6 w-6" />}
          subtitle="Active enrolled students"
        />
        <StatCard
          title="Paid Students"
          value={data.students.paid}
          color="green"
          icon={<CreditCard className="h-6 w-6" />}
          subtitle="Fees fully paid"
        />
        <StatCard
          title="Unpaid Students"
          value={data.students.unpaid}
          color="red"
          icon={<CreditCard className="h-6 w-6" />}
          subtitle="Fees pending"
        />
        <StatCard
          title="SMS Sent"
          value={data.sms.sentThisTerm}
          color="purple"
          icon={<MessageSquare className="h-6 w-6" />}
          subtitle="This term"
        />
        <StatCard
          title="SMS Balance"
          value={data.sms.balance}
          color={data.alerts.smsBalanceLow ? 'yellow' : 'gray'}
          icon={<MessageSquare className="h-6 w-6" />}
          subtitle="Messages remaining"
        />
        <StatCard
          title="Attendance Today"
          value={`${data.attendance.presentPercentage}%`}
          color={data.attendance.presentPercentage >= 80 ? 'green' : 'yellow'}
          icon={<Calendar className="h-6 w-6" />}
          subtitle={`${data.attendance.presentToday} present, ${data.attendance.absentToday} absent`}
        />
      </StatsGrid>

      {/* Attendance Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-base font-medium mb-4 text-gray-900 dark:text-white">Today&apos;s Attendance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{data.attendance.presentPercentage}%</span>
                <span className="text-sm text-gray-500">({data.attendance.presentToday} students)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${data.attendance.presentPercentage}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold text-red-600 dark:text-red-400">{data.attendance.absentPercentage}%</span>
                <span className="text-sm text-gray-500">({data.attendance.absentToday} students)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${data.attendance.absentPercentage}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h3 className="text-base font-medium mb-4 text-gray-900 dark:text-white">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Students</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.students.total}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Payment Rate</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {data.students.total > 0 ? Math.round((data.students.paid / data.students.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">SMS Usage</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.sms.sentThisTerm} sent</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Attendance Recorded</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.attendance.totalToday} today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
