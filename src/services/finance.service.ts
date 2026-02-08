/**
 * Finance Service
 * Core business logic for finance operations
 * 
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7
 * 
 * Property 4: Payment Recording Completeness
 * For any successfully recorded payment, the system SHALL have created:
 * (1) a Payment record, (2) an immutable Receipt with unique number,
 * (3) an updated StudentAccount balance, and (4) a FinanceAuditLog entry.
 * 
 * Property 5: Payment Date Validation
 * For any payment recording attempt with a future date, the system SHALL reject the payment.
 * 
 * Property 6: Payment Immutability
 * For any confirmed payment, direct modification of amount, method, or reference SHALL be rejected.
 * Corrections SHALL only be possible through reversal.
 * 
 * Property 7: Reversal Audit Trail
 * For any payment reversal, the system SHALL create an audit entry containing the original
 * payment details, reversal reason, and user who performed the reversal.
 */
import { prisma } from '@/lib/db'
import type { PaymentMethod, PaymentRecord, PaymentResult, PaymentFilters, PaginatedPayments } from '@/types/finance'
import { ReceiptService, type GenerateReceiptInput } from './receipt.service'
import { FinanceAuditService } from './finance-audit.service'
import { updateBalanceAfterPayment } from './student-account.service'

// Error codes for payment operations
export const PAYMENT_ERRORS = {
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_FUTURE_DATE: 'PAYMENT_FUTURE_DATE',
  PAYMENT_INVALID_AMOUNT: 'PAYMENT_INVALID_AMOUNT',
  PAYMENT_MISSING_FIELDS: 'PAYMENT_MISSING_FIELDS',
  PAYMENT_ALREADY_REVERSED: 'PAYMENT_ALREADY_REVERSED',
  PAYMENT_IMMUTABLE: 'PAYMENT_IMMUTABLE',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  TERM_NOT_FOUND: 'TERM_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  REVERSAL_NOT_AUTHORIZED: 'REVERSAL_NOT_AUTHORIZED',
} as const

export class PaymentError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}

// Number to words conversion for receipts
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  if (num < 0) return 'Negative ' + numberToWords(-num)
  let words = ''
  if (Math.floor(num / 1000000) > 0) {
    words += numberToWords(Math.floor(num / 1000000)) + ' Million '
    num %= 1000000
  }
  if (Math.floor(num / 1000) > 0) {
    words += numberToWords(Math.floor(num / 1000)) + ' Thousand '
    num %= 1000
  }
  if (Math.floor(num / 100) > 0) {
    words += numberToWords(Math.floor(num / 100)) + ' Hundred '
    num %= 100
  }
  if (num > 0) {
    if (words !== '') words += 'and '
    if (num < 20) words += ones[num]
    else {
      words += tens[Math.floor(num / 10)]
      if (num % 10 > 0) words += '-' + ones[num % 10]
    }
  }
  return words.trim()
}

export function amountToWords(amount: number, currency: string = 'Shillings'): string {
  const whole = Math.floor(amount)
  return `${numberToWords(whole)} ${currency} Only`
}

export async function generateReceiptNumber(schoolId: string): Promise<string> {
  const settings = await prisma.financeSettings.findUnique({ where: { schoolId } })
  const prefix = settings?.receiptPrefix || 'RCP'
  const year = new Date().getFullYear()
  const nextNumber = settings?.nextReceiptNumber || 1
  await prisma.financeSettings.upsert({
    where: { schoolId },
    update: { nextReceiptNumber: nextNumber + 1 },
    create: { schoolId, nextReceiptNumber: nextNumber + 1 },
  })
  return `${prefix}-${year}-${String(nextNumber).padStart(6, '0')}`
}

export async function generateInvoiceNumber(schoolId: string): Promise<string> {
  const settings = await prisma.financeSettings.findUnique({ where: { schoolId } })
  const prefix = settings?.invoicePrefix || 'INV'
  const year = new Date().getFullYear()
  const nextNumber = settings?.nextInvoiceNumber || 1
  await prisma.financeSettings.upsert({
    where: { schoolId },
    update: { nextInvoiceNumber: nextNumber + 1 },
    create: { schoolId, nextInvoiceNumber: nextNumber + 1 },
  })
  return `${prefix}-${year}-${String(nextNumber).padStart(6, '0')}`
}


export async function getOrCreateStudentAccount(studentId: string, schoolId: string) {
  let account = await prisma.studentAccount.findUnique({
    where: { studentId_schoolId: { studentId, schoolId } },
  })
  if (!account) {
    account = await prisma.studentAccount.create({
      data: { studentId, schoolId, balance: 0 },
    })
  }
  return account
}

export async function calculateStudentBalance(studentId: string, schoolId: string, termId?: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  })
  if (!student) throw new Error('Student not found')

  const feeStructure = await prisma.feeStructure.findFirst({
    where: {
      schoolId,
      classId: student.classId,
      ...(termId ? { termId } : {}),
      isActive: true,
    },
    include: { items: true },
  })
  const totalFees = feeStructure?.totalAmount || 0

  const payments = await prisma.payment.aggregate({
    where: {
      studentId,
      schoolId,
      ...(termId ? { termId } : {}),
      status: 'CONFIRMED',
    },
    _sum: { amount: true },
  })
  const totalPaid = payments._sum.amount || 0

  const account = await prisma.studentAccount.findUnique({
    where: { studentId_schoolId: { studentId, schoolId } },
    include: {
      discounts: { where: { status: 'APPROVED', ...(termId ? { termId } : {}) } },
      penalties: { where: { isWaived: false, ...(termId ? { termId } : {}) } },
    },
  })

  const totalDiscounts = account?.discounts.reduce((sum, d) => sum + d.calculatedAmount, 0) || 0
  const totalPenalties = account?.penalties.reduce((sum, p) => sum + p.amount, 0) || 0
  const balance = totalFees - totalPaid - totalDiscounts + totalPenalties

  return { totalFees, totalPaid, totalDiscounts, totalPenalties, balance }
}

export async function updateStudentAccountBalance(studentId: string, schoolId: string, termId?: string) {
  const { totalFees, totalPaid, totalDiscounts, totalPenalties, balance } = 
    await calculateStudentBalance(studentId, schoolId, termId)

  const lastPayment = await prisma.payment.findFirst({
    where: { studentId, schoolId, status: 'CONFIRMED' },
    orderBy: { receivedAt: 'desc' },
  })

  await prisma.studentAccount.upsert({
    where: { studentId_schoolId: { studentId, schoolId } },
    update: {
      totalFees, totalPaid, totalDiscounts, totalPenalties, balance,
      lastPaymentDate: lastPayment?.receivedAt,
      lastPaymentAmount: lastPayment?.amount,
    },
    create: {
      studentId, schoolId, totalFees, totalPaid, totalDiscounts, totalPenalties, balance,
      lastPaymentDate: lastPayment?.receivedAt,
      lastPaymentAmount: lastPayment?.amount,
    },
  })

  return { totalFees, totalPaid, totalDiscounts, totalPenalties, balance }
}


/**
 * Input type for recording a payment
 * Requirement 4.1: Payment SHALL require date, amount, method, reference, and received-by fields
 */
export interface RecordPaymentInput {
  schoolId: string
  studentId: string
  guardianId?: string
  termId: string
  amount: number
  method: PaymentMethod
  reference: string
  bankName?: string
  chequeNumber?: string
  mobileNumber?: string
  notes?: string
  receivedBy: string
  receivedByName: string
  receivedAt: Date
}

/**
 * Validate payment date is not in the future
 * Property 5: Payment Date Validation
 * Requirement 4.7: System SHALL prevent future dates
 */
export function validatePaymentDate(receivedAt: Date): void {
  const now = new Date()
  // Set time to end of day for comparison (allow same-day payments)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  
  if (receivedAt > endOfToday) {
    throw new PaymentError(
      PAYMENT_ERRORS.PAYMENT_FUTURE_DATE,
      'Payment date cannot be in the future',
      { receivedAt: receivedAt.toISOString(), currentDate: now.toISOString() }
    )
  }
}

/**
 * Validate required payment fields
 * Requirement 4.1: Payment SHALL require date, amount, method, reference, and received-by fields
 */
export function validatePaymentFields(data: RecordPaymentInput): void {
  const missingFields: string[] = []
  
  if (!data.schoolId) missingFields.push('schoolId')
  if (!data.studentId) missingFields.push('studentId')
  if (!data.termId) missingFields.push('termId')
  if (data.amount === undefined || data.amount === null) missingFields.push('amount')
  if (!data.method) missingFields.push('method')
  if (!data.reference) missingFields.push('reference')
  if (!data.receivedBy) missingFields.push('receivedBy')
  if (!data.receivedByName) missingFields.push('receivedByName')
  if (!data.receivedAt) missingFields.push('receivedAt')
  
  if (missingFields.length > 0) {
    throw new PaymentError(
      PAYMENT_ERRORS.PAYMENT_MISSING_FIELDS,
      `Missing required payment fields: ${missingFields.join(', ')}`,
      { missingFields }
    )
  }
  
  // Validate amount is positive
  if (data.amount <= 0) {
    throw new PaymentError(
      PAYMENT_ERRORS.PAYMENT_INVALID_AMOUNT,
      'Payment amount must be positive',
      { amount: data.amount }
    )
  }
}

/**
 * Record a new payment with full validation and integration
 * 
 * Property 4: Payment Recording Completeness
 * For any successfully recorded payment, the system SHALL have created:
 * (1) a Payment record, (2) an immutable Receipt with unique number,
 * (3) an updated StudentAccount balance, and (4) a FinanceAuditLog entry.
 * 
 * Property 5: Payment Date Validation
 * For any payment recording attempt with a future date, the system SHALL reject the payment.
 * 
 * Requirements: 4.1, 4.3, 4.4, 4.7
 */
export async function recordPayment(data: RecordPaymentInput): Promise<PaymentResult> {
  const { schoolId, studentId, receivedBy, receivedByName, receivedAt } = data

  // Step 1: Validate required fields (Requirement 4.1)
  validatePaymentFields(data)
  
  // Step 2: Validate payment date is not in the future (Property 5, Requirement 4.7)
  validatePaymentDate(receivedAt)

  // Step 3: Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true, stream: true },
  })
  if (!student) {
    throw new PaymentError(
      PAYMENT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found',
      { studentId }
    )
  }

  // Step 4: Verify term exists
  const term = await prisma.term.findUnique({ where: { id: data.termId } })
  if (!term) {
    throw new PaymentError(
      PAYMENT_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId: data.termId }
    )
  }

  // Step 5: Calculate balance before payment using StudentAccountService
  const balanceBreakdown = await StudentAccountService.calculateBalance(studentId, schoolId, data.termId)
  const balanceBefore = balanceBreakdown.balance

  // Step 6: Generate receipt using ReceiptService (Property 4 - part 2)
  const receiptInput: GenerateReceiptInput = {
    schoolId,
    studentId,
    guardianId: data.guardianId,
    termId: data.termId,
    amount: data.amount,
    method: data.method,
    reference: data.reference,
    balanceBefore,
    issuedBy: receivedBy,
    issuedByName: receivedByName,
    issuedAt: receivedAt,
  }
  const receipt = await ReceiptService.generateReceipt(receiptInput)

  // Step 7: Create payment record (Property 4 - part 1)
  const payment = await prisma.payment.create({
    data: {
      schoolId,
      studentId,
      guardianId: data.guardianId,
      termId: data.termId,
      amount: data.amount,
      method: data.method as 'CASH' | 'MOBILE_MONEY' | 'BANK' | 'CHEQUE',
      reference: data.reference,
      bankName: data.bankName,
      chequeNumber: data.chequeNumber,
      mobileNumber: data.mobileNumber,
      notes: data.notes,
      status: 'CONFIRMED',
      receivedBy,
      receivedAt,
      receiptId: receipt.id,
    },
  })

  // Step 8: Update student account balance using StudentAccountService (Property 4 - part 3)
  const updatedAccount = await StudentAccountService.updateBalance(studentId, schoolId, data.termId)

  // Step 9: Create audit log entry using FinanceAuditService (Property 4 - part 4)
  await FinanceAuditService.logAction({
    schoolId,
    userId: receivedBy,
    action: 'PAYMENT_RECORDED',
    resourceType: 'Payment',
    resourceId: payment.id,
    newValue: {
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      receiptNumber: receipt.receiptNumber,
      studentId,
      termId: data.termId,
      balanceBefore,
      balanceAfter: updatedAccount.balance,
    },
  })

  return {
    payment: {
      id: payment.id,
      schoolId: payment.schoolId,
      studentId: payment.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      guardianId: payment.guardianId ?? undefined,
      termId: payment.termId,
      termName: term.name,
      amount: payment.amount,
      method: payment.method as PaymentMethod,
      reference: payment.reference,
      bankName: payment.bankName ?? undefined,
      chequeNumber: payment.chequeNumber ?? undefined,
      mobileNumber: payment.mobileNumber ?? undefined,
      notes: payment.notes ?? undefined,
      status: payment.status as PaymentRecord['status'],
      receivedBy: payment.receivedBy,
      receivedByName,
      receivedAt: payment.receivedAt.toISOString(),
      receiptId: payment.receiptId ?? undefined,
      receiptNumber: receipt.receiptNumber,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    },
    receipt,
    updatedBalance: updatedAccount.balance,
  }
}


/**
 * Reverse a payment
 * 
 * Property 6: Payment Immutability
 * For any confirmed payment, direct modification of amount, method, or reference SHALL be rejected.
 * Corrections SHALL only be possible through reversal.
 * 
 * Property 7: Reversal Audit Trail
 * For any payment reversal, the system SHALL create an audit entry containing the original
 * payment details, reversal reason, and user who performed the reversal.
 * 
 * Requirements: 4.5, 4.6, 10.2
 */
export async function reversePayment(
  paymentId: string,
  schoolId: string,
  userId: string,
  reason: string
): Promise<PaymentRecord> {
  // Validate reason is provided
  if (!reason || reason.trim().length === 0) {
    throw new PaymentError(
      PAYMENT_ERRORS.PAYMENT_MISSING_FIELDS,
      'Reversal reason is required',
      { paymentId }
    )
  }

  // Get payment with receipt
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { 
      receipt: true,
      student: { include: { class: true, stream: true } },
      term: true,
    },
  })

  if (!payment) {
    throw new PaymentError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND,
      'Payment not found',
      { paymentId }
    )
  }

  // Verify school authorization
  if (payment.schoolId !== schoolId) {
    throw new PaymentError(
      PAYMENT_ERRORS.UNAUTHORIZED,
      'Unauthorized to reverse this payment',
      { paymentId, schoolId }
    )
  }

  // Check if payment is already reversed (Property 6)
  if (payment.status === 'REVERSED') {
    throw new PaymentError(
      PAYMENT_ERRORS.PAYMENT_ALREADY_REVERSED,
      'Payment has already been reversed',
      { paymentId, status: payment.status }
    )
  }

  // Check if payment is in a state that can be reversed
  if (payment.status !== 'CONFIRMED') {
    throw new PaymentError(
      PAYMENT_ERRORS.PAYMENT_IMMUTABLE,
      `Cannot reverse payment with status: ${payment.status}`,
      { paymentId, status: payment.status }
    )
  }

  // Capture previous values for audit (Property 7)
  const previousValue = {
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference,
    status: payment.status,
    receiptNumber: payment.receipt?.receiptNumber,
    studentId: payment.studentId,
    termId: payment.termId,
  }

  // Update payment status to REVERSED (not deleted - Property 6)
  const reversedAt = new Date()
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'REVERSED',
      reversedBy: userId,
      reversedAt,
      reversalReason: reason.trim(),
    },
  })

  // Update student account balance using StudentAccountService
  const updatedAccount = await StudentAccountService.updateBalance(
    payment.studentId,
    schoolId,
    payment.termId
  )

  // Create audit entry with before/after values using FinanceAuditService (Property 7)
  await FinanceAuditService.logAction({
    schoolId,
    userId,
    action: 'PAYMENT_REVERSED',
    resourceType: 'Payment',
    resourceId: paymentId,
    previousValue,
    newValue: {
      status: 'REVERSED',
      reversedBy: userId,
      reversedAt: reversedAt.toISOString(),
      balanceAfterReversal: updatedAccount.balance,
    },
    reason: reason.trim(),
  })

  // Get user name for response
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { staff: true },
  })
  const reversedByName = user?.staff 
    ? `${user.staff.firstName} ${user.staff.lastName}` 
    : user?.email || 'Unknown'

  // Get receivedBy name
  const receivedByUser = await prisma.user.findUnique({
    where: { id: payment.receivedBy },
    include: { staff: true },
  })
  const receivedByName = receivedByUser?.staff
    ? `${receivedByUser.staff.firstName} ${receivedByUser.staff.lastName}`
    : receivedByUser?.email || 'Unknown'

  return {
    id: payment.id,
    schoolId: payment.schoolId,
    studentId: payment.studentId,
    studentName: `${payment.student.firstName} ${payment.student.lastName}`,
    admissionNumber: payment.student.admissionNumber,
    guardianId: payment.guardianId ?? undefined,
    termId: payment.termId,
    termName: payment.term.name,
    amount: payment.amount,
    method: payment.method as PaymentMethod,
    reference: payment.reference,
    bankName: payment.bankName ?? undefined,
    chequeNumber: payment.chequeNumber ?? undefined,
    mobileNumber: payment.mobileNumber ?? undefined,
    notes: payment.notes ?? undefined,
    status: 'REVERSED',
    receivedBy: payment.receivedBy,
    receivedByName,
    receivedAt: payment.receivedAt.toISOString(),
    receiptId: payment.receiptId ?? undefined,
    receiptNumber: payment.receipt?.receiptNumber,
    reversedBy: userId,
    reversedByName,
    reversedAt: reversedAt.toISOString(),
    reversalReason: reason.trim(),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Get a payment by ID with receipt
 */
export async function getPayment(paymentId: string, schoolId: string): Promise<PaymentRecord | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      receipt: true,
      student: { include: { class: true, stream: true } },
      term: true,
      guardian: true,
    },
  })

  if (!payment || payment.schoolId !== schoolId) {
    return null
  }

  // Get receivedBy name
  const receivedByUser = await prisma.user.findUnique({
    where: { id: payment.receivedBy },
    include: { staff: true },
  })
  const receivedByName = receivedByUser?.staff
    ? `${receivedByUser.staff.firstName} ${receivedByUser.staff.lastName}`
    : receivedByUser?.email || 'Unknown'

  // Get reversedBy name if applicable
  let reversedByName: string | undefined
  if (payment.reversedBy) {
    const reversedByUser = await prisma.user.findUnique({
      where: { id: payment.reversedBy },
      include: { staff: true },
    })
    reversedByName = reversedByUser?.staff
      ? `${reversedByUser.staff.firstName} ${reversedByUser.staff.lastName}`
      : reversedByUser?.email || 'Unknown'
  }

  return {
    id: payment.id,
    schoolId: payment.schoolId,
    studentId: payment.studentId,
    studentName: `${payment.student.firstName} ${payment.student.lastName}`,
    admissionNumber: payment.student.admissionNumber,
    guardianId: payment.guardianId ?? undefined,
    guardianName: payment.guardian
      ? `${payment.guardian.firstName} ${payment.guardian.lastName}`
      : undefined,
    termId: payment.termId,
    termName: payment.term.name,
    amount: payment.amount,
    method: payment.method as PaymentMethod,
    reference: payment.reference,
    bankName: payment.bankName ?? undefined,
    chequeNumber: payment.chequeNumber ?? undefined,
    mobileNumber: payment.mobileNumber ?? undefined,
    notes: payment.notes ?? undefined,
    status: payment.status as PaymentRecord['status'],
    receivedBy: payment.receivedBy,
    receivedByName,
    receivedAt: payment.receivedAt.toISOString(),
    receiptId: payment.receiptId ?? undefined,
    receiptNumber: payment.receipt?.receiptNumber,
    reversedBy: payment.reversedBy ?? undefined,
    reversedByName,
    reversedAt: payment.reversedAt?.toISOString(),
    reversalReason: payment.reversalReason ?? undefined,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  }
}

/**
 * List payments with filters and pagination
 */
export async function listPayments(
  schoolId: string,
  filters: PaymentFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedPayments> {
  const where: Record<string, unknown> = { schoolId }

  if (filters.studentId) where.studentId = filters.studentId
  if (filters.guardianId) where.guardianId = filters.guardianId
  if (filters.termId) where.termId = filters.termId
  if (filters.method) where.method = filters.method
  if (filters.status) where.status = filters.status

  if (filters.dateFrom || filters.dateTo) {
    where.receivedAt = {}
    if (filters.dateFrom) (where.receivedAt as Record<string, Date>).gte = filters.dateFrom
    if (filters.dateTo) (where.receivedAt as Record<string, Date>).lte = filters.dateTo
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        receipt: true,
        student: { include: { class: true, stream: true } },
        term: true,
        guardian: true,
      },
      orderBy: { receivedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ])

  // Get user names for receivedBy and reversedBy
  const userIds = [
    ...new Set([
      ...payments.map((p) => p.receivedBy),
      ...payments.filter((p) => p.reversedBy).map((p) => p.reversedBy!),
    ]),
  ]
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

  const data: PaymentRecord[] = payments.map((payment) => ({
    id: payment.id,
    schoolId: payment.schoolId,
    studentId: payment.studentId,
    studentName: `${payment.student.firstName} ${payment.student.lastName}`,
    admissionNumber: payment.student.admissionNumber,
    guardianId: payment.guardianId ?? undefined,
    guardianName: payment.guardian
      ? `${payment.guardian.firstName} ${payment.guardian.lastName}`
      : undefined,
    termId: payment.termId,
    termName: payment.term.name,
    amount: payment.amount,
    method: payment.method as PaymentMethod,
    reference: payment.reference,
    bankName: payment.bankName ?? undefined,
    chequeNumber: payment.chequeNumber ?? undefined,
    mobileNumber: payment.mobileNumber ?? undefined,
    notes: payment.notes ?? undefined,
    status: payment.status as PaymentRecord['status'],
    receivedBy: payment.receivedBy,
    receivedByName: userMap.get(payment.receivedBy) || 'Unknown',
    receivedAt: payment.receivedAt.toISOString(),
    receiptId: payment.receiptId ?? undefined,
    receiptNumber: payment.receipt?.receiptNumber,
    reversedBy: payment.reversedBy ?? undefined,
    reversedByName: payment.reversedBy ? userMap.get(payment.reversedBy) : undefined,
    reversedAt: payment.reversedAt?.toISOString(),
    reversalReason: payment.reversalReason ?? undefined,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  }))

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * Get payment history for a student
 */
export async function getStudentPaymentHistory(
  studentId: string,
  schoolId: string,
  termId?: string
): Promise<PaymentRecord[]> {
  const where: Record<string, unknown> = { studentId, schoolId }
  if (termId) where.termId = termId

  const payments = await prisma.payment.findMany({
    where,
    include: {
      receipt: true,
      student: { include: { class: true, stream: true } },
      term: true,
      guardian: true,
    },
    orderBy: { receivedAt: 'desc' },
  })

  // Get user names
  const userIds = [
    ...new Set([
      ...payments.map((p) => p.receivedBy),
      ...payments.filter((p) => p.reversedBy).map((p) => p.reversedBy!),
    ]),
  ]
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

  return payments.map((payment) => ({
    id: payment.id,
    schoolId: payment.schoolId,
    studentId: payment.studentId,
    studentName: `${payment.student.firstName} ${payment.student.lastName}`,
    admissionNumber: payment.student.admissionNumber,
    guardianId: payment.guardianId ?? undefined,
    guardianName: payment.guardian
      ? `${payment.guardian.firstName} ${payment.guardian.lastName}`
      : undefined,
    termId: payment.termId,
    termName: payment.term.name,
    amount: payment.amount,
    method: payment.method as PaymentMethod,
    reference: payment.reference,
    bankName: payment.bankName ?? undefined,
    chequeNumber: payment.chequeNumber ?? undefined,
    mobileNumber: payment.mobileNumber ?? undefined,
    notes: payment.notes ?? undefined,
    status: payment.status as PaymentRecord['status'],
    receivedBy: payment.receivedBy,
    receivedByName: userMap.get(payment.receivedBy) || 'Unknown',
    receivedAt: payment.receivedAt.toISOString(),
    receiptId: payment.receiptId ?? undefined,
    receiptNumber: payment.receipt?.receiptNumber,
    reversedBy: payment.reversedBy ?? undefined,
    reversedByName: payment.reversedBy ? userMap.get(payment.reversedBy) : undefined,
    reversedAt: payment.reversedAt?.toISOString(),
    reversalReason: payment.reversalReason ?? undefined,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  }))
}

export async function getFinanceDashboardSummary(schoolId: string, termId?: string) {
  let currentTermId = termId
  if (!currentTermId) {
    const currentTerm = await prisma.term.findFirst({
      where: { academicYear: { schoolId }, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
      orderBy: { startDate: 'desc' },
    })
    currentTermId = currentTerm?.id
  }

  const accounts = await prisma.studentAccount.findMany({
    where: { schoolId },
    include: { student: { include: { class: true, stream: true } } },
  })

  const totalExpected = accounts.reduce((sum, a) => sum + a.totalFees, 0)
  const totalCollected = accounts.reduce((sum, a) => sum + a.totalPaid, 0)
  const totalOutstanding = accounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0)
  const paidStudents = accounts.filter(a => a.balance <= 0).length
  const partialStudents = accounts.filter(a => a.totalPaid > 0 && a.balance > 0).length
  const unpaidStudents = accounts.filter(a => a.totalPaid === 0 && a.totalFees > 0).length

  const recentPayments = await prisma.payment.findMany({
    where: { schoolId, status: 'CONFIRMED' },
    orderBy: { receivedAt: 'desc' },
    take: 10,
    include: { student: { include: { class: true } }, receipt: true },
  })

  const topDefaulters = accounts.filter(a => a.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 10)

  return {
    totalExpected, totalCollected, totalOutstanding,
    collectionRate: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
    paidStudents, partialStudents, unpaidStudents, totalStudents: accounts.length,
    recentPayments: recentPayments.map(p => ({
      id: p.id, studentId: p.studentId,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      admissionNumber: p.student.admissionNumber,
      amount: p.amount, method: p.method, reference: p.reference,
      receiptNumber: p.receipt?.receiptNumber,
      receivedAt: p.receivedAt.toISOString(),
    })),
    topDefaulters: topDefaulters.map(a => ({
      id: a.id, studentId: a.studentId,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      admissionNumber: a.student.admissionNumber,
      className: a.student.class.name,
      balance: a.balance, totalFees: a.totalFees, totalPaid: a.totalPaid,
    })),
  }
}


/**
 * Determine payment status category for a student account
 * 
 * Property 15: Payment Status Categorization
 * For any student account, the payment status SHALL be correctly categorized as:
 * - PAID: balance <= 0
 * - OVERPAID: balance < 0
 * - PARTIAL: totalPaid > 0 AND balance > 0
 * - UNPAID: totalPaid = 0 AND totalFees > 0
 * 
 * Requirement 7.1: Categorize students as fully paid, partial, unpaid, or overpaid
 */
export function categorizePaymentStatus(
  totalFees: number,
  totalPaid: number,
  balance: number
): 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERPAID' {
  // OVERPAID: balance < 0 (paid more than owed)
  if (balance < 0) {
    return 'OVERPAID'
  }
  // PAID: balance <= 0 (exactly paid or overpaid - but overpaid handled above)
  if (balance <= 0) {
    return 'PAID'
  }
  // PARTIAL: totalPaid > 0 AND balance > 0 (some payment made but still owes)
  if (totalPaid > 0 && balance > 0) {
    return 'PARTIAL'
  }
  // UNPAID: totalPaid = 0 AND totalFees > 0 (no payment made and has fees)
  if (totalPaid === 0 && totalFees > 0) {
    return 'UNPAID'
  }
  // Edge case: no fees assigned yet
  return 'PAID'
}

/**
 * Calculate days overdue for a student
 * 
 * Property 16: Days Overdue Calculation
 * For any student with overdue balance, the days overdue SHALL equal 
 * the number of days since the fee due date.
 * 
 * Requirement 7.4: Flag students with days overdue
 */
export function calculateDaysOverdue(dueDate: Date | null | undefined, balance: number): number {
  // If no balance owed or no due date, not overdue
  if (balance <= 0 || !dueDate) {
    return 0
  }
  
  const now = new Date()
  const due = new Date(dueDate)
  
  // If due date is in the future, not overdue yet
  if (due > now) {
    return 0
  }
  
  // Calculate days difference
  const diffTime = now.getTime() - due.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Calculate collection rate
 * 
 * Property 17: Collection Rate Calculation
 * For any balance summary, the collection rate SHALL equal 
 * (totalCollected / totalExpected) * 100.
 * 
 * Requirement 7.6: Show collection percentage
 */
export function calculateCollectionRate(totalExpected: number, totalCollected: number): number {
  if (totalExpected <= 0) {
    return 0
  }
  return (totalCollected / totalExpected) * 100
}

/**
 * Balance Monitor Filters interface
 */
export interface BalanceMonitorFilters {
  classId?: string
  termId?: string
  guardianId?: string
  status?: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERPAID'
  minBalance?: number
  maxBalance?: number
  overdueOnly?: boolean
}

/**
 * Defaulter record with full details
 */
export interface DefaulterRecord {
  id: string
  studentId: string
  name: string
  admissionNumber: string
  className: string
  streamName?: string
  guardianName?: string
  guardianPhone?: string
  totalFees: number
  totalPaid: number
  balance: number
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERPAID'
  lastPaymentDate?: string
  dueDate?: string
  daysOverdue: number
}

/**
 * Balance summary for monitoring
 */
export interface BalanceSummary {
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  studentsByStatus: {
    paid: number
    partial: number
    unpaid: number
    overpaid: number
  }
  overdueCount: number
  totalOverdueAmount: number
}

/**
 * Get defaulters with comprehensive filters
 * 
 * Requirements: 7.1, 7.3, 7.4
 * - 7.1: Categorize students as fully paid, partial, unpaid, or overpaid
 * - 7.3: Show student name, class, total fees, paid, balance, and last payment date
 * - 7.4: Flag students with days overdue
 */
export async function getDefaulters(
  schoolId: string, 
  filters?: BalanceMonitorFilters
): Promise<DefaulterRecord[]> {
  // Build where clause for student accounts
  const where: Record<string, unknown> = { schoolId }
  
  // Filter by minimum balance (defaulters have balance > 0)
  if (filters?.minBalance !== undefined) {
    where.balance = { gt: filters.minBalance }
  } else {
    // Default: get accounts with positive balance (defaulters)
    where.balance = { gt: 0 }
  }
  
  // Filter by maximum balance
  if (filters?.maxBalance !== undefined) {
    where.balance = { 
      ...(where.balance as Record<string, number> || {}), 
      lte: filters.maxBalance 
    }
  }

  // Build student filter conditions
  const studentWhere: Record<string, unknown> = {}
  if (filters?.classId) {
    studentWhere.classId = filters.classId
  }
  
  // Filter by guardian
  if (filters?.guardianId) {
    studentWhere.studentGuardians = {
      some: { guardianId: filters.guardianId }
    }
  }
  
  if (Object.keys(studentWhere).length > 0) {
    where.student = studentWhere
  }

  // Fetch accounts with related data
  const accounts = await prisma.studentAccount.findMany({
    where,
    include: {
      student: {
        include: {
          class: true,
          stream: true,
          studentGuardians: { 
            where: { isPrimary: true }, 
            include: { guardian: true } 
          },
        },
      },
    },
    orderBy: { balance: 'desc' },
  })

  // Get fee structure due dates for the term
  const termId = filters?.termId
  let feeStructures: Map<string, Date | null> = new Map()
  
  if (termId) {
    const structures = await prisma.feeStructure.findMany({
      where: { schoolId, termId, isActive: true },
      select: { classId: true, studentType: true, dueDate: true },
    })
    structures.forEach(fs => {
      const key = `${fs.classId}-${fs.studentType}`
      feeStructures.set(key, fs.dueDate)
    })
  }

  // Map accounts to defaulter records
  const defaulters: DefaulterRecord[] = accounts.map(account => {
    const student = account.student
    const primaryGuardian = student.studentGuardians[0]?.guardian
    
    // Get due date from fee structure
    const feeStructureKey = `${student.classId}-${account.studentType}`
    const dueDate = feeStructures.get(feeStructureKey) || null
    
    // Calculate payment status
    const status = categorizePaymentStatus(
      account.totalFees,
      account.totalPaid,
      account.balance
    )
    
    // Calculate days overdue
    const daysOverdue = calculateDaysOverdue(dueDate, account.balance)
    
    return {
      id: account.id,
      studentId: account.studentId,
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class.name,
      streamName: student.stream?.name,
      guardianName: primaryGuardian 
        ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}` 
        : undefined,
      guardianPhone: primaryGuardian?.phone,
      totalFees: account.totalFees,
      totalPaid: account.totalPaid,
      balance: account.balance,
      status,
      lastPaymentDate: account.lastPaymentDate?.toISOString(),
      dueDate: dueDate?.toISOString(),
      daysOverdue,
    }
  })

  // Apply status filter if specified
  let filteredDefaulters = defaulters
  if (filters?.status) {
    filteredDefaulters = defaulters.filter(d => d.status === filters.status)
  }
  
  // Apply overdue-only filter
  if (filters?.overdueOnly) {
    filteredDefaulters = filteredDefaulters.filter(d => d.daysOverdue > 0)
  }

  return filteredDefaulters
}

/**
 * Get balance summary for monitoring
 * 
 * Property 17: Collection Rate Calculation
 * For any balance summary, the collection rate SHALL equal 
 * (totalCollected / totalExpected) * 100.
 * 
 * Requirements: 7.1, 7.6
 * - 7.1: Categorize students as fully paid, partial, unpaid, or overpaid
 * - 7.6: Show total expected, collected, outstanding, and collection percentage
 */
export async function getBalanceSummary(
  schoolId: string,
  termId?: string
): Promise<BalanceSummary> {
  // Fetch all student accounts for the school
  const accounts = await prisma.studentAccount.findMany({
    where: { schoolId },
    include: {
      student: {
        include: { class: true },
      },
    },
  })

  // Get fee structure due dates if term specified
  let feeStructures: Map<string, Date | null> = new Map()
  if (termId) {
    const structures = await prisma.feeStructure.findMany({
      where: { schoolId, termId, isActive: true },
      select: { classId: true, studentType: true, dueDate: true },
    })
    structures.forEach(fs => {
      const key = `${fs.classId}-${fs.studentType}`
      feeStructures.set(key, fs.dueDate)
    })
  }

  // Calculate totals and categorize students
  let totalExpected = 0
  let totalCollected = 0
  let totalOutstanding = 0
  let overdueCount = 0
  let totalOverdueAmount = 0
  
  const studentsByStatus = {
    paid: 0,
    partial: 0,
    unpaid: 0,
    overpaid: 0,
  }

  for (const account of accounts) {
    totalExpected += account.totalFees
    totalCollected += account.totalPaid
    
    // Only count positive balances as outstanding
    if (account.balance > 0) {
      totalOutstanding += account.balance
    }
    
    // Categorize payment status
    const status = categorizePaymentStatus(
      account.totalFees,
      account.totalPaid,
      account.balance
    )
    
    switch (status) {
      case 'PAID':
        studentsByStatus.paid++
        break
      case 'PARTIAL':
        studentsByStatus.partial++
        break
      case 'UNPAID':
        studentsByStatus.unpaid++
        break
      case 'OVERPAID':
        studentsByStatus.overpaid++
        break
    }
    
    // Check if overdue
    if (account.balance > 0 && termId) {
      const feeStructureKey = `${account.student.classId}-${account.studentType}`
      const dueDate = feeStructures.get(feeStructureKey)
      const daysOverdue = calculateDaysOverdue(dueDate, account.balance)
      
      if (daysOverdue > 0) {
        overdueCount++
        totalOverdueAmount += account.balance
      }
    }
  }

  // Calculate collection rate
  const collectionRate = calculateCollectionRate(totalExpected, totalCollected)

  return {
    totalExpected,
    totalCollected,
    totalOutstanding,
    collectionRate,
    studentsByStatus,
    overdueCount,
    totalOverdueAmount,
  }
}

/**
 * Get all students with their payment status for balance monitoring
 * 
 * Requirements: 7.1, 7.3, 7.4
 */
export async function getAllStudentBalances(
  schoolId: string,
  filters?: BalanceMonitorFilters
): Promise<DefaulterRecord[]> {
  // Build where clause
  const where: Record<string, unknown> = { schoolId }
  
  // Build student filter conditions
  const studentWhere: Record<string, unknown> = {}
  if (filters?.classId) {
    studentWhere.classId = filters.classId
  }
  
  if (filters?.guardianId) {
    studentWhere.studentGuardians = {
      some: { guardianId: filters.guardianId }
    }
  }
  
  if (Object.keys(studentWhere).length > 0) {
    where.student = studentWhere
  }

  // Apply balance filters
  if (filters?.minBalance !== undefined || filters?.maxBalance !== undefined) {
    where.balance = {}
    if (filters?.minBalance !== undefined) {
      (where.balance as Record<string, number>).gte = filters.minBalance
    }
    if (filters?.maxBalance !== undefined) {
      (where.balance as Record<string, number>).lte = filters.maxBalance
    }
  }

  // Fetch accounts
  const accounts = await prisma.studentAccount.findMany({
    where,
    include: {
      student: {
        include: {
          class: true,
          stream: true,
          studentGuardians: { 
            where: { isPrimary: true }, 
            include: { guardian: true } 
          },
        },
      },
    },
    orderBy: { balance: 'desc' },
  })

  // Get fee structure due dates
  const termId = filters?.termId
  let feeStructures: Map<string, Date | null> = new Map()
  
  if (termId) {
    const structures = await prisma.feeStructure.findMany({
      where: { schoolId, termId, isActive: true },
      select: { classId: true, studentType: true, dueDate: true },
    })
    structures.forEach(fs => {
      const key = `${fs.classId}-${fs.studentType}`
      feeStructures.set(key, fs.dueDate)
    })
  }

  // Map to records
  const records: DefaulterRecord[] = accounts.map(account => {
    const student = account.student
    const primaryGuardian = student.studentGuardians[0]?.guardian
    
    const feeStructureKey = `${student.classId}-${account.studentType}`
    const dueDate = feeStructures.get(feeStructureKey) || null
    
    const status = categorizePaymentStatus(
      account.totalFees,
      account.totalPaid,
      account.balance
    )
    
    const daysOverdue = calculateDaysOverdue(dueDate, account.balance)
    
    return {
      id: account.id,
      studentId: account.studentId,
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class.name,
      streamName: student.stream?.name,
      guardianName: primaryGuardian 
        ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}` 
        : undefined,
      guardianPhone: primaryGuardian?.phone,
      totalFees: account.totalFees,
      totalPaid: account.totalPaid,
      balance: account.balance,
      status,
      lastPaymentDate: account.lastPaymentDate?.toISOString(),
      dueDate: dueDate?.toISOString(),
      daysOverdue,
    }
  })

  // Apply status filter
  let filteredRecords = records
  if (filters?.status) {
    filteredRecords = records.filter(r => r.status === filters.status)
  }
  
  // Apply overdue-only filter
  if (filters?.overdueOnly) {
    filteredRecords = filteredRecords.filter(r => r.daysOverdue > 0)
  }

  return filteredRecords
}

export async function getDailyCollections(schoolId: string, date: Date) {
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999)

  const payments = await prisma.payment.findMany({
    where: { schoolId, status: 'CONFIRMED', receivedAt: { gte: startOfDay, lte: endOfDay } },
    include: { student: { include: { class: true } } },
  })

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const byMethod = payments.reduce((acc, p) => {
    if (!acc[p.method]) acc[p.method] = { amount: 0, count: 0 }
    acc[p.method].amount += p.amount; acc[p.method].count += 1
    return acc
  }, {} as Record<string, { amount: number; count: number }>)

  const byClass = payments.reduce((acc, p) => {
    const cn = p.student.class.name
    if (!acc[cn]) acc[cn] = { amount: 0, count: 0 }
    acc[cn].amount += p.amount; acc[cn].count += 1
    return acc
  }, {} as Record<string, { amount: number; count: number }>)

  return {
    date: date.toISOString().split('T')[0], totalAmount, transactionCount: payments.length,
    byMethod: Object.entries(byMethod).map(([method, data]) => ({ method: method as PaymentMethod, ...data })),
    byClass: Object.entries(byClass).map(([className, data]) => ({ className, ...data })),
  }
}

// ============================================
// PAYMENT SERVICE EXPORT
// ============================================

/**
 * PaymentService - Enhanced payment operations with full validation and integration
 * 
 * Property 4: Payment Recording Completeness
 * Property 5: Payment Date Validation
 * Property 6: Payment Immutability
 * Property 7: Reversal Audit Trail
 * Property 15: Payment Status Categorization
 * Property 16: Days Overdue Calculation
 * Property 17: Collection Rate Calculation
 */
export const PaymentService = {
  // Core payment operations
  recordPayment,
  reversePayment,
  getPayment,
  listPayments,
  getStudentPaymentHistory,
  
  // Validation functions
  validatePaymentDate,
  validatePaymentFields,
  
  // Legacy functions (for backward compatibility)
  calculateStudentBalance,
  updateStudentAccountBalance,
  getOrCreateStudentAccount,
  
  // Dashboard and reporting
  getFinanceDashboardSummary,
  getDailyCollections,
  
  // Balance monitoring (Requirements 7.1, 7.3, 7.4, 7.6)
  getDefaulters,
  getBalanceSummary,
  getAllStudentBalances,
  categorizePaymentStatus,
  calculateDaysOverdue,
  calculateCollectionRate,
  
  // Utility functions
  amountToWords,
  generateReceiptNumber,
  generateInvoiceNumber,
}

export default PaymentService
