/**
 * Super Admin Dashboard API
 * GET /api/super-admin/dashboard
 * 
 * Requirements: 1.1, 1.2, 1.5
 * - Implement global statistics calculation
 * - Implement school list query with pagination
 * - Add caching with 5-minute TTL for stats, 1-minute for list
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { AlertSeverity } from '@prisma/client'

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

interface GlobalStatistics {
  totalSchools: number
  activeSchools: number
  suspendedSchools: number
  totalRevenue: number
  schoolsFlagged: number
}

interface SchoolListItem {
  id: string
  name: string
  healthScore: number
  plan: string
  mrr: number
  lastActivity: Date | null
  studentCount: number
  teacherCount: number
  alertFlags: {
    type: string
    severity: string
    title: string
  }[]
}

interface DashboardResponse {
  globalStats: GlobalStatistics
  schools: SchoolListItem[]
  pagination: {
    page: number
    pageSize: number
    totalSchools: number
    totalPages: number
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate global statistics
 * Requirement 1.1: Display global statistics
 */
async function calculateGlobalStatistics(): Promise<GlobalStatistics> {
  // Check cache first (5-minute TTL)
  const cacheKey = 'super-admin:global-stats'
  const cached = getCachedData<GlobalStatistics>(cacheKey)
  
  if (cached) {
    console.log('📊 Using cached global stats')
    return cached
  }

  console.log('📊 Calculating global statistics...')

  try {
    // Calculate statistics
    const [totalSchools, activeSchools, suspendedSchools, subscriptionData, flaggedSchools] = await Promise.all([
      // Total schools
      prisma.school.count().catch(err => {
        console.error('Error counting total schools:', err)
        return 0
      }),
      
      // Active schools
      prisma.school.count({
        where: { isActive: true },
      }).catch(err => {
        console.error('Error counting active schools:', err)
        return 0
      }),
      
      // Suspended schools
      prisma.school.count({
        where: { isActive: false },
      }).catch(err => {
        console.error('Error counting suspended schools:', err)
        return 0
      }),
      
      // Total revenue (sum from subscriptions)
      prisma.schoolSubscription.aggregate({
        _sum: {
          paymentAmount: true,
        },
      }).catch(err => {
        console.error('Error calculating total revenue:', err)
        return { _sum: { paymentAmount: 0 } }
      }),
      
      // Schools with active alerts
      prisma.schoolAlert.findMany({
        where: { isActive: true },
        select: { schoolId: true },
        distinct: ['schoolId'],
      }).catch(err => {
        console.error('Error fetching flagged schools:', err)
        return []
      }),
    ])

    const stats: GlobalStatistics = {
      totalSchools,
      activeSchools,
      suspendedSchools,
      totalRevenue: subscriptionData._sum.paymentAmount || 0,
      schoolsFlagged: flaggedSchools.length,
    }

    console.log('📊 Global stats calculated:', stats)

    // Cache for 5 minutes
    setCachedData(cacheKey, stats, 5 * 60 * 1000)

    return stats
  } catch (error) {
    console.error('❌ Error in calculateGlobalStatistics:', error)
    // Return default stats on error
    return {
      totalSchools: 0,
      activeSchools: 0,
      suspendedSchools: 0,
      totalRevenue: 0,
      schoolsFlagged: 0,
    }
  }
}

/**
 * Get paginated school list with health metrics and alerts
 * Requirement 1.2: Display diagnostic table with all schools
 */
async function getSchoolList(page: number, pageSize: number): Promise<{
  schools: SchoolListItem[]
  totalSchools: number
}> {
  // Check cache first (1-minute TTL)
  const cacheKey = `super-admin:school-list:${page}:${pageSize}`
  const cached = getCachedData<{ schools: SchoolListItem[]; totalSchools: number }>(cacheKey)
  
  if (cached) {
    return cached
  }

  // Get total count
  const totalSchools = await prisma.school.count()

  // Get schools with pagination
  const schools = await prisma.school.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      licenseType: true,
      createdAt: true,
      updatedAt: true,
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

  // Get last admin login activity
  const adminLogins = await prisma.user.findMany({
    where: {
      schoolId: { in: schoolIds },
      role: 'SCHOOL_ADMIN',
    },
    select: {
      schoolId: true,
      lastLoginAt: true,
    },
  })

  const lastActivityMap = new Map<string, Date | null>()
  adminLogins.forEach(admin => {
    const existing = lastActivityMap.get(admin.schoolId)
    if (!existing || (admin.lastLoginAt && admin.lastLoginAt > existing)) {
      lastActivityMap.set(admin.schoolId, admin.lastLoginAt)
    }
  })

  const schoolList: SchoolListItem[] = schools.map((school) => {
    const subscription = subscriptionMap.get(school.id)
    const studentCount = studentCountMap.get(school.id) || 0
    const teacherCount = teacherCountMap.get(school.id) || 0
    
    // Calculate a simple health score based on available data
    let healthScore = 50 // Base score
    
    // Add points for having students and teachers
    if (studentCount > 0) healthScore += 20
    if (teacherCount > 0) healthScore += 15
    
    // Add points for recent activity
    const lastActivity = lastActivityMap.get(school.id)
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
      healthScore,
      plan: subscription?.paymentTier || school.licenseType,
      mrr: subscription?.paymentAmount || 0,
      lastActivity: lastActivity || null,
      studentCount,
      teacherCount,
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
 * GET /api/super-admin/dashboard
 * Get dashboard data with global stats and school list
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Super Admin Dashboard API called')
    
    // Authenticate and authorize
    const session = await auth()
    console.log('🔐 Session:', session ? 'Found' : 'Not found')
    
    if (!session?.user) {
      console.log('❌ No session user')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('👤 User role:', session.user.role)
    if (session.user.role !== Role.SUPER_ADMIN) {
      console.log('❌ Not super admin')
      return NextResponse.json(
        { error: 'Forbidden', message: 'Super Admin access required' },
        { status: 403 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    console.log('📄 Pagination:', { page, pageSize })

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { 
          error: 'Bad Request', 
          message: 'Invalid pagination parameters. Page must be >= 1, pageSize must be between 1 and 100' 
        },
        { status: 400 }
      )
    }

    console.log('📊 Fetching data...')
    // Get global statistics and school list in parallel
    const [globalStats, schoolListData] = await Promise.all([
      calculateGlobalStatistics(),
      getSchoolList(page, pageSize),
    ])

    console.log('📊 Data fetched:', {
      globalStats,
      schoolCount: schoolListData.schools.length,
      totalSchools: schoolListData.totalSchools
    })

    const totalPages = Math.ceil(schoolListData.totalSchools / pageSize)

    const response: DashboardResponse = {
      globalStats,
      schools: schoolListData.schools,
      pagination: {
        page,
        pageSize,
        totalSchools: schoolListData.totalSchools,
        totalPages,
      },
    }

    return NextResponse.json({
      success: true,
      data: response,
    })

  } catch (error) {
    console.error('❌ Dashboard API error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to load dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Invalidate dashboard cache
 * This function can be called when school data changes
 */
export function invalidateDashboardCache(): void {
  // Clear all dashboard-related cache entries
  const keysToDelete: string[] = []
  
  for (const key of cache.keys()) {
    if (key.startsWith('super-admin:global-stats') || key.startsWith('super-admin:school-list')) {
      keysToDelete.push(key)
    }
  }
  
  for (const key of keysToDelete) {
    cache.delete(key)
  }
}
