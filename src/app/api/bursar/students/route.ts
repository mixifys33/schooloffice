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

    // Get all students in the school
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'ACTIVE'
      },
      include: {
        class: true,
        stream: true,
        payments: {
          where: {
            termId: currentTerm.id
          },
          orderBy: { receivedAt: 'desc' }
        }
      }
    })

    console.log('Students found:', students.length)
    console.log('Sample student payments:', students[0] ? {
      name: `${students[0].firstName} ${students[0].lastName}`,
      paymentsCount: students[0].payments.length,
      payments: students[0].payments.map(p => ({
        amount: p.amount,
        termId: p.termId,
        receivedAt: p.receivedAt
      }))
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

    // Process student data with financial information
    const processedStudents = students.map(student => {
      // Determine student type based on available data
      // TODO: Add a studentType field to Student model or determine from other fields
      // For now, default to DAY
      const studentType: 'DAY' | 'BOARDING' = 'DAY'
      
      // Find the fee structure for this student's class and student type
      const feeStructure = feeStructures.find(fs => 
        fs.classId === student.classId && 
        fs.studentType === studentType
      )

      const totalDue = feeStructure?.totalAmount || 0
      
      // Calculate total payments for this student for current term
      const totalPaid = student.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const balance = totalDue - totalPaid

      // Log for first student to debug
      if (students.indexOf(student) === 0) {
        console.log('First student debug:', {
          name: `${student.firstName} ${student.lastName}`,
          classId: student.classId,
          studentType: studentType,
          feeStructureFound: !!feeStructure,
          feeStructureDetails: feeStructure ? {
            id: feeStructure.id,
            classId: feeStructure.classId,
            termId: feeStructure.termId,
            studentType: feeStructure.studentType,
            totalAmount: feeStructure.totalAmount
          } : null,
          totalDue,
          totalPaid,
          balance
        })
      }

      // Determine payment status
      let paymentStatus: 'not_paid' | 'partially_paid' | 'fully_paid' = 'not_paid'
      if (balance <= 0 && totalDue > 0) {
        // Fully paid or overpaid
        paymentStatus = 'fully_paid'
      } else if (totalPaid > 0 && balance > 0) {
        paymentStatus = 'partially_paid'
      } else if (totalDue > 0 && totalPaid === 0) {
        paymentStatus = 'not_paid'
      }

      // For display purposes, show balance as 0 if overpaid (negative balance)
      // The actual overpayment is tracked in creditBalance
      const displayBalance = Math.max(0, balance)

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        classId: student.classId,
        className: student.class?.name || 'Unknown',
        stream: student.stream?.name || null,
        streamId: student.streamId,
        studentType: studentType,
        status: student.status as 'active' | 'transferred' | 'left',
        totalDue,
        totalPaid,
        balance: displayBalance, // Show 0 instead of negative
        actualBalance: balance, // Keep actual balance for internal calculations
        lastPaymentDate: student.payments[0]?.receivedAt.toISOString() || null,
        paymentStatus,
        feeStructureId: feeStructure?.id || null,
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