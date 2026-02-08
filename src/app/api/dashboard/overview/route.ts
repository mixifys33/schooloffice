/**
 * School Admin Dashboard Overview API Route
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
      console.log('Dashboard API: No session found')
      return NextResponse.json({ error: 'Unauthorized', details: 'No valid session found' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('Dashboard API: No schoolId found for user:', session.user.email)
      return NextResponse.json({ 
        error: 'School ID not found', 
        details: 'User account is not associated with a school' 
      }, { status: 400 })
    }

    console.log(`Dashboard API: Fetching data for school ${schoolId}, user ${session.user.email}`)

    // Get today's date normalized to start of day
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch all data in parallel with error handling
    const [
      totalStudents,
      paidStudents,
      school,
      currentTerm,
      todayAttendance,
    ] = await Promise.allSettled([
      // Total students
      prisma.student.count({
        where: { schoolId, status: 'ACTIVE' },
      }),
      // Paid students (PAID pilot type)
      prisma.student.count({
        where: { schoolId, status: 'ACTIVE', pilotType: 'PAID' },
      }),
      // School details for SMS budget
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { smsBudgetPerTerm: true, isActive: true, name: true },
      }),
      // Current term - First get the active academic year for the school, then find the term
      (async () => {
        console.log(`🔍 [Dashboard Overview] Looking for active academic year for school: ${schoolId}`);
        const activeAcademicYear = await prisma.academicYear.findFirst({
          where: {
            schoolId,
            isActive: true,
          },
          select: { id: true, name: true },
        });
        
        if (!activeAcademicYear) {
          console.log(`⚠️ [Dashboard Overview] No active academic year found for school: ${schoolId}`);
          return null;
        }
        
        console.log(`✅ [Dashboard Overview] Found active academic year: ${activeAcademicYear.name} (${activeAcademicYear.id})`);
        console.log(`🔍 [Dashboard Overview] Looking for terms in academic year: ${activeAcademicYear.id}`);
        
        const termResult = await prisma.term.findFirst({
          where: {
            academicYearId: activeAcademicYear.id,
          },
          select: { 
            id: true, 
            name: true, 
            startDate: true, 
            endDate: true,
            academicYear: {
              select: {
                name: true
              }
            }
          },
        });
        
        if (termResult) {
          console.log(`✅ [Dashboard Overview] Found current term: ${termResult.name} (${termResult.id})`);
        } else {
          console.log(`⚠️ [Dashboard Overview] No terms found in academic year: ${activeAcademicYear.id}`);
        }
        
        return termResult;
      })(),
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

    // Extract values with fallbacks
    const totalStudentsCount = totalStudents.status === 'fulfilled' ? totalStudents.value : 0
    const paidStudentsCount = paidStudents.status === 'fulfilled' ? paidStudents.value : 0
    const schoolData = school.status === 'fulfilled' ? school.value : null
    const termData = currentTerm.status === 'fulfilled' ? currentTerm.value : null
    const attendanceData = todayAttendance.status === 'fulfilled' ? todayAttendance.value : []

    // SMS sent this term (with error handling)
    let smsSentThisTerm = 0
    try {
      if (termData?.startDate) {
        smsSentThisTerm = await prisma.message.count({
          where: {
            schoolId,
            createdAt: { gte: termData.startDate },
          },
        })
      }
    } catch (error) {
      console.warn('Could not fetch SMS count:', error)
    }

    // Calculate unpaid students
    const unpaidStudents = totalStudentsCount - paidStudentsCount

    // Calculate SMS balance
    const smsBudget = schoolData?.smsBudgetPerTerm || 0
    const smsBalance = Math.max(0, smsBudget - smsSentThisTerm)

    // Calculate attendance percentages
    const presentCount = attendanceData.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length
    const absentCount = attendanceData.filter(
      (a) => a.status === 'ABSENT'
    ).length
    const totalAttendanceRecords = attendanceData.length

    const presentPercentage = totalAttendanceRecords > 0
      ? Math.round((presentCount / totalAttendanceRecords) * 100)
      : 0
    const absentPercentage = totalAttendanceRecords > 0
      ? Math.round((absentCount / totalAttendanceRecords) * 100)
      : 0

    // Calculate alerts
    const paymentOverdue = !schoolData?.isActive
    const smsBalanceLow = smsBalance < 50
    
    // Term ending soon (within 14 days)
    let termEndingSoon = false
    let daysUntilTermEnd: number | undefined
    let termEndDate: string | undefined
    
    if (termData?.endDate) {
      const termEnd = new Date(termData.endDate)
      const diffTime = termEnd.getTime() - today.getTime()
      daysUntilTermEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      termEndingSoon = daysUntilTermEnd <= 14 && daysUntilTermEnd > 0
      termEndDate = termData.endDate.toISOString()
    }

    // Get school features for subscription status
    let schoolFeatures = null
    try {
      schoolFeatures = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { 
          isActive: true, 
          features: true,
          licenseType: true 
        }
      })
    } catch (error) {
      console.warn('Could not fetch school features:', error)
    }

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
        total: totalStudentsCount,
        paid: paidStudentsCount,
        unpaid: unpaidStudents,
      },
      sms: {
        sentThisTerm: smsSentThisTerm,
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

    // Add context data
    const responseData = {
      ...data,
      context: {
        schoolName: schoolData?.name || 'School Dashboard',
        currentTerm: termData?.name || 'Current Term',
        academicYear: termData?.academicYear?.name || new Date().getFullYear().toString(),
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching dashboard overview:', error)
    
    // Return a more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard overview data',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}
