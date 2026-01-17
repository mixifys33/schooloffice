/**
 * Super Admin Dashboard Overview API Route
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface SuperAdminOverviewData {
  schools: {
    total: number
    active: number
    pilot: number
    suspended: number
  }
  students: {
    total: number
  }
  sms: {
    totalUsage: number
    totalCost: number
  }
  revenue: {
    expected: number
    received: number
  }
  errorsToday: number
}

/**
 * GET /api/admin/overview
 * Fetches super admin dashboard overview data
 * Only accessible by Super Admin role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    console.log('Super Admin Overview - Session:', JSON.stringify(session, null, 2))
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      console.log('Access denied - User role:', session.user.role)
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    // Fetch data with error handling for each query
    let totalSchools = 0
    let activeSchools = 0
    let pilotSchools = 0
    let suspendedSchools = 0
    let totalStudents = 0
    let totalSmsUsage = 0
    let totalSmsCost = 0

    try {
      totalSchools = await prisma.school.count()
    } catch (e) {
      console.error('Error counting schools:', e)
    }

    try {
      activeSchools = await prisma.school.count({ where: { isActive: true } })
    } catch (e) {
      console.error('Error counting active schools:', e)
    }

    try {
      pilotSchools = await prisma.school.count({ where: { licenseType: 'FREE_PILOT' } })
    } catch (e) {
      console.error('Error counting pilot schools:', e)
    }

    try {
      suspendedSchools = await prisma.school.count({ where: { isActive: false } })
    } catch (e) {
      console.error('Error counting suspended schools:', e)
    }

    try {
      totalStudents = await prisma.student.count()
    } catch (e) {
      console.error('Error counting students:', e)
    }

    try {
      const smsCostLogs = await prisma.sMSCostLog.aggregate({
        _sum: { cost: true, messageCount: true },
      })
      totalSmsUsage = smsCostLogs._sum.messageCount || 0
      totalSmsCost = smsCostLogs._sum.cost || 0
    } catch (e) {
      console.error('Error aggregating SMS costs:', e)
    }

    // Calculate revenue (simplified)
    const perStudentFee = 50000
    let expectedRevenue = 0
    let receivedRevenue = 0

    try {
      const paidSchools = await prisma.school.findMany({
        where: { isActive: true, licenseType: { not: 'FREE_PILOT' } },
        select: { _count: { select: { students: true } } },
      })
      for (const school of paidSchools) {
        expectedRevenue += school._count.students * perStudentFee
      }
    } catch (e) {
      console.error('Error calculating revenue:', e)
    }

    const data: SuperAdminOverviewData = {
      schools: {
        total: totalSchools,
        active: activeSchools,
        pilot: pilotSchools,
        suspended: suspendedSchools,
      },
      students: {
        total: totalStudents,
      },
      sms: {
        totalUsage: totalSmsUsage,
        totalCost: totalSmsCost,
      },
      revenue: {
        expected: expectedRevenue,
        received: receivedRevenue,
      },
      errorsToday: 0,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching super admin overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch super admin overview data' },
      { status: 500 }
    )
  }
}
