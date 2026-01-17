/**
 * School Admin Dashboard Overview API Route
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentStatus, AttendanceStatus, PilotType } from '@/types/enums'

export interface DashboardOverviewData {
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
}

/**
 * GET /api/dashboard/overview
 * Fetches school admin dashboard overview data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId

    // Get today's date normalized to start of day
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch all data in parallel
    const [
      totalStudents,
      paidStudents,
      school,
      currentTerm,
      todayAttendance,
    ] = await Promise.all([
      // Total students
      prisma.student.count({
        where: { schoolId, status: StudentStatus.ACTIVE },
      }),
      // Paid students (PAID pilot type)
      prisma.student.count({
        where: { schoolId, status: StudentStatus.ACTIVE, pilotType: PilotType.PAID },
      }),
      // School details for SMS budget
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { smsBudgetPerTerm: true, isActive: true },
      }),
      // Current term
      prisma.term.findFirst({
        where: {
          academicYear: { schoolId, isActive: true },
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { id: true, startDate: true, endDate: true },
      }),
      // Today's attendance
      prisma.attendance.findMany({
        where: {
          date: today,
          student: { schoolId },
        },
        distinct: ['studentId'],
        select: { studentId: true, status: true },
      }),
    ])

    // SMS sent this term (needs currentTerm to be resolved first)
    const smsSentThisTerm = await prisma.message.count({
      where: {
        schoolId,
        createdAt: currentTerm ? { gte: currentTerm.startDate } : undefined,
      },
    }).catch(() => 0)

    // Calculate unpaid students
    const unpaidStudents = totalStudents - paidStudents

    // Calculate SMS balance
    const smsBudget = school?.smsBudgetPerTerm || 0
    const smsBalance = Math.max(0, smsBudget - (smsSentThisTerm || 0))

    // Calculate attendance percentages
    const presentCount = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE
    ).length
    const absentCount = todayAttendance.filter(
      (a) => a.status === AttendanceStatus.ABSENT
    ).length
    const totalAttendanceRecords = todayAttendance.length

    const presentPercentage = totalAttendanceRecords > 0
      ? Math.round((presentCount / totalAttendanceRecords) * 100)
      : 0
    const absentPercentage = totalAttendanceRecords > 0
      ? Math.round((absentCount / totalAttendanceRecords) * 100)
      : 0

    // Calculate alerts
    const paymentOverdue = !school?.isActive
    const smsBalanceLow = smsBalance < 50
    
    // Term ending soon (within 14 days)
    let termEndingSoon = false
    let daysUntilTermEnd: number | undefined
    let termEndDate: string | undefined
    
    if (currentTerm?.endDate) {
      const termEnd = new Date(currentTerm.endDate)
      const diffTime = termEnd.getTime() - today.getTime()
      daysUntilTermEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      termEndingSoon = daysUntilTermEnd <= 14 && daysUntilTermEnd > 0
      termEndDate = currentTerm.endDate.toISOString()
    }

    // Get school features for subscription status
    // Requirement 14.3: Check if features are restricted for unpaid schools
    const schoolFeatures = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { 
        isActive: true, 
        features: true,
        licenseType: true 
      }
    })

    const features = schoolFeatures?.features as { 
      smsEnabled?: boolean
      advancedReporting?: boolean 
    } | null

    // Determine subscription status
    let subscriptionStatus: 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED' = 'ACTIVE'
    if (!schoolFeatures?.isActive) {
      subscriptionStatus = 'SUSPENDED'
    } else if (paymentOverdue) {
      subscriptionStatus = 'GRACE_PERIOD'
    }

    const smsEnabled = features?.smsEnabled !== false
    const reportsEnabled = features?.advancedReporting !== false
    const featuresRestricted = !smsEnabled || !reportsEnabled

    const data: DashboardOverviewData = {
      students: {
        total: totalStudents,
        paid: paidStudents,
        unpaid: unpaidStudents,
      },
      sms: {
        sentThisTerm: smsSentThisTerm || 0,
        balance: smsBalance,
      },
      attendance: {
        presentPercentage,
        absentPercentage,
        totalToday: totalAttendanceRecords,
        presentToday: presentCount,
        absentToday: absentCount,
      },
      alerts: {
        paymentOverdue,
        smsBalanceLow,
        termEndingSoon,
        termEndDate,
        daysUntilTermEnd,
      },
      subscription: {
        status: subscriptionStatus,
        featuresRestricted,
        smsEnabled,
        reportsEnabled,
      },
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching dashboard overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard overview data' },
      { status: 500 }
    )
  }
}
