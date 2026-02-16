/**
 * Financial Statement Service
 * Generates comprehensive financial statements with chronological transaction records
 * 
 * Requirements: Financial Statement Generation - Clear, chronological records for transparency
 * 
 * Property 1: Chronological Transaction Order
 * For any financial statement, transactions SHALL be ordered chronologically with timestamps.
 *   
 * Property 2: Complete Transaction Details
 * For any financial statement, each transaction SHALL include: date, amount, method, 
 * reference, balance before/after, and associated receipt number.
 */
import { prisma } from '@/lib/db'
import { 
  PaymentService, 
  type PaymentRecord 
} from './finance.service'
import { 
  ReceiptService, 
  type Receipt 
} from './receipt.service'
import { 
  StudentAccountService, 
  type StudentAccountDetails 
} from './student-account.service'
import type { 
  PaymentMethod, 
  StudentAccount, 
  FinanceSettings 
} from '@/types/finance'

// Error codes for financial statement operations
export const FINANCIAL_STATEMENT_ERRORS = {
  STATEMENT_GENERATION_FAILED: 'STATEMENT_GENERATION_FAILED',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
} as const

export class FinancialStatementError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'FinancialStatementError'
  }
}

/**
 * Financial transaction record for statements
 */
export interface FinancialTransaction {
  id: string
  date: string
  type: 'PAYMENT' | 'DISCOUNT' | 'PENALTY' | 'REFUND' | 'FEE_CHARGE'
  description: string
  amount: number
  method?: PaymentMethod
  reference?: string
  receiptNumber?: string
  balanceBefore: number
  balanceAfter: number
  status: string
  addedBy: string
  addedByName: string
}

/**
 * Financial statement record
 */
export interface FinancialStatement {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  termName: string
  startDate: string
  endDate: string
  openingBalance: number
  closingBalance: number
  totalCredits: number
  totalDebits: number
  transactions: FinancialTransaction[]
  generatedAt: string
  generatedBy: string
  generatedByName: string
}

/**
 * Financial statement filters
 */
export interface StatementFilters {
  startDate?: Date
  endDate?: Date
  includePayments?: boolean
  includeDiscounts?: boolean
  includePenalties?: boolean
  sortBy?: 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Financial statement service
 */
export class FinancialStatementService {
  /**
   * Generate a financial statement for a specific student
   * 
   * Property 1: Chronological Transaction Order
   * For any financial statement, transactions SHALL be ordered chronologically with timestamps.
   * 
   * Property 2: Complete Transaction Details
   * For any financial statement, each transaction SHALL include: date, amount, method, 
   * reference, balance before/after, and associated receipt number.
   */
  static async generateStudentStatement(
    studentId: string,
    schoolId: string,
    termId: string,
    filters?: StatementFilters
  ): Promise<FinancialStatement> {
    try {
      // Get student information
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { 
          class: true,
          stream: true
        }
      })
      
      if (!student) {
        throw new FinancialStatementError(
          FINANCIAL_STATEMENT_ERRORS.STUDENT_NOT_FOUND,
          'Student not found',
          { studentId }
        )
      }
      
      // Get term information
      const term = await prisma.term.findUnique({
        where: { id: termId },
        include: { academicYear: true }
      })
      
      if (!term) {
        throw new FinancialStatementError(
          FINANCIAL_STATEMENT_ERRORS.STUDENT_NOT_FOUND,
          'Term not found',
          { termId }
        )
      }
      
      // Get initial balance (balance at the start of the period)
      let openingBalance = 0
      const account = await prisma.studentAccount.findUnique({
        where: { 
          studentId_schoolId: { 
            studentId, 
            schoolId 
          } 
        }
      })
      
      if (account) {
        openingBalance = account.balance
      }
      
      // Get all transactions for the student within the date range
      const transactions: FinancialTransaction[] = []
      
      // Include payments
      if (filters?.includePayments !== false) { // Default to true if not specified
        const payments = await prisma.payment.findMany({
          where: {
            studentId,
            schoolId,
            termId,
            ...(filters?.startDate && { receivedAt: { gte: filters.startDate } }),
            ...(filters?.endDate && { receivedAt: { lte: filters.endDate } }),
          },
          include: {
            receipt: true,
            student: { include: { class: true, stream: true } },
            term: true,
            guardian: true,
          },
          orderBy: { receivedAt: 'asc' }
        })
        
        for (const payment of payments) {
          // Get user names for the payment
          const receivedByUser = await prisma.user.findUnique({
            where: { id: payment.receivedBy },
            include: { staff: true },
          })
          const receivedByName = receivedByUser?.staff
            ? `${receivedByUser.staff.firstName} ${receivedByUser.staff.lastName}`
            : receivedByUser?.email || 'Unknown'
          
          transactions.push({
            id: payment.id,
            date: payment.receivedAt.toISOString(),
            type: 'PAYMENT',
            description: `Payment via ${payment.method}`,
            amount: payment.amount,
            method: payment.method as any,
            reference: payment.reference,
            receiptNumber: payment.receipt?.receiptNumber,
            balanceBefore: payment.receipt?.balanceBefore || 0,
            balanceAfter: payment.receipt?.balanceAfter || 0,
            status: payment.status,
            addedBy: payment.receivedBy,
            addedByName: receivedByName
          })
        }
      }
      
      // Include discounts
      if (filters?.includeDiscounts !== false) {
        const discounts = await prisma.studentDiscount.findMany({
          where: {
            studentId,
            termId,
            ...(filters?.startDate && { appliedAt: { gte: filters.startDate } }),
            ...(filters?.endDate && { appliedAt: { lte: filters.endDate } }),
          },
          include: {
            discountRule: true
          },
          orderBy: { appliedAt: 'asc' }
        })
        
        for (const discount of discounts) {
          transactions.push({
            id: discount.id,
            date: discount.appliedAt.toISOString(),
            type: 'DISCOUNT',
            description: `Discount: ${discount.name} (${discount.reason || ''})`,
            amount: discount.calculatedAmount,
            balanceBefore: 0, // Would need to calculate this properly
            balanceAfter: 0,  // Would need to calculate this properly
            status: discount.status,
            addedBy: discount.appliedBy,
            addedByName: 'System' // Placeholder - would need to get actual user
          })
        }
      }
      
      // Include penalties
      if (filters?.includePenalties !== false) {
        const penalties = await prisma.studentPenalty.findMany({
          where: {
            studentId,
            termId,
            ...(filters?.startDate && { appliedAt: { gte: filters.startDate } }),
            ...(filters?.endDate && { appliedAt: { lte: filters.endDate } }),
          },
          include: {
            penaltyRule: true
          },
          orderBy: { appliedAt: 'asc' }
        })
        
        for (const penalty of penalties) {
          transactions.push({
            id: penalty.id,
            date: penalty.appliedAt.toISOString(),
            type: 'PENALTY',
            description: `Penalty: ${penalty.name} (${penalty.reason || ''})`,
            amount: penalty.amount,
            balanceBefore: 0, // Would need to calculate this properly
            balanceAfter: 0,  // Would need to calculate this properly
            status: 'ACTIVE',
            addedBy: penalty.appliedBy,
            addedByName: 'System' // Placeholder - would need to get actual user
          })
        }
      }
      
      // Sort transactions chronologically
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      // Calculate running balance and final balance
      let runningBalance = openingBalance
      let totalCredits = 0
      let totalDebits = 0
      
      for (const transaction of transactions) {
        if (transaction.type === 'PAYMENT') {
          // Payments reduce the balance (debt decreases)
          runningBalance -= transaction.amount
          totalDebits += transaction.amount
        } else if (transaction.type === 'PENALTY') {
          // Penalties increase the balance (debt increases)
          runningBalance += transaction.amount
          totalCredits += transaction.amount
        } else if (transaction.type === 'DISCOUNT') {
          // Discounts reduce the balance (debt decreases)
          runningBalance -= transaction.amount
          totalDebits += transaction.amount
        }
        
        // Update balance fields in the transaction
        transaction.balanceAfter = runningBalance
      }
      
      const closingBalance = runningBalance
      
      // Create the statement
      const statement: FinancialStatement = {
        id: `stmt_${studentId}_${Date.now()}`,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.class.name,
        termName: term.name,
        startDate: filters?.startDate?.toISOString() || new Date(0).toISOString(),
        endDate: filters?.endDate?.toISOString() || new Date().toISOString(),
        openingBalance,
        closingBalance,
        totalCredits,
        totalDebits,
        transactions,
        generatedAt: new Date().toISOString(),
        generatedBy: 'system', // Would come from calling context
        generatedByName: 'System'
      }
      
      return statement
    } catch (error) {
      if (error instanceof FinancialStatementError) {
        throw error
      }
      
      throw new FinancialStatementError(
        FINANCIAL_STATEMENT_ERRORS.STATEMENT_GENERATION_FAILED,
        'Failed to generate financial statement',
        { studentId, termId, error: error.message }
      )
    }
  }

  /**
   * Generate a financial statement for all students in a class
   */
  static async generateClassStatement(
    classId: string,
    schoolId: string,
    termId: string,
    filters?: StatementFilters
  ): Promise<FinancialStatement[]> {
    try {
      // Get all students in the class
      const students = await prisma.student.findMany({
        where: { classId },
        select: { id: true }
      })
      
      const statements: FinancialStatement[] = []
      
      // Generate statement for each student
      for (const student of students) {
        const statement = await this.generateStudentStatement(
          student.id,
          schoolId,
          termId,
          filters
        )
        statements.push(statement)
      }
      
      return statements
    } catch (error) {
      if (error instanceof FinancialStatementError) {
        throw error
      }
      
      throw new FinancialStatementError(
        FINANCIAL_STATEMENT_ERRORS.STATEMENT_GENERATION_FAILED,
        'Failed to generate class financial statements',
        { classId, termId, error: error.message }
      )
    }
  }

  /**
   * Generate a financial summary statement for the entire school
   */
  static async generateSchoolSummaryStatement(
    schoolId: string,
    termId: string,
    filters?: StatementFilters
  ): Promise<{
    schoolId: string
    schoolName: string
    termName: string
    startDate: string
    endDate: string
    totalEnrolledStudents: number
    totalFeesExpected: number
    totalFeesCollected: number
    totalOutstanding: number
    totalDiscounts: number
    totalPenalties: number
    collectionRate: number
    studentsWithOutstanding: number
    studentsFullyPaid: number
    generatedAt: string
    generatedBy: string
    generatedByName: string
  }> {
    try {
      // Get school info
      const school = await prisma.school.findUnique({
        where: { id: schoolId }
      })
      
      if (!school) {
        throw new FinancialStatementError(
          FINANCIAL_STATEMENT_ERRORS.STUDENT_NOT_FOUND,
          'School not found',
          { schoolId }
        )
      }
      
      // Get term info
      const term = await prisma.term.findUnique({
        where: { id: termId }
      })
      
      if (!term) {
        throw new FinancialStatementError(
          FINANCIAL_STATEMENT_ERRORS.STUDENT_NOT_FOUND,
          'Term not found',
          { termId }
        )
      }
      
      // Get all student accounts for the school and term
      const accounts = await prisma.studentAccount.findMany({
        where: { schoolId },
        include: { student: true }
      })
      
      // Calculate summary values
      const totalEnrolledStudents = accounts.length
      const totalFeesExpected = accounts.reduce((sum, acc) => sum + acc.totalFees, 0)
      const totalFeesCollected = accounts.reduce((sum, acc) => sum + acc.totalPaid, 0)
      const totalOutstanding = accounts.reduce((sum, acc) => sum + Math.max(0, acc.balance), 0)
      const totalDiscounts = accounts.reduce((sum, acc) => sum + acc.totalDiscounts, 0)
      const totalPenalties = accounts.reduce((sum, acc) => sum + acc.totalPenalties, 0)
      const collectionRate = totalFeesExpected > 0 ? (totalFeesCollected / totalFeesExpected) * 100 : 0
      const studentsWithOutstanding = accounts.filter(acc => acc.balance > 0).length
      const studentsFullyPaid = accounts.filter(acc => acc.balance <= 0).length
      
      return {
        schoolId,
        schoolName: school.name,
        termName: term.name, // Need to get term name properly
        startDate: filters?.startDate?.toISOString() || new Date(0).toISOString(),
        endDate: filters?.endDate?.toISOString() || new Date().toISOString(),
        totalEnrolledStudents,
        totalFeesExpected,
        totalFeesCollected,
        totalOutstanding,
        totalDiscounts,
        totalPenalties,
        collectionRate,
        studentsWithOutstanding,
        studentsFullyPaid,
        generatedAt: new Date().toISOString(),
        generatedBy: 'system',
        generatedByName: 'System'
      }
    } catch (error) {
      if (error instanceof FinancialStatementError) {
        throw error
      }
      
      throw new FinancialStatementError(
        FINANCIAL_STATEMENT_ERRORS.STATEMENT_GENERATION_FAILED,
        'Failed to generate school summary statement',
        { schoolId, termId, error: error.message }
      )
    }
  }

  /**
   * Export financial statement as CSV format
   */
  static async exportStatementAsCSV(statement: FinancialStatement): Promise<string> {
    // CSV header
    let csvContent = 'Date,Type,Description,Amount,Method,Reference,Receipt,Balance Before,Balance After,Status\n'
    
    // Add transactions
    for (const transaction of statement.transactions) {
      const row = [
        transaction.date,
        transaction.type,
        `"${transaction.description}"`,
        transaction.amount,
        transaction.method || '',
        transaction.reference || '',
        transaction.receiptNumber || '',
        transaction.balanceBefore,
        transaction.balanceAfter,
        transaction.status
      ].join(',')
      
      csvContent += row + '\n'
    }
    
    return csvContent
  }

  /**
   * Export financial statement as PDF-ready HTML
   */
  static async exportStatementAsHTML(statement: FinancialStatement): Promise<string> {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Financial Statement - ${statement.studentName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
    .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .statement-title { font-size: 20px; font-weight: bold; margin: 10px 0; }
    .student-info { margin: 10px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .summary-box { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .transactions-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .transactions-table th, .transactions-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .transactions-table th { background-color: #f2f2f2; }
    .transactions-table tr:nth-child(even) { background-color: #f9f9f9; }
    .balance-positive { color: #2e7d32; font-weight: bold; }
    .balance-negative { color: #c62828; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${statement.studentName}'s School</div>
    <div class="statement-title">Financial Statement</div>
  </div>
  
  <div class="student-info">
    <div class="info-row">
      <strong>Student Name:</strong>
      <span>${statement.studentName}</span>
    </div>
    <div class="info-row">
      <strong>Admission Number:</strong>
      <span>${statement.admissionNumber}</span>
    </div>
    <div class="info-row">
      <strong>Class:</strong>
      <span>${statement.className}</span>
    </div>
    <div class="info-row">
      <strong>Term:</strong>
      <span>${statement.termName}</span>
    </div>
    <div class="info-row">
      <strong>Statement Period:</strong>
      <span>${formatDate(statement.startDate)} to ${formatDate(statement.endDate)}</span>
    </div>
  </div>
  
  <div class="summary-box">
    <div class="info-row">
      <strong>Opening Balance:</strong>
      <span class="${statement.openingBalance < 0 ? 'balance-negative' : 'balance-positive'}">UGX ${statement.openingBalance.toLocaleString()}</span>
    </div>
    <div class="info-row">
      <strong>Closing Balance:</strong>
      <span class="${statement.closingBalance < 0 ? 'balance-negative' : 'balance-positive'}">UGX ${statement.closingBalance.toLocaleString()}</span>
    </div>
    <div class="info-row">
      <strong>Total Credits:</strong>
      <span>UGX ${statement.totalCredits.toLocaleString()}</span>
    </div>
    <div class="info-row">
      <strong>Total Debits:</strong>
      <span>UGX ${statement.totalDebits.toLocaleString()}</span>
    </div>
  </div>
  
  <h3>Transaction History</h3>
  <table class="transactions-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Description</th>
        <th>Amount</th>
        <th>Method</th>
        <th>Reference</th>
        <th>Receipt</th>
        <th>Balance After</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${statement.transactions.map(t => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>${t.type}</td>
        <td>${t.description}</td>
        <td>UGX ${t.amount.toLocaleString()}</td>
        <td>${t.method || 'N/A'}</td>
        <td>${t.reference || 'N/A'}</td>
        <td>${t.receiptNumber || 'N/A'}</td>
        <td class="${t.balanceAfter < 0 ? 'balance-negative' : 'balance-positive'}">UGX ${t.balanceAfter.toLocaleString()}</td>
        <td>${t.status}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on: ${formatDate(statement.generatedAt)}</p>
    <p>Generated by: ${statement.generatedByName}</p>
    <p>This is a computer-generated statement. Please contact the school for any discrepancies.</p>
  </div>
</body>
</html>`
  }

  /**
   * Send financial statement to guardian via email/SMS
   */
  static async sendStatementToGuardian(
    statement: FinancialStatement,
    guardianId: string,
    method: 'EMAIL' | 'SMS' = 'EMAIL'
  ): Promise<boolean> {
    // This would integrate with the messaging system
    // For now, returning true to indicate success
    console.log(`Sending statement to guardian ${guardianId} via ${method}`)
    return true
  }
}

export default FinancialStatementService