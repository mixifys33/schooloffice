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
    const classFilter = searchParams.get('class')

    // Get current academic year with intelligent fallback
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: session.user.schoolId,
        isCurrent: true
      }
    })

    console.log('Current academic year (isCurrent=true):', currentAcademicYear ? {
      id: currentAcademicYear.id,
      name: currentAcademicYear.name,
      isCurrent: currentAcademicYear.isCurrent
    } : 'None found')

    // Intelligent fallback: Find academic year that matches current year or is active
    if (!currentAcademicYear) {
      const currentYear = new Date().getFullYear()
      
      // Try to find academic year with current year in the name
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log(`Fallback: Academic year matching ${currentYear}:`, currentAcademicYear ? {
        id: currentAcademicYear.id,
        name: currentAcademicYear.name
      } : 'None')
    }

    // Final fallback: Use isActive flag or most recent
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log('Fallback: Active academic year:', currentAcademicYear ? {
        id: currentAcademicYear.id,
        name: currentAcademicYear.name
      } : 'None')
    }

    // Last resort: Most recent academic year
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: { schoolId: session.user.schoolId },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log('Fallback: Most recent academic year:', currentAcademicYear ? {
        id: currentAcademicYear.id,
        name: currentAcademicYear.name
      } : 'None')
    }
      
    if (!currentAcademicYear) {
      return NextResponse.json(
        { 
          error: 'No academic year found. Please create an academic year in settings.',
          hasAcademicYears: false
        },
        { status: 400 }
      )
    }

    // Get current term with intelligent fallback
    const today = new Date()
    
    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      },
      include: {
        academicYear: true
      }
    })

    console.log('Current term (isCurrent=true):', currentTerm ? {
      id: currentTerm.id,
      name: currentTerm.name,
      isCurrent: currentTerm.isCurrent
    } : 'None found')

    // Intelligent fallback: Find term that includes today's date
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today },
          endDate: { gte: today }
        },
        include: {
          academicYear: true
        },
        orderBy: { startDate: 'desc' }
      })
      
      console.log('Fallback: Term containing today:', currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate
      } : 'None')
    }

    // Second fallback: Most recent term that has started
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today }
        },
        include: {
          academicYear: true
        },
        orderBy: { startDate: 'desc' }
      })
      
      console.log('Fallback: Most recent started term:', currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate
      } : 'None')
    }

    // Last resort: Most recent term regardless of dates
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: { academicYearId: currentAcademicYear.id },
        orderBy: { startDate: 'desc' },
        include: {
          academicYear: true
        }
      })
      
      console.log('Fallback: Most recent term:', currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name
      } : 'None')
    }
      
    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No term found. Please create a term in academic settings.',
          hasTerms: false,
          academicYearName: currentAcademicYear.name
        },
        { status: 400 }
      )
    }

    console.log('Using term:', {
      id: currentTerm.id,
      name: currentTerm.name,
      academicYear: currentTerm.academicYear.name,
      startDate: currentTerm.startDate,
      endDate: currentTerm.endDate,
      isCurrent: currentTerm.isCurrent
    })

    // Get all students in the school with their student accounts
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'ACTIVE'
      },
      include: {
        class: true,
        stream: true,
        studentAccounts: {
          where: {
            termId: currentTerm.id
          }
        }
      }
    })

    console.log('Students found:', students.length)
    console.log('Sample student account:', students[0] ? {
      name: `${students[0].firstName} ${students[0].lastName}`,
      hasAccount: students[0].studentAccounts.length > 0,
      account: students[0].studentAccounts[0] ? {
        totalFees: students[0].studentAccounts[0].totalFees,
        totalPaid: students[0].studentAccounts[0].totalPaid,
        balance: students[0].studentAccounts[0].balance,
        lastPaymentDate: students[0].studentAccounts[0].lastPaymentDate
      } : null
    } : 'No students')

    // Get all fee structures for the current term
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId,
        termId: currentTerm.id,
        isActive: true
      },
      include: {
        term: true,
        class: true
      }
    })

    console.log('Fee structures found for current term:', feeStructures.length)
    
    // Also check all fee structures regardless of term
    const allFeeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId,
        isActive: true
      },
      include: {
        term: true,
        class: true
      }
    })
    
    console.log('All active fee structures:', allFeeStructures.length)
    console.log('All fee structures details:', allFeeStructures.map(fs => ({
      className: fs.class.name,
      termName: fs.term.name,
      termId: fs.termId,
      currentTermId: currentTerm.id,
      matches: fs.termId === currentTerm.id,
      studentType: fs.studentType,
      totalAmount: fs.totalAmount
    })))

    // Process student data with financial information from StudentAccount
    const processedStudents = students.map(student => {
      // Get student account for current term
      const studentAccount = student.studentAccounts[0]
      
      let totalDue = 0
      let totalPaid = 0
      let balance = 0
      let lastPaymentDate: string | null = null
      
      if (studentAccount) {
        // Use StudentAccount data which is the single source of truth
        totalDue = studentAccount.totalFees
        totalPaid = studentAccount.totalPaid
        balance = studentAccount.balance
        lastPaymentDate = studentAccount.lastPaymentDate?.toISOString() || null
      } else {
        // Fallback: Get fee structure if no student account exists
        const studentType: 'DAY' | 'BOARDING' = 'DAY'
        const feeStructure = feeStructures.find(fs => 
          fs.classId === student.classId && 
          fs.studentType === studentType
        )
        totalDue = feeStructure?.totalAmount || 0
      }

      // Log for first student to debug
      if (students.indexOf(student) === 0) {
        console.log('First student debug:', {
          name: `${student.firstName} ${student.lastName}`,
          classId: student.classId,
          hasStudentAccount: !!studentAccount,
          studentAccountDetails: studentAccount ? {
            totalFees: studentAccount.totalFees,
            totalPaid: studentAccount.totalPaid,
            balance: studentAccount.balance,
            lastPaymentDate: studentAccount.lastPaymentDate
          } : null,
          totalDue,
          totalPaid,
          balance
        })
      }

      // Determine payment status based on balance and amount paid
      let paymentStatus: 'not_paid' | 'partially_paid' | 'fully_paid' = 'not_paid'
      if (balance <= 0 && totalDue > 0) {
        // Fully paid or overpaid
        paymentStatus = 'fully_paid'
      } else if (totalPaid > 0 && balance > 0) {
        // Partially paid (has paid something but still owes)
        paymentStatus = 'partially_paid'
      } else if (totalPaid === 0 && totalDue > 0) {
        // Not paid at all
        paymentStatus = 'not_paid'
      } else if (totalDue === 0) {
        // No fees assigned yet
        paymentStatus = 'fully_paid'
      }

      // For display purposes, show balance as 0 if overpaid (negative balance)
      const displayBalance = Math.max(0, balance)

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        classId: student.classId,
        className: student.class?.name || 'Unknown',
        stream: student.stream?.name || null,
        streamId: student.streamId,
        studentType: studentAccount?.studentType || 'DAY',
        status: student.status as 'active' | 'transferred' | 'left',
        totalDue,
        totalPaid,
        balance: displayBalance, // Show 0 instead of negative for overpaid
        actualBalance: balance, // Keep actual balance for internal calculations
        lastPaymentDate,
        paymentStatus,
        feeStructureId: studentAccount?.id || null,
        currentTerm: currentTerm.name,
        currentAcademicYear: currentTerm.academicYear.name
      }
    })

    // Apply filters
    let filteredStudents = processedStudents

    if (classFilter && classFilter !== 'all') {
      filteredStudents = filteredStudents.filter(s => s.classId === classFilter)
    }

    return NextResponse.json({
      success: true,
      students: filteredStudents,
      currentTerm: {
        id: currentTerm.id,
        name: currentTerm.name,
        academicYear: currentTerm.academicYear.name
      }
    })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}