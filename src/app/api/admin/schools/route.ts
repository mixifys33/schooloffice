/**
 * Super Admin Schools Management API Route
 * Requirements: 13.1, 22.2
 * - GET: Return all schools data (Super Admin only)
 * - POST: Create new school
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LicenseType } from '@/types/enums'

export interface SchoolWithMetrics {
  id: string
  name: string
  code: string
  studentCount: number
  plan: 'FREE_PILOT' | 'BASIC' | 'PREMIUM'
  amountDue: number
  dueDate: string | null
  status: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'PILOT'
  isActive: boolean
  email: string | null
  phone: string | null
  createdAt: string
}

/**
 * GET /api/admin/schools
 * Fetches all schools with metrics for Super Admin
 * Requirements: 13.1, 22.2
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin - Requirement 22.2
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    // Fetch all schools with student counts
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to SchoolWithMetrics format - Requirement 13.1
    const schoolsWithMetrics: SchoolWithMetrics[] = schools.map(school => {
      // Determine status based on isActive and licenseType
      let status: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'PILOT'
      if (!school.isActive) {
        status = 'SUSPENDED'
      } else if (school.licenseType === LicenseType.FREE_PILOT) {
        status = 'PILOT'
      } else {
        status = 'ACTIVE'
      }

      // Calculate amount due (simplified - per student fee * student count for non-pilot)
      const perStudentFee = 50000 // UGX per term
      const amountDue = school.licenseType !== LicenseType.FREE_PILOT 
        ? school._count.students * perStudentFee 
        : 0

      // Due date - end of current month (simplified)
      const now = new Date()
      const dueDate = school.licenseType !== LicenseType.FREE_PILOT
        ? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
        : null

      return {
        id: school.id,
        name: school.name,
        code: school.code,
        studentCount: school._count.students,
        plan: school.licenseType as 'FREE_PILOT' | 'BASIC' | 'PREMIUM',
        amountDue,
        dueDate,
        status,
        isActive: school.isActive,
        email: school.email,
        phone: school.phone,
        createdAt: school.createdAt.toISOString()
      }
    })

    return NextResponse.json({ schools: schoolsWithMetrics })
  } catch (error) {
    console.error('Error fetching schools:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schools data' },
      { status: 500 }
    )
  }
}
