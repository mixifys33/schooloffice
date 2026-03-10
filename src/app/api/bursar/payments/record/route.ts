import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Helper function to convert number to words
function convertToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

  if (amount === 0) return 'Zero Shillings'

  const num = Math.floor(amount)
  let words = ''

  if (num >= 1000000) {
    words += convertToWords(Math.floor(num / 1000000)) + ' Million '
    return words + convertToWords(num % 1000000)
  }

  if (num >= 1000) {
    words += convertToWords(Math.floor(num / 1000)) + ' Thousand '
    return words + convertToWords(num % 1000)
  }

  if (num >= 100) {
    words += ones[Math.floor(num / 100)] + ' Hundred '
    return words + convertToWords(num % 100)
  }

  if (num >= 20) {
    words += tens[Math.floor(num / 10)] + ' '
    return words + ones[num % 10] + ' Shillings'
  }

  if (num >= 10) {
    return teens[num - 10] + ' Shillings'
  }

  return ones[num] + ' Shillings'
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      studentId,
      amount,
      method,
      reference,
      bankName,
      chequeNumber,
      mobileNumber,
      notes,
      receivedAt
    } = body

    // Validate required fields
    if (!studentId || !amount || !method || !reference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get student to verify they exist and get their current term
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true
      }
    })

    if (!student || student.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Get current term using the same intelligent fallback as the students endpoint
    const today = new Date()
    const currentYear = new Date().getFullYear()
    
    // First, get current academic year with intelligent fallback
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: session.user.schoolId,
        isCurrent: true
      }
    })

    // Fallback: Find academic year that matches current year
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Fallback: Use isActive flag
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Last resort: Most recent academic year
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

    // Get current term with intelligent fallback
    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    // Fallback: Find term that includes today's date
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

    // Fallback: Most recent term that has started
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    // Last resort: Most recent term
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

    console.log('Payment recording - Using term:', {
      id: currentTerm.id,
      name: currentTerm.name,
      academicYearId: currentAcademicYear.id,
      academicYearName: currentAcademicYear.name
    })

    // Get fee structure for this student's class and term
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        schoolId: session.user.schoolId,
        classId: student.classId,
        termId: currentTerm.id,
        isActive: true
      }
    })

    // Calculate current balance
    const existingPayments = await prisma.payment.aggregate({
      where: {
        studentId,
        termId: currentTerm.id,
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    })

    const totalDue = feeStructure?.totalAmount || 0
    const totalPaid = existingPayments._sum.amount || 0
    const balanceBefore = totalDue - totalPaid
    const balanceAfter = balanceBefore - parseFloat(amount)

    // Check for overpayment
    const isOverpayment = balanceAfter < 0
    const overpaymentAmount = isOverpayment ? Math.abs(balanceAfter) : 0

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        schoolId: session.user.schoolId,
        studentId,
        termId: currentTerm.id,
        amount: parseFloat(amount),
        method,
        reference,
        bankName: bankName || null,
        chequeNumber: chequeNumber || null,
        mobileNumber: mobileNumber || null,
        notes: isOverpayment 
          ? `${notes || ''} [OVERPAYMENT: ${overpaymentAmount.toFixed(2)} - Credit added to student balance]`.trim()
          : notes || null,
        status: 'CONFIRMED',
        receivedBy: session.user.id!,
        receivedAt: new Date(receivedAt)
      }
    })

    console.log('Payment created:', {
      id: payment.id,
      studentId: payment.studentId,
      termId: payment.termId,
      amount: payment.amount,
      status: payment.status,
      receivedAt: payment.receivedAt
    })

    // If overpayment, add to student credit balance
    if (isOverpayment) {
      const currentStudent = await prisma.student.findUnique({
        where: { id: studentId },
        select: { creditBalance: true }
      })

      const newCreditBalance = (currentStudent?.creditBalance || 0) + overpaymentAmount

      await prisma.student.update({
        where: { id: studentId },
        data: { creditBalance: newCreditBalance }
      })

      // Record credit transaction
      await prisma.creditTransaction.create({
        data: {
          schoolId: session.user.schoolId,
          studentId,
          amount: overpaymentAmount,
          type: 'OVERPAYMENT',
          description: `Overpayment from payment ${reference}. Amount: ${overpaymentAmount.toFixed(2)}`,
          paymentId: payment.id,
          balanceBefore: currentStudent?.creditBalance || 0,
          balanceAfter: newCreditBalance,
          createdBy: session.user.id!
        }
      })
    }

    // Get issuer name from staff profile
    const issuer = await prisma.staff.findFirst({
      where: { userId: session.user.id! },
      select: { 
        firstName: true,
        lastName: true
      }
    })

    const issuerName = issuer 
      ? `${issuer.firstName} ${issuer.lastName}`.trim()
      : session.user.email || 'System'

    // Convert amount to words (simple implementation)
    const amountInWords = convertToWords(parseFloat(amount))

    // Create receipt with all required fields
    const receipt = await prisma.receipt.create({
      data: {
        schoolId: session.user.schoolId,
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.class.name,
        termName: currentTerm.name,
        receiptNumber: `RCP-${Date.now()}`,
        amount: parseFloat(amount),
        amountInWords,
        method,
        reference,
        balanceBefore,
        balanceAfter: balanceAfter < 0 ? 0 : balanceAfter, // Don't show negative balance
        issuedBy: session.user.id!,
        issuedByName: issuerName,
        issuedAt: new Date(receivedAt)
      }
    })

    // Link payment to receipt
    await prisma.payment.update({
      where: { id: payment.id },
      data: { receiptId: receipt.id }
    })

    // Update StudentAccount with the new payment
    // This is critical - StudentAccount is the single source of truth for payment data
    const studentAccount = await prisma.studentAccount.findUnique({
      where: {
        studentId_termId: {
          studentId,
          termId: currentTerm.id
        }
      }
    })

    if (studentAccount) {
      // Update existing student account
      const newTotalPaid = studentAccount.totalPaid + parseFloat(amount)
      const newBalance = studentAccount.totalFees - newTotalPaid

      await prisma.studentAccount.update({
        where: {
          studentId_termId: {
            studentId,
            termId: currentTerm.id
          }
        },
        data: {
          totalPaid: newTotalPaid,
          balance: newBalance,
          lastPaymentDate: new Date(receivedAt),
          lastPaymentAmount: parseFloat(amount),
          status: newBalance <= 0 ? 'OK' : (newBalance > studentAccount.totalFees * 0.5 ? 'OVERDUE' : 'OK')
        }
      })

      console.log('StudentAccount updated:', {
        studentId,
        termId: currentTerm.id,
        totalPaid: newTotalPaid,
        balance: newBalance,
        lastPaymentDate: new Date(receivedAt)
      })
    } else {
      // Create student account if it doesn't exist
      const totalFees = feeStructure?.totalAmount || 0
      const newTotalPaid = parseFloat(amount)
      const newBalance = totalFees - newTotalPaid

      await prisma.studentAccount.create({
        data: {
          studentId,
          schoolId: session.user.schoolId,
          termId: currentTerm.id,
          studentType: 'DAY', // Default, should be determined from student data
          totalFees,
          totalPaid: newTotalPaid,
          balance: newBalance,
          lastPaymentDate: new Date(receivedAt),
          lastPaymentAmount: parseFloat(amount),
          status: newBalance <= 0 ? 'OK' : (newBalance > totalFees * 0.5 ? 'OVERDUE' : 'OK')
        }
      })

      console.log('StudentAccount created:', {
        studentId,
        termId: currentTerm.id,
        totalFees,
        totalPaid: newTotalPaid,
        balance: newBalance
      })
    }

    return NextResponse.json({
      success: true,
      payment,
      receipt,
      overpayment: isOverpayment ? {
        amount: overpaymentAmount,
        message: `Student has overpaid by ${overpaymentAmount.toFixed(2)}. This will be credited to the next term.`,
        balanceAfter: balanceAfter
      } : null,
      balanceInfo: {
        totalDue,
        totalPaid: totalPaid + parseFloat(amount),
        balanceBefore,
        balanceAfter: balanceAfter < 0 ? 0 : balanceAfter,
        status: balanceAfter <= 0 ? 'FULLY_PAID' : 'PARTIAL'
      }
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
