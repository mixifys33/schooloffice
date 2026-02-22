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
    const dateRange = searchParams.get('dateRange') || 'this-term'
    const classFilter = searchParams.get('classFilter') || 'all'

    // Get current term using intelligent fallback
    const today = new Date()
    const currentYear = new Date().getFullYear()
    
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: session.user.schoolId,
        isCurrent: true
      }
    })

    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: { schoolId: session.user.schoolId },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      return NextResponse.json(
        { error: 'No academic year found' },
        { status: 400 }
      )
    }

    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today },
          endDate: { gte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: { academicYearId: currentAcademicYear.id },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      return NextResponse.json(
        { error: 'No term found' },
        { status: 400 }
      )
    }

    // Get all active students with their payments for the current term
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'ACTIVE',
        ...(classFilter !== 'all' && { classId: classFilter })
      },
      include: {
        class: true,
        stream: true,
        payments: {
          where: {
            termId: currentTerm.id,
            status: 'CONFIRMED'
          }
        }
      }
    })

    // Get fee structures for the current term
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId,
        termId: currentTerm.id,
        isActive: true
      },
      include: {
        class: true
      }
    })

    // Calculate overall metrics
    let totalExpected = 0
    let totalCollected = 0
    let totalOutstanding = 0
    const totalStudents = students.length
    let fullyPaid = 0
    let partiallyPaid = 0
    let notPaid = 0

    // Track class-level data
    const classDataMap = new Map<string, {
      className: string
      stream: string | null
      totalExpected: number
      totalCollected: number
      outstanding: number
      studentCount: number
    }>()

    // Calculate metrics per student
    students.forEach(student => {
      const feeStructure = feeStructures.find(fs => 
        fs.classId === student.classId && 
        fs.studentType === 'DAY'
      )
      
      const expectedFee = feeStructure?.totalAmount || 0
      const paidAmount = student.payments.reduce((sum, p) => sum + p.amount, 0)
      const balance = expectedFee - paidAmount

      totalExpected += expectedFee
      totalCollected += paidAmount
      
      // Only count positive balances as outstanding
      if (balance > 0) {
        totalOutstanding += balance
      }

      // Count payment statuses
      if (balance <= 0 && expectedFee > 0) {
        fullyPaid++
      } else if (paidAmount > 0 && balance > 0) {
        partiallyPaid++
      } else if (expectedFee > 0 && paidAmount === 0) {
        notPaid++
      }

      // Aggregate by class
      const classKey = `${student.classId}-${student.streamId || 'no-stream'}`
      const classData = classDataMap.get(classKey) || {
        className: student.class?.name || 'Unknown',
        stream: student.stream?.name || null,
        totalExpected: 0,
        totalCollected: 0,
        outstanding: 0,
        studentCount: 0
      }

      classData.totalExpected += expectedFee
      classData.totalCollected += paidAmount
      classData.outstanding += Math.max(0, balance)
      classData.studentCount++
      classDataMap.set(classKey, classData)
    })

    const collectionRate = totalExpected > 0 
      ? Math.min(100, (totalCollected / totalExpected) * 100) 
      : 0
    const studentsWithOutstandingFees = partiallyPaid + notPaid

    // Get payment methods breakdown for current term
    const paymentMethodsMap = new Map<string, { amount: number; count: number }>()
    
    students.forEach(student => {
      student.payments.forEach(payment => {
        const method = payment.method
        const current = paymentMethodsMap.get(method) || { amount: 0, count: 0 }
        current.amount += payment.amount
        current.count++
        paymentMethodsMap.set(method, current)
      })
    })

    const paymentMethods = Array.from(paymentMethodsMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      percentage: totalCollected > 0 ? (data.amount / totalCollected) * 100 : 0
    }))

    // Sort by amount descending
    paymentMethods.sort((a, b) => b.amount - a.amount)

    // Get class breakdown
    const classBreakdown = Array.from(classDataMap.values()).map(classData => ({
      className: classData.className,
      stream: classData.stream,
      totalExpected: classData.totalExpected,
      totalCollected: classData.totalCollected,
      outstanding: classData.outstanding,
      collectionRate: classData.totalExpected > 0 
        ? Math.min(100, (classData.totalCollected / classData.totalExpected) * 100)
        : 0
    }))

    // Sort by collection rate ascending (worst first)
    classBreakdown.sort((a, b) => a.collectionRate - b.collectionRate)

    // Get monthly trend for the current academic year
    const academicYearStart = currentAcademicYear.startDate || new Date(currentYear, 0, 1)
    
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'CONFIRMED',
        receivedAt: {
          gte: academicYearStart
        }
      },
      select: {
        receivedAt: true,
        amount: true
      }
    })

    // Group payments by month
    const monthlyTrendMap = new Map<string, { collected: number; outstanding: number }>()
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' })
      monthlyTrendMap.set(monthKey, { collected: 0, outstanding: 0 })
    }

    // Add collected amounts
    monthlyPayments.forEach(payment => {
      const monthKey = new Date(payment.receivedAt).toLocaleString('default', { month: 'short', year: 'numeric' })
      const current = monthlyTrendMap.get(monthKey)
      if (current) {
        current.collected += payment.amount
      }
    })

    // Calculate outstanding for each month (simplified: current outstanding divided by months)
    const monthlyOutstanding = totalOutstanding / 6
    monthlyTrendMap.forEach((value, key) => {
      value.outstanding = monthlyOutstanding
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
        classBreakdown,
        currentTerm: {
          id: currentTerm.id,
          name: currentTerm.name,
          academicYear: currentAcademicYear.name
        }
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