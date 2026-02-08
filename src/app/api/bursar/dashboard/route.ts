import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current-term'

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    })

    // Calculate revenue (total payments collected)
    const totalRevenue = await prisma.payment.aggregate({
      where: {
        student: {
          schoolId: session.user.schoolId
        },
        status: 'CONFIRMED',
        ...(currentTerm ? {
          receivedAt: {
            gte: currentTerm.startDate,
            lte: currentTerm.endDate
          }
        } : {})
      },
      _sum: {
        amount: true
      }
    })

    // Calculate expenses
    const totalExpenses = await prisma.expense.aggregate({
      where: {
        budgetCategory: {
          schoolId: session.user.schoolId
        },
        status: { in: ['APPROVED', 'PAID'] },
        ...(currentTerm ? {
          expenseDate: {
            gte: currentTerm.startDate,
            lte: currentTerm.endDate
          }
        } : {})
      },
      _sum: {
        amount: true
      }
    })

    // Calculate net income
    const netIncome = (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0)

    // Calculate total expected fees
    const studentAccounts = await prisma.studentAccount.findMany({
      where: {
        schoolId: session.user.schoolId
      }
    })

    const totalExpectedFees = studentAccounts.reduce((sum, account) => sum + account.totalFees, 0)
    const totalCollected = studentAccounts.reduce((sum, account) => sum + account.totalPaid, 0)
    const totalOutstanding = totalExpectedFees - totalCollected

    // Calculate collection rate
    const collectionRate = totalExpectedFees > 0 ? (totalCollected / totalExpectedFees) * 100 : 0

    // Count students with outstanding fees
    const studentsWithOutstandingFees = studentAccounts.filter(account => account.balance > 0).length
    const totalStudents = studentAccounts.length

    // Calculate cash flow (net income)
    const cashFlow = netIncome

    // Calculate budget variance
    const budgetCategories = await prisma.budgetCategory.findMany({
      where: {
        schoolId: session.user.schoolId
      }
    })

    let totalBudgeted = 0
    let totalSpent = 0
    budgetCategories.forEach(category => {
      totalBudgeted += category.budgetedAmount
      totalSpent += category.spentAmount
    })

    const budgetVariance = totalBudgeted > 0 ? ((totalSpent - totalBudgeted) / totalBudgeted) * 100 : 0

    // Get payment methods breakdown
    const allPayments = await prisma.payment.findMany({
      where: {
        student: {
          schoolId: session.user.schoolId
        },
        status: 'CONFIRMED',
        ...(currentTerm ? {
          receivedAt: {
            gte: currentTerm.startDate,
            lte: currentTerm.endDate
          }
        } : {})
      }
    })

    const paymentMethodsMap = new Map<string, { amount: number; count: number }>()
    allPayments.forEach(payment => {
      const method = payment.method
      const current = paymentMethodsMap.get(method) || { amount: 0, count: 0 }
      current.amount += payment.amount
      current.count++
      paymentMethodsMap.set(method, current)
    })

    const paymentMethods = Array.from(paymentMethodsMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      percentage: totalCollected > 0 ? (data.amount / totalCollected) * 100 : 0
    }))

    // Get monthly trend (last 6 months)
    const monthlyTrend = []
    const now = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthPayments = await prisma.payment.aggregate({
        where: {
          student: {
            schoolId: session.user.schoolId
          },
          receivedAt: {
            gte: monthStart,
            lte: monthEnd
          },
          status: 'CONFIRMED'
        },
        _sum: {
          amount: true
        }
      })

      // Calculate outstanding fees for this month
      const monthOutstanding = await prisma.studentAccount.aggregate({
        where: {
          schoolId: session.user.schoolId,
          createdAt: {
            lte: monthEnd
          }
        },
        _sum: {
          balance: true
        }
      })

      monthlyTrend.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        collected: monthPayments._sum.amount || 0,
        outstanding: monthOutstanding._sum.balance || 0
      })
    }

    // Get recent financial alerts
    const alerts = await prisma.budgetAlert.findMany({
      where: {
        schoolId: session.user.schoolId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      type: alert.isActive ? 'warning' : 'info',
      message: alert.message,
      timestamp: alert.createdAt.toISOString()
    }))

    // Also get payment-related alerts
    const paymentAlerts = await prisma.alert.findMany({
      where: {
        schoolId: session.user.schoolId,
        type: {
          in: ['WARNING', 'ERROR', 'INFO']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5 - formattedAlerts.length
    })

    const formattedPaymentAlerts = paymentAlerts.map(alert => ({
      id: alert.id,
      type: alert.type.toLowerCase() as 'warning' | 'error' | 'info',
      message: alert.message,
      timestamp: alert.createdAt.toISOString()
    }))

    const allAlerts = [...formattedAlerts, ...formattedPaymentAlerts].slice(0, 5)

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.amount || 0,
        totalExpenses: totalExpenses._sum.amount || 0,
        netIncome,
        collectionRate,
        outstandingFees: totalOutstanding,
        cashFlow,
        budgetVariance,
        studentsWithOutstandingFees,
        totalStudents,
        monthlyTrend,
        paymentMethods,
        alerts: allAlerts
      }
    })
  } catch (error) {
    console.error('Error fetching bursar dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bursar dashboard' },
      { status: 500 }
    )
  }
}