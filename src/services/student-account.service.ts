/**
 * Student Account Service
 * Manages student financial accounts and balance calculations
 * Requirements: 2.1, 2.3, 2.4, 2.5, 2.7, 2.9
 * 
 * Property 1: Balance Calculation Invariant
 * For any student account, after any financial operation (payment, discount, penalty),
 * the balance SHALL equal: totalFees - totalPaid - totalDiscounts + totalPenalties
 */
import { prisma } from '@/lib/db'
import type {
  StudentAccount,
  StudentAccountDetails,
  BalanceBreakdown,
  StudentType,
  PaymentStatusCategory,
  PaymentRecord,
  StudentDiscount,
  StudentPenalty,
  Invoice,
} from '@/types/finance'

// Error codes for student account operations
export const STUDENT_ACCOUNT_ERRORS = {
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INVALID_STUDENT_TYPE: 'INVALID_STUDENT_TYPE',
  FEE_STRUCTURE_NOT_FOUND: 'FEE_STRUCTURE_NOT_FOUND',
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
 * Determine payment status category based on balance and payments
 * Property 15: Payment Status Categorization
 * - PAID: balance <= 0
 * - OVERPAID: balance < 0
 * - PARTIAL: totalPaid > 0 AND balance > 0
 * - UNPAID: totalPaid = 0 AND totalFees > 0
 */
export function determinePaymentStatus(
  totalFees: number,
  totalPaid: number,
  balance: number
): PaymentStatusCategory {
  if (balance < 0) return 'OVERPAID'
  if (balance <= 0) return 'PAID'
  if (totalPaid > 0 && balance > 0) return 'PARTIAL'
  if (totalPaid === 0 && totalFees > 0) return 'UNPAID'
  return 'UNPAID'
}

/**
 * Calculate balance using the invariant formula
 * Property 1: Balance Calculation Invariant
 * balance = totalFees - totalPaid - totalDiscounts + totalPenalties
 */
export function calculateBalanceFromComponents(
  totalFees: number,
  totalPaid: number,
  totalDiscounts: number,
  totalPenalties: number
): number {
  return totalFees - totalPaid - totalDiscounts + totalPenalties
}


/**
 * Get or create student account
 * Requirement 2.1: WHEN a student is enrolled, THE System SHALL automatically create a Student_Account
 */
export async function getOrCreateAccount(
  studentId: string,
  schoolId: string
): Promise<StudentAccount> {
  // Check if student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      stream: true,
      account: true,
    },
  })

  if (!student) {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found',
      { studentId }
    )
  }

  // If account exists, return it with calculated status
  if (student.account) {
    const paymentStatus = determinePaymentStatus(
      student.account.totalFees,
      student.account.totalPaid,
      student.account.balance
    )

    return {
      id: student.account.id,
      studentId: student.account.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class.name,
      streamName: student.stream?.name,
      studentType: student.account.studentType as StudentType,
      totalFees: student.account.totalFees,
      totalPaid: student.account.totalPaid,
      totalDiscounts: student.account.totalDiscounts,
      totalPenalties: student.account.totalPenalties,
      balance: student.account.balance,
      lastPaymentDate: student.account.lastPaymentDate?.toISOString(),
      lastPaymentAmount: student.account.lastPaymentAmount ?? undefined,
      paymentStatus,
      createdAt: student.account.createdAt.toISOString(),
      updatedAt: student.account.updatedAt.toISOString(),
    }
  }

  // Create new account with default values
  const newAccount = await prisma.studentAccount.create({
    data: {
      studentId,
      schoolId,
      studentType: 'DAY', // Default to DAY, can be changed later
      totalFees: 0,
      totalPaid: 0,
      totalDiscounts: 0,
      totalPenalties: 0,
      balance: 0,
    },
  })

  return {
    id: newAccount.id,
    studentId: newAccount.studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNumber: student.admissionNumber,
    className: student.class.name,
    streamName: student.stream?.name,
    studentType: newAccount.studentType as StudentType,
    totalFees: newAccount.totalFees,
    totalPaid: newAccount.totalPaid,
    totalDiscounts: newAccount.totalDiscounts,
    totalPenalties: newAccount.totalPenalties,
    balance: newAccount.balance,
    lastPaymentDate: undefined,
    lastPaymentAmount: undefined,
    paymentStatus: 'UNPAID',
    createdAt: newAccount.createdAt.toISOString(),
    updatedAt: newAccount.updatedAt.toISOString(),
  }
}


/**
 * Calculate current balance breakdown
 * Property 1: Balance Calculation Invariant
 * balance = totalFees - totalPaid - totalDiscounts + totalPenalties
 * 
 * Requirements: 2.3, 2.4, 2.5
 */
export async function calculateBalance(
  studentId: string,
  schoolId: string,
  termId?: string
): Promise<BalanceBreakdown> {
  // Get student with class info
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      account: true,
    },
  })

  if (!student) {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found',
      { studentId }
    )
  }

  // Get student type from account or default to DAY
  const studentType = student.account?.studentType || 'DAY'

  // Build term filter for queries
  const termFilter = termId ? { termId } : {}

  // Get applicable fee structure(s)
  const feeStructureWhere: Record<string, unknown> = {
    schoolId,
    classId: student.classId,
    studentType,
    isActive: true,
    ...termFilter,
  }

  const feeStructures = await prisma.feeStructure.findMany({
    where: feeStructureWhere,
  })

  // Sum total fees from all applicable fee structures
  const totalFees = feeStructures.reduce((sum, fs) => sum + fs.totalAmount, 0)

  // Get total confirmed payments
  const paymentsAggregate = await prisma.payment.aggregate({
    where: {
      studentId,
      schoolId,
      status: 'CONFIRMED',
      ...termFilter,
    },
    _sum: { amount: true },
  })
  const totalPaid = paymentsAggregate._sum.amount || 0

  // Get total approved discounts
  const discountsAggregate = await prisma.studentDiscount.aggregate({
    where: {
      studentAccount: { studentId, schoolId },
      status: 'APPROVED',
      ...termFilter,
    },
    _sum: { calculatedAmount: true },
  })
  const totalDiscounts = discountsAggregate._sum.calculatedAmount || 0

  // Get total non-waived penalties
  const penaltiesAggregate = await prisma.studentPenalty.aggregate({
    where: {
      studentAccount: { studentId, schoolId },
      isWaived: false,
      ...termFilter,
    },
    _sum: { amount: true },
  })
  const totalPenalties = penaltiesAggregate._sum.amount || 0

  // Calculate balance using the invariant formula (Property 1)
  const balance = calculateBalanceFromComponents(
    totalFees,
    totalPaid,
    totalDiscounts,
    totalPenalties
  )

  return {
    totalFees,
    totalPaid,
    totalDiscounts,
    totalPenalties,
    balance,
  }
}


/**
 * Update account balance (called after any financial operation)
 * Requirements: 2.3, 2.4, 2.5 - balance updates automatically and immediately
 * Property 1: Balance Calculation Invariant
 */
export async function updateBalance(
  studentId: string,
  schoolId: string,
  termId?: string
): Promise<StudentAccount> {
  // Calculate current balance
  const breakdown = await calculateBalance(studentId, schoolId, termId)

  // Get student info for response
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      stream: true,
      account: true,
    },
  })

  if (!student) {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found',
      { studentId }
    )
  }

  // Get last payment info
  const lastPayment = await prisma.payment.findFirst({
    where: {
      studentId,
      schoolId,
      status: 'CONFIRMED',
    },
    orderBy: { receivedAt: 'desc' },
  })

  // Get student type from existing account or default
  const studentType = student.account?.studentType || 'DAY'

  // Upsert student account with calculated values
  const updatedAccount = await prisma.studentAccount.upsert({
    where: {
      studentId_schoolId: { studentId, schoolId },
    },
    update: {
      totalFees: breakdown.totalFees,
      totalPaid: breakdown.totalPaid,
      totalDiscounts: breakdown.totalDiscounts,
      totalPenalties: breakdown.totalPenalties,
      balance: breakdown.balance,
      lastPaymentDate: lastPayment?.receivedAt,
      lastPaymentAmount: lastPayment?.amount,
    },
    create: {
      studentId,
      schoolId,
      studentType,
      totalFees: breakdown.totalFees,
      totalPaid: breakdown.totalPaid,
      totalDiscounts: breakdown.totalDiscounts,
      totalPenalties: breakdown.totalPenalties,
      balance: breakdown.balance,
      lastPaymentDate: lastPayment?.receivedAt,
      lastPaymentAmount: lastPayment?.amount,
    },
  })

  // Determine payment status
  const paymentStatus = determinePaymentStatus(
    updatedAccount.totalFees,
    updatedAccount.totalPaid,
    updatedAccount.balance
  )

  return {
    id: updatedAccount.id,
    studentId: updatedAccount.studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNumber: student.admissionNumber,
    className: student.class.name,
    streamName: student.stream?.name,
    studentType: updatedAccount.studentType as StudentType,
    totalFees: updatedAccount.totalFees,
    totalPaid: updatedAccount.totalPaid,
    totalDiscounts: updatedAccount.totalDiscounts,
    totalPenalties: updatedAccount.totalPenalties,
    balance: updatedAccount.balance,
    lastPaymentDate: updatedAccount.lastPaymentDate?.toISOString(),
    lastPaymentAmount: updatedAccount.lastPaymentAmount ?? undefined,
    paymentStatus,
    createdAt: updatedAccount.createdAt.toISOString(),
    updatedAt: updatedAccount.updatedAt.toISOString(),
  }
}


/**
 * Get account with full details including payment history, discounts, penalties, invoices
 * Requirement 2.2: display total fees, amount paid, balance, discounts, penalties, 
 * and payment history on a single screen
 * Requirement 2.6: show date, amount, method, reference, received by, and receipt number
 * Requirement 2.9: show account creation date and last transaction date
 */
export async function getAccountDetails(
  studentId: string,
  schoolId: string
): Promise<StudentAccountDetails> {
  // Get student with all related data
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      stream: true,
      account: {
        include: {
          discounts: {
            include: {
              discountRule: true,
            },
            orderBy: { appliedAt: 'desc' },
          },
          penalties: {
            include: {
              penaltyRule: true,
            },
            orderBy: { appliedAt: 'desc' },
          },
        },
      },
    },
  })

  if (!student) {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found',
      { studentId }
    )
  }

  // Ensure account exists
  const account = await getOrCreateAccount(studentId, schoolId)

  // Get payment history with receipt info (Requirement 2.6)
  const payments = await prisma.payment.findMany({
    where: {
      studentId,
      schoolId,
    },
    include: {
      receipt: true,
      term: true,
    },
    orderBy: { receivedAt: 'desc' },
  })

  // Get user names for receivedBy
  const userIds = [...new Set(payments.map((p) => p.receivedBy))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { staff: true },
  })
  const userMap = new Map(
    users.map((u) => [
      u.id,
      u.staff ? `${u.staff.firstName} ${u.staff.lastName}` : u.email,
    ])
  )

  // Map payments to PaymentRecord type
  const paymentHistory: PaymentRecord[] = payments.map((p) => ({
    id: p.id,
    schoolId: p.schoolId,
    studentId: p.studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNumber: student.admissionNumber,
    guardianId: p.guardianId ?? undefined,
    termId: p.termId,
    termName: p.term.name,
    amount: p.amount,
    method: p.method as PaymentRecord['method'],
    reference: p.reference,
    bankName: p.bankName ?? undefined,
    chequeNumber: p.chequeNumber ?? undefined,
    mobileNumber: p.mobileNumber ?? undefined,
    notes: p.notes ?? undefined,
    status: p.status as PaymentRecord['status'],
    receivedBy: p.receivedBy,
    receivedByName: userMap.get(p.receivedBy) || 'Unknown',
    receivedAt: p.receivedAt.toISOString(),
    receiptId: p.receiptId ?? undefined,
    receiptNumber: p.receipt?.receiptNumber,
    reversedBy: p.reversedBy ?? undefined,
    reversedAt: p.reversedAt?.toISOString(),
    reversalReason: p.reversalReason ?? undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  // Map discounts
  const discounts: StudentDiscount[] = (student.account?.discounts || []).map(
    (d) => ({
      id: d.id,
      studentAccountId: d.studentAccountId,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      discountRuleId: d.discountRuleId ?? undefined,
      discountRuleName: d.discountRule?.name,
      termId: d.termId,
      termName: '', // Will be populated if needed
      name: d.name,
      type: d.type as StudentDiscount['type'],
      value: d.value,
      calculatedAmount: d.calculatedAmount,
      reason: d.reason ?? undefined,
      status: d.status as StudentDiscount['status'],
      appliedBy: d.appliedBy,
      appliedAt: d.appliedAt.toISOString(),
      approvedBy: d.approvedBy ?? undefined,
      approvedAt: d.approvedAt?.toISOString(),
      rejectedBy: d.rejectedBy ?? undefined,
      rejectedAt: d.rejectedAt?.toISOString(),
      rejectionReason: d.rejectionReason ?? undefined,
    })
  )

  // Map penalties
  const penalties: StudentPenalty[] = (student.account?.penalties || []).map(
    (p) => ({
      id: p.id,
      studentAccountId: p.studentAccountId,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      penaltyRuleId: p.penaltyRuleId ?? undefined,
      penaltyRuleName: p.penaltyRule?.name,
      termId: p.termId,
      termName: '', // Will be populated if needed
      name: p.name,
      amount: p.amount,
      reason: p.reason ?? undefined,
      isWaived: p.isWaived,
      waivedBy: p.waivedBy ?? undefined,
      waivedAt: p.waivedAt?.toISOString(),
      waiverReason: p.waiverReason ?? undefined,
      appliedBy: p.appliedBy,
      appliedAt: p.appliedAt.toISOString(),
    })
  )

  // Get invoices
  const invoicesData = await prisma.invoice.findMany({
    where: {
      studentId,
      schoolId,
    },
    include: {
      items: true,
      feeStructure: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const invoices: Invoice[] = invoicesData.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    schoolId: inv.schoolId,
    studentId: inv.studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNumber: student.admissionNumber,
    guardianId: inv.guardianId ?? undefined,
    className: student.class.name,
    termId: inv.termId,
    termName: '', // Will be populated if needed
    feeStructureId: inv.feeStructureId,
    subtotal: inv.subtotal,
    discountAmount: inv.discountAmount,
    penaltyAmount: inv.penaltyAmount,
    totalAmount: inv.totalAmount,
    paidAmount: inv.paidAmount,
    balance: inv.balance,
    dueDate: inv.dueDate.toISOString(),
    status: inv.status as Invoice['status'],
    items: inv.items.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.description,
      category: item.category as Invoice['items'][0]['category'],
      amount: item.amount,
      isOptional: item.isOptional,
    })),
    issuedAt: inv.issuedAt?.toISOString(),
    issuedBy: inv.issuedBy ?? undefined,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  }))

  return {
    ...account,
    paymentHistory,
    discounts,
    penalties,
    invoices,
  }
}


/**
 * Change student type (triggers fee recalculation)
 * Requirement 2.7: WHEN the student type changes (day to boarding or vice versa), 
 * THE Student_Account SHALL recalculate fees based on the new fee structure
 * Property 13: Student Type Change Recalculation
 */
export async function changeStudentType(
  studentId: string,
  schoolId: string,
  newType: StudentType,
  userId: string
): Promise<StudentAccount> {
  // Validate student type
  if (newType !== 'DAY' && newType !== 'BOARDING') {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.INVALID_STUDENT_TYPE,
      'Invalid student type. Must be DAY or BOARDING',
      { newType }
    )
  }

  // Get student with account
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      stream: true,
      account: true,
    },
  })

  if (!student) {
    throw new StudentAccountError(
      STUDENT_ACCOUNT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found',
      { studentId }
    )
  }

  // Get previous type for audit
  const previousType = student.account?.studentType || 'DAY'

  // If type hasn't changed, just return current account
  if (previousType === newType) {
    return getOrCreateAccount(studentId, schoolId)
  }

  // Update student type in account
  await prisma.studentAccount.upsert({
    where: {
      studentId_schoolId: { studentId, schoolId },
    },
    update: {
      studentType: newType,
    },
    create: {
      studentId,
      schoolId,
      studentType: newType,
      totalFees: 0,
      totalPaid: 0,
      totalDiscounts: 0,
      totalPenalties: 0,
      balance: 0,
    },
  })

  // Log audit entry for student type change
  await prisma.financeAuditLog.create({
    data: {
      schoolId,
      userId,
      action: 'SETTINGS_UPDATED',
      resourceType: 'Settings',
      resourceId: studentId,
      previousValue: { studentType: previousType },
      newValue: { studentType: newType },
      reason: `Student type changed from ${previousType} to ${newType}`,
    },
  })

  // Recalculate balance with new fee structure (Property 13)
  const updatedAccount = await updateBalance(studentId, schoolId)

  return updatedAccount
}


/**
 * Get student account by ID
 */
export async function getAccountById(
  accountId: string,
  schoolId: string
): Promise<StudentAccount | null> {
  const account = await prisma.studentAccount.findFirst({
    where: {
      id: accountId,
      schoolId,
    },
    include: {
      student: {
        include: {
          class: true,
          stream: true,
        },
      },
    },
  })

  if (!account) {
    return null
  }

  const paymentStatus = determinePaymentStatus(
    account.totalFees,
    account.totalPaid,
    account.balance
  )

  return {
    id: account.id,
    studentId: account.studentId,
    studentName: `${account.student.firstName} ${account.student.lastName}`,
    admissionNumber: account.student.admissionNumber,
    className: account.student.class.name,
    streamName: account.student.stream?.name,
    studentType: account.studentType as StudentType,
    totalFees: account.totalFees,
    totalPaid: account.totalPaid,
    totalDiscounts: account.totalDiscounts,
    totalPenalties: account.totalPenalties,
    balance: account.balance,
    lastPaymentDate: account.lastPaymentDate?.toISOString(),
    lastPaymentAmount: account.lastPaymentAmount ?? undefined,
    paymentStatus,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  }
}

/**
 * List all student accounts for a school with optional filters
 */
export async function listAccounts(
  schoolId: string,
  filters?: {
    classId?: string
    studentType?: StudentType
    paymentStatus?: PaymentStatusCategory
    minBalance?: number
    maxBalance?: number
  }
): Promise<StudentAccount[]> {
  const where: Record<string, unknown> = { schoolId }

  if (filters?.studentType) {
    where.studentType = filters.studentType
  }

  if (filters?.minBalance !== undefined) {
    where.balance = { ...((where.balance as object) || {}), gte: filters.minBalance }
  }

  if (filters?.maxBalance !== undefined) {
    where.balance = { ...((where.balance as object) || {}), lte: filters.maxBalance }
  }

  // Build student filter for class
  if (filters?.classId) {
    where.student = { classId: filters.classId }
  }

  const accounts = await prisma.studentAccount.findMany({
    where,
    include: {
      student: {
        include: {
          class: true,
          stream: true,
        },
      },
    },
    orderBy: [
      { student: { class: { level: 'asc' } } },
      { student: { lastName: 'asc' } },
    ],
  })

  // Map and filter by payment status if needed
  let result = accounts.map((account) => {
    const paymentStatus = determinePaymentStatus(
      account.totalFees,
      account.totalPaid,
      account.balance
    )

    return {
      id: account.id,
      studentId: account.studentId,
      studentName: `${account.student.firstName} ${account.student.lastName}`,
      admissionNumber: account.student.admissionNumber,
      className: account.student.class.name,
      streamName: account.student.stream?.name,
      studentType: account.studentType as StudentType,
      totalFees: account.totalFees,
      totalPaid: account.totalPaid,
      totalDiscounts: account.totalDiscounts,
      totalPenalties: account.totalPenalties,
      balance: account.balance,
      lastPaymentDate: account.lastPaymentDate?.toISOString(),
      lastPaymentAmount: account.lastPaymentAmount ?? undefined,
      paymentStatus,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    }
  })

  // Filter by payment status if specified
  if (filters?.paymentStatus) {
    result = result.filter((a) => a.paymentStatus === filters.paymentStatus)
  }

  return result
}


/**
 * Bulk update balances for all students in a class
 * Used when fee structures change
 */
export async function bulkUpdateBalances(
  schoolId: string,
  classId: string,
  termId?: string
): Promise<{ updatedCount: number }> {
  // Get all students in the class
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      classId,
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  let updatedCount = 0

  // Update each student's balance
  for (const student of students) {
    await updateBalance(student.id, schoolId, termId)
    updatedCount++
  }

  return { updatedCount }
}

/**
 * Get account summary statistics for a school
 */
export async function getAccountSummary(
  schoolId: string,
  termId?: string
): Promise<{
  totalAccounts: number
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  byStatus: Record<PaymentStatusCategory, number>
}> {
  const accounts = await prisma.studentAccount.findMany({
    where: { schoolId },
  })

  const totalAccounts = accounts.length
  const totalExpected = accounts.reduce((sum, a) => sum + a.totalFees, 0)
  const totalCollected = accounts.reduce((sum, a) => sum + a.totalPaid, 0)
  const totalOutstanding = accounts.reduce(
    (sum, a) => sum + Math.max(0, a.balance),
    0
  )
  const collectionRate =
    totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0

  // Count by status
  const byStatus: Record<PaymentStatusCategory, number> = {
    PAID: 0,
    PARTIAL: 0,
    UNPAID: 0,
    OVERPAID: 0,
  }

  for (const account of accounts) {
    const status = determinePaymentStatus(
      account.totalFees,
      account.totalPaid,
      account.balance
    )
    byStatus[status]++
  }

  return {
    totalAccounts,
    totalExpected,
    totalCollected,
    totalOutstanding,
    collectionRate,
    byStatus,
  }
}

/**
 * Ensure all students have accounts (batch creation)
 * Useful for initial setup or after bulk student import
 */
export async function ensureAllStudentsHaveAccounts(
  schoolId: string
): Promise<{ createdCount: number; existingCount: number }> {
  // Get all active students without accounts
  const studentsWithoutAccounts = await prisma.student.findMany({
    where: {
      schoolId,
      status: 'ACTIVE',
      account: null,
    },
    select: { id: true },
  })

  let createdCount = 0

  // Create accounts for students without them
  for (const student of studentsWithoutAccounts) {
    await prisma.studentAccount.create({
      data: {
        studentId: student.id,
        schoolId,
        studentType: 'DAY',
        totalFees: 0,
        totalPaid: 0,
        totalDiscounts: 0,
        totalPenalties: 0,
        balance: 0,
      },
    })
    createdCount++
  }

  // Count existing accounts
  const existingCount = await prisma.studentAccount.count({
    where: { schoolId },
  })

  return {
    createdCount,
    existingCount: existingCount - createdCount,
  }
}

// Export all functions as a service object
export const StudentAccountService = {
  getOrCreateAccount,
  calculateBalance,
  updateBalance,
  getAccountDetails,
  changeStudentType,
  getAccountById,
  listAccounts,
  bulkUpdateBalances,
  getAccountSummary,
  ensureAllStudentsHaveAccounts,
  // Utility functions
  determinePaymentStatus,
  calculateBalanceFromComponents,
}

export default StudentAccountService
