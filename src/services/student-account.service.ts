/**
 * Student Account Service
 * Manages student financial accounts and balance calculations
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * 
 * Property 1: Balance Calculation Accuracy
 * For any student account, balance SHALL equal totalFees minus totalPaid plus totalPenalties minus totalDiscounts.
 * 
 * Property 2: Balance Update Atomicity
 * For any payment, discount, or penalty operation, the student balance update SHALL be atomic with the operation.
 */   
import { prisma } from '@/lib/db'
import type {
  StudentAccount,
  StudentAccountDetails,
  BalanceBreakdown,
  StudentAccountFilters,
  PaginatedStudentAccounts,
} from '@/types/finance'
import { FinanceAuditService } from './finance-audit.service'

// Error codes for student account operations
export const STUDENT_ACCOUNT_ERRORS = {
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INVALID_BALANCE: 'INVALID_BALANCE',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  CONCURRENT_UPDATE: 'CONCURRENT_UPDATE',
} as const

export class StudentAccountError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'StudentAccountError'
  }
}

/**
 * Calculate balance breakdown for a student account
 * Property 1: Balance Calculation Accuracy
 */
export function calculateBalance(
  totalFees: number,
  totalPaid: number,
  totalDiscounts: number,
  totalPenalties: number
): BalanceBreakdown {
  const netFees = totalFees - totalDiscounts + totalPenalties
  const balance = netFees - totalPaid
  
  return {
    totalFees,
    totalPaid,
    totalDiscounts,
    totalPenalties,
    netFees,
    balance,
    status: balance <= 0 ? 'PAID' : balance < netFees ? 'PARTIAL' : 'UNPAID',
    overpayment: balance < 0 ? Math.abs(balance) : 0,
  }
}

/**
 * Get or create student account for a term
 * Ensures every student has an account for financial tracking
 * PART 1.4: SERVICE LAYER ALIGNMENT - Always require termId
 */
export async function getOrCreateStudentAccount(
  studentId: string,
  termId: string
): Promise<StudentAccount> {
  // Verify term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.ACCOUNT_NOT_FOUND,
      'Term not found'
    );
  }

  // Try to find existing account
  let account = await prisma.studentAccount.findUnique({
    where: {
      studentId_termId: {
        studentId,
        termId,
      },
    },
  })

  if (!account) {
    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });

    if (!student) {
      throw new StudentAccountError(
        STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
        'Student not found'
      );
    }

    // Default to DAY student type
    // Student type can be updated later based on fee structure or enrollment data
    account = await prisma.studentAccount.create({
      data: {
        studentId,
        schoolId: student.schoolId,
        termId,
        studentType: 'DAY', // Default value
        totalFees: 0,
        totalPaid: 0,
        totalDiscounts: 0,
        totalPenalties: 0,
        balance: 0,
      },
    })

    // Log account creation - skip audit for system operations to avoid user lookup errors
    // Audit logging can be added later with proper system user handling
    // await FinanceAuditService.logAction({
    //   action: 'ACCOUNT_CREATED',
    //   entityType: 'STUDENT_ACCOUNT',
    //   entityId: account.id,
    //   details: { studentId, termId },
    //   userId: 'system',
    // })
  }

  return account
}

/**
 * Get detailed student account information with breakdown
 */
export async function getStudentAccountDetails(
  studentId: string,
  termId: string
): Promise<StudentAccountDetails> {
  const account = await getOrCreateStudentAccount(studentId, termId)
  
  // Get student information
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      stream: true,
    },
  })

  if (!student) {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found'
    )
  }

  // Get term information
  const term = await prisma.term.findUnique({
    where: { id: termId },
    include: { academicYear: true },
  })

  if (!term) {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
      'Term not found'
    )
  }

  // Calculate balance breakdown
  const breakdown = calculateBalance(
    account.totalFees,
    account.totalPaid,
    account.totalDiscounts,
    account.totalPenalties
  )

  // Get recent transactions
  const recentPayments = await prisma.payment.findMany({
    where: { studentId, termId },
    orderBy: { receivedAt: 'desc' },
    take: 5,
    include: {
      receipt: true,
    },
  })

  const recentDiscounts = await prisma.studentDiscount.findMany({
    where: { studentId, termId },
    orderBy: { appliedAt: 'desc' },
    take: 5,
    include: {
      discountRule: true,
    },
  })

  const recentPenalties = await prisma.studentPenalty.findMany({
    where: { studentId, termId },
    orderBy: { appliedAt: 'desc' },
    take: 5,
    include: {
      penaltyRule: true,
    },
  })

  return {
    account,
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNumber: student.admissionNumber,
      className: student.class?.name || '',
      streamName: student.stream?.name || '',
    },
    term: {
      id: term.id,
      name: term.name,
      academicYearName: term.academicYear.name,
      startDate: term.startDate.toISOString(),
      endDate: term.endDate.toISOString(),
    },
    breakdown,
    recentTransactions: {
      payments: recentPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        status: p.status,
        paymentDate: p.receivedAt.toISOString(),
        receiptNumber: p.receipt?.receiptNumber,
      })),
      discounts: recentDiscounts.map(d => ({
        id: d.id,
        amount: d.amount,
        reason: d.reason,
        status: d.status,
        appliedAt: d.appliedAt.toISOString(),
        discountRuleName: d.discountRule?.name,
      })),
      penalties: recentPenalties.map(p => ({
        id: p.id,
        amount: p.amount,
        reason: p.reason,
        status: p.status,
        appliedAt: p.appliedAt.toISOString(),
        penaltyRuleName: p.penaltyRule?.name,
      })),
    },
  }
}

/**
 * Update student account balance after payment
 * Property 2: Balance Update Atomicity
 */
export async function updateBalanceAfterPayment(
  studentId: string,
  termId: string,
  paymentAmount: number,
  userId: string
): Promise<StudentAccount> {
  return await prisma.$transaction(async (tx) => {
    // Get current account
    const account = await tx.studentAccount.findUnique({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
    })

    if (!account) {
      throw new StudentAccountError(
        STUDENT_ACCOUNT_ERRORS.ACCOUNT_NOT_FOUND,
        'Student account not found'
      )
    }

    // Calculate new balances
    const newTotalPaid = account.totalPaid + paymentAmount
    const newBalance = account.totalFees - newTotalPaid + account.totalPenalties - account.totalDiscounts

    // Update account
    const updatedAccount = await tx.studentAccount.update({
      where: { id: account.id },
      data: {
        totalPaid: newTotalPaid,
        balance: newBalance,
        updatedAt: new Date(),
      },
    })

    // Log balance update
    await FinanceAuditService.logAction({
      action: 'BALANCE_UPDATED',
      entityType: 'STUDENT_ACCOUNT',
      entityId: account.id,
      details: {
        studentId,
        termId,
        paymentAmount,
        previousBalance: account.balance,
        newBalance,
        previousTotalPaid: account.totalPaid,
        newTotalPaid,
      },
      userId,
    })

    return updatedAccount
  })
}

/**
 * Update student account balance after discount application
 */
export async function updateBalanceAfterDiscount(
  studentId: string,
  termId: string,
  discountAmount: number,
  userId: string
): Promise<StudentAccount> {
  return await prisma.$transaction(async (tx) => {
    const account = await tx.studentAccount.findUnique({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
    })

    if (!account) {
      throw new StudentAccountError(
        STUDENT_ACCOUNT_ERRORS.ACCOUNT_NOT_FOUND,
        'Student account not found'
      )
    }

    const newTotalDiscounts = account.totalDiscounts + discountAmount
    const newBalance = account.totalFees - account.totalPaid + account.totalPenalties - newTotalDiscounts

    const updatedAccount = await tx.studentAccount.update({
      where: { id: account.id },
      data: {
        totalDiscounts: newTotalDiscounts,
        balance: newBalance,
        updatedAt: new Date(),
      },
    })

    await FinanceAuditService.logAction({
      action: 'BALANCE_UPDATED',
      entityType: 'STUDENT_ACCOUNT',
      entityId: account.id,
      details: {
        studentId,
        termId,
        discountAmount,
        previousBalance: account.balance,
        newBalance,
        previousTotalDiscounts: account.totalDiscounts,
        newTotalDiscounts,
      },
      userId,
    })

    return updatedAccount
  })
}

/**
 * Update student account balance after penalty application
 */
export async function updateBalanceAfterPenalty(
  studentId: string,
  termId: string,
  penaltyAmount: number,
  userId: string
): Promise<StudentAccount> {
  return await prisma.$transaction(async (tx) => {
    const account = await tx.studentAccount.findUnique({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
    })

    if (!account) {
      throw new StudentAccountError(
        STUDENT_ACCOUNT_ERRORS.ACCOUNT_NOT_FOUND,
        'Student account not found'
      )
    }

    const newTotalPenalties = account.totalPenalties + penaltyAmount
    const newBalance = account.totalFees - account.totalPaid + newTotalPenalties - account.totalDiscounts

    const updatedAccount = await tx.studentAccount.update({
      where: { id: account.id },
      data: {
        totalPenalties: newTotalPenalties,
        balance: newBalance,
        updatedAt: new Date(),
      },
    })

    await FinanceAuditService.logAction({
      action: 'BALANCE_UPDATED',
      entityType: 'STUDENT_ACCOUNT',
      entityId: account.id,
      details: {
        studentId,
        termId,
        penaltyAmount,
        previousBalance: account.balance,
        newBalance,
        previousTotalPenalties: account.totalPenalties,
        newTotalPenalties,
      },
      userId,
    })

    return updatedAccount
  })
}

/**
 * Recalculate and update student account balance from scratch
 * Used for data consistency checks and corrections
 */
export async function recalculateStudentBalance(
  studentId: string,
  termId: string,
  userId: string
): Promise<StudentAccount> {
  return await prisma.$transaction(async (tx) => {
    // Get all fee structures for the student
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    })

    if (!student) {
      throw new StudentAccountError(
        STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
        'Student not found'
      )
    }

    const feeStructures = await tx.feeStructure.findMany({
      where: {
        classId: student.classId,
        termId,
        studentType: student.type,
        isActive: true,
      },
    })

    const totalFees = feeStructures.reduce((sum, fs) => sum + fs.totalAmount, 0)

    // Calculate total payments
    const payments = await tx.payment.findMany({
      where: {
        studentId,
        termId,
        status: 'CONFIRMED',
      },
    })

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

    // Get the student account ID first
    const studentAccount = await tx.studentAccount.findUnique({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
      select: { id: true },
    })

    if (!studentAccount) {
      throw new Error(`Student account not found for student ${studentId} and term ${termId}`)
    }

    // Calculate total discounts
    const discounts = await tx.studentDiscount.findMany({
      where: {
        studentAccountId: studentAccount.id,
        status: 'APPROVED',
      },
    })

    const totalDiscounts = discounts.reduce((sum, d) => sum + d.calculatedAmount, 0)

    // Calculate total penalties
    const penalties = await tx.studentPenalty.findMany({
      where: {
        studentAccountId: studentAccount.id,
        isWaived: false,
      },
    })

    const totalPenalties = penalties.reduce((sum, p) => sum + p.amount, 0)

    // Calculate balance
    const balance = totalFees - totalPaid + totalPenalties - totalDiscounts

    // Update or create account
    const updatedAccount = await tx.studentAccount.update({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
      data: {
        totalFees,
        totalPaid,
        totalDiscounts,
        totalPenalties,
        balance,
        updatedAt: new Date(),
      },
    })

    // Skip audit logging for system operations to avoid user lookup errors
    // await FinanceAuditService.logAction({
    //   action: 'BALANCE_RECALCULATED',
    //   entityType: 'STUDENT_ACCOUNT',
    //   entityId: updatedAccount.id,
    //   details: {
    //     studentId,
    //     termId,
    //     totalFees,
    //     totalPaid,
    //     totalDiscounts,
    //     totalPenalties,
    //     balance,
    //   },
    //   userId,
    // })

    return updatedAccount
  })
}

/**
 * List student accounts with filtering and pagination
 */
export async function listStudentAccounts(
  schoolId: string,
  filters: StudentAccountFilters = {},
  page: number = 1,
  limit: number = 50
): Promise<PaginatedStudentAccounts> {
  const offset = (page - 1) * limit

  // Build where clause
  const where: any = {
    student: { schoolId },
  }

  if (filters.termId) {
    where.termId = filters.termId
  }

  if (filters.classId) {
    where.student = { ...where.student, classId: filters.classId }
  }

  if (filters.balanceStatus) {
    switch (filters.balanceStatus) {
      case 'PAID':
        where.balance = { lte: 0 }
        break
      case 'PARTIAL':
        where.AND = [
          { balance: { gt: 0 } },
          { totalPaid: { gt: 0 } },
        ]
        break
      case 'UNPAID':
        where.totalPaid = 0
        break
      case 'OVERPAID':
        where.balance = { lt: 0 }
        break
    }
  }

  if (filters.minBalance !== undefined) {
    where.balance = { ...where.balance, gte: filters.minBalance }
  }

  if (filters.maxBalance !== undefined) {
    where.balance = { ...where.balance, lte: filters.maxBalance }
  }

  // Get total count
  const total = await prisma.studentAccount.count({ where })

  // Get accounts
  const accounts = await prisma.studentAccount.findMany({
    where,
    include: {
      student: {
        include: {
          class: true,
          stream: true,
        },
      },
      term: {
        include: {
          academicYear: true,
        },
      },
    },
    orderBy: filters.sortBy === 'balance' 
      ? { balance: filters.sortOrder || 'desc' }
      : { updatedAt: 'desc' },
    skip: offset,
    take: limit,
  })

  const items = accounts.map(account => ({
    ...account,
    breakdown: calculateBalance(
      account.totalFees,
      account.totalPaid,
      account.totalDiscounts,
      account.totalPenalties
    ),
    student: {
      id: account.student.id,
      firstName: account.student.firstName,
      lastName: account.student.lastName,
      admissionNumber: account.student.admissionNumber,
      className: account.student.class?.name || '',
      streamName: account.student.stream?.name || '',
    },
    term: {
      id: account.term.id,
      name: account.term.name,
      academicYearName: account.term.academicYear.name,
    },
  }))

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get account summary statistics for a school
 */
export async function getAccountSummary(
  schoolId: string,
  termId?: string
): Promise<{
  totalStudents: number
  totalFees: number
  totalPaid: number
  totalOutstanding: number
  collectionRate: number
  studentsWithOutstanding: number
  averageBalance: number
}> {
  const where: any = {
    student: { schoolId },
  }

  if (termId) {
    where.termId = termId
  }

  const accounts = await prisma.studentAccount.findMany({
    where,
    select: {
      totalFees: true,
      totalPaid: true,
      balance: true,
    },
  })

  const totalStudents = accounts.length
  const totalFees = accounts.reduce((sum, acc) => sum + acc.totalFees, 0)
  const totalPaid = accounts.reduce((sum, acc) => sum + acc.totalPaid, 0)
  const totalOutstanding = accounts.reduce((sum, acc) => sum + Math.max(0, acc.balance), 0)
  const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0
  const studentsWithOutstanding = accounts.filter(acc => acc.balance > 0).length
  const averageBalance = totalStudents > 0 ? totalOutstanding / totalStudents : 0

  return {
    totalStudents,
    totalFees,
    totalPaid,
    totalOutstanding,
    collectionRate,
    studentsWithOutstanding,
    averageBalance,
  }
}