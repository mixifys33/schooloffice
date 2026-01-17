/**
 * Super Admin SMS Monitoring API Route
 * Requirements: 16.1, 16.2, 16.3, 16.4
 * - Display SMS sent per school, cost per school, total platform SMS balance
 * - Flag schools with usage exceeding 2x average
 * - Set daily SMS limit for flagged schools
 * - Add SMS credits to school balance
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LicenseType } from '@/types/enums'

export interface SchoolSMSUsage {
  schoolId: string
  schoolName: string
  schoolCode: string
  licenseType: string
  isActive: boolean
  smsSent: number
  smsCost: number
  smsBalance: number
  dailyLimit: number | null
  isAbnormal: boolean
  abnormalReason?: string
}

export interface SMSMonitoringData {
  summary: {
    totalPlatformSMSBalance: number
    totalSMSSent: number
    totalSMSCost: number
    averageSMSPerSchool: number
    schoolsWithAbnormalUsage: number
  }
  schools: SchoolSMSUsage[]
}

/**
 * GET /api/admin/sms-monitoring
 * Fetches SMS monitoring data for all schools
 * Only accessible by Super Admin role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    // Fetch all schools with their SMS data
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        licenseType: true,
        isActive: true,
        smsBudgetPerTerm: true,
      },
      orderBy: { name: 'asc' },
    })

    // Get SMS cost logs aggregated by school
    const smsCostBySchool = await prisma.sMSCostLog.groupBy({
      by: ['schoolId'],
      _sum: {
        cost: true,
      },
      _count: true,
    })

    // Get SMS budget usage for each school (current term)
    const smsBudgetUsage = await prisma.sMSBudgetUsage.findMany({
      select: {
        schoolId: true,
        usedAmount: true,
        smsCount: true,
        totalBudget: true,
        isPaused: true,
      },
    })

    // Create lookup maps
    const smsCostMap = new Map(
      smsCostBySchool.map(item => [
        item.schoolId,
        { cost: item._sum.cost || 0, count: item._count },
      ])
    )

    const budgetUsageMap = new Map(
      smsBudgetUsage.map(item => [item.schoolId, item])
    )

    // Calculate average SMS per school for anomaly detection
    const totalSMSSent = smsCostBySchool.reduce((sum, item) => sum + item._count, 0)
    const activeSchoolsCount = schools.filter(s => s.isActive).length
    const averageSMSPerSchool = activeSchoolsCount > 0 ? totalSMSSent / activeSchoolsCount : 0
    const abnormalThreshold = averageSMSPerSchool * 2 // 2x average is abnormal

    // Build school SMS usage data
    let schoolsWithAbnormalUsage = 0
    const schoolsData: SchoolSMSUsage[] = schools.map(school => {
      const smsData = smsCostMap.get(school.id) || { cost: 0, count: 0 }
      const budgetData = budgetUsageMap.get(school.id)
      
      const smsSent = budgetData?.smsCount || smsData.count
      const smsCost = budgetData?.usedAmount || smsData.cost
      const smsBalance = school.smsBudgetPerTerm - smsCost
      
      // Check for abnormal usage (Requirement 16.2)
      const isAbnormal = smsSent > abnormalThreshold && abnormalThreshold > 0
      if (isAbnormal) {
        schoolsWithAbnormalUsage++
      }

      return {
        schoolId: school.id,
        schoolName: school.name,
        schoolCode: school.code,
        licenseType: school.licenseType,
        isActive: school.isActive,
        smsSent,
        smsCost,
        smsBalance: Math.max(0, smsBalance),
        dailyLimit: null, // Will be fetched from school settings if implemented
        isAbnormal,
        abnormalReason: isAbnormal 
          ? `Usage (${smsSent}) exceeds 2x average (${Math.round(averageSMSPerSchool)})`
          : undefined,
      }
    })

    // Calculate totals
    const totalSMSCost = schoolsData.reduce((sum, s) => sum + s.smsCost, 0)
    const totalPlatformSMSBalance = schools.reduce((sum, s) => sum + s.smsBudgetPerTerm, 0) - totalSMSCost

    const data: SMSMonitoringData = {
      summary: {
        totalPlatformSMSBalance: Math.max(0, totalPlatformSMSBalance),
        totalSMSSent,
        totalSMSCost,
        averageSMSPerSchool: Math.round(averageSMSPerSchool),
        schoolsWithAbnormalUsage,
      },
      schools: schoolsData,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching SMS monitoring data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SMS monitoring data' },
      { status: 500 }
    )
  }
}
