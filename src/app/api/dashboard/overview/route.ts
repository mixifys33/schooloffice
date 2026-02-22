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

    // Fetch all data in parallel with error handling and timeouts
    const queryTimeout = 25000 // 25 second timeout for database queries
    
    const [
      totalStudents,
      school,
      currentAcademicYear,
      currentTerm,
      todayAttendance,
    ] = await Promise.allSettled([
      // Total students
      Promise.race([
        prisma.student.count({
          where: { schoolId, status: 'ACTIVE' },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),
      // School details for SMS budget
      Promise.race([
        prisma.school.findUnique({
          where: { id: schoolId },
          select: { smsBudgetPerTerm: true, isActive: true, name: true },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),
      // Get current academic year
      Promise.race([
        (async () => {
          const today = new Date()
          const currentYear = new Date().getFullYear()
          
          let academicYear = await prisma.academicYear.findFirst({
            where: {
              schoolId,
              isCurrent: true
            }
          })

          if (!academicYear) {
            academicYear = await prisma.academicYear.findFirst({
              where: {
                schoolId,
                name: { contains: currentYear.toString() }
              },
              orderBy: { createdAt: 'desc' }
            })
          }

          if (!academicYear) {
            academicYear = await prisma.academicYear.findFirst({
              where: {
                schoolId,
                isActive: true
              },
              orderBy: { createdAt: 'desc' }
            })
          }

          if (!academicYear) {
            academicYear = await prisma.academicYear.findFirst({
              where: { schoolId },
              orderBy: { createdAt: 'desc' }
            })
          }

          return academicYear
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),
      // Current term - First get the active academic year for the school, then find the term
      Promise.race([
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
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),
      // Today's attendance
      Promise.race([
        prisma.attendance.findMany({
          where: {
            date: today,
            student: { schoolId },
          },
          distinct: ['studentId'],
          select: { studentId: true, status: true },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),
    ])

    // Extract values with fallbacks
    const totalStudentsCount = totalStudents.status === 'fulfilled' ? totalStudents.value : 0
    const schoolData = school.status === 'fulfilled' ? school.value : null
    const academicYearData = currentAcademicYear.status === 'fulfilled' ? currentAcademicYear.value : null
    const termData = currentTerm.status === 'fulfilled' ? currentTerm.value : null
    const attendanceData = todayAttendance.status === 'fulfilled' ? todayAttendance.value : []

    // Calculate paid/unpaid students based on actual payments
    let paidStudentsCount = 0
    let unpaidStudents = 0
    
    if (termData?.id && academicYearData?.id) {
      try {
        // Get all active students with their payments
        const studentsWithPayments = await prisma.student.findMany({
          where: {
            schoolId,
            status: 'ACTIVE'
          },
          include: {
            payments: {
              where: {
                termId: termData.id,
                status: 'CONFIRMED'
              }
            }
          }
        })

        // Get fee structures for the term
        const feeStructures = await prisma.feeStructure.findMany({
          where: {
            schoolId,
            termId: termData.id,
            isActive: true
          }
        })

        // Calculate paid vs unpaid
        for (const student of studentsWithPayments) {
          const feeStructure = feeStructures.find(fs => 
            fs.classId === student.classId && 
            fs.studentType === 'DAY'
          )

          const expectedFee = feeStructure?.totalAmount || 0
          const paidAmount = student.payments.reduce((sum, p) => sum + p.amount, 0)
          const balance = expectedFee - paidAmount

          if (balance <= 0 && expectedFee > 0) {
            paidStudentsCount++
          } else if (balance > 0) {
            unpaidStudents++
          }
        }
      } catch (error) {
        console.warn('Could not calculate paid/unpaid students:', error)
        unpaidStudents = totalStudentsCount
      }
    } else {
      unpaidStudents = totalStudentsCount
    }

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
