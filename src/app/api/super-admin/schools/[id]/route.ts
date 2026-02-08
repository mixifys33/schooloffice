/**
 * Super Admin School Detail API
 * GET /api/super-admin/schools/[id]
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 * - Implement detailed school profile query
 * - Include all metrics, alerts, and recent audit logs
 * - Add caching with 30-second TTL
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { superAdminAuditService } from '@/services/super-admin-audit.service'

// ============================================
// IN-MEMORY CACHE
// In production, this would be Redis or similar
// ============================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<unknown>>()

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  
  if (!entry) {
    return null
  }

  const now = Date.now()
  if (now - entry.timestamp > entry.ttl) {
    // Cache expired
    cache.delete(key)
    return null
  }

  return entry.data
}

function setCachedData<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  })
}

// ============================================
// TYPES
// ============================================

interface SchoolDetailResponse {
  // Header section - Requirement 6.2
  id: string
  name: string
  healthScore: number
  plan: string
  status: 'active' | 'suspended'
  lastActivity: Date | null
  
  // Core information - Requirement 6.4
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
  
  // Usage metrics - Requirement 6.5
  usageMetrics: {
    studentCount: number
    teacherCount: number
    classCount: number
    smsSentThisMonth: number
    smsBalance: number
  }
  
  // Financial metrics - Requirement 6.6
  financialMetrics: {
    mrr: number
    totalRevenue: number
    lastPaymentDate: Date | null
    lastPaymentAmount: number
    nextBillingDate: Date | null
  }
  
  // Activity timeline - Requirement 6.7
  activityTimeline: {
    timestamp: Date
    eventType: string
    description: string
    actor: string | null
  }[]
  
  // Alert flags - Requirement 6.8
  alertFlags: {
    id: string
    type: string
    severity: string
    title: string
    message: string
    daysSinceCondition: number
    conditionStartedAt: Date
  }[]
  
  // Recent audit logs - Requirement 6.8
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

/**
 * Get detailed school profile
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
async function getSchoolDetail(schoolId: string): Promise<SchoolDetailResponse | null> {
  // Check cache first (30-second TTL)
  const cacheKey = `super-admin:school:${schoolId}`
  const cached = getCachedData<SchoolDetailResponse>(cacheKey)
  
  if (cached) {
    return cached
  }

  // Get school with all related data
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      licenseType: true,
      isActive: true,
      createdAt: true,
      healthMetrics: {
        select: {
          healthScore: true,
          activityScore: true,
          dataCompletenessScore: true,
          smsEngagementScore: true,
          paymentDisciplineScore: true,
          growthScore: true,
          lastAdminLogin: true,
          studentCount: true,
          teacherCount: true,
          classCount: true,
          smsBalance: true,
          smsSentThisMonth: true,
          lastPaymentDate: true,
          lastPaymentAmount: true,
          nextBillingDate: true,
          mrr: true,
          totalRevenue: true,
          calculatedAt: true,
        },
      },
      alerts: {
        where: { isActive: true },
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          message: true,
          daysSinceCondition: true,
          conditionStartedAt: true,
        },
        orderBy: {
          severity: 'desc',
        },
      },
    },
  })

  if (!school) {
    return null
  }

  // Get subscription data
  const subscription = await prisma.schoolSubscription.findUnique({
    where: { schoolId },
    select: {
      paymentTier: true,
      billingCycle: true,
    },
  })

  // Get admin user (first user with SCHOOL_ADMIN role)
  const adminUser = await prisma.user.findFirst({
    where: {
      schoolId,
      role: Role.SCHOOL_ADMIN,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  })

  // Get recent audit logs for this school
  const auditLogs = await superAdminAuditService.getSchoolAuditLog(schoolId, 10, 0)

  // Build activity timeline from audit logs and other events
  // Requirement 6.7: Display activity timeline showing recent significant events
  const activityTimeline: SchoolDetailResponse['activityTimeline'] = []

  // Add audit log events
  for (const log of auditLogs) {
    activityTimeline.push({
      timestamp: log.timestamp,
      eventType: log.actionType,
      description: `${log.actionType.replace(/_/g, ' ').toLowerCase()} - ${log.reason}`,
      actor: log.adminEmail,
    })
  }

  // Add last admin login event if available
  if (school.healthMetrics?.lastAdminLogin) {
    activityTimeline.push({
      timestamp: school.healthMetrics.lastAdminLogin,
      eventType: 'ADMIN_LOGIN',
      description: 'Admin logged in',
      actor: adminUser?.email || null,
    })
  }

  // Add last payment event if available
  if (school.healthMetrics?.lastPaymentDate) {
    activityTimeline.push({
      timestamp: school.healthMetrics.lastPaymentDate,
      eventType: 'PAYMENT_RECEIVED',
      description: `Payment received: ${school.healthMetrics.lastPaymentAmount.toFixed(2)}`,
      actor: null,
    })
  }

  // Sort timeline by timestamp (most recent first)
  // Requirement 6.7: Events in reverse chronological order
  activityTimeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  // Take only the most recent 20 events
  const recentTimeline = activityTimeline.slice(0, 20)

  // Build response
  const response: SchoolDetailResponse = {
    // Header section - Requirement 6.2
    id: school.id,
    name: school.name,
    healthScore: school.healthMetrics?.healthScore || 0,
    plan: subscription?.paymentTier || school.licenseType,
    status: school.isActive ? 'active' : 'suspended',
    lastActivity: school.healthMetrics?.lastAdminLogin || null,
    
    // Core information - Requirement 6.4
    coreInfo: {
      adminName: adminUser 
        ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || null
        : null,
      adminEmail: adminUser?.email || school.email || null,
      phone: school.phone || null,
      registrationDate: school.createdAt,
      currentPlan: subscription?.paymentTier || school.licenseType,
      planDetails: {
        tier: subscription?.paymentTier || null,
        billingCycle: subscription?.billingCycle || null,
      },
    },
    
    // Usage metrics - Requirement 6.5
    usageMetrics: {
      studentCount: school.healthMetrics?.studentCount || 0,
      teacherCount: school.healthMetrics?.teacherCount || 0,
      classCount: school.healthMetrics?.classCount || 0,
      smsSentThisMonth: school.healthMetrics?.smsSentThisMonth || 0,
      smsBalance: school.healthMetrics?.smsBalance || 0,
    },
    
    // Financial metrics - Requirement 6.6
    financialMetrics: {
      mrr: school.healthMetrics?.mrr || 0,
      totalRevenue: school.healthMetrics?.totalRevenue || 0,
      lastPaymentDate: school.healthMetrics?.lastPaymentDate || null,
      lastPaymentAmount: school.healthMetrics?.lastPaymentAmount || 0,
      nextBillingDate: school.healthMetrics?.nextBillingDate || null,
    },
    
    // Activity timeline - Requirement 6.7
    activityTimeline: recentTimeline,
    
    // Alert flags - Requirement 6.8
    alertFlags: school.alerts.map((alert) => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      daysSinceCondition: alert.daysSinceCondition,
      conditionStartedAt: alert.conditionStartedAt,
    })),
    
    // Recent audit logs - Requirement 6.8
    recentAuditLogs: auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      adminEmail: log.adminEmail,
      actionType: log.actionType,
      reason: log.reason,
      result: log.result,
    })),
  }

  // Cache for 30 seconds
  setCachedData(cacheKey, response, 30 * 1000)

  return response
}

// ============================================
// API ROUTE HANDLER
// ============================================

/**
 * GET /api/super-admin/schools/[id]
 * Get detailed school profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate and authorize
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Super Admin access required' },
        { status: 403 }
      )
    }

    // Get school ID from params
    const { id: schoolId } = await params

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'School ID is required' },
        { status: 400 }
      )
    }

    // Get school detail
    const schoolDetail = await getSchoolDetail(schoolId)

    if (!schoolDetail) {
      return NextResponse.json(
        { error: 'Not Found', message: 'School not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: schoolDetail,
    })

  } catch (error) {
    console.error('School detail API error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to load school detail',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Invalidate school detail cache
 * This function can be called when school data changes
 */
export function invalidateSchoolDetailCache(schoolId: string): void {
  const cacheKey = `super-admin:school:${schoolId}`
  cache.delete(cacheKey)
}

/**
 * Invalidate all school detail caches
 */
export function invalidateAllSchoolDetailCaches(): void {
  const keysToDelete: string[] = []
  
  for (const key of cache.keys()) {
    if (key.startsWith('super-admin:school:')) {
      keysToDelete.push(key)
    }
  }
  
  for (const key of keysToDelete) {
    cache.delete(key)
  }
}
