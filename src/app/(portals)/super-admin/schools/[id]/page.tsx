'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Users,
  GraduationCap,
  BookOpen,
  MessageSquare,
  DollarSign,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { StatCard, StatsGrid } from '@/components/ui/stat-card'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { cn } from '@/lib/utils'
import { SchoolProfileHeader } from '@/components/super-admin/school-profile-header'
import { SchoolQuickActions } from '@/components/super-admin/school-quick-actions'
import { SchoolCoreInfo } from '@/components/super-admin/school-core-info'
import { SchoolActivityTimeline } from '@/components/super-admin/school-activity-timeline'
import { SchoolAuditLog } from '@/components/super-admin/school-audit-log'

/**
 * Super Admin School Profile Page
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 * - Navigate to school profile page (6.1)
 * - Display header section with school name, health score, plan, status badge, and last activity timestamp (6.2)
 * - Display quick action buttons for suspend, reactivate, change plan, reset admin password, force logout, and impersonate (6.3)
 * - Display core information including admin name, admin email, phone, registration date, and current plan details (6.4)
 * - Display usage metrics including student count, teacher count, class count, SMS sent this month, and SMS balance (6.5)
 * - Display financial metrics including MRR, total revenue, last payment date, last payment amount, and next billing date (6.6)
 * - Display activity timeline showing recent significant events in reverse chronological order (6.7)
 * - Display current alert flags with descriptions (6.8)
 */

// ============================================
// TYPES
// ============================================

interface SchoolDetailData {
  id: string
  name: string
  healthScore: number
  plan: string
  status: 'active' | 'suspended'
  lastActivity: Date | null
  coreInfo: {
    adminName: string | null
    adminEmail: string | null
    phone: string | null
    registrationDate: Date
    currentPlan: string
    planDetails: {
      tier: string | null
      billingCycle: string | null
    }
  }
  usageMetrics: {
    studentCount: number
    teacherCount: number
    classCount: number
    smsSentThisMonth: number
    smsBalance: number
  }
  financialMetrics: {
    mrr: number
    totalRevenue: number
    lastPaymentDate: Date | null
    lastPaymentAmount: number
    nextBillingDate: Date | null
  }
  activityTimeline: {
    timestamp: Date
    eventType: string
    description: string
    actor: string | null
  }[]
  alertFlags: {
    id: string
    type: string
    severity: string
    title: string
    message: string
    daysSinceCondition: number
    conditionStartedAt: Date
  }[]
  recentAuditLogs: {
    id: string
    timestamp: Date
    adminEmail: string
    actionType: string
    reason: string
    result: string
  }[]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date | null): string {
  if (!date) return 'Not available'
  
  return new Date(date).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getAlertBadge(severity: string): React.ReactNode {
  const severityClasses = {
    critical: 'bg-[var(--danger-light)] text-[var(--danger-dark)] dark:bg-[var(--danger-dark)] dark:text-[var(--danger)]',
    warning: 'bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)] dark:text-[var(--warning)]',
    info: 'bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)] dark:text-[var(--info)]',
  }
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      severityClasses[severity as keyof typeof severityClasses] || severityClasses.info
    )}>
      {severity}
    </span>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SchoolProfilePage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = params?.id as string

  const [data, setData] = useState<SchoolDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSchoolDetail() {
      if (!schoolId) {
        setError('School ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        const response = await fetch(`/api/super-admin/schools/${schoolId}`)
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized. Please log in.')
          }
          if (response.status === 403) {
            throw new Error('Access denied. Super Admin privileges required.')
          }
          if (response.status === 404) {
            throw new Error('School not found.')
          }
          throw new Error('Failed to fetch school details')
        }
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to load school details')
        }
        
        setData(result.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching school detail:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSchoolDetail()
  }, [schoolId])

  const handleActionComplete = () => {
    // Refresh the page data
    window.location.reload()
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-6">
        <SkeletonLoader variant="text" count={1} />
        <SkeletonLoader variant="card" count={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-2 sm:p-3 md:p-4 lg:p-6">
        <AlertBanner
          type="danger"
          message={error}
          action={{
            label: 'Back to Dashboard',
            onClick: () => router.push('/portals/super-admin/dashboard'),
          }}
        />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-2 sm:p-3 md:p-4 lg:p-6">
        <AlertBanner
          type="danger"
          message="No data available"
          action={{
            label: 'Back to Dashboard',
            onClick: () => router.push('/portals/super-admin/dashboard'),
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Requirement 6.2: Header Section - Mobile Optimized */}
      <SchoolProfileHeader
        schoolId={data.id}
        schoolName={data.name}
        healthScore={data.healthScore}
        plan={data.plan}
        status={data.status}
        lastActivity={data.lastActivity}
      />

      {/* Requirement 6.3: Quick Action Buttons */}
      <SchoolQuickActions
        schoolId={data.id}
        schoolName={data.name}
        currentStatus={data.status}
        currentPlan={data.plan}
        onActionComplete={handleActionComplete}
      />

      {/* Requirement 6.8: Alert Flags Display - Fully Responsive */}
      {data.alertFlags.length > 0 && (
        <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-3 sm:p-4 md:p-6">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3 sm:mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--warning)]" />
            <span>Active Alerts ({data.alertFlags.length})</span>
          </h2>
          
          <div className="space-y-3">
            {data.alertFlags.map((alert) => (
              <div
                key={alert.id}
                className="p-3 sm:p-4 rounded-lg border border-[var(--warning-light)] dark:border-[var(--warning-dark)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/10"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      {getAlertBadge(alert.severity)}
                      <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                        {alert.title}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                      {alert.message}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-2">
                      Active for {alert.daysSinceCondition} day{alert.daysSinceCondition !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirement 6.4: Core Information Section */}
      <SchoolCoreInfo coreInfo={data.coreInfo} />

      {/* Requirement 6.5: Usage Metrics Section - Fully Responsive */}
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Usage Metrics
        </h2>
        {/* Mobile: 1 column, Small: 2 columns, Medium: 3 columns, Large: 5 columns */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            title="Students"
            value={data.usageMetrics.studentCount}
            subtitle="Total enrolled"
            color="blue"
            icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="Teachers"
            value={data.usageMetrics.teacherCount}
            subtitle="Active staff"
            color="green"
            icon={<GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="Classes"
            value={data.usageMetrics.classCount}
            subtitle="Total classes"
            color="purple"
            icon={<BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="SMS Sent"
            value={data.usageMetrics.smsSentThisMonth}
            subtitle="This month"
            color="orange"
            icon={<MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
          <StatCard
            title="SMS Balance"
            value={data.usageMetrics.smsBalance}
            subtitle="Remaining credits"
            color={data.usageMetrics.smsBalance < 100 ? 'red' : 'gray'}
            icon={<MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />}
          />
        </div>
      </div>

      {/* Requirement 6.6: Financial Metrics Section - Fully Responsive */}
      <div className="space-y-3">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          Financial Metrics
        </h2>
        <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">Monthly Recurring Revenue</p>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {formatCurrency(data.financialMetrics.mrr)}
              </p>
            </div>
            
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">Total Revenue</p>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {formatCurrency(data.financialMetrics.totalRevenue)}
              </p>
            </div>
            
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">Last Payment</p>
              <p className="text-sm sm:text-base md:text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {formatCurrency(data.financialMetrics.lastPaymentAmount)}
              </p>
              <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                {formatDate(data.financialMetrics.lastPaymentDate)}
              </p>
            </div>
            
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-1">Next Billing Date</p>
              <p className="text-sm sm:text-base md:text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {formatDate(data.financialMetrics.nextBillingDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Requirement 6.7: Activity Timeline */}
      <SchoolActivityTimeline activityTimeline={data.activityTimeline} />

      {/* Requirement 6.8: Audit Log Display */}
      <SchoolAuditLog recentAuditLogs={data.recentAuditLogs} />
    </div>
  )
}
