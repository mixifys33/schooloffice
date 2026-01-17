/**
 * School SMS Credits API Route
 * Requirement 16.4: Add SMS credits to school balance
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/schools/[id]/sms-credits
 * Add SMS credits to a school's balance
 * Only accessible by Super Admin role
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { id: schoolId } = await params
    const body = await request.json()
    const { amount, reason } = body

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'amount is required' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 }
      )
    }

    // Verify school exists and get current budget
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { 
        id: true, 
        name: true, 
        smsBudgetPerTerm: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const previousBudget = school.smsBudgetPerTerm
    const newBudget = previousBudget + amount

    // Update school SMS budget
    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        smsBudgetPerTerm: newBudget,
      },
      select: {
        id: true,
        name: true,
        smsBudgetPerTerm: true,
      },
    })

    // Log the action
    if (session.user.id) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: session.user.id,
          action: 'ADD_SMS_CREDITS',
          resource: 'School',
          resourceId: schoolId,
          previousValue: { smsBudgetPerTerm: previousBudget },
          newValue: { 
            smsBudgetPerTerm: newBudget, 
            creditsAdded: amount,
            reason: reason || 'Manual credit addition',
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Added ${amount.toLocaleString()} UGX SMS credits to ${school.name}`,
      school: {
        id: updatedSchool.id,
        name: updatedSchool.name,
        previousBalance: previousBudget,
        creditsAdded: amount,
        newBalance: updatedSchool.smsBudgetPerTerm,
      },
    })
  } catch (error) {
    console.error('Error adding SMS credits:', error)
    return NextResponse.json(
      { error: 'Failed to add SMS credits' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/schools/[id]/sms-credits
 * Get SMS credit history for a school
 * Only accessible by Super Admin role
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { id: schoolId } = await params

    // Get school with current balance
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        smsBudgetPerTerm: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Get SMS credit addition history from audit logs
    const creditHistory = await prisma.auditLog.findMany({
      where: {
        schoolId,
        action: 'ADD_SMS_CREDITS',
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        id: true,
        timestamp: true,
        newValue: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    // Get SMS usage for current term
    const smsUsage = await prisma.sMSCostLog.aggregate({
      where: { schoolId },
      _sum: { cost: true },
      _count: true,
    })

    return NextResponse.json({
      schoolId: school.id,
      schoolName: school.name,
      currentBalance: school.smsBudgetPerTerm,
      totalUsed: smsUsage._sum.cost || 0,
      totalSmsSent: smsUsage._count || 0,
      remainingBalance: Math.max(0, school.smsBudgetPerTerm - (smsUsage._sum.cost || 0)),
      creditHistory: creditHistory.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        creditsAdded: (log.newValue as Record<string, unknown>)?.creditsAdded || 0,
        reason: (log.newValue as Record<string, unknown>)?.reason || 'Unknown',
        addedBy: log.user?.email || 'Unknown',
      })),
    })
  } catch (error) {
    console.error('Error getting SMS credits:', error)
    return NextResponse.json(
      { error: 'Failed to get SMS credits' },
      { status: 500 }
    )
  }
}
