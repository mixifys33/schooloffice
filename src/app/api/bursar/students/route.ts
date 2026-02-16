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
    const termFilter = searchParams.get('term')

    // Get current active term (the one that includes today's date)
    const today = new Date()
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        academicYear: true
      }
    })

    // If no term matches today's date, get the most recent term that has started
    const fallbackTerm = !currentTerm ? await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        startDate: { lte: today }
      },
      include: {
        academicYear: true
      },
      orderBy: {
        startDate: 'desc'
      }
    }) : null

    const activeTerm = currentTerm || fallbackTerm

    console.log('Current term found:', activeTerm ? {
      id: activeTerm.id,
      name: activeTerm.name,
      academicYear: activeTerm.academicYear.name,
      startDate: activeTerm.startDate,
      endDate: activeTerm.endDate
    } : 'None')

    if (!activeTerm) {
      return NextResponse.json(
        { error: 'No active term found. Please create an academic year and term first.' },
        { status: 400 }
      )
    }

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
            termId: activeTerm.id
          },
          orderBy: { receivedAt: 'desc' }
        }
      }
    })

    console.log('Students found:', students.length)

    // Get all fee structures for the current term
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId,
        termId: activeTerm.id,
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
      currentTermId: activeTerm.id,
      matches: fs.termId === activeTerm.id,
      studentType: fs.studentType,
      totalAmount: fs.totalAmount
    })))

    // Process student data with financial information
    const processedStudents = students.map(student => {
      // Default to DAY if studentType is not set
      const studentType = student.studentType || 'DAY'
      
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
      if (balance === 0 && totalDue > 0) {
        paymentStatus = 'fully_paid'
      } else if (totalPaid > 0 && balance > 0) {
        paymentStatus = 'partially_paid'
      } else if (totalDue > 0 && totalPaid === 0) {
        paymentStatus = 'not_paid'
      }

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
        balance,
        lastPaymentDate: student.payments[0]?.receivedAt.toISOString() || null,
        paymentStatus,
        feeStructureId: feeStructure?.id || null,
        currentTerm: activeTerm.name,
        currentAcademicYear: activeTerm.academicYear.name
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
        id: activeTerm.id,
        name: activeTerm.name,
        academicYear: activeTerm.academicYear.name
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