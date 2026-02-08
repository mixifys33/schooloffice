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
    const dateRange = searchParams.get('dateRange') || 'this-month'
    const classFilter = searchParams.get('classFilter') || 'all'
    const term = searchParams.get('term') || 'current'

    // Get all students in the school
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'active'
      },
      include: {
        class: true,
        payments: true
      }
    })

    // Get fee structures
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId
      }
    })

    // Calculate overall metrics
    let totalExpected = 0
    let totalCollected = 0
    let totalStudents = students.length
    let fullyPaid = 0
    let partiallyPaid = 0
    let notPaid = 0

    // Calculate metrics per student
    students.forEach(student => {
      // Find fee structure for this student's class
      const feeStructure = feeStructures.find(fs => fs.classId === student.classId)
      const totalDue = feeStructure?.amount || 0
      
      // Calculate total payments for this student
      const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const balance = totalDue - totalPaid

      totalExpected += totalDue
      totalCollected += totalPaid

      // Count payment statuses
      if (balance === 0 && totalDue > 0) {
        fullyPaid++
      } else if (totalPaid > 0 && balance > 0) {
        partiallyPaid++
      } else if (totalDue > 0) {
        notPaid++
      }
    })

    const totalOutstanding = totalExpected - totalCollected
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0
    const studentsWithOutstandingFees = partiallyPaid + notPaid

    // Get payment methods breakdown
    const allPayments = await prisma.payment.findMany({
      where: {
        student: {
          schoolId: session.user.schoolId
        }
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

    // Get class breakdown
    const classBreakdown = await Promise.all(
      students.map(async (student) => {
        const feeStructure = feeStructures.find(fs => fs.classId === student.classId)
        const totalExpectedForClass = feeStructure?.amount || 0
        
        const totalPaidForClass = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const outstandingForClass = totalExpectedForClass - totalPaidForClass
        const collectionRateForClass = totalExpectedForClass > 0 ? (totalPaidForClass / totalExpectedForClass) * 100 : 0

        return {
          className: student.class?.name || 'Unknown',
          stream: student.class?.stream || null,
          totalExpected: totalExpectedForClass,
          totalCollected: totalPaidForClass,
          outstanding: outstandingForClass,
          collectionRate: collectionRateForClass
        }
      })
    )

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyPayments = await prisma.payment.groupBy({
      by: ['paymentDate'],
      where: {
        student: {
          schoolId: session.user.schoolId
        },
        paymentDate: {
          gte: sixMonthsAgo
        }
      },
      _sum: {
        amount: true
      }
    })

    // Group payments by month
    const monthlyTrendMap = new Map<string, { collected: number; outstanding: number }>()
    
    // Initialize months
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toLocaleString('default', { month: 'short' }).substring(0, 3)
      monthlyTrendMap.set(monthKey, { collected: 0, outstanding: 0 })
    }

    // Add collected amounts
    monthlyPayments.forEach(payment => {
      const month = new Date(payment.paymentDate).toLocaleString('default', { month: 'short' }).substring(0, 3)
      const current = monthlyTrendMap.get(month) || { collected: 0, outstanding: 0 }
      current.collected += payment._sum.amount || 0
      monthlyTrendMap.set(month, current)
    })

    const monthlyTrend = Array.from(monthlyTrendMap.entries()).map(([month, data]) => ({
      month,
      collected: data.collected,
      outstanding: data.outstanding
    }))

    return NextResponse.json({
      success: true,
      reportData: {
        totalExpected,
        totalCollected,
        totalOutstanding,
        collectionRate,
        studentsWithOutstandingFees,
        totalStudents,
        fullyPaid,
        partiallyPaid,
        notPaid,
        monthlyTrend,
        paymentMethods,
        classBreakdown
      }
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}