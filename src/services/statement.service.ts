/**
 * Statement Service
 * Generates financial statements for students and guardians
 * Requirements: 6.2, 6.3, 6.4
 *
 * Property 27: Statement Running Balance
 * For any student statement, the running balance after each transaction
 * SHALL be correctly calculated based on the previous balance and transaction amount.
 *
 * Property 28: Guardian Statement Aggregation
 * For any guardian statement, the financial data SHALL aggregate all linked students' transactions.
 */   
import { prisma } from '@/lib/db'
import type {
  StudentStatement,
  GuardianStatement,
  GuardianStudentSummary,
  ClassSummary,
  TransactionEntry,
  PaymentStatusCategory,
} from '@/types/finance'
import { updateBalanceAfterPayment } from './student-account.service'

// Error codes for statement operations
export const STATEMENT_ERRORS = {
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  GUARDIAN_NOT_FOUND: 'GUARDIAN_NOT_FOUND',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  TERM_NOT_FOUND: 'TERM_NOT_FOUND',
  SCHOOL_NOT_FOUND: 'SCHOOL_NOT_FOUND',
  NO_TRANSACTIONS: 'NO_TRANSACTIONS',
} as const

export class StatementError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'StatementError'
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get transaction description based on type
 */
function getTransactionDescription(
  type: 'fee' | 'payment' | 'discount' | 'penalty',
  details: { name?: string; method?: string; reference?: string }
): string {
  switch (type) {
    case 'fee':
      return `Fee Charge: ${details.name || 'Term Fees'}`
    case 'payment':
      return `Payment (${details.method?.replace('_', ' ') || 'Cash'}) - Ref: ${details.reference || 'N/A'}`
    case 'discount':
      return `Discount: ${details.name || 'Applied Discount'}`
    case 'penalty':
      return `Penalty: ${details.name || 'Late Payment Penalty'}`
    default:
      return 'Transaction'
  }
}


// ============================================
// STUDENT STATEMENT GENERATION
// ============================================

/**
 * Generate student statement with running balance
 * Requirement 6.2: Statement SHALL show complete transaction history with running balance
 * Property 27: Statement Running Balance
 */
export async function generateStudentStatement(
  studentId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<StudentStatement> {
  // Get student with school info
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      school: true,
      class: true,
      stream: true,
      account: true,
    },
  })

  if (!student) {
    throw new StatementError(
      STATEMENT_ERRORS.STUDENT_NOT_FOUND,
      'Student not found',
      { studentId }
    )
  }

  const schoolId = student.schoolId
  const transactions: TransactionEntry[] = []

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (dateFrom) dateFilter.gte = dateFrom
  if (dateTo) dateFilter.lte = dateTo

  // Get fee structures (debits) - these represent charges
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      classId: student.classId,
      studentType: student.account?.studentType || 'DAY',
      isActive: true,
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
    },
    include: {
      items: true,
      term: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Add fee charges as debit transactions
  for (const fs of feeStructures) {
    transactions.push({
      id: fs.id,
      date: formatDate(fs.createdAt),
      description: `Term Fees - ${fs.term.name}`,
      type: 'DEBIT',
      amount: fs.totalAmount,
      runningBalance: 0, // Will be calculated later
      reference: `FEE-${fs.id.slice(-8)}`,
      category: 'FEES',
    })
  }

  // Get payments (credits)
  const payments = await prisma.payment.findMany({
    where: {
      studentId,
      schoolId,
      status: 'CONFIRMED',
      ...(dateFrom || dateTo ? { receivedAt: dateFilter } : {}),
    },
    include: {
      receipt: true,
    },
    orderBy: { receivedAt: 'asc' },
  })

  // Add payments as credit transactions
  for (const payment of payments) {
    transactions.push({
      id: payment.id,
      date: formatDate(payment.receivedAt),
      description: getTransactionDescription('payment', {
        method: payment.method,
        reference: payment.reference,
      }),
      type: 'CREDIT',
      amount: payment.amount,
      runningBalance: 0, // Will be calculated later
      reference: payment.receipt?.receiptNumber || payment.reference,
      category: payment.method,
    })
  }

  // Get approved discounts (credits)
  if (student.account) {
    const discounts = await prisma.studentDiscount.findMany({
      where: {
        studentAccountId: student.account.id,
        status: 'APPROVED',
        ...(dateFrom || dateTo ? { appliedAt: dateFilter } : {}),
      },
      orderBy: { appliedAt: 'asc' },
    })

    for (const discount of discounts) {
      transactions.push({
        id: discount.id,
        date: formatDate(discount.appliedAt),
        description: getTransactionDescription('discount', { name: discount.name }),
        type: 'CREDIT',
        amount: discount.calculatedAmount,
        runningBalance: 0,
        reference: `DSC-${discount.id.slice(-8)}`,
        category: 'DISCOUNT',
      })
    }

    // Get non-waived penalties (debits)
    const penalties = await prisma.studentPenalty.findMany({
      where: {
        studentAccountId: student.account.id,
        isWaived: false,
        ...(dateFrom || dateTo ? { appliedAt: dateFilter } : {}),
      },
      orderBy: { appliedAt: 'asc' },
    })

    for (const penalty of penalties) {
      transactions.push({
        id: penalty.id,
        date: formatDate(penalty.appliedAt),
        description: getTransactionDescription('penalty', { name: penalty.name }),
        type: 'DEBIT',
        amount: penalty.amount,
        runningBalance: 0,
        reference: `PEN-${penalty.id.slice(-8)}`,
        category: 'PENALTY',
      })
    }
  }

  // Sort transactions by date
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate running balance (Property 27)
  let runningBalance = 0
  let totalDebits = 0
  let totalCredits = 0

  for (const txn of transactions) {
    if (txn.type === 'DEBIT') {
      runningBalance += txn.amount
      totalDebits += txn.amount
    } else {
      runningBalance -= txn.amount
      totalCredits += txn.amount
    }
    txn.runningBalance = runningBalance
  }

  const openingBalance = 0 // Starting balance
  const closingBalance = runningBalance

  return {
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNumber: student.admissionNumber,
    className: student.class.name + (student.stream ? ` - ${student.stream.name}` : ''),
    schoolName: student.school.name,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
    transactions,
    openingBalance,
    closingBalance,
    totalDebits,
    totalCredits,
    generatedAt: new Date().toISOString(),
  }
}


// ============================================
// GUARDIAN STATEMENT GENERATION
// ============================================

/**
 * Generate guardian statement aggregating all linked students
 * Requirement 6.3: Statement SHALL aggregate all linked students' financial data
 * Property 28: Guardian Statement Aggregation
 */
export async function generateGuardianStatement(
  guardianId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<GuardianStatement> {
  // Get guardian with linked students
  const guardian = await prisma.guardian.findUnique({
    where: { id: guardianId },
    include: {
      studentGuardians: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
              school: true,
              account: true,
            },
          },
        },
      },
    },
  })

  if (!guardian) {
    throw new StatementError(
      STATEMENT_ERRORS.GUARDIAN_NOT_FOUND,
      'Guardian not found',
      { guardianId }
    )
  }

  const students: GuardianStudentSummary[] = []
  let totalDebits = 0
  let totalCredits = 0
  let totalBalance = 0

  // Process each linked student (Property 28)
  for (const sg of guardian.studentGuardians) {
    const student = sg.student
    if (!student) continue

    // Generate statement for this student
    const studentStatement = await generateStudentStatement(
      student.id,
      dateFrom,
      dateTo
    )

    // Calculate student totals
    const studentTotalFees = student.account?.totalFees || 0
    const studentTotalPaid = student.account?.totalPaid || 0
    const studentBalance = student.account?.balance || 0

    students.push({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class.name + (student.stream ? ` - ${student.stream.name}` : ''),
      totalFees: studentTotalFees,
      totalPaid: studentTotalPaid,
      balance: studentBalance,
      transactions: studentStatement.transactions,
    })

    // Aggregate totals
    totalDebits += studentStatement.totalDebits
    totalCredits += studentStatement.totalCredits
    totalBalance += studentBalance
  }

  return {
    guardianId: guardian.id,
    guardianName: `${guardian.firstName} ${guardian.lastName}`,
    phone: guardian.phone,
    email: guardian.email ?? undefined,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
    students,
    totalDebits,
    totalCredits,
    totalBalance,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// CLASS SUMMARY GENERATION
// ============================================

/**
 * Generate class summary
 * Requirement 6.4: Summary SHALL show total expected, collected, and outstanding for that class
 */
export async function generateClassSummary(
  classId: string,
  termId: string
): Promise<ClassSummary> {
  // Get class info
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      school: true,
    },
  })

  if (!classRecord) {
    throw new StatementError(
      STATEMENT_ERRORS.CLASS_NOT_FOUND,
      'Class not found',
      { classId }
    )
  }

  // Get term info
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new StatementError(
      STATEMENT_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get all students in the class with their accounts
  const students = await prisma.student.findMany({
    where: {
      classId,
      status: 'ACTIVE',
    },
    include: {
      account: true,
    },
  })

  // Calculate totals
  let totalExpected = 0
  let totalCollected = 0
  let totalOutstanding = 0
  let paidCount = 0
  let partialCount = 0
  let unpaidCount = 0

  for (const student of students) {
    const account = student.account
    if (!account) continue

    totalExpected += account.totalFees
    totalCollected += account.totalPaid
    totalOutstanding += Math.max(0, account.balance)

    // Categorize by payment status
    const status = StudentAccountService.determinePaymentStatus(
      account.totalFees,
      account.totalPaid,
      account.balance
    )

    switch (status) {
      case 'PAID':
      case 'OVERPAID':
        paidCount++
        break
      case 'PARTIAL':
        partialCount++
        break
      case 'UNPAID':
        unpaidCount++
        break
    }
  }

  const collectionRate = totalExpected > 0 
    ? (totalCollected / totalExpected) * 100 
    : 0

  return {
    classId: classRecord.id,
    className: classRecord.name,
    termId: term.id,
    termName: term.name,
    totalExpected,
    totalCollected,
    totalOutstanding,
    collectionRate: Math.round(collectionRate * 100) / 100,
    studentCount: students.length,
    paidCount,
    partialCount,
    unpaidCount,
    generatedAt: new Date().toISOString(),
  }
}


// ============================================
// STATEMENT PDF/HTML GENERATION
// ============================================

/**
 * Generate student statement HTML for printing/PDF
 * Requirement 6.5: Allow printing or downloading as PDF
 */
export function generateStudentStatementHTML(
  statement: StudentStatement,
  schoolInfo?: {
    name?: string
    address?: string
    phone?: string
    email?: string
    logo?: string
  }
): string {
  const formattedDateFrom = statement.dateFrom
    ? new Date(statement.dateFrom).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Beginning'

  const formattedDateTo = statement.dateTo
    ? new Date(statement.dateTo).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Present'

  const transactionsHTML = statement.transactions.length > 0
    ? statement.transactions
        .map(
          (txn) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(txn.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${txn.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${txn.reference || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: ${txn.type === 'DEBIT' ? 'var(--chart-red)' : 'var(--chart-green)'};">
            ${txn.type === 'DEBIT' ? '' : '-'}UGX ${txn.amount.toLocaleString()}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: ${txn.runningBalance > 0 ? 'var(--chart-red)' : 'var(--chart-green)'};">
            UGX ${txn.runningBalance.toLocaleString()}
          </td>
        </tr>
      `
        )
        .join('')
    : '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #666;">No transactions found for this period</td></tr>'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Statement - ${statement.studentName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; color: #333; }
    .statement { border: 1px solid #ddd; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .school-info { flex: 1; }
    .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .school-details { font-size: 12px; color: #666; line-height: 1.5; }
    .statement-info { text-align: right; }
    .statement-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
    .statement-period { font-size: 12px; color: #666; }
    .details-section { display: flex; justify-content: space-between; margin: 20px 0; background: #f9f9f9; padding: 15px; border-radius: 5px; }
    .details-box { flex: 1; }
    .details-box h3 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
    .details-box p { font-size: 14px; margin: 4px 0; }
    .transactions-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .transactions-table th { background: #333; color: white; padding: 10px; text-align: left; font-size: 12px; }
    .transactions-table th:nth-child(4), .transactions-table th:nth-child(5) { text-align: right; }
    .summary-section { margin-top: 20px; border-top: 2px solid #333; padding-top: 20px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .summary-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 15px; }
    .summary-row.balance { font-size: 20px; font-weight: bold; color: ${statement.closingBalance > 0 ? 'var(--chart-red)' : 'var(--chart-green)'}; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
    @media print {
      body { padding: 0; }
      .statement { border: none; }
    }
  </style>
</head>
<body>
  <div class="statement">
    <div class="header">
      <div class="school-info">
        <div class="school-name">${schoolInfo?.name || statement.schoolName}</div>
        <div class="school-details">
          ${schoolInfo?.address ? `<div>${schoolInfo.address}</div>` : ''}
          ${schoolInfo?.phone ? `<div>Tel: ${schoolInfo.phone}</div>` : ''}
          ${schoolInfo?.email ? `<div>Email: ${schoolInfo.email}</div>` : ''}
        </div>
      </div>
      <div class="statement-info">
        <div class="statement-title">ACCOUNT STATEMENT</div>
        <div class="statement-period">Period: ${formattedDateFrom} to ${formattedDateTo}</div>
      </div>
    </div>

    <div class="details-section">
      <div class="details-box">
        <h3>Student Information</h3>
        <p><strong>${statement.studentName}</strong></p>
        <p>Admission No: ${statement.admissionNumber}</p>
        <p>Class: ${statement.className}</p>
      </div>
      <div class="details-box" style="text-align: right;">
        <h3>Statement Summary</h3>
        <p>Total Charges: UGX ${statement.totalDebits.toLocaleString()}</p>
        <p>Total Payments: UGX ${statement.totalCredits.toLocaleString()}</p>
        <p><strong>Balance: UGX ${statement.closingBalance.toLocaleString()}</strong></p>
      </div>
    </div>

    <table class="transactions-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Reference</th>
          <th>Amount</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        ${transactionsHTML}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="summary-row">
        <span>Opening Balance</span>
        <span>UGX ${statement.openingBalance.toLocaleString()}</span>
      </div>
      <div class="summary-row">
        <span>Total Charges (Debits)</span>
        <span style="color: var(--chart-red);">+ UGX ${statement.totalDebits.toLocaleString()}</span>
      </div>
      <div class="summary-row">
        <span>Total Payments (Credits)</span>
        <span style="color: var(--chart-green);">- UGX ${statement.totalCredits.toLocaleString()}</span>
      </div>
      <div class="summary-row balance">
        <span>Closing Balance</span>
        <span>UGX ${statement.closingBalance.toLocaleString()}</span>
      </div>
    </div>

    <div class="footer">
      <p>This is a computer-generated statement. For any queries, please contact the school bursar.</p>
      <p>Generated on: ${new Date(statement.generatedAt).toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}


/**
 * Generate guardian statement HTML for printing/PDF
 * Requirement 6.5: Allow printing or downloading as PDF
 */
export function generateGuardianStatementHTML(
  statement: GuardianStatement,
  schoolInfo?: {
    name?: string
    address?: string
    phone?: string
    email?: string
    logo?: string
  }
): string {
  const formattedDateFrom = statement.dateFrom
    ? new Date(statement.dateFrom).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Beginning'

  const formattedDateTo = statement.dateTo
    ? new Date(statement.dateTo).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Present'

  // Generate HTML for each student's section
  const studentsHTML = statement.students
    .map(
      (student) => `
      <div class="student-section">
        <div class="student-header">
          <h3>${student.studentName}</h3>
          <p>Admission No: ${student.admissionNumber} | Class: ${student.className}</p>
        </div>
        <div class="student-summary">
          <div class="summary-item">
            <span class="label">Total Fees:</span>
            <span class="value">UGX ${student.totalFees.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span class="label">Total Paid:</span>
            <span class="value" style="color: var(--chart-green);">UGX ${student.totalPaid.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span class="label">Balance:</span>
            <span class="value" style="color: ${student.balance > 0 ? 'var(--chart-red)' : 'var(--chart-green)'}; font-weight: bold;">
              UGX ${student.balance.toLocaleString()}
            </span>
          </div>
        </div>
        ${
          student.transactions.length > 0
            ? `
        <table class="transactions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Reference</th>
              <th>Amount</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${student.transactions
              .map(
                (txn) => `
              <tr>
                <td>${new Date(txn.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td>${txn.description}</td>
                <td>${txn.reference || '-'}</td>
                <td style="text-align: right; color: ${txn.type === 'DEBIT' ? 'var(--chart-red)' : 'var(--chart-green)'};">
                  ${txn.type === 'DEBIT' ? '' : '-'}UGX ${txn.amount.toLocaleString()}
                </td>
                <td style="text-align: right; font-weight: bold; color: ${txn.runningBalance > 0 ? 'var(--chart-red)' : 'var(--chart-green)'};">
                  UGX ${txn.runningBalance.toLocaleString()}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        `
            : '<p class="no-transactions">No transactions for this student</p>'
        }
      </div>
    `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Guardian Statement - ${statement.guardianName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; color: #333; }
    .statement { border: 1px solid #ddd; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .school-info { flex: 1; }
    .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .school-details { font-size: 12px; color: #666; line-height: 1.5; }
    .statement-info { text-align: right; }
    .statement-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
    .statement-period { font-size: 12px; color: #666; }
    .guardian-details { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .guardian-details h3 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
    .guardian-details p { font-size: 14px; margin: 4px 0; }
    .student-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .student-header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px; }
    .student-header h3 { font-size: 16px; margin-bottom: 5px; }
    .student-header p { font-size: 12px; color: #666; }
    .student-summary { display: flex; gap: 20px; margin-bottom: 15px; }
    .summary-item { }
    .summary-item .label { font-size: 12px; color: #666; }
    .summary-item .value { font-size: 14px; display: block; }
    .transactions-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .transactions-table th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; }
    .transactions-table th:nth-child(4), .transactions-table th:nth-child(5) { text-align: right; }
    .transactions-table td { padding: 8px; border-bottom: 1px solid #eee; }
    .no-transactions { color: #666; font-style: italic; text-align: center; padding: 20px; }
    .total-section { margin-top: 30px; border-top: 2px solid #333; padding-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; }
    .total-row.grand-total { font-size: 20px; font-weight: bold; color: ${statement.totalBalance > 0 ? 'var(--chart-red)' : 'var(--chart-green)'}; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
    @media print {
      body { padding: 0; }
      .statement { border: none; }
      .student-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="statement">
    <div class="header">
      <div class="school-info">
        <div class="school-name">${schoolInfo?.name || 'School Name'}</div>
        <div class="school-details">
          ${schoolInfo?.address ? `<div>${schoolInfo.address}</div>` : ''}
          ${schoolInfo?.phone ? `<div>Tel: ${schoolInfo.phone}</div>` : ''}
          ${schoolInfo?.email ? `<div>Email: ${schoolInfo.email}</div>` : ''}
        </div>
      </div>
      <div class="statement-info">
        <div class="statement-title">GUARDIAN STATEMENT</div>
        <div class="statement-period">Period: ${formattedDateFrom} to ${formattedDateTo}</div>
      </div>
    </div>

    <div class="guardian-details">
      <h3>Guardian Information</h3>
      <p><strong>${statement.guardianName}</strong></p>
      ${statement.phone ? `<p>Phone: ${statement.phone}</p>` : ''}
      ${statement.email ? `<p>Email: ${statement.email}</p>` : ''}
      <p>Number of Students: ${statement.students.length}</p>
    </div>

    ${studentsHTML}

    <div class="total-section">
      <div class="total-row">
        <span>Total Charges (All Students)</span>
        <span style="color: var(--chart-red);">UGX ${statement.totalDebits.toLocaleString()}</span>
      </div>
      <div class="total-row">
        <span>Total Payments (All Students)</span>
        <span style="color: var(--chart-green);">UGX ${statement.totalCredits.toLocaleString()}</span>
      </div>
      <div class="total-row grand-total">
        <span>Total Balance Due</span>
        <span>UGX ${statement.totalBalance.toLocaleString()}</span>
      </div>
    </div>

    <div class="footer">
      <p>This is a computer-generated statement. For any queries, please contact the school bursar.</p>
      <p>Generated on: ${new Date(statement.generatedAt).toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}


/**
 * Generate statement PDF
 * Requirement 6.5: Allow printing or downloading as PDF
 * Note: Returns HTML that can be converted to PDF by the caller
 */
export async function generateStatementPDF(
  type: 'student' | 'guardian',
  id: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{ html: string; statement: StudentStatement | GuardianStatement }> {
  if (type === 'student') {
    const statement = await generateStudentStatement(id, dateFrom, dateTo)

    // Get school info
    const student = await prisma.student.findUnique({
      where: { id },
      include: { school: true },
    })

    const html = generateStudentStatementHTML(statement, {
      name: student?.school.name,
      address: student?.school.address ?? undefined,
      phone: student?.school.phone ?? undefined,
      email: student?.school.email ?? undefined,
    })

    return { html, statement }
  } else {
    const statement = await generateGuardianStatement(id, dateFrom, dateTo)

    // Get school info from first student
    let schoolInfo: {
      name?: string
      address?: string
      phone?: string
      email?: string
    } = {}

    if (statement.students.length > 0) {
      const student = await prisma.student.findUnique({
        where: { id: statement.students[0].studentId },
        include: { school: true },
      })
      if (student) {
        schoolInfo = {
          name: student.school.name,
          address: student.school.address ?? undefined,
          phone: student.school.phone ?? undefined,
          email: student.school.email ?? undefined,
        }
      }
    }

    const html = generateGuardianStatementHTML(statement, schoolInfo)

    return { html, statement }
  }
}

// ============================================
// SERVICE EXPORT
// ============================================

export const StatementService = {
  // Core functions
  generateStudentStatement,
  generateGuardianStatement,
  generateClassSummary,

  // PDF/HTML generation
  generateStudentStatementHTML,
  generateGuardianStatementHTML,
  generateStatementPDF,
}

export default StatementService
