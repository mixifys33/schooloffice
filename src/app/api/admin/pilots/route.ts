/**
 * Super Admin Pilot Schools Management API Route
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 * - GET: Return all pilot schools with limits and dates
 * - POST: Convert pilot to paid
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LicenseType } from '@/types/enums'

export interface PilotSchoolData {
  id: string
  name: string
  code: string
  email: string | null
  phone: string | null
  studentCount: number
  studentLimit: number
  smsCount: number
  smsLimit: number
  startDate: string
  endDate: string
  daysRemaining: number
  isExpired: boolean
  isStudentLimitReached: boolean
  isSmsLimitReached: boolean
  isActive: boolean
  createdAt: string
}

// Default pilot limits
const DEFAULT_PILOT_STUDENT_LIMIT = 50
const DEFAULT_PILOT_SMS_LIMIT = 100
const DEFAULT_PILOT_DURATION_DAYS = 30

/**
 * GET /api/admin/pilots
 * Fetches all pilot schools with their limits and status
 * Requirement: 15.1
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

    // Fetch all pilot schools
    const schools = await prisma.school.findMany({
      where: {
        licenseType: LicenseType.FREE_PILOT
      },
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const now = new Date()

    // Map to PilotSchoolData format
    const pilotSchools: PilotSchoolData[] = schools.map(school => {
      const features = school.features as Record<string, unknown>
      
      // Get pilot limits from features or use defaults
      const studentLimit = (features.pilotStudentLimit as number) || DEFAULT_PILOT_STUDENT_LIMIT
      const smsLimit = (features.pilotSmsLimit as number) || DEFAULT_PILOT_SMS_LIMIT
      
      // Get pilot dates
      const startDate = school.createdAt
      const pilotEndDate = features.pilotEndDate 
        ? new Date(features.pilotEndDate as string)
        : new Date(startDate.getTime() + DEFAULT_PILOT_DURATION_DAYS * 24 * 60 * 60 * 1000)
      
      // Get SMS count from features or default to 0
      const smsCount = (features.smsSentCount as number) || 0
      
      // Calculate days remaining
      const daysRemaining = Math.max(0, Math.ceil((pilotEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      const isExpired = now > pilotEndDate
      
      // Check limits
      const isStudentLimitReached = school._count.students >= studentLimit
      const isSmsLimitReached = smsCount >= smsLimit

      return {
        id: school.id,
        name: school.name,
        code: school.code,
        email: school.email,
        phone: school.phone,
        studentCount: school._count.students,
        studentLimit,
        smsCount,
        smsLimit,
        startDate: startDate.toISOString(),
        endDate: pilotEndDate.toISOString(),
        daysRemaining,
        isExpired,
        isStudentLimitReached,
        isSmsLimitReached,
        isActive: school.isActive,
        createdAt: school.createdAt.toISOString()
      }
    })

    return NextResponse.json({ 
      pilots: pilotSchools,
      summary: {
        total: pilotSchools.length,
        active: pilotSchools.filter(p => p.isActive && !p.isExpired).length,
        expired: pilotSchools.filter(p => p.isExpired).length,
        limitReached: pilotSchools.filter(p => p.isStudentLimitReached || p.isSmsLimitReached).length
      }
    })
  } catch (error) {
    console.error('Error fetching pilot schools:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pilot schools data' },
      { status: 500 }
    )
  }
}
