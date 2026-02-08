/**
 * Super Admin Schools List API
 * GET /api/super-admin/schools
 * 
 * Requirements: 2.1, 2.3, 11.6
 * - Implement search across name, email, school ID
 * - Implement stackable filters (plan, health range, payment, activity, alerts)
 * - Implement pagination (50 schools per page)
 * - Add caching with 1-minute TTL
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { AlertType, AlertSeverity, PaymentTier } from '@prisma/client'

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

interface SchoolListItem {
  id: string
  name: string
  adminEmail: string | null
  healthScore: number
  plan: string
  mrr: number
  lastActivity: Date | null
  studentCount: number
  teacherCount: number
  isActive: boolean
  alertFlags: {
    type: string
    severity: string
    title: string
  }[]
}

interface SchoolsListResponse {
  schools: SchoolListItem[]
  pagination: {
    page: number
    pageSize: number
    totalSchools: number
    totalPages: number
  }
  filters: {
    search?: string
    plan?: string[]
    healthMin?: number
    healthMax?: number
    paymentStatus?: string[]
    activityStatus?: string[]
    alertTypes?: string[]
  }
}

interface FilterParams {
  search?: string
  plan?: string[]
  healthMin?: number
  healthMax?: number
  paymentStatus?: string[]
  activityStatus?: string[]
  alertTypes?: string[]
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse filter parameters from query string
 */
function parseFilters(searchParams: URLSearchParams): FilterParams {
  const filters: FilterParams = {}

  // Search query
  const search = searchParams.get('search')
  if (search) {
    filters.search = search.trim()
  }

  // Plan filter (can be multiple)
  const plan = searchParams.get('plan')
  if (plan) {
    filters.plan = plan.split(',').map(p => p.trim()).filter(Boolean)
  }

  // Health score range
  const healthMin = searchParams.get('healthMin')
  if (healthMin) {
    const parsed = parseInt(healthMin, 10)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      filters.healthMin = parsed
    }
  }

  const healthMax = searchParams.get('healthMax')
  if (healthMax) {
    const parsed = parseInt(healthMax, 10)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      filters.healthMax = parsed
    }
  }

  // Payment status filter (can be multiple)
  const paymentStatus = searchParams.get('paymentStatus')
  if (paymentStatus) {
    filters.paymentStatus = paymentStatus.split(',').map(p => p.trim()).filter(Boolean)
  }

  // Activity status filter (can be multiple)
  const activityStatus = searchParams.get('activityStatus')
  if (activityStatus) {
    filters.activityStatus = activityStatus.split(',').map(a => a.trim()).filter(Boolean)
  }

  // Alert types filter (can be multiple)
  const alertTypes = searchParams.get('alertTypes')
  if (alertTypes) {
    filters.alertTypes = alertTypes.split(',').map(a => a.trim()).filter(Boolean)
  }

  return filters
}

/**
 * Generate cache key from filters
 */
function generateCacheKey(page: number, pageSize: number, filters: FilterParams): string {
  const filterStr = JSON.stringify(filters)
  return `super-admin:schools:${page}:${pageSize}:${filterStr}`
}

/**
 * Build Prisma where clause from filters
 * Requirement 2.3: Support stackable filters
 */
function buildWhereClause(filters: FilterParams): any {
  const where: any = {}

  // Search across name, email, school ID
  // Requirement 2.1: Search across school name, admin email, and school ID fields
  if (filters.search) {
    const searchTerm = filters.search
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { id: { contains: searchTerm, mode: 'insensitive' } },
    ]
  }

  // Plan filter
  if (filters.plan && filters.plan.length > 0) {
    where.OR = where.OR || []
    
    // Check both licenseType and subscription paymentTier
    const planConditions: any[] = []
    
    // Add licenseType conditions
    if (filters.plan.some(p => ['FREE_PILOT', 'BASIC', 'PREMIUM'].includes(p))) {
      planConditions.push({
        licenseType: { in: filters.plan.filter(p => ['FREE_PILOT', 'BASIC', 'PREMIUM'].includes(p)) }
      })
    }
    
    // Add subscription paymentTier conditions
    if (filters.plan.some(p => ['FULL', 'HALF', 'QUARTER', 'NONE'].includes(p))) {
      planConditions.push({
        subscription: {
          paymentTier: { in: filters.plan.filter(p => ['FULL', 'HALF', 'QUARTER', 'NONE'].includes(p)) }
        }
      })
    }
    
    if (planConditions.length > 0) {
      if (where.OR && where.OR.length > 0) {
        // If we already have OR conditions from search, we need to combine them with AND
        where.AND = [
          { OR: where.OR },
          { OR: planConditions }
        ]
        delete where.OR
      } else {
        where.OR = planConditions
      }
    }
  }

  // Health score range filter
  if (filters.healthMin !== undefined || filters.healthMax !== undefined) {
    // Since we don't have healthMetrics table, we'll skip this filter for now
    // In a real implementation, you'd calculate health scores on the fly or store them elsewhere
    console.warn('Health score filtering not available - healthMetrics table removed')
  }

  // Payment status filter
  if (filters.paymentStatus && filters.paymentStatus.length > 0) {
    const paymentConditions: any[] = []
    
    if (filters.paymentStatus.includes('current')) {
      // Payment is current (has recent payment)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      paymentConditions.push({
        subscription: {
          lastPaymentDate: { gte: thirtyDaysAgo }
        }
      })
    }
    
    if (filters.paymentStatus.includes('overdue')) {
      // Payment is overdue (no recent payment or no subscription)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      paymentConditions.push({
        OR: [
          {
            subscription: {
              lastPaymentDate: { lt: thirtyDaysAgo }
            }
          },
          {
            subscription: null
          }
        ]
      })
    }
    
    if (paymentConditions.length > 0) {
      if (where.AND) {
        where.AND.push({ OR: paymentConditions })
      } else if (where.OR && !where.AND) {
        where.AND = [
          { OR: where.OR },
          { OR: paymentConditions }
        ]
        delete where.OR
      } else {
        where.OR = paymentConditions
      }
    }
  }

  // Activity status filter
  if (filters.activityStatus && filters.activityStatus.length > 0) {
    const activityConditions: any[] = []
    const now = new Date()
    
    if (filters.activityStatus.includes('active_7d')) {
      // Active within 7 days - check for users with recent login
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      activityConditions.push({
        users: {
          some: {
            role: 'SCHOOL_ADMIN',
            lastLoginAt: { gte: sevenDaysAgo }
          }
        }
      })
    }
    
    if (filters.activityStatus.includes('active_30d')) {
      // Active within 30 days but not 7 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      activityConditions.push({
        users: {
          some: {
            role: 'SCHOOL_ADMIN',
            lastLoginAt: {
              gte: thirtyDaysAgo,
              lt: sevenDaysAgo
            }
          }
        }
      })
    }
    
    if (filters.activityStatus.includes('inactive')) {
      // Inactive for more than 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      activityConditions.push({
        OR: [
          {
            users: {
              every: {
                OR: [
                  { role: { not: 'SCHOOL_ADMIN' } },
                  { lastLoginAt: { lt: thirtyDaysAgo } },
                  { lastLoginAt: null }
                ]
              }
            }
          },
          {
            users: {
              none: {
                role: 'SCHOOL_ADMIN'
              }
            }
          }
        ]
      })
    }
    
    if (activityConditions.length > 0) {
      if (where.AND) {
        where.AND.push({ OR: activityConditions })
      } else if (where.OR && !where.AND) {
        where.AND = [
          { OR: where.OR },
          { OR: activityConditions }
        ]
        delete where.OR
      } else {
        where.OR = activityConditions
      }
    }
  }

  // Alert types filter
  if (filters.alertTypes && filters.alertTypes.length > 0) {
    where.alerts = {
      some: {
        isActive: true,
        type: { in: filters.alertTypes }
      }
    }
  }

  return where
}

/**
 * Get paginated and filtered school list
 * Requirements: 2.1, 2.3, 11.6
 */
async function getSchoolsList(
  page: number,
  pageSize: number,
  filters: FilterParams
): Promise<{
  schools: SchoolListItem[]
  totalSchools: number
}> {
  // Check cache first (1-minute TTL)
  const cacheKey = generateCacheKey(page, pageSize, filters)
  const cached = getCachedData<{ schools: SchoolListItem[]; totalSchools: number }>(cacheKey)
  
  if (cached) {
    return cached
  }

  // Build where clause from filters
  const where = buildWhereClause(filters)

  // Get total count
  const totalSchools = await prisma.school.count({ where })

  // Get schools with pagination
  const schools = await prisma.school.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      email: true,
      licenseType: true,
      isActive: true,
      createdAt: true,
      alerts: {
        where: { isActive: true },
        select: {
          type: true,
          severity: true,
          title: true,
        },
      },
    },
  })

  // Get subscription data separately for schools that have it
  const schoolIds = schools.map(s => s.id)
  const subscriptions = await prisma.schoolSubscription.findMany({
    where: {
      schoolId: { in: schoolIds },
    },
    select: {
      schoolId: true,
      paymentTier: true,
      paymentAmount: true,
      lastPaymentDate: true,
    },
  })

  const subscriptionMap = new Map(
    subscriptions.map(sub => [sub.schoolId, sub])
  )

  // Get admin email for each school (first user with SCHOOL_ADMIN role)
  const adminUsers = await prisma.user.findMany({
    where: {
      schoolId: { in: schoolIds },
      role: Role.SCHOOL_ADMIN,
    },
    select: {
      schoolId: true,
      email: true,
      lastLoginAt: true,
    },
    distinct: ['schoolId'],
  })

  const adminEmailMap = new Map(
    adminUsers.map(user => [user.schoolId, user.email])
  )

  const lastActivityMap = new Map(
    adminUsers.map(user => [user.schoolId, user.lastLoginAt])
  )

  // Get student and teacher counts
  const [studentCounts, teacherCounts] = await Promise.all([
    prisma.student.groupBy({
      by: ['schoolId'],
      where: {
        schoolId: { in: schoolIds },
        status: 'ACTIVE',
      },
      _count: {
        id: true,
      },
    }),
    prisma.teacher.groupBy({
      by: ['schoolId'],
      where: {
        schoolId: { in: schoolIds },
        employmentStatus: 'ACTIVE',
      },
      _count: {
        id: true,
      },
    }),
  ])

  const studentCountMap = new Map(
    studentCounts.map(count => [count.schoolId, count._count.id])
  )

  const teacherCountMap = new Map(
    teacherCounts.map(count => [count.schoolId, count._count.id])
  )

  const schoolList: SchoolListItem[] = schools.map((school) => {
    const subscription = subscriptionMap.get(school.id)
    const studentCount = studentCountMap.get(school.id) || 0
    const teacherCount = teacherCountMap.get(school.id) || 0
    const lastActivity = lastActivityMap.get(school.id)
    
    // Calculate a simple health score based on available data
    let healthScore = 50 // Base score
    
    // Add points for having students and teachers
    if (studentCount > 0) healthScore += 20
    if (teacherCount > 0) healthScore += 15
    
    // Add points for recent activity
    if (lastActivity) {
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceActivity <= 7) healthScore += 15
      else if (daysSinceActivity <= 30) healthScore += 5
    }
    
    // Subtract points for alerts
    healthScore -= school.alerts.length * 5
    
    // Ensure score is between 0 and 100
    healthScore = Math.max(0, Math.min(100, healthScore))

    return {
      id: school.id,
      name: school.name,
      adminEmail: adminEmailMap.get(school.id) || school.email || null,
      healthScore,
      plan: subscription?.paymentTier || school.licenseType,
      mrr: subscription?.paymentAmount || 0,
      lastActivity: lastActivity || null,
      studentCount,
      teacherCount,
      isActive: school.isActive,
      alertFlags: school.alerts.map((alert) => ({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
      })),
    }
  })

  const result = {
    schools: schoolList,
    totalSchools,
  }

  // Cache for 1 minute
  setCachedData(cacheKey, result, 1 * 60 * 1000)

  return result
}

// ============================================
// API ROUTE HANDLER
// ============================================

/**
 * GET /api/super-admin/schools
 * Get paginated and filtered school list
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    // Validate pagination parameters
    // Requirement 11.6: Paginate school lists with 50 schools per page
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Invalid pagination parameters. Page must be >= 1, pageSize must be between 1 and 100' 
        },
        { status: 400 }
      )
    }

    // Parse filters
    const filters = parseFilters(searchParams)

    // Get school list
    const schoolListData = await getSchoolsList(page, pageSize, filters)

    const totalPages = Math.ceil(schoolListData.totalSchools / pageSize)

    const response: SchoolsListResponse = {
      schools: schoolListData.schools,
      pagination: {
        page,
        pageSize,
        totalSchools: schoolListData.totalSchools,
        totalPages,
      },
      filters,
    }

    return NextResponse.json({
      success: true,
      data: response,
    })

  } catch (error) {
    console.error('Schools list API error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to load schools list',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Invalidate schools list cache
 * This function can be called when school data changes
 */
export function invalidateSchoolsListCache(): void {
  // Clear all schools list cache entries
  const keysToDelete: string[] = []
  
  for (const key of cache.keys()) {
    if (key.startsWith('super-admin:schools:')) {
      keysToDelete.push(key)
    }
  }
  
  for (const key of keysToDelete) {
    cache.delete(key)
  }
}
