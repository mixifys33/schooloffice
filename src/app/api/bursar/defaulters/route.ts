import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface Defaulter {
  id: string
  studentId: string
  name: string
  className: string
  stream: string | null
  studentType: 'DAY' | 'BOARDING'
  totalDue: number
  totalPaid: number
  balance: number
  daysOverdue: number
  lastPaymentDate: string | null
  contactInfo: {
    parentName: string
    parentPhone: string
    parentEmail: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classFilter = searchParams.get('class')
    const severityFilter = searchParams.get('severity')
    const minBalance = searchParams.get('minBalance')
    const maxBalance = searchParams.get('maxBalance')
    const studentTypeFilter = searchParams.get('studentType')
    const sortBy = searchParams.get('sortBy') || 'balance'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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

    // Get all active students with their payments for current term
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'ACTIVE'
      },
      include: {
        class: true,
        stream: true,
        studentGuardians: {
          where: {
            isPrimary: true
          },
          include: {
            guardian: true
          },
          take: 1
        },
        payments: {
          where: {
            termId: currentTerm.id,
            status: 'CONFIRMED'
          },
          orderBy: { receivedAt: 'desc' }
        }
      }
    })

    // Get fee structures for current term
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId,
        termId: currentTerm.id,
        isActive: true
      }
    })

    // Get all unique classes for filtering
    const allClasses = await prisma.class.findMany({
      where: {
        schoolId: session.user.schoolId
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calculate defaulter data
    const defaulters = students
      .map((student): Defaulter | null => {
        // Find the appropriate fee structure for this student's class
        // Try to match with student type if available, otherwise default to DAY
        const studentType: 'DAY' | 'BOARDING' = 'DAY' // TODO: Add studentType field to Student model
        
        const feeStructure = feeStructures.find(fs => 
          fs.classId === student.classId && 
          fs.studentType === studentType
        )
        const totalDue = feeStructure?.totalAmount || 0
        
        // Calculate total payments for this student
        const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
        const balance = totalDue - totalPaid

        // Skip students with no balance or overpaid
        if (balance <= 0) return null

        // Calculate days overdue from term start date
        const termStartDate = currentTerm.startDate
        const daysOverdue = Math.floor(
          (Date.now() - termStartDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Get guardian contact info (primary guardian)
        const primaryGuardian = student.studentGuardians[0]?.guardian
        const contactInfo = {
          parentName: primaryGuardian 
            ? `${primaryGuardian.firstName || ''} ${primaryGuardian.lastName || ''}`.trim() || 'N/A'
            : 'N/A',
          parentPhone: primaryGuardian?.phone || 'N/A',
          parentEmail: primaryGuardian?.email || 'N/A'
        }

        return {
          id: student.id,
          studentId: student.id,
          name: `${student.firstName} ${student.lastName}`,
          className: student.class?.name || 'Unknown',
          stream: student.stream?.name || null,
          studentType,
          totalDue,
          totalPaid,
          balance,
          daysOverdue,
          lastPaymentDate: student.payments[0]?.receivedAt.toISOString() || null,
          contactInfo
        }
      })
      .filter((defaulter): defaulter is Defaulter => defaulter !== null)

    // Apply filters
    let filteredDefaulters = defaulters

    // Class filter - match by class ID or name
    if (classFilter && classFilter !== 'all') {
      filteredDefaulters = filteredDefaulters.filter(d => {
        const matchingClass = allClasses.find(c => c.id === classFilter)
        return matchingClass ? d.className === matchingClass.name : false
      })
    }

    // Student type filter (Day/Boarding)
    if (studentTypeFilter && studentTypeFilter !== 'all') {
      filteredDefaulters = filteredDefaulters.filter(d => 
        d.studentType === studentTypeFilter
      )
    }

    // Severity filter (days overdue)
    if (severityFilter && severityFilter !== 'all') {
      if (severityFilter === 'high') {
        filteredDefaulters = filteredDefaulters.filter(d => d.daysOverdue > 60)
      } else if (severityFilter === 'medium') {
        filteredDefaulters = filteredDefaulters.filter(d => d.daysOverdue > 30 && d.daysOverdue <= 60)
      } else if (severityFilter === 'low') {
        filteredDefaulters = filteredDefaulters.filter(d => d.daysOverdue <= 30)
      }
    }

    // Balance range filters
    if (minBalance) {
      const minBalanceNum = parseInt(minBalance)
      if (!isNaN(minBalanceNum)) {
        filteredDefaulters = filteredDefaulters.filter(d => d.balance >= minBalanceNum)
      }
    }

    if (maxBalance) {
      const maxBalanceNum = parseInt(maxBalance)
      if (!isNaN(maxBalanceNum)) {
        filteredDefaulters = filteredDefaulters.filter(d => d.balance <= maxBalanceNum)
      }
    }

    // Sorting
    filteredDefaulters.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'balance':
          comparison = a.balance - b.balance
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'className':
          comparison = a.className.localeCompare(b.className)
          break
        case 'daysOverdue':
          comparison = a.daysOverdue - b.daysOverdue
          break
        case 'totalDue':
          comparison = a.totalDue - b.totalDue
          break
        default:
          comparison = a.balance - b.balance
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return NextResponse.json({
      success: true,
      defaulters: filteredDefaulters,
      availableClasses: allClasses,
      currentTerm: {
        id: currentTerm.id,
        name: currentTerm.name,
        academicYear: currentAcademicYear.name
      },
      filters: {
        classFilter,
        severityFilter,
        minBalance,
        maxBalance,
        studentTypeFilter,
        sortBy,
        sortOrder
      }
    })
  } catch (error) {
    console.error('Error fetching defaulters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch defaulters' },
      { status: 500 }
    )
  }
}
