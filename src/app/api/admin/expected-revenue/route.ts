/**
 * Super Admin Expected Revenue API Route
 * Calculates expected revenue based on school type and student count
 * - Secondary school: 5000 UGX per student
 * - Primary school: 3000 UGX per student
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface SchoolRevenueBreakdown {
  schoolId: string
  schoolName: string
  type: 'PRIMARY' | 'SECONDARY' | 'BOTH'
  students: number
  revenue: number
}

export interface ExpectedRevenueData {
  totalRevenue: number
  breakdown: SchoolRevenueBreakdown[]
  summary: {
    primarySchools: number
    secondarySchools: number
    bothSchools: number
    totalStudents: number
  }
}

// Revenue rates per student
const REVENUE_RATES = {
  PRIMARY: 3000,
  SECONDARY: 5000,
  BOTH: 4000, // Average for schools with both levels
}

/**
 * GET /api/admin/expected-revenue
 * Fetches expected revenue breakdown by school
 * Only accessible by Super Admin role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    // Fetch all active schools with student counts using aggregation
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        schoolType: true,
        _count: {
          select: {
            students: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Calculate revenue for each school
    const breakdown: SchoolRevenueBreakdown[] = schools.map(school => {
      const studentCount = school._count.students
      const rate = REVENUE_RATES[school.schoolType]
      const revenue = studentCount * rate

      return {
        schoolId: school.id,
        schoolName: school.name,
        type: school.schoolType,
        students: studentCount,
        revenue
      }
    })

    // Calculate totals
    const totalRevenue = breakdown.reduce((sum, school) => sum + school.revenue, 0)
    const totalStudents = breakdown.reduce((sum, school) => sum + school.students, 0)
    const primarySchools = breakdown.filter(s => s.type === 'PRIMARY').length
    const secondarySchools = breakdown.filter(s => s.type === 'SECONDARY').length
    const bothSchools = breakdown.filter(s => s.type === 'BOTH').length

    const data: ExpectedRevenueData = {
      totalRevenue,
      breakdown,
      summary: {
        primarySchools,
        secondarySchools,
        bothSchools,
        totalStudents
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching expected revenue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expected revenue data' },
      { status: 500 }
    )
  }
}
