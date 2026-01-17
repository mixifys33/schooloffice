/**
 * Finance Report Service
 * Generates comprehensive finance reports with accurate aggregations
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 *
 * Property 18: Report Total Consistency
 * For any generated report, the totals SHALL match the sum of actual receipt records for the same period.
 */
import { prisma } from '@/lib/db'
import type {
  DailyCollectionReport,
  TermCollectionReport,
  ClassCollectionReport,
  PaymentMethodReport,
  OutstandingBalancesReport,
  DiscountsPenaltiesReport,
  PaymentMethodBreakdown,
  ClassCollectionBreakdown,
  ClassTermCollection,
  StudentPaymentSummary,
  OutstandingStudent,
  AgingBucket,
  DiscountSummary,
  PenaltySummary,
  PaymentMethod,
} from '@/types/finance'
import { determinePaymentStatus } from './student-account.service'

// Error codes for report operations
export const REPORT_ERRORS = {
  SCHOOL_NOT_FOUND: 'SCHOOL_NOT_FOUND',
  TERM_NOT_FOUND: 'TERM_NOT_FOUND',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  EXPORT_FAILED: 'EXPORT_FAILED',
} as const

export class ReportError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ReportError'
  }
}


// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate days overdue from due date
 * Property 16: Days Overdue Calculation
 */
export function calculateDaysOverdue(dueDate: Date | null | undefined): number {
  if (!dueDate) return 0
  const now = new Date()
  const due = new Date(dueDate)
  if (now <= due) return 0
  const diffTime = now.getTime() - due.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate collection rate
 * Property 17: Collection Rate Calculation
 * collectionRate = (totalCollected / totalExpected) * 100
 */
export function calculateCollectionRate(collected: number, expected: number): number {
  if (expected <= 0) return 0
  return Math.round((collected / expected) * 10000) / 100
}

/**
 * Get aging bucket label and range
 */
export function getAgingBucket(daysOverdue: number): { label: string; minDays: number; maxDays?: number } {
  if (daysOverdue <= 30) return { label: '0-30 days', minDays: 0, maxDays: 30 }
  if (daysOverdue <= 60) return { label: '31-60 days', minDays: 31, maxDays: 60 }
  if (daysOverdue <= 90) return { label: '61-90 days', minDays: 61, maxDays: 90 }
  return { label: '90+ days', minDays: 91 }
}

/**
 * Group payments by method and calculate totals
 */
function groupPaymentsByMethod(
  payments: { amount: number; method: string }[]
): PaymentMethodBreakdown[] {
  const methodTotals: Record<string, { amount: number; count: number }> = {}
  let totalAmount = 0

  for (const payment of payments) {
    const method = payment.method
    if (!methodTotals[method]) {
      methodTotals[method] = { amount: 0, count: 0 }
    }
    methodTotals[method].amount += payment.amount
    methodTotals[method].count++
    totalAmount += payment.amount
  }

  return Object.entries(methodTotals).map(([method, data]) => ({
    method: method as PaymentMethod,
    amount: data.amount,
    count: data.count,
    percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 10000) / 100 : 0,
  }))
}


// ============================================
// DAILY COLLECTIONS REPORT
// ============================================

/**
 * Get daily collections report
 * Requirement 9.1: Show all payments received on that date with totals by method
 * Property 18: Report Total Consistency - totals match actual receipt records
 */
export async function getDailyCollections(
  schoolId: string,
  date: Date
): Promise<DailyCollectionReport> {
  // Validate school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  })

  if (!school) {
    throw new ReportError(
      REPORT_ERRORS.SCHOOL_NOT_FOUND,
      'School not found',
      { schoolId }
    )
  }

  // Get start and end of day
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  // Get all confirmed payments for the day (Property 18 - use actual payment records)
  const payments = await prisma.payment.findMany({
    where: {
      schoolId,
      status: 'CONFIRMED',
      receivedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      student: {
        include: {
          class: true,
        },
      },
    },
    orderBy: { receivedAt: 'asc' },
  })

  // Calculate total amount (Property 18 - sum from actual records)
  const totalAmount = payments.reduce((sum: number, p) => sum + p.amount, 0)

  // Group by payment method
  const byMethod = groupPaymentsByMethod(
    payments.map(p => ({ amount: p.amount, method: p.method }))
  )

  // Group by class
  const classTotals: Record<string, { classId: string; className: string; amount: number; count: number }> = {}
  for (const payment of payments) {
    const classId = payment.student.classId
    const className = payment.student.class.name
    if (!classTotals[classId]) {
      classTotals[classId] = { classId, className, amount: 0, count: 0 }
    }
    classTotals[classId].amount += payment.amount
    classTotals[classId].count++
  }

  const byClass: ClassCollectionBreakdown[] = Object.values(classTotals)

  return {
    date: startOfDay.toISOString().split('T')[0],
    schoolId,
    totalAmount,
    transactionCount: payments.length,
    byMethod,
    byClass,
  }
}


// ============================================
// TERM COLLECTIONS REPORT
// ============================================

/**
 * Get term collections report
 * Requirement 9.2: Show cumulative collections with breakdown by class and method
 * Property 17: Collection Rate Calculation
 * Property 18: Report Total Consistency
 */
export async function getTermCollections(
  schoolId: string,
  termId: string
): Promise<TermCollectionReport> {
  // Validate school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  })

  if (!school) {
    throw new ReportError(
      REPORT_ERRORS.SCHOOL_NOT_FOUND,
      'School not found',
      { schoolId }
    )
  }

  // Validate term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new ReportError(
      REPORT_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get all classes in the school
  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: { level: 'asc' },
  })

  // Get all confirmed payments for the term (Property 18)
  const payments = await prisma.payment.findMany({
    where: {
      schoolId,
      termId,
      status: 'CONFIRMED',
    },
    include: {
      student: true,
    },
  })

  // Get all fee structures for the term
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      termId,
      isActive: true,
    },
  })

  // Get all student accounts
  const studentAccounts = await prisma.studentAccount.findMany({
    where: { schoolId },
    include: {
      student: {
        include: { class: true },
      },
    },
  })

  // Calculate totals by class
  const byClass: ClassTermCollection[] = []
  let totalExpected = 0
  let totalCollected = 0

  for (const classRecord of classes) {
    // Get students in this class
    const classStudents = studentAccounts.filter(
      sa => sa.student.classId === classRecord.id && sa.student.status === 'ACTIVE'
    )

    // Get fee structure for this class
    const classFeeStructures = feeStructures.filter(fs => fs.classId === classRecord.id)
    
    // Calculate expected fees for this class
    let classExpected = 0
    for (const student of classStudents) {
      const applicableFeeStructure = classFeeStructures.find(
        fs => fs.studentType === student.studentType
      )
      if (applicableFeeStructure) {
        classExpected += applicableFeeStructure.totalAmount
      }
    }

    // Calculate collected for this class
    const classPayments = payments.filter(p => p.student.classId === classRecord.id)
    const classCollected = classPayments.reduce((sum: number, p) => sum + p.amount, 0)

    // Count by payment status
    let paidCount = 0
    let partialCount = 0
    let unpaidCount = 0

    for (const student of classStudents) {
      const status = determinePaymentStatus(
        student.totalFees,
        student.totalPaid,
        student.balance
      )
      if (status === 'PAID' || status === 'OVERPAID') paidCount++
      else if (status === 'PARTIAL') partialCount++
      else unpaidCount++
    }

    byClass.push({
      classId: classRecord.id,
      className: classRecord.name,
      expected: classExpected,
      collected: classCollected,
      outstanding: classExpected - classCollected,
      studentCount: classStudents.length,
      paidCount,
      partialCount,
      unpaidCount,
      collectionRate: calculateCollectionRate(classCollected, classExpected),
    })

    totalExpected += classExpected
    totalCollected += classCollected
  }

  // Group payments by method
  const byMethod = groupPaymentsByMethod(
    payments.map(p => ({ amount: p.amount, method: p.method }))
  )

  return {
    termId,
    termName: term.name,
    schoolId,
    totalExpected,
    totalCollected,
    totalOutstanding: totalExpected - totalCollected,
    collectionRate: calculateCollectionRate(totalCollected, totalExpected),
    byClass,
    byMethod,
  }
}


// ============================================
// CLASS COLLECTIONS REPORT
// ============================================

/**
 * Get class collections report
 * Requirement 9.3: Show each student's payment status and class totals
 * Property 15: Payment Status Categorization
 * Property 18: Report Total Consistency
 */
export async function getClassCollections(
  schoolId: string,
  classId: string,
  termId: string
): Promise<ClassCollectionReport> {
  // Validate school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  })

  if (!school) {
    throw new ReportError(
      REPORT_ERRORS.SCHOOL_NOT_FOUND,
      'School not found',
      { schoolId }
    )
  }

  // Validate class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  })

  if (!classRecord || classRecord.schoolId !== schoolId) {
    throw new ReportError(
      REPORT_ERRORS.CLASS_NOT_FOUND,
      'Class not found',
      { classId }
    )
  }

  // Validate term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new ReportError(
      REPORT_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get fee structure for this class/term
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      classId,
      termId,
      isActive: true,
    },
  })

  // Get all active students in the class with their accounts
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      classId,
      status: 'ACTIVE',
    },
    include: {
      account: true,
      stream: true,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  // Get payments for this class/term
  const payments = await prisma.payment.findMany({
    where: {
      schoolId,
      termId,
      status: 'CONFIRMED',
      student: { classId },
    },
  })

  // Build student payment summaries
  const studentSummaries: StudentPaymentSummary[] = []
  let totalExpected = 0
  let totalCollected = 0

  for (const student of students) {
    // Get applicable fee structure based on student type
    const studentType = student.account?.studentType || 'DAY'
    const applicableFeeStructure = feeStructures.find(
      fs => fs.studentType === studentType
    )
    const totalFees = applicableFeeStructure?.totalAmount || 0

    // Get student's payments for this term
    const studentPayments = payments.filter(p => p.studentId === student.id)
    const totalPaid = studentPayments.reduce((sum: number, p) => sum + p.amount, 0)

    // Calculate balance
    const totalDiscounts = student.account?.totalDiscounts || 0
    const totalPenalties = student.account?.totalPenalties || 0
    const balance = totalFees - totalPaid - totalDiscounts + totalPenalties

    // Determine payment status (Property 15)
    const status = determinePaymentStatus(totalFees, totalPaid, balance)

    // Get last payment date
    const lastPayment = studentPayments.length > 0
      ? studentPayments.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())[0]
      : null

    // Calculate days overdue (Property 16)
    const dueDate = applicableFeeStructure?.dueDate
    const daysOverdue = balance > 0 ? calculateDaysOverdue(dueDate) : 0

    studentSummaries.push({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      totalFees,
      totalPaid,
      balance,
      status,
      lastPaymentDate: lastPayment?.receivedAt.toISOString(),
      daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
    })

    totalExpected += totalFees
    totalCollected += totalPaid
  }

  return {
    classId,
    className: classRecord.name,
    termId,
    termName: term.name,
    totalExpected,
    totalCollected,
    totalOutstanding: totalExpected - totalCollected,
    collectionRate: calculateCollectionRate(totalCollected, totalExpected),
    students: studentSummaries,
  }
}


// ============================================
// PAYMENT METHOD BREAKDOWN
// ============================================

/**
 * Get payment method breakdown
 * Requirement 9.4: Show totals and percentages for each payment method
 * Property 18: Report Total Consistency
 */
export async function getPaymentMethodBreakdown(
  schoolId: string,
  termId: string
): Promise<PaymentMethodReport> {
  // Validate school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  })

  if (!school) {
    throw new ReportError(
      REPORT_ERRORS.SCHOOL_NOT_FOUND,
      'School not found',
      { schoolId }
    )
  }

  // Validate term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new ReportError(
      REPORT_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get all confirmed payments for the term (Property 18)
  const payments = await prisma.payment.findMany({
    where: {
      schoolId,
      termId,
      status: 'CONFIRMED',
    },
    select: {
      amount: true,
      method: true,
    },
  })

  // Calculate total amount
  const totalAmount = payments.reduce((sum: number, p) => sum + p.amount, 0)

  // Group by method with percentages
  const methods = groupPaymentsByMethod(
    payments.map(p => ({ amount: p.amount, method: p.method }))
  )

  return {
    termId,
    termName: term.name,
    totalAmount,
    methods,
  }
}


// ============================================
// OUTSTANDING BALANCES REPORT
// ============================================

/**
 * Get outstanding balances report with aging
 * Requirement 9.5: Show all unpaid and partial balances with aging
 * Property 16: Days Overdue Calculation
 * Property 18: Report Total Consistency
 */
export async function getOutstandingBalances(
  schoolId: string,
  termId: string
): Promise<OutstandingBalancesReport> {
  // Validate school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  })

  if (!school) {
    throw new ReportError(
      REPORT_ERRORS.SCHOOL_NOT_FOUND,
      'School not found',
      { schoolId }
    )
  }

  // Validate term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new ReportError(
      REPORT_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get all student accounts with outstanding balances
  const accounts = await prisma.studentAccount.findMany({
    where: {
      schoolId,
      balance: { gt: 0 },
    },
    include: {
      student: {
        include: {
          class: true,
          studentGuardians: {
            where: { isPrimary: true },
            include: { guardian: true },
          },
        },
      },
    },
    orderBy: { balance: 'desc' },
  })

  // Get fee structures for due dates
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      termId,
      isActive: true,
    },
  })

  // Build outstanding students list
  const students: OutstandingStudent[] = []
  const agingBuckets: Record<string, { amount: number; count: number; minDays: number; maxDays?: number }> = {
    '0-30 days': { amount: 0, count: 0, minDays: 0, maxDays: 30 },
    '31-60 days': { amount: 0, count: 0, minDays: 31, maxDays: 60 },
    '61-90 days': { amount: 0, count: 0, minDays: 61, maxDays: 90 },
    '90+ days': { amount: 0, count: 0, minDays: 91 },
  }

  let totalOutstanding = 0

  for (const account of accounts) {
    if (account.student.status !== 'ACTIVE') continue

    // Get applicable fee structure for due date
    const applicableFeeStructure = feeStructures.find(
      fs => fs.classId === account.student.classId && fs.studentType === account.studentType
    )
    const dueDate = applicableFeeStructure?.dueDate

    // Calculate days overdue (Property 16)
    const daysOverdue = calculateDaysOverdue(dueDate)

    // Get primary guardian info
    const primaryGuardian = account.student.studentGuardians[0]?.guardian

    // Get last payment date
    const lastPayment = await prisma.payment.findFirst({
      where: {
        studentId: account.studentId,
        schoolId,
        status: 'CONFIRMED',
      },
      orderBy: { receivedAt: 'desc' },
    })

    students.push({
      studentId: account.studentId,
      studentName: `${account.student.firstName} ${account.student.lastName}`,
      admissionNumber: account.student.admissionNumber,
      className: account.student.class.name,
      guardianName: primaryGuardian
        ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}`
        : undefined,
      guardianPhone: primaryGuardian?.phone,
      balance: account.balance,
      dueDate: dueDate?.toISOString(),
      daysOverdue,
      lastPaymentDate: lastPayment?.receivedAt.toISOString(),
    })

    totalOutstanding += account.balance

    // Add to aging bucket
    const bucket = getAgingBucket(daysOverdue)
    if (agingBuckets[bucket.label]) {
      agingBuckets[bucket.label].amount += account.balance
      agingBuckets[bucket.label].count++
    }
  }

  // Convert aging buckets to array
  const byAging: AgingBucket[] = Object.entries(agingBuckets).map(([label, data]) => ({
    label,
    minDays: data.minDays,
    maxDays: data.maxDays,
    amount: data.amount,
    count: data.count,
  }))

  return {
    termId,
    termName: term.name,
    totalOutstanding,
    studentCount: students.length,
    students,
    byAging,
  }
}


// ============================================
// DISCOUNTS AND PENALTIES REPORT
// ============================================

/**
 * Get discounts and penalties report
 * Requirement 9.6: Show all applied discounts and penalties with totals
 * Property 18: Report Total Consistency
 */
export async function getDiscountsAndPenalties(
  schoolId: string,
  termId: string
): Promise<DiscountsPenaltiesReport> {
  // Validate school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  })

  if (!school) {
    throw new ReportError(
      REPORT_ERRORS.SCHOOL_NOT_FOUND,
      'School not found',
      { schoolId }
    )
  }

  // Validate term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new ReportError(
      REPORT_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get all approved discounts for the term
  const discounts = await prisma.studentDiscount.findMany({
    where: {
      termId,
      status: 'APPROVED',
      studentAccount: { schoolId },
    },
  })

  // Get all penalties for the term (including waived for reporting)
  const penalties = await prisma.studentPenalty.findMany({
    where: {
      termId,
      studentAccount: { schoolId },
    },
  })

  // Calculate discount totals
  const totalDiscounts = discounts.reduce((sum: number, d) => sum + d.calculatedAmount, 0)
  const discountCount = discounts.length

  // Group discounts by name/type
  const discountGroups: Record<string, { name: string; type: string; count: number; totalAmount: number }> = {}
  for (const discount of discounts) {
    const key = discount.name
    if (!discountGroups[key]) {
      discountGroups[key] = {
        name: discount.name,
        type: discount.type,
        count: 0,
        totalAmount: 0,
      }
    }
    discountGroups[key].count++
    discountGroups[key].totalAmount += discount.calculatedAmount
  }

  const discountSummaries: DiscountSummary[] = Object.values(discountGroups).map((g) => ({
    name: g.name,
    type: g.type as DiscountSummary['type'],
    count: g.count,
    totalAmount: g.totalAmount,
  }))

  // Calculate penalty totals
  const activePenalties = penalties.filter(p => !p.isWaived)
  const totalPenalties = activePenalties.reduce((sum: number, p) => sum + p.amount, 0)
  const penaltyCount = activePenalties.length

  // Group penalties by name
  const penaltyGroups: Record<string, { name: string; count: number; totalAmount: number; waivedCount: number; waivedAmount: number }> = {}
  for (const penalty of penalties) {
    const key = penalty.name
    if (!penaltyGroups[key]) {
      penaltyGroups[key] = {
        name: penalty.name,
        count: 0,
        totalAmount: 0,
        waivedCount: 0,
        waivedAmount: 0,
      }
    }
    if (penalty.isWaived) {
      penaltyGroups[key].waivedCount++
      penaltyGroups[key].waivedAmount += penalty.amount
    } else {
      penaltyGroups[key].count++
      penaltyGroups[key].totalAmount += penalty.amount
    }
  }

  const penaltySummaries: PenaltySummary[] = Object.values(penaltyGroups).map((g) => ({
    name: g.name,
    count: g.count,
    totalAmount: g.totalAmount,
    waivedCount: g.waivedCount,
    waivedAmount: g.waivedAmount,
  }))

  return {
    termId,
    termName: term.name,
    totalDiscounts,
    totalPenalties,
    discountCount,
    penaltyCount,
    discounts: discountSummaries,
    penalties: penaltySummaries,
  }
}


// ============================================
// EXPORT REPORT
// ============================================

/**
 * Export report to CSV or PDF format
 * Requirement 9.7: Allow export to CSV or PDF
 * Property 18: Report Total Consistency - exported data matches source
 */
export async function exportReport(
  reportType: ReportType,
  data: ReportData,
  format: 'CSV' | 'PDF'
): Promise<Buffer> {
  if (format === 'CSV') {
    return exportToCSV(reportType, data)
  } else {
    return exportToPDF(reportType, data)
  }
}

// Report type union for type safety
export type ReportType = 
  | 'daily_collections'
  | 'term_collections'
  | 'class_collections'
  | 'payment_method'
  | 'outstanding_balances'
  | 'discounts_penalties'

// Report data union type
export type ReportData = 
  | DailyCollectionReport
  | TermCollectionReport
  | ClassCollectionReport
  | PaymentMethodReport
  | OutstandingBalancesReport
  | DiscountsPenaltiesReport

/**
 * Export report data to CSV format
 */
function exportToCSV(reportType: ReportType, data: ReportData): Buffer {
  let csvContent = ''

  switch (reportType) {
    case 'daily_collections':
      csvContent = formatDailyCollectionsCSV(data as DailyCollectionReport)
      break
    case 'term_collections':
      csvContent = formatTermCollectionsCSV(data as TermCollectionReport)
      break
    case 'class_collections':
      csvContent = formatClassCollectionsCSV(data as ClassCollectionReport)
      break
    case 'payment_method':
      csvContent = formatPaymentMethodCSV(data as PaymentMethodReport)
      break
    case 'outstanding_balances':
      csvContent = formatOutstandingBalancesCSV(data as OutstandingBalancesReport)
      break
    case 'discounts_penalties':
      csvContent = formatDiscountsPenaltiesCSV(data as DiscountsPenaltiesReport)
      break
    default:
      throw new ReportError(
        REPORT_ERRORS.EXPORT_FAILED,
        `Unknown report type: ${reportType}`
      )
  }

  return Buffer.from(csvContent, 'utf-8')
}

/**
 * Export report data to PDF format
 * Note: Returns a simple text-based PDF structure
 * For production, integrate with a PDF library like pdfkit or puppeteer
 */
function exportToPDF(reportType: ReportType, data: ReportData): Buffer {
  let pdfContent = ''

  switch (reportType) {
    case 'daily_collections':
      pdfContent = formatDailyCollectionsPDF(data as DailyCollectionReport)
      break
    case 'term_collections':
      pdfContent = formatTermCollectionsPDF(data as TermCollectionReport)
      break
    case 'class_collections':
      pdfContent = formatClassCollectionsPDF(data as ClassCollectionReport)
      break
    case 'payment_method':
      pdfContent = formatPaymentMethodPDF(data as PaymentMethodReport)
      break
    case 'outstanding_balances':
      pdfContent = formatOutstandingBalancesPDF(data as OutstandingBalancesReport)
      break
    case 'discounts_penalties':
      pdfContent = formatDiscountsPenaltiesPDF(data as DiscountsPenaltiesReport)
      break
    default:
      throw new ReportError(
        REPORT_ERRORS.EXPORT_FAILED,
        `Unknown report type: ${reportType}`
      )
  }

  return Buffer.from(pdfContent, 'utf-8')
}


// ============================================
// CSV FORMATTERS
// ============================================

function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDailyCollectionsCSV(report: DailyCollectionReport): string {
  const lines: string[] = []
  
  lines.push('Daily Collections Report')
  lines.push(`Date,${report.date}`)
  lines.push(`Total Amount,${report.totalAmount}`)
  lines.push(`Transaction Count,${report.transactionCount}`)
  lines.push('')
  
  lines.push('Collections by Payment Method')
  lines.push('Method,Amount,Count,Percentage')
  for (const method of report.byMethod) {
    lines.push(`${method.method},${method.amount},${method.count},${method.percentage || 0}%`)
  }
  lines.push('')
  
  lines.push('Collections by Class')
  lines.push('Class,Amount,Count')
  for (const cls of report.byClass) {
    lines.push(`${escapeCSV(cls.className)},${cls.amount},${cls.count}`)
  }
  
  return lines.join('\n')
}

function formatTermCollectionsCSV(report: TermCollectionReport): string {
  const lines: string[] = []
  
  lines.push('Term Collections Report')
  lines.push(`Term,${escapeCSV(report.termName)}`)
  lines.push(`Total Expected,${report.totalExpected}`)
  lines.push(`Total Collected,${report.totalCollected}`)
  lines.push(`Total Outstanding,${report.totalOutstanding}`)
  lines.push(`Collection Rate,${report.collectionRate}%`)
  lines.push('')
  
  lines.push('Collections by Class')
  lines.push('Class,Expected,Collected,Outstanding,Students,Paid,Partial,Unpaid,Collection Rate')
  for (const cls of report.byClass) {
    lines.push([
      escapeCSV(cls.className),
      cls.expected,
      cls.collected,
      cls.outstanding,
      cls.studentCount,
      cls.paidCount,
      cls.partialCount,
      cls.unpaidCount,
      `${cls.collectionRate}%`
    ].join(','))
  }
  lines.push('')
  
  lines.push('Collections by Payment Method')
  lines.push('Method,Amount,Count,Percentage')
  for (const method of report.byMethod) {
    lines.push(`${method.method},${method.amount},${method.count},${method.percentage || 0}%`)
  }
  
  return lines.join('\n')
}

function formatClassCollectionsCSV(report: ClassCollectionReport): string {
  const lines: string[] = []
  
  lines.push('Class Collections Report')
  lines.push(`Class,${escapeCSV(report.className)}`)
  lines.push(`Term,${escapeCSV(report.termName)}`)
  lines.push(`Total Expected,${report.totalExpected}`)
  lines.push(`Total Collected,${report.totalCollected}`)
  lines.push(`Total Outstanding,${report.totalOutstanding}`)
  lines.push(`Collection Rate,${report.collectionRate}%`)
  lines.push('')
  
  lines.push('Student Payment Details')
  lines.push('Student Name,Admission No,Total Fees,Total Paid,Balance,Status,Last Payment,Days Overdue')
  for (const student of report.students) {
    lines.push([
      escapeCSV(student.studentName),
      escapeCSV(student.admissionNumber),
      student.totalFees,
      student.totalPaid,
      student.balance,
      student.status,
      student.lastPaymentDate || '',
      student.daysOverdue || ''
    ].join(','))
  }
  
  return lines.join('\n')
}

function formatPaymentMethodCSV(report: PaymentMethodReport): string {
  const lines: string[] = []
  
  lines.push('Payment Method Breakdown Report')
  lines.push(`Term,${escapeCSV(report.termName)}`)
  lines.push(`Total Amount,${report.totalAmount}`)
  lines.push('')
  
  lines.push('Payment Methods')
  lines.push('Method,Amount,Count,Percentage')
  for (const method of report.methods) {
    lines.push(`${method.method},${method.amount},${method.count},${method.percentage || 0}%`)
  }
  
  return lines.join('\n')
}

function formatOutstandingBalancesCSV(report: OutstandingBalancesReport): string {
  const lines: string[] = []
  
  lines.push('Outstanding Balances Report')
  lines.push(`Term,${escapeCSV(report.termName)}`)
  lines.push(`Total Outstanding,${report.totalOutstanding}`)
  lines.push(`Student Count,${report.studentCount}`)
  lines.push('')
  
  lines.push('Aging Summary')
  lines.push('Period,Amount,Count')
  for (const bucket of report.byAging) {
    lines.push(`${bucket.label},${bucket.amount},${bucket.count}`)
  }
  lines.push('')
  
  lines.push('Outstanding Students')
  lines.push('Student Name,Admission No,Class,Guardian,Phone,Balance,Due Date,Days Overdue,Last Payment')
  for (const student of report.students) {
    lines.push([
      escapeCSV(student.studentName),
      escapeCSV(student.admissionNumber),
      escapeCSV(student.className),
      escapeCSV(student.guardianName),
      escapeCSV(student.guardianPhone),
      student.balance,
      student.dueDate || '',
      student.daysOverdue,
      student.lastPaymentDate || ''
    ].join(','))
  }
  
  return lines.join('\n')
}

function formatDiscountsPenaltiesCSV(report: DiscountsPenaltiesReport): string {
  const lines: string[] = []
  
  lines.push('Discounts and Penalties Report')
  lines.push(`Term,${escapeCSV(report.termName)}`)
  lines.push(`Total Discounts,${report.totalDiscounts}`)
  lines.push(`Total Penalties,${report.totalPenalties}`)
  lines.push(`Discount Count,${report.discountCount}`)
  lines.push(`Penalty Count,${report.penaltyCount}`)
  lines.push('')
  
  lines.push('Discounts Summary')
  lines.push('Name,Type,Count,Total Amount')
  for (const discount of report.discounts) {
    lines.push(`${escapeCSV(discount.name)},${discount.type},${discount.count},${discount.totalAmount}`)
  }
  lines.push('')
  
  lines.push('Penalties Summary')
  lines.push('Name,Count,Total Amount,Waived Count,Waived Amount')
  for (const penalty of report.penalties) {
    lines.push([
      escapeCSV(penalty.name),
      penalty.count,
      penalty.totalAmount,
      penalty.waivedCount,
      penalty.waivedAmount
    ].join(','))
  }
  
  return lines.join('\n')
}


// ============================================
// PDF FORMATTERS (Simple text-based)
// ============================================

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDailyCollectionsPDF(report: DailyCollectionReport): string {
  const lines: string[] = []
  
  lines.push('='.repeat(60))
  lines.push('DAILY COLLECTIONS REPORT')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Date: ${report.date}`)
  lines.push(`Total Amount: ${formatCurrency(report.totalAmount)}`)
  lines.push(`Transaction Count: ${report.transactionCount}`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('COLLECTIONS BY PAYMENT METHOD')
  lines.push('-'.repeat(60))
  for (const method of report.byMethod) {
    lines.push(`${method.method.padEnd(20)} ${formatCurrency(method.amount).padStart(15)} (${method.count} transactions, ${method.percentage || 0}%)`)
  }
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('COLLECTIONS BY CLASS')
  lines.push('-'.repeat(60))
  for (const cls of report.byClass) {
    lines.push(`${cls.className.padEnd(20)} ${formatCurrency(cls.amount).padStart(15)} (${cls.count} transactions)`)
  }
  lines.push('')
  lines.push('='.repeat(60))
  lines.push(`Generated: ${new Date().toISOString()}`)
  
  return lines.join('\n')
}

function formatTermCollectionsPDF(report: TermCollectionReport): string {
  const lines: string[] = []
  
  lines.push('='.repeat(60))
  lines.push('TERM COLLECTIONS REPORT')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Term: ${report.termName}`)
  lines.push(`Total Expected: ${formatCurrency(report.totalExpected)}`)
  lines.push(`Total Collected: ${formatCurrency(report.totalCollected)}`)
  lines.push(`Total Outstanding: ${formatCurrency(report.totalOutstanding)}`)
  lines.push(`Collection Rate: ${report.collectionRate}%`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('COLLECTIONS BY CLASS')
  lines.push('-'.repeat(60))
  for (const cls of report.byClass) {
    lines.push(`${cls.className}`)
    lines.push(`  Expected: ${formatCurrency(cls.expected)} | Collected: ${formatCurrency(cls.collected)} | Outstanding: ${formatCurrency(cls.outstanding)}`)
    lines.push(`  Students: ${cls.studentCount} | Paid: ${cls.paidCount} | Partial: ${cls.partialCount} | Unpaid: ${cls.unpaidCount}`)
    lines.push(`  Collection Rate: ${cls.collectionRate}%`)
    lines.push('')
  }
  lines.push('-'.repeat(60))
  lines.push('COLLECTIONS BY PAYMENT METHOD')
  lines.push('-'.repeat(60))
  for (const method of report.byMethod) {
    lines.push(`${method.method.padEnd(20)} ${formatCurrency(method.amount).padStart(15)} (${method.percentage || 0}%)`)
  }
  lines.push('')
  lines.push('='.repeat(60))
  lines.push(`Generated: ${new Date().toISOString()}`)
  
  return lines.join('\n')
}

function formatClassCollectionsPDF(report: ClassCollectionReport): string {
  const lines: string[] = []
  
  lines.push('='.repeat(60))
  lines.push('CLASS COLLECTIONS REPORT')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Class: ${report.className}`)
  lines.push(`Term: ${report.termName}`)
  lines.push(`Total Expected: ${formatCurrency(report.totalExpected)}`)
  lines.push(`Total Collected: ${formatCurrency(report.totalCollected)}`)
  lines.push(`Total Outstanding: ${formatCurrency(report.totalOutstanding)}`)
  lines.push(`Collection Rate: ${report.collectionRate}%`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('STUDENT PAYMENT DETAILS')
  lines.push('-'.repeat(60))
  for (const student of report.students) {
    lines.push(`${student.studentName} (${student.admissionNumber})`)
    lines.push(`  Fees: ${formatCurrency(student.totalFees)} | Paid: ${formatCurrency(student.totalPaid)} | Balance: ${formatCurrency(student.balance)}`)
    lines.push(`  Status: ${student.status}${student.daysOverdue ? ` | ${student.daysOverdue} days overdue` : ''}`)
    lines.push('')
  }
  lines.push('='.repeat(60))
  lines.push(`Generated: ${new Date().toISOString()}`)
  
  return lines.join('\n')
}

function formatPaymentMethodPDF(report: PaymentMethodReport): string {
  const lines: string[] = []
  
  lines.push('='.repeat(60))
  lines.push('PAYMENT METHOD BREAKDOWN REPORT')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Term: ${report.termName}`)
  lines.push(`Total Amount: ${formatCurrency(report.totalAmount)}`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('BREAKDOWN BY METHOD')
  lines.push('-'.repeat(60))
  for (const method of report.methods) {
    lines.push(`${method.method.padEnd(20)} ${formatCurrency(method.amount).padStart(15)}`)
    lines.push(`  Transactions: ${method.count} | Percentage: ${method.percentage || 0}%`)
    lines.push('')
  }
  lines.push('='.repeat(60))
  lines.push(`Generated: ${new Date().toISOString()}`)
  
  return lines.join('\n')
}

function formatOutstandingBalancesPDF(report: OutstandingBalancesReport): string {
  const lines: string[] = []
  
  lines.push('='.repeat(60))
  lines.push('OUTSTANDING BALANCES REPORT')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Term: ${report.termName}`)
  lines.push(`Total Outstanding: ${formatCurrency(report.totalOutstanding)}`)
  lines.push(`Students with Balance: ${report.studentCount}`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('AGING SUMMARY')
  lines.push('-'.repeat(60))
  for (const bucket of report.byAging) {
    lines.push(`${bucket.label.padEnd(15)} ${formatCurrency(bucket.amount).padStart(15)} (${bucket.count} students)`)
  }
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('OUTSTANDING STUDENTS')
  lines.push('-'.repeat(60))
  for (const student of report.students) {
    lines.push(`${student.studentName} (${student.admissionNumber}) - ${student.className}`)
    lines.push(`  Balance: ${formatCurrency(student.balance)} | Days Overdue: ${student.daysOverdue}`)
    if (student.guardianName) {
      lines.push(`  Guardian: ${student.guardianName}${student.guardianPhone ? ` (${student.guardianPhone})` : ''}`)
    }
    lines.push('')
  }
  lines.push('='.repeat(60))
  lines.push(`Generated: ${new Date().toISOString()}`)
  
  return lines.join('\n')
}

function formatDiscountsPenaltiesPDF(report: DiscountsPenaltiesReport): string {
  const lines: string[] = []
  
  lines.push('='.repeat(60))
  lines.push('DISCOUNTS AND PENALTIES REPORT')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`Term: ${report.termName}`)
  lines.push(`Total Discounts: ${formatCurrency(report.totalDiscounts)} (${report.discountCount} applied)`)
  lines.push(`Total Penalties: ${formatCurrency(report.totalPenalties)} (${report.penaltyCount} applied)`)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('DISCOUNTS SUMMARY')
  lines.push('-'.repeat(60))
  for (const discount of report.discounts) {
    lines.push(`${discount.name} (${discount.type})`)
    lines.push(`  Count: ${discount.count} | Total: ${formatCurrency(discount.totalAmount)}`)
    lines.push('')
  }
  lines.push('-'.repeat(60))
  lines.push('PENALTIES SUMMARY')
  lines.push('-'.repeat(60))
  for (const penalty of report.penalties) {
    lines.push(`${penalty.name}`)
    lines.push(`  Applied: ${penalty.count} (${formatCurrency(penalty.totalAmount)})`)
    lines.push(`  Waived: ${penalty.waivedCount} (${formatCurrency(penalty.waivedAmount)})`)
    lines.push('')
  }
  lines.push('='.repeat(60))
  lines.push(`Generated: ${new Date().toISOString()}`)
  
  return lines.join('\n')
}
