'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, CreditCard, MessageSquare, Calendar, UserCheck, UserX, GraduationCap, BookOpen, BarChart3, Settings, UserCog, AlertTriangle, X } from 'lucide-react'
import { StatCard, StatsGrid } from '@/components/ui/stat-card'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { FinancialSummary } from '@/components/ui/financial-summary'
import { Button } from '@/components/ui/button'
import { useStaffOnboardingContext } from '@/components/providers/staff-onboarding-provider'

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
    color: 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 text-[var(--accent-hover)] dark:text-[var(--chart-blue)]',
  },
  {
    title: 'Staff',
    description: 'Manage teachers and staff accounts',
    icon: Users,
    href: '/dashboard/teachers',
    color: 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 text-[var(--success-dark)] dark:text-[var(--success)]',
  },
  {
    title: 'Assignments',
    description: 'Who teaches what to whom - the truth table',
    icon: UserCog,
    href: '/dashboard/assignments',
    color: 'bg-indigo-50 dark:bg-indigo-950/30 text-[var(--chart-purple)] dark:text-[var(--info)]',
  },
  {
    title: 'Academics',
    description: 'Classes, subjects, and timetables',
    icon: BookOpen,
    href: '/dashboard/classes',
    color: 'bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 text-[var(--chart-purple)] dark:text-[var(--chart-purple)]',
  },
  {
    title: 'Finance',
    description: 'Fees, payments, and financial reports',
    icon: CreditCard,
    href: '/dashboard/fees',
    color: 'bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/30 text-[var(--warning-dark)] dark:text-[var(--warning)]',
  },
  {
    title: 'Communication',
    description: 'SMS and messaging to parents',
    icon: MessageSquare,
    href: '/dashboard/sms',
    color: 'bg-cyan-50 dark:bg-cyan-950/30 text-[var(--info)] dark:text-[var(--info)]',
  },
  {
    title: 'Reports',
    description: 'Generate and view reports',
    icon: BarChart3,
    href: '/dashboard/reports',
    color: 'bg-rose-50 dark:bg-rose-950/30 text-[var(--chart-red)] dark:text-[var(--danger)]',
  },
]

export default function SchoolAdminDashboardPage() {
  const [data, setData] = useState<DashboardOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false)

  // Staff onboarding hook
  const {
    onboardingStatus,
    showModal: showOnboardingModal,
    buttonLoading: onboardingButtonLoading,
  } = useStaffOnboardingContext()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        console.log('Fetching dashboard data...')
        
        // Add more detailed logging and error handling
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.log('Dashboard API request timeout - aborting request')
          controller.abort()
        }, 30000) // Increased timeout to 30 seconds for complex queries

        try {
          const response = await fetch('/api/dashboard/overview', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId)
          
          console.log('Dashboard API response status:', response.status)
          console.log('Dashboard API response headers:', [...response.headers.entries()])
          
          if (!response.ok) {
            // Try to get more specific error information
            let errorMessage = 'Failed to fetch dashboard data'
            let errorDetails = null

            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorData.details || errorMessage
              errorDetails = errorData
              console.error('Dashboard API error details:', errorData)
            } catch (parseError) {
              console.error('Could not parse error response:', parseError)
              // Try to get response as text
              try {
                const errorText = await response.text()
                console.error('Error response as text:', errorText)
                if (errorText) {
                  errorMessage = `${errorMessage} - ${errorText.substring(0, 200)}`
                }
              } catch (textError) {
                console.error('Could not get error response as text:', textError)
              }
            }

            throw new Error(`${errorMessage} (Status: ${response.status})`)
          }

          const dashboardData = await response.json()
          console.log('Dashboard data received:', dashboardData)
          setData(dashboardData)
          setError(null)
        } catch (err) {
          // Check if the error is due to the timeout
          if (controller.signal.aborted) {
            console.error('Dashboard API request was aborted due to timeout')
            throw new Error('Request timed out. Please check your connection and try again.')
          }
          
          console.error('Error fetching dashboard data:', err)

          // Provide more specific error messages based on error type
          let errorMessage = 'Unable to load dashboard data. Please try again.'

          if (err.name === 'AbortError') {
            errorMessage = 'Request timed out. Please check your connection and try again.'
          } else if (err.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please ensure the application is running and try again.'
          } else if (err.message.includes('401')) {
            errorMessage = 'Authentication required. Please log in again.'
          } else if (err.message.includes('403')) {
            errorMessage = 'Access denied. Please contact your administrator.'
          } else if (err.message.includes('500')) {
            errorMessage = 'Server error. Please try again in a moment.'
          } else if (err instanceof Error) {
            errorMessage = err.message
          }

          setError(errorMessage)
        } finally {
          setLoading(false)
        }
      } catch (err) {
        console.error('Unexpected error in fetchDashboardData:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  // Add retry functionality
  const handleRetry = async () => {
    setError(null)
    setLoading(true)
    
    try {
      console.log('Retrying dashboard data fetch...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('Retry - Dashboard API request timeout - aborting request')
        controller.abort()
      }, 15000) // Increased timeout to 15 seconds to allow for slower responses

      try {
        const response = await fetch('/api/dashboard/overview', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        console.log('Retry - Dashboard API response status:', response.status)
        console.log('Retry - Dashboard API response headers:', [...response.headers.entries()])

        if (!response.ok) {
          let errorMessage = 'Failed to fetch dashboard data'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.details || errorMessage
            console.error('Retry - Dashboard API error details:', errorData)
          } catch (parseError) {
            console.error('Retry - Could not parse error response:', parseError)
          }
          throw new Error(`${errorMessage} (Status: ${response.status})`)
        }

        const dashboardData = await response.json()
        console.log('Retry - Dashboard data received:', dashboardData)
        setData(dashboardData)
        setError(null)
      } catch (err) {
        // Check if the error is due to the timeout
        if (controller.signal.aborted) {
          console.error('Retry - Dashboard API request was aborted due to timeout')
          throw new Error('Request timed out. Please check your connection and try again.')
        }
        
        console.error('Retry - Error fetching dashboard data:', err)

        let errorMessage = 'Unable to load dashboard data. Please try again.'

        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection and try again.'
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to server. Please ensure the application is running and try again.'
        } else if (err instanceof Error) {
          errorMessage = err.message
        }

        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    } catch (err) {
      console.error('Unexpected error in retry function:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during retry')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">School Admin Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">Welcome to your school dashboard</p>
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">School Admin Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
            Unable to load dashboard data
          </p>
        </div>
        
        <AlertBanner
          type="danger"
          message={error}
          action={{ 
            label: loading ? 'Retrying...' : 'Retry', 
            onClick: handleRetry,
            disabled: loading
          }}
        />
        
        {/* Show diagnostic information */}
        <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg p-4 border border-[var(--border-default)] dark:border-[var(--border-strong)]">
          <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
            Troubleshooting Steps:
          </h3>
          <ul className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] space-y-1">
            <li>• Check your internet connection</li>
            <li>• Ensure you are logged in properly</li>
            <li>• Try refreshing the page</li>
            <li>• Contact support if the issue persists</li>
          </ul>
        </div>
        
        {/* Show basic fallback content */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectionCards.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className="group bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5 hover:border-[var(--border-default)] dark:hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${section.color}`}>
                  <section.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] group-hover:text-[var(--text-primary)] dark:group-hover:text-[var(--text-secondary)]">
                    {section.title}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                    {section.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Staff Onboarding Banner - Show only when clicked */}
      {showOnboardingBanner && onboardingStatus && !onboardingStatus.isComplete && onboardingStatus.missingRoles.some((role: any) => role.isRequired) && (
        <div 
          className="border rounded-lg p-4 relative"
          style={{
            background: 'linear-gradient(to right, var(--warning-light), var(--warning-light))',
            borderColor: 'var(--warning)',
            color: 'var(--warning-dark)'
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setShowOnboardingBanner(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 transition-colors"
            style={{ color: 'var(--warning-dark)' }}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-start gap-4 pr-8">
            <div className="flex-shrink-0">
              <div 
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--warning)',
                  color: 'var(--bg-main)'
                }}
              >
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="flex-1">
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--warning-dark)' }}
              >
                Complete Your Staff Setup
              </h3>
              <p 
                className="mb-4"
                style={{ color: 'var(--warning-dark)' }}
              >
                Your school setup is incomplete. You need to register {onboardingStatus.missingRoles.filter((role: any) => role.isRequired).length} required staff member{onboardingStatus.missingRoles.filter((role: any) => role.isRequired).length === 1 ? '' : 's'} to unlock all features.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {onboardingStatus.missingRoles.filter((role: any) => role.isRequired).map((role: any, index: number) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: 'var(--warning)',
                      color: 'var(--bg-main)'
                    }}
                  >
                    <UserCog className="h-4 w-4 mr-1" />
                    {typeof role.title === 'string' ? role.title : (role.title?.name || role.name || 'Unknown Role')}
                  </span>
                ))}
              </div>
              <Button
                onClick={showOnboardingModal}
                disabled={onboardingButtonLoading}
                style={{
                  backgroundColor: 'var(--warning)',
                  color: 'var(--bg-main)'
                }}
                className="hover:opacity-90"
              >
                {onboardingButtonLoading ? (
                  <>
                    <div 
                      className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"
                      style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
                    />
                    Loading...
                  </>
                ) : (
                  <>
                    <UserCog className="h-4 w-4 mr-2" />
                    Complete Staff Setup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header with School Context - Requirements: 13.1 - School Name, Term, Academic Year always visible */}
      <div 
        className="rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 
                className="text-xl font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {data.context?.schoolName || 'School Admin Dashboard'}
              </h1>
              
              {/* Staff Setup Indicator - Show when setup is incomplete */}
              {onboardingStatus && !onboardingStatus.isComplete && onboardingStatus.missingRoles.some((role: any) => role.isRequired) && (
                <button
                  onClick={() => setShowOnboardingBanner(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--warning)',
                    color: 'var(--bg-main)'
                  }}
                  title="Click to view staff setup requirements"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Setup Incomplete
                </button>
              )}
            </div>
            <p 
              className="text-sm mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {data.context?.currentTerm || 'Current Term'} • {data.context?.academicYear || 'Academic Year'}
            </p>
          </div>
          <Link 
            href="/dashboard/settings" 
            className="inline-flex items-center gap-2 text-sm hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
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

      {/* Financial Summary - The 4 Essential Numbers */}
      <FinancialSummary className="mb-6" />

      {/* Main Section Cards - Requirements: 13.2, 13.3 - Cards with icon and description */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sectionCards.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="group bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5 hover:border-[var(--border-default)] dark:hover:border-[var(--border-strong)] transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${section.color}`}>
                <section.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] group-hover:text-[var(--text-primary)] dark:group-hover:text-[var(--text-secondary)]">
                  {section.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
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
        <div className="rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-main)] dark:bg-[var(--text-primary)] p-4">
          <h3 className="text-base font-medium mb-4 text-[var(--text-primary)] dark:text-[var(--white-pure)]">Today&apos;s Attendance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[var(--chart-green)] dark:text-[var(--success)]" />
                <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold text-[var(--chart-green)] dark:text-[var(--success)]">{data.attendance.presentPercentage}%</span>
                <span className="text-sm text-[var(--text-muted)]">({data.attendance.presentToday} students)</span>
              </div>
            </div>
            <div className="w-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-full h-1.5">
              <div className="bg-[var(--success)] h-1.5 rounded-full" style={{ width: `${data.attendance.presentPercentage}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-[var(--chart-red)] dark:text-[var(--danger)]" />
                <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold text-[var(--chart-red)] dark:text-[var(--danger)]">{data.attendance.absentPercentage}%</span>
                <span className="text-sm text-[var(--text-muted)]">({data.attendance.absentToday} students)</span>
              </div>
            </div>
            <div className="w-full bg-[var(--bg-surface)] dark:border-[var(--border-strong)] rounded-full h-1.5">
              <div className="bg-[var(--danger)] h-1.5 rounded-full" style={{ width: `${data.attendance.absentPercentage}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-main)] dark:bg-[var(--text-primary)] p-4">
          <h3 className="text-base font-medium mb-4 text-[var(--text-primary)] dark:text-[var(--white-pure)]">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
              <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Total Students</span>
              <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{data.students.total}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
              <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Payment Rate</span>
              <span className="font-medium text-[var(--chart-green)] dark:text-[var(--success)]">
                {data.students.total > 0 ? Math.round((data.students.paid / data.students.total) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
              <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">SMS Usage</span>
              <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{data.sms.sentThisTerm} sent</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Attendance Recorded</span>
              <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{data.attendance.totalToday} today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}