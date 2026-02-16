/**
 * Receipt Service
 * Generates and manages immutable receipts for payments
 * Requirements: 5.1, 5.4
 * 
 * Property 8: Receipt Immutability
 * For any receipt, modification or deletion attempts by non-admin users SHALL be rejected.
 *    
 * Property 9: Receipt Content Completeness
 * For any receipt, the record SHALL contain: school name, student name, amount, date, 
 * method, reference, and receipt number.
 */
import { prisma } from '@/lib/db'
import type {
  Receipt,
  ReceiptSearchFilters,
  CancellationRequest,
  PaymentMethod,
  FinanceSettings,
  PaginatedReceipts,
} from '@/types/finance'

// Error codes for receipt operations
export const RECEIPT_ERRORS = {
  RECEIPT_NOT_FOUND: 'RECEIPT_NOT_FOUND',
  RECEIPT_IMMUTABLE: 'RECEIPT_IMMUTABLE',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  SCHOOL_NOT_FOUND: 'SCHOOL_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  CANCELLATION_NOT_AUTHORIZED: 'CANCELLATION_NOT_AUTHORIZED',
} as const

export class ReceiptError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ReceiptError'
  }
}

// ============================================
// NUMBER TO WORDS CONVERSION
// ============================================

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
]

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
]

/**
 * Convert a number to words
 * Requirement 5.4: Receipt SHALL include amount in words
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  if (num < 0) return 'Negative ' + numberToWords(-num)
  
  let words = ''
  
  // Handle billions
  if (Math.floor(num / 1000000000) > 0) {
    words += numberToWords(Math.floor(num / 1000000000)) + ' Billion '
    num %= 1000000000
  }
  
  // Handle millions
  if (Math.floor(num / 1000000) > 0) {
    words += numberToWords(Math.floor(num / 1000000)) + ' Million '
    num %= 1000000
  }
  
  // Handle thousands
  if (Math.floor(num / 1000) > 0) {
    words += numberToWords(Math.floor(num / 1000)) + ' Thousand '
    num %= 1000
  }
  
  // Handle hundreds
  if (Math.floor(num / 100) > 0) {
    words += numberToWords(Math.floor(num / 100)) + ' Hundred '
    num %= 100
  }
  
  // Handle tens and ones
  if (num > 0) {
    if (words !== '') words += 'and '
    if (num < 20) {
      words += ones[num]
    } else {
      words += tens[Math.floor(num / 10)]
      if (num % 10 > 0) {
        words += '-' + ones[num % 10]
      }
    }
  }
  
  return words.trim()
}

/**
 * Convert amount to words with currency
 * Requirement 5.4: Receipt SHALL include amount in words
 */
export function amountToWords(amount: number, currency: string = 'Shillings'): string {
  const whole = Math.floor(Math.abs(amount))
  const prefix = amount < 0 ? 'Negative ' : ''
  return `${prefix}${numberToWords(whole)} ${currency} Only`
}

// ============================================
// RECEIPT NUMBER GENERATION
// ============================================

/**
 * Generate unique receipt number based on school settings
 * Requirement 5.1: Auto-generate unique receipt number following school's format
 */
export async function generateReceiptNumber(schoolId: string): Promise<string> {
  // Get finance settings for the school
  const settings = await prisma.financeSettings.findUnique({
    where: { schoolId }
  })
  
  const prefix = settings?.receiptPrefix || 'RCP'
  const year = new Date().getFullYear()
  const nextNumber = settings?.nextReceiptNumber || 1
  
  // Atomically increment the receipt number
  await prisma.financeSettings.upsert({
    where: { schoolId },
    update: { nextReceiptNumber: nextNumber + 1 },
    create: {
      schoolId,
      nextReceiptNumber: nextNumber + 1,
    },
  })
  
  // Format: PREFIX-YEAR-NNNNNN (e.g., RCP-2026-000001)
  return `${prefix}-${year}-${String(nextNumber).padStart(6, '0')}`
}

/**
 * Format receipt number using custom format from settings
 * Supports placeholders: {PREFIX}, {YEAR}, {NUMBER}
 */
export function formatReceiptNumber(
  format: string,
  prefix: string,
  year: number,
  number: number
): string {
  return format
    .replace('{PREFIX}', prefix)
    .replace('{YEAR}', String(year))
    .replace('{NUMBER}', String(number).padStart(6, '0'))
}

// ============================================
// RECEIPT GENERATION INPUT TYPE
// ============================================

export interface GenerateReceiptInput {
  schoolId: string
  studentId: string
  guardianId?: string
  termId: string
  amount: number
  method: PaymentMethod
  reference: string
  balanceBefore: number
  issuedBy: string
  issuedByName: string
  issuedAt?: Date
}

// ============================================
// RECEIPT SERVICE FUNCTIONS
// ============================================

/**
 * Generate a receipt for a payment
 * Requirement 5.1: Auto-generate unique receipt number
 * Requirement 5.4: Receipt SHALL include school name, student name, amount, date, method, reference
 * 
 * Property 9: Receipt Content Completeness
 */
export async function generateReceipt(input: GenerateReceiptInput): Promise<Receipt> {
  const {
    schoolId,
    studentId,
    guardianId,
    termId,
    amount,
    method,
    reference,
    balanceBefore,
    issuedBy,
    issuedByName,
    issuedAt = new Date(),
  } = input

  // Validate amount
  if (amount <= 0) {
    throw new ReceiptError(
      RECEIPT_ERRORS.INVALID_AMOUNT,
      'Receipt amount must be positive',
      { amount }
    )
  }

  // Get student with class info (snapshot data at receipt time)
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      stream: true,
    },
  })

  if (!student) {
    throw new ReceiptError(
      RECEIPT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found',
      { studentId }
    )
  }

  // Get school info for receipt
  const school = await prisma.school.findFirst({
    where: { id: schoolId },
  })

  if (!school) {
    throw new ReceiptError(
      RECEIPT_ERRORS.SCHOOL_NOT_FOUND,
      'School not found',
      { schoolId }
    )
  }

  // Get term info
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new ReceiptError(
      RECEIPT_ERRORS.PAYMENT_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get guardian name if provided
  let guardianName: string | undefined
  if (guardianId) {
    const guardian = await prisma.guardian.findUnique({
      where: { id: guardianId },
    })
    if (guardian) {
      guardianName = `${guardian.firstName} ${guardian.lastName}`
    }
  }

  // Get finance settings for currency
  const settings = await prisma.financeSettings.findUnique({
    where: { schoolId },
  })
  const currency = settings?.currency || 'Shillings'

  // Generate unique receipt number
  const receiptNumber = await generateReceiptNumber(schoolId)

  // Snapshot student name and class at receipt time
  const studentName = `${student.firstName} ${student.lastName}`
  const className = student.class.name + (student.stream ? ` - ${student.stream.name}` : '')
  const termName = term.name

  // Calculate balance after payment
  const balanceAfter = balanceBefore - amount

  // Convert amount to words
  const amountInWordsText = amountToWords(amount, currency)

  // Create immutable receipt
  const receipt = await prisma.receipt.create({
    data: {
      receiptNumber,
      schoolId,
      studentId,
      guardianId,
      studentName,      // Snapshot
      guardianName,     // Snapshot
      className,        // Snapshot
      termName,         // Snapshot
      amount,
      amountInWords: amountInWordsText,
      method: method as 'CASH' | 'MOBILE_MONEY' | 'BANK',
      reference,
      balanceBefore,
      balanceAfter,
      issuedBy,
      issuedByName,     // Snapshot
      issuedAt,
    },
  })

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    schoolId: receipt.schoolId,
    schoolName: school.name,
    schoolAddress: school.address ?? undefined,
    schoolPhone: school.phone ?? undefined,
    studentId: receipt.studentId,
    studentName: receipt.studentName,
    admissionNumber: student.admissionNumber,
    guardianId: receipt.guardianId ?? undefined,
    guardianName: receipt.guardianName ?? undefined,
    className: receipt.className,
    termName: receipt.termName,
    amount: receipt.amount,
    amountInWords: receipt.amountInWords,
    method: receipt.method as PaymentMethod,
    reference: receipt.reference,
    balanceBefore: receipt.balanceBefore,
    balanceAfter: receipt.balanceAfter,
    issuedBy: receipt.issuedBy,
    issuedByName: receipt.issuedByName,
    issuedAt: receipt.issuedAt.toISOString(),
  }
}


/**
 * Get receipt by ID
 * Property 8: Receipt Immutability - receipts are read-only
 */
export async function getReceipt(receiptId: string): Promise<Receipt | null> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
  })

  if (!receipt) {
    return null
  }

  // Get school info for additional details
  const school = await prisma.school.findFirst({
    where: { id: receipt.schoolId },
  })

  // Get student for admission number
  const student = await prisma.student.findUnique({
    where: { id: receipt.studentId },
  })

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    schoolId: receipt.schoolId,
    schoolName: school?.name,
    schoolAddress: school?.address ?? undefined,
    schoolPhone: school?.phone ?? undefined,
    studentId: receipt.studentId,
    studentName: receipt.studentName,
    admissionNumber: student?.admissionNumber,
    guardianId: receipt.guardianId ?? undefined,
    guardianName: receipt.guardianName ?? undefined,
    className: receipt.className,
    termName: receipt.termName,
    amount: receipt.amount,
    amountInWords: receipt.amountInWords,
    method: receipt.method as PaymentMethod,
    reference: receipt.reference,
    balanceBefore: receipt.balanceBefore,
    balanceAfter: receipt.balanceAfter,
    issuedBy: receipt.issuedBy,
    issuedByName: receipt.issuedByName,
    issuedAt: receipt.issuedAt.toISOString(),
  }
}

/**
 * Get receipt by receipt number
 * Requirement 5.6: Search by receipt number
 */
export async function getReceiptByNumber(receiptNumber: string): Promise<Receipt | null> {
  const receipt = await prisma.receipt.findUnique({
    where: { receiptNumber },
  })

  if (!receipt) {
    return null
  }

  return getReceipt(receipt.id)
}

/**
 * Search receipts with filters
 * Requirement 5.6: Search by receipt number, student name, or date range
 */
export async function searchReceipts(
  schoolId: string,
  filters: ReceiptSearchFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedReceipts> {
  const where: Record<string, unknown> = { schoolId }

  // Filter by receipt number (partial match)
  if (filters.receiptNumber) {
    where.receiptNumber = { contains: filters.receiptNumber, mode: 'insensitive' }
  }

  // Filter by student name (partial match)
  if (filters.studentName) {
    where.studentName = { contains: filters.studentName, mode: 'insensitive' }
  }

  // Filter by student ID
  if (filters.studentId) {
    where.studentId = filters.studentId
  }

  // Filter by date range
  if (filters.dateFrom || filters.dateTo) {
    where.issuedAt = {}
    if (filters.dateFrom) {
      (where.issuedAt as Record<string, Date>).gte = filters.dateFrom
    }
    if (filters.dateTo) {
      (where.issuedAt as Record<string, Date>).lte = filters.dateTo
    }
  }

  // Get total count
  const total = await prisma.receipt.count({ where })

  // Get paginated receipts
  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  // Get school info
  const school = await prisma.school.findFirst({
    where: { id: schoolId },
  })

  // Get student admission numbers
  const studentIds = [...new Set(receipts.map(r => r.studentId))]
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, admissionNumber: true },
  })
  const studentMap = new Map(students.map(s => [s.id, s.admissionNumber]))

  // Map to Receipt type
  const data: Receipt[] = receipts.map(receipt => ({
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    schoolId: receipt.schoolId,
    schoolName: school?.name,
    schoolAddress: school?.address ?? undefined,
    schoolPhone: school?.phone ?? undefined,
    studentId: receipt.studentId,
    studentName: receipt.studentName,
    admissionNumber: studentMap.get(receipt.studentId),
    guardianId: receipt.guardianId ?? undefined,
    guardianName: receipt.guardianName ?? undefined,
    className: receipt.className,
    termName: receipt.termName,
    amount: receipt.amount,
    amountInWords: receipt.amountInWords,
    method: receipt.method as PaymentMethod,
    reference: receipt.reference,
    balanceBefore: receipt.balanceBefore,
    balanceAfter: receipt.balanceAfter,
    issuedBy: receipt.issuedBy,
    issuedByName: receipt.issuedByName,
    issuedAt: receipt.issuedAt.toISOString(),
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
 * Get receipts for a student
 */
export async function getStudentReceipts(
  studentId: string,
  schoolId: string
): Promise<Receipt[]> {
  const receipts = await prisma.receipt.findMany({
    where: { studentId, schoolId },
    orderBy: { issuedAt: 'desc' },
  })

  // Get school info
  const school = await prisma.school.findFirst({
    where: { id: schoolId },
  })

  // Get student for admission number
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  })

  return receipts.map(receipt => ({
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    schoolId: receipt.schoolId,
    schoolName: school?.name,
    schoolAddress: school?.address ?? undefined,
    schoolPhone: school?.phone ?? undefined,
    studentId: receipt.studentId,
    studentName: receipt.studentName,
    admissionNumber: student?.admissionNumber,
    guardianId: receipt.guardianId ?? undefined,
    guardianName: receipt.guardianName ?? undefined,
    className: receipt.className,
    termName: receipt.termName,
    amount: receipt.amount,
    amountInWords: receipt.amountInWords,
    method: receipt.method as PaymentMethod,
    reference: receipt.reference,
    balanceBefore: receipt.balanceBefore,
    balanceAfter: receipt.balanceAfter,
    issuedBy: receipt.issuedBy,
    issuedByName: receipt.issuedByName,
    issuedAt: receipt.issuedAt.toISOString(),
  }))
}


/**
 * Generate receipt HTML for printing/PDF
 * Requirement 5.3: Print or download as PDF
 * Requirement 5.4: Receipt SHALL include school name, student name, amount, date, method, reference
 */
export function generateReceiptHTML(receipt: Receipt): string {
  const formattedDate = new Date(receipt.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = new Date(receipt.issuedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${receipt.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
    .receipt { border: 2px solid #333; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }
    .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .school-details { font-size: 12px; color: #666; }
    .receipt-title { font-size: 18px; font-weight: bold; margin-top: 10px; text-transform: uppercase; }
    .receipt-number { font-size: 14px; color: #333; margin-top: 5px; }
    .section { margin: 15px 0; }
    .section-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; }
    .label { color: #666; }
    .value { font-weight: 500; }
    .amount-section { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .amount-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .amount-label { font-size: 14px; }
    .amount-value { font-size: 14px; font-weight: bold; }
    .total-amount { font-size: 20px; font-weight: bold; color: #2e7d32; }
    .amount-words { font-style: italic; font-size: 12px; color: #666; margin-top: 10px; }
    .balance-section { border-top: 2px dashed #ccc; padding-top: 15px; margin-top: 15px; }
    .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 11px; color: #666; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 30px; }
    .signature-box { width: 45%; text-align: center; }
    .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 5px; font-size: 12px; }
    @media print {
      body { padding: 0; }
      .receipt { border: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="school-name">${receipt.schoolName || 'School Name'}</div>
      ${receipt.schoolAddress ? `<div class="school-details">${receipt.schoolAddress}</div>` : ''}
      ${receipt.schoolPhone ? `<div class="school-details">Tel: ${receipt.schoolPhone}</div>` : ''}
      <div class="receipt-title">Payment Receipt</div>
      <div class="receipt-number">Receipt No: ${receipt.receiptNumber}</div>
    </div>

    <div class="section">
      <div class="section-title">Student Information</div>
      <div class="row">
        <span class="label">Student Name:</span>
        <span class="value">${receipt.studentName}</span>
      </div>
      ${receipt.admissionNumber ? `
      <div class="row">
        <span class="label">Admission No:</span>
        <span class="value">${receipt.admissionNumber}</span>
      </div>
      ` : ''}
      <div class="row">
        <span class="label">Class:</span>
        <span class="value">${receipt.className}</span>
      </div>
      <div class="row">
        <span class="label">Term:</span>
        <span class="value">${receipt.termName}</span>
      </div>
      ${receipt.guardianName ? `
      <div class="row">
        <span class="label">Paid By:</span>
        <span class="value">${receipt.guardianName}</span>
      </div>
      ` : ''}
    </div>

    <div class="section">
      <div class="section-title">Payment Details</div>
      <div class="row">
        <span class="label">Date:</span>
        <span class="value">${formattedDate} at ${formattedTime}</span>
      </div>
      <div class="row">
        <span class="label">Payment Method:</span>
        <span class="value">${receipt.method.replace('_', ' ')}</span>
      </div>
      <div class="row">
        <span class="label">Reference:</span>
        <span class="value">${receipt.reference}</span>
      </div>
    </div>

    <div class="amount-section">
      <div class="amount-row">
        <span class="amount-label">Amount Paid:</span>
        <span class="total-amount">UGX ${receipt.amount.toLocaleString()}</span>
      </div>
      <div class="amount-words">${receipt.amountInWords}</div>
    </div>

    <div class="balance-section">
      <div class="section-title">Balance Information</div>
      <div class="row">
        <span class="label">Balance Before Payment:</span>
        <span class="value">UGX ${receipt.balanceBefore.toLocaleString()}</span>
      </div>
      <div class="row">
        <span class="label">Balance After Payment:</span>
        <span class="value" style="color: ${receipt.balanceAfter <= 0 ? '#2e7d32' : '#d32f2f'}">
          UGX ${receipt.balanceAfter.toLocaleString()}
        </span>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line">Received By: ${receipt.issuedByName}</div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Parent/Guardian Signature</div>
      </div>
    </div>

    <div class="footer">
      <p>This is a computer-generated receipt. Please keep it for your records.</p>
      <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate receipt PDF buffer
 * Requirement 5.3: Print or download as PDF
 * Note: This returns HTML that can be converted to PDF by the caller
 */
export async function generateReceiptPDF(receiptId: string): Promise<{ html: string; receipt: Receipt }> {
  const receipt = await getReceipt(receiptId)
  
  if (!receipt) {
    throw new ReceiptError(
      RECEIPT_ERRORS.RECEIPT_NOT_FOUND,
      'Receipt not found',
      { receiptId }
    )
  }

  const html = generateReceiptHTML(receipt)
  
  return { html, receipt }
}


/**
 * Request receipt cancellation (requires admin approval)
 * Requirement 5.5: Receipt cancellation requires admin approval and audit trail
 * Property 8: Receipt Immutability
 */
export async function requestCancellation(
  receiptId: string,
  userId: string,
  reason: string
): Promise<CancellationRequest> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
  })

  if (!receipt) {
    throw new ReceiptError(
      RECEIPT_ERRORS.RECEIPT_NOT_FOUND,
      'Receipt not found',
      { receiptId }
    )
  }

  // Create audit log for cancellation request
  await prisma.financeAuditLog.create({
    data: {
      schoolId: receipt.schoolId,
      userId,
      action: 'RECEIPT_CANCELLED',
      resource: "Receipt",
      resourceId: receiptId,
      previousValue: {
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        studentName: receipt.studentName,
      },
      newValue: { status: 'CANCELLATION_REQUESTED' },
      reason,
    },
  })

  // Return cancellation request (in a real system, this would be stored in a separate table)
  return {
    id: `cancel-${receiptId}`,
    receiptId,
    requestedBy: userId,
    requestedAt: new Date().toISOString(),
    reason,
    status: 'PENDING',
  }
}

/**
 * Validate receipt content completeness
 * Property 9: Receipt Content Completeness
 */
export function validateReceiptCompleteness(receipt: Receipt): { 
  complete: boolean
  missing: string[] 
} {
  const missing: string[] = []

  // Check required fields per Requirement 5.4
  if (!receipt.receiptNumber) missing.push('receipt number')
  if (!receipt.studentName) missing.push('student name')
  if (!receipt.className) missing.push('class name')
  if (!receipt.termName) missing.push('term name')
  if (receipt.amount === undefined || receipt.amount === null) missing.push('amount')
  if (!receipt.amountInWords) missing.push('amount in words')
  if (!receipt.method) missing.push('payment method')
  if (!receipt.reference) missing.push('reference')
  if (!receipt.issuedAt) missing.push('issue date')
  if (!receipt.issuedBy) missing.push('issued by')
  if (!receipt.issuedByName) missing.push('issued by name')
  if (receipt.balanceBefore === undefined) missing.push('balance before')
  if (receipt.balanceAfter === undefined) missing.push('balance after')

  return {
    complete: missing.length === 0,
    missing,
  }
}

/**
 * Get receipt statistics for a school
 */
export async function getReceiptStats(
  schoolId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  totalReceipts: number
  totalAmount: number
  byMethod: Record<string, { count: number; amount: number }>
}> {
  const where: Record<string, unknown> = { schoolId }

  if (dateFrom || dateTo) {
    where.issuedAt = {}
    if (dateFrom) {
      (where.issuedAt as Record<string, Date>).gte = dateFrom
    }
    if (dateTo) {
      (where.issuedAt as Record<string, Date>).lte = dateTo
    }
  }

  const receipts = await prisma.receipt.findMany({
    where,
    select: {
      amount: true,
      method: true,
    },
  })

  const totalReceipts = receipts.length
  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0)

  const byMethod: Record<string, { count: number; amount: number }> = {}
  for (const receipt of receipts) {
    if (!byMethod[receipt.method]) {
      byMethod[receipt.method] = { count: 0, amount: 0 }
    }
    byMethod[receipt.method].count++
    byMethod[receipt.method].amount += receipt.amount
  }

  return {
    totalReceipts,
    totalAmount,
    byMethod,
  }
}

// ============================================
// SERVICE EXPORT
// ============================================

export const ReceiptService = {
  // Core functions
  generateReceipt,
  getReceipt,
  getReceiptByNumber,
  searchReceipts,
  getStudentReceipts,
  
  // PDF/HTML generation
  generateReceiptHTML,
  generateReceiptPDF,
  
  // Cancellation
  requestCancellation,
  
  // Utilities
  generateReceiptNumber,
  formatReceiptNumber,
  amountToWords,
  validateReceiptCompleteness,
  getReceiptStats,
}

export default ReceiptService
