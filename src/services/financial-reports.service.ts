/**
 * Financial Reports Service
 * Handles daily collection reports, term summaries, arrears reports, and exports
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
import { prisma } from '@/lib/db'
import { Payment, StudentBalance } from '@/types'
import { PaymentMethod } from '@/types/enums'
import { financeService } from './finance.service'

// ============================================
// REPORT DATA TYPES
// ============================================

/**
 * Daily collection report data
 * Requirement 10.1: Display all payments received on a date with totals
 */
export interface DailyCollectionReport {
  date: Date
  schoolId: string
  schoolName: string
  payments: PaymentDetail[]
  totalAmount: number
  byMethod: Record<PaymentMethod, number>
  paymentCount: number
  generatedAt: Date
}

export interface PaymentDetail {
  id: string
  receiptNumber: string
  studentName: string
  admissionNumber: string
  className: string
  amount: number
  method: PaymentMethod
  reference: string
  receivedBy: string
  receivedAt: Date
}

/**
 * Term financial summary data
 * Requirement 10.2: Show expected fees, collected amount, and outstanding balance per class
 */
export interface TermFinancialSummary {
  termId: string
  termName: string
  schoolId: string
  schoolName: string
  expectedFees: number
  collectedAmount: number
  outstandingBalance: number
  collectionRate: number
  byClass: ClassFinancialSummary[]
  generatedAt: Date
}

export interface ClassFinancialSummary {
  classId: string
  className: string
  studentCount: number
  expectedFees: number
  collectedAmount: number
  outstandingBalance: number
  collectionRate: number
}

/**
 * Arrears report data
 * Requirement 10.3: List all students with outstanding balances sorted by amount
 */
export interface ArrearsReport {
  schoolId: string
  schoolName: string
  termId: string
  termName: string
  totalStudentsWithArrears: number
  totalArrearsAmount: number
  students: StudentArrearsDetail[]
  generatedAt: Date
}

export interface StudentArrearsDetail {
  studentId: string
  studentName: string
  admissionNumber: string
  classId: string
  className: string
  totalFees: number
  totalPaid: number
  arrearsAmount: number
  arrearsPercentage: number
  lastPaymentDate?: Date
  guardianPhone?: string
}

// ============================================
// EXPORT TYPES
// ============================================

export type ExportFormat = 'PDF' | 'EXCEL'

export interface ExportOptions {
  format: ExportFormat
  includeHeader?: boolean
  includeFooter?: boolean
  pageSize?: 'A4' | 'LETTER'
}


// ============================================
// FINANCIAL REPORTS SERVICE CLASS
// ============================================

export class FinancialReportsService {
  // ============================================
  // DAILY COLLECTION REPORTS
  // ============================================

  /**
   * Get daily collection report
   * Requirement 10.1: Display all payments received on that date with totals
   */
  async getDailyCollectionReport(
    schoolId: string,
    date: Date
  ): Promise<DailyCollectionReport> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${schoolId} not found`)
    }

    // Get start and end of day
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Get all payments for the day
    const payments = await prisma.payment.findMany({
      where: {
        student: { schoolId },
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

    // Map to payment details
    const paymentDetails: PaymentDetail[] = payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      admissionNumber: p.student.admissionNumber,
      className: p.student.class.name,
      amount: p.amount,
      method: p.method as PaymentMethod,
      reference: p.reference,
      receivedBy: p.receivedBy,
      receivedAt: p.receivedAt,
    }))

    // Calculate totals
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

    // Group by payment method
    const byMethod = this.groupPaymentsByMethod(payments)

    return {
      date: startOfDay,
      schoolId,
      schoolName: school.name,
      payments: paymentDetails,
      totalAmount,
      byMethod,
      paymentCount: payments.length,
      generatedAt: new Date(),
    }
  }

  /**
   * Get daily collections for a date range
   */
  async getDailyCollectionsRange(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyCollectionReport[]> {
    const reports: DailyCollectionReport[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const report = await this.getDailyCollectionReport(schoolId, new Date(currentDate))
      reports.push(report)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return reports
  }

  /**
   * Group payments by method
   */
  private groupPaymentsByMethod(
    payments: { amount: number; method: string }[]
  ): Record<PaymentMethod, number> {
    const byMethod: Record<PaymentMethod, number> = {
      CASH: 0,
      MOBILE_MONEY: 0,
      BANK: 0,
    }

    for (const payment of payments) {
      const method = payment.method as PaymentMethod
      byMethod[method] = (byMethod[method] || 0) + payment.amount
    }

    return byMethod
  }

  // ============================================
  // TERM SUMMARY REPORTS
  // ============================================

  /**
   * Get term financial summary
   * Requirement 10.2: Show expected fees, collected amount, and outstanding balance per class
   */
  async getTermFinancialSummary(
    schoolId: string,
    termId: string
  ): Promise<TermFinancialSummary> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${schoolId} not found`)
    }

    // Validate term exists
    const term = await prisma.term.findUnique({
      where: { id: termId },
    })

    if (!term) {
      throw new Error(`Term with id ${termId} not found`)
    }

    // Get all classes in the school
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { level: 'asc' },
    })

    const classSummaries: ClassFinancialSummary[] = []
    let totalExpected = 0
    let totalCollected = 0

    for (const classRecord of classes) {
      const summary = await this.getClassFinancialSummary(classRecord.id, termId)
      classSummaries.push({
        classId: classRecord.id,
        className: classRecord.name,
        ...summary,
      })
      totalExpected += summary.expectedFees
      totalCollected += summary.collectedAmount
    }

    const outstandingBalance = totalExpected - totalCollected
    const collectionRate = totalExpected > 0 
      ? Math.round((totalCollected / totalExpected) * 10000) / 100 
      : 0

    return {
      termId,
      termName: term.name,
      schoolId,
      schoolName: school.name,
      expectedFees: totalExpected,
      collectedAmount: totalCollected,
      outstandingBalance,
      collectionRate,
      byClass: classSummaries,
      generatedAt: new Date(),
    }
  }

  /**
   * Get financial summary for a single class
   */
  private async getClassFinancialSummary(
    classId: string,
    termId: string
  ): Promise<Omit<ClassFinancialSummary, 'classId' | 'className'>> {
    // Get active students in the class
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
    })

    // Get fee structure for the class
    const feeStructure = await prisma.feeStructure.findFirst({
      where: { classId, termId },
    })

    const feePerStudent = feeStructure?.totalAmount ?? 0
    const expectedFees = feePerStudent * students.length

    // Get total payments for all students in this class for this term
    let collectedAmount = 0
    for (const student of students) {
      const payments = await prisma.payment.aggregate({
        where: { studentId: student.id, termId },
        _sum: { amount: true },
      })
      collectedAmount += payments._sum.amount ?? 0
    }

    const outstandingBalance = expectedFees - collectedAmount
    const collectionRate = expectedFees > 0 
      ? Math.round((collectedAmount / expectedFees) * 10000) / 100 
      : 0

    return {
      studentCount: students.length,
      expectedFees,
      collectedAmount,
      outstandingBalance,
      collectionRate,
    }
  }


  // ============================================
  // ARREARS REPORTS
  // ============================================

  /**
   * Get arrears report
   * Requirement 10.3: List all students with outstanding balances sorted by amount
   */
  async getArrearsReport(
    schoolId: string,
    termId: string,
    minAmount?: number
  ): Promise<ArrearsReport> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${schoolId} not found`)
    }

    // Validate term exists
    const term = await prisma.term.findUnique({
      where: { id: termId },
    })

    if (!term) {
      throw new Error(`Term with id ${termId} not found`)
    }

    // Get all active students in the school
    const students = await prisma.student.findMany({
      where: { schoolId, status: 'ACTIVE' },
      include: {
        class: true,
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    const studentsWithArrears: StudentArrearsDetail[] = []
    let totalArrearsAmount = 0

    for (const student of students) {
      const balance = await financeService.calculateStudentBalance(student.id, termId)

      if (balance.hasArrears) {
        // Skip if below minimum amount threshold
        if (minAmount && balance.balance < minAmount) {
          continue
        }

        // Get last payment date
        const lastPayment = await prisma.payment.findFirst({
          where: { studentId: student.id, termId },
          orderBy: { receivedAt: 'desc' },
        })

        // Get primary guardian phone
        const primaryGuardian = student.studentGuardians[0]?.guardian

        const arrearsPercentage = balance.totalFees > 0
          ? Math.round((balance.balance / balance.totalFees) * 10000) / 100
          : 0

        studentsWithArrears.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          classId: student.classId,
          className: student.class.name,
          totalFees: balance.totalFees,
          totalPaid: balance.totalPaid,
          arrearsAmount: balance.balance,
          arrearsPercentage,
          lastPaymentDate: lastPayment?.receivedAt,
          guardianPhone: primaryGuardian?.phone,
        })

        totalArrearsAmount += balance.balance
      }
    }

    // Sort by arrears amount descending
    studentsWithArrears.sort((a, b) => b.arrearsAmount - a.arrearsAmount)

    return {
      schoolId,
      schoolName: school.name,
      termId,
      termName: term.name,
      totalStudentsWithArrears: studentsWithArrears.length,
      totalArrearsAmount,
      students: studentsWithArrears,
      generatedAt: new Date(),
    }
  }

  /**
   * Get arrears summary by class
   */
  async getArrearsSummaryByClass(
    schoolId: string,
    termId: string
  ): Promise<{
    classId: string
    className: string
    studentsWithArrears: number
    totalArrears: number
  }[]> {
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { level: 'asc' },
    })

    const summaries: {
      classId: string
      className: string
      studentsWithArrears: number
      totalArrears: number
    }[] = []

    for (const classRecord of classes) {
      const students = await prisma.student.findMany({
        where: { classId: classRecord.id, status: 'ACTIVE' },
      })

      let studentsWithArrears = 0
      let totalArrears = 0

      for (const student of students) {
        const balance = await financeService.calculateStudentBalance(student.id, termId)
        if (balance.hasArrears) {
          studentsWithArrears++
          totalArrears += balance.balance
        }
      }

      summaries.push({
        classId: classRecord.id,
        className: classRecord.name,
        studentsWithArrears,
        totalArrears,
      })
    }

    return summaries
  }

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  /**
   * Generate daily collection report HTML for PDF export
   * Requirement 10.4: Produce exportable formats (PDF)
   */
  generateDailyCollectionHTML(report: DailyCollectionReport): string {
    const paymentRows = report.payments
      .map(
        (p) => `
        <tr>
          <td>${p.receiptNumber}</td>
          <td>${p.studentName}</td>
          <td>${p.admissionNumber}</td>
          <td>${p.className}</td>
          <td>UGX ${p.amount.toLocaleString()}</td>
          <td>${p.method}</td>
          <td>${p.reference}</td>
          <td>${p.receivedAt.toLocaleTimeString()}</td>
        </tr>
      `
      )
      .join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Collection Report - ${report.date.toLocaleDateString()}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .school-name { font-size: 18px; font-weight: bold; }
    .report-title { font-size: 16px; margin-top: 10px; }
    .report-date { font-size: 14px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .summary { margin-top: 20px; background: #f9f9f9; padding: 15px; }
    .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .total { font-size: 16px; font-weight: bold; color: #2e7d32; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${report.schoolName}</div>
    <div class="report-title">DAILY COLLECTION REPORT</div>
    <div class="report-date">${report.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Receipt #</th>
        <th>Student Name</th>
        <th>Adm. No.</th>
        <th>Class</th>
        <th>Amount</th>
        <th>Method</th>
        <th>Reference</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows || '<tr><td colspan="8" style="text-align: center;">No payments recorded</td></tr>'}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row">
      <span>Total Payments:</span>
      <span>${report.paymentCount}</span>
    </div>
    <div class="summary-row">
      <span>Cash:</span>
      <span>UGX ${report.byMethod.CASH.toLocaleString()}</span>
    </div>
    <div class="summary-row">
      <span>Mobile Money:</span>
      <span>UGX ${report.byMethod.MOBILE_MONEY.toLocaleString()}</span>
    </div>
    <div class="summary-row">
      <span>Bank:</span>
      <span>UGX ${report.byMethod.BANK.toLocaleString()}</span>
    </div>
    <div class="summary-row total">
      <span>TOTAL COLLECTED:</span>
      <span>UGX ${report.totalAmount.toLocaleString()}</span>
    </div>
  </div>

  <div class="footer">
    <p>Generated on: ${report.generatedAt.toLocaleString()}</p>
  </div>
</body>
</html>
    `
  }


  /**
   * Generate term summary report HTML for PDF export
   * Requirement 10.4: Produce exportable formats (PDF)
   */
  generateTermSummaryHTML(report: TermFinancialSummary): string {
    const classRows = report.byClass
      .map(
        (c) => `
        <tr>
          <td>${c.className}</td>
          <td>${c.studentCount}</td>
          <td>UGX ${c.expectedFees.toLocaleString()}</td>
          <td>UGX ${c.collectedAmount.toLocaleString()}</td>
          <td>UGX ${c.outstandingBalance.toLocaleString()}</td>
          <td>${c.collectionRate}%</td>
        </tr>
      `
      )
      .join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Term Financial Summary - ${report.termName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .school-name { font-size: 18px; font-weight: bold; }
    .report-title { font-size: 16px; margin-top: 10px; }
    .term-name { font-size: 14px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .summary { margin-top: 20px; background: #f9f9f9; padding: 15px; }
    .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .total { font-size: 14px; font-weight: bold; }
    .collected { color: #2e7d32; }
    .outstanding { color: #c62828; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${report.schoolName}</div>
    <div class="report-title">TERM FINANCIAL SUMMARY</div>
    <div class="term-name">${report.termName}</div>
  </div>

  <div class="summary">
    <div class="summary-row total">
      <span>Expected Fees:</span>
      <span>UGX ${report.expectedFees.toLocaleString()}</span>
    </div>
    <div class="summary-row total collected">
      <span>Collected Amount:</span>
      <span>UGX ${report.collectedAmount.toLocaleString()}</span>
    </div>
    <div class="summary-row total outstanding">
      <span>Outstanding Balance:</span>
      <span>UGX ${report.outstandingBalance.toLocaleString()}</span>
    </div>
    <div class="summary-row total">
      <span>Collection Rate:</span>
      <span>${report.collectionRate}%</span>
    </div>
  </div>

  <h3>Breakdown by Class</h3>
  <table>
    <thead>
      <tr>
        <th>Class</th>
        <th>Students</th>
        <th>Expected</th>
        <th>Collected</th>
        <th>Outstanding</th>
        <th>Rate</th>
      </tr>
    </thead>
    <tbody>
      ${classRows || '<tr><td colspan="6" style="text-align: center;">No classes found</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated on: ${report.generatedAt.toLocaleString()}</p>
  </div>
</body>
</html>
    `
  }

  /**
   * Generate arrears report HTML for PDF export
   * Requirement 10.4: Produce exportable formats (PDF)
   */
  generateArrearsReportHTML(report: ArrearsReport): string {
    const studentRows = report.students
      .map(
        (s) => `
        <tr>
          <td>${s.studentName}</td>
          <td>${s.admissionNumber}</td>
          <td>${s.className}</td>
          <td>UGX ${s.totalFees.toLocaleString()}</td>
          <td>UGX ${s.totalPaid.toLocaleString()}</td>
          <td>UGX ${s.arrearsAmount.toLocaleString()}</td>
          <td>${s.arrearsPercentage}%</td>
          <td>${s.lastPaymentDate?.toLocaleDateString() || 'N/A'}</td>
          <td>${s.guardianPhone || 'N/A'}</td>
        </tr>
      `
      )
      .join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Arrears Report - ${report.termName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .school-name { font-size: 18px; font-weight: bold; }
    .report-title { font-size: 16px; margin-top: 10px; color: #c62828; }
    .term-name { font-size: 14px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .summary { margin-top: 20px; background: #fff3e0; padding: 15px; border: 1px solid #ff9800; }
    .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .total { font-size: 14px; font-weight: bold; color: #c62828; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${report.schoolName}</div>
    <div class="report-title">ARREARS REPORT</div>
    <div class="term-name">${report.termName}</div>
  </div>

  <div class="summary">
    <div class="summary-row total">
      <span>Students with Arrears:</span>
      <span>${report.totalStudentsWithArrears}</span>
    </div>
    <div class="summary-row total">
      <span>Total Arrears Amount:</span>
      <span>UGX ${report.totalArrearsAmount.toLocaleString()}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Student Name</th>
        <th>Adm. No.</th>
        <th>Class</th>
        <th>Total Fees</th>
        <th>Paid</th>
        <th>Arrears</th>
        <th>%</th>
        <th>Last Payment</th>
        <th>Guardian Phone</th>
      </tr>
    </thead>
    <tbody>
      ${studentRows || '<tr><td colspan="9" style="text-align: center;">No students with arrears</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated on: ${report.generatedAt.toLocaleString()}</p>
  </div>
</body>
</html>
    `
  }


  // ============================================
  // EXCEL EXPORT FUNCTIONS
  // ============================================

  /**
   * Generate daily collection report data for Excel export
   * Requirement 10.4: Produce exportable formats (Excel)
   */
  generateDailyCollectionExcelData(report: DailyCollectionReport): {
    headers: string[]
    rows: (string | number)[][]
    summary: { label: string; value: string | number }[]
  } {
    const headers = [
      'Receipt #',
      'Student Name',
      'Admission No.',
      'Class',
      'Amount (UGX)',
      'Method',
      'Reference',
      'Time',
    ]

    const rows = report.payments.map((p) => [
      p.receiptNumber,
      p.studentName,
      p.admissionNumber,
      p.className,
      p.amount,
      p.method,
      p.reference,
      p.receivedAt.toLocaleTimeString(),
    ])

    const summary = [
      { label: 'Date', value: report.date.toLocaleDateString() },
      { label: 'School', value: report.schoolName },
      { label: 'Total Payments', value: report.paymentCount },
      { label: 'Cash', value: report.byMethod.CASH },
      { label: 'Mobile Money', value: report.byMethod.MOBILE_MONEY },
      { label: 'Bank', value: report.byMethod.BANK },
      { label: 'Total Collected', value: report.totalAmount },
    ]

    return { headers, rows, summary }
  }

  /**
   * Generate term summary report data for Excel export
   * Requirement 10.4: Produce exportable formats (Excel)
   */
  generateTermSummaryExcelData(report: TermFinancialSummary): {
    headers: string[]
    rows: (string | number)[][]
    summary: { label: string; value: string | number }[]
  } {
    const headers = [
      'Class',
      'Students',
      'Expected Fees (UGX)',
      'Collected (UGX)',
      'Outstanding (UGX)',
      'Collection Rate (%)',
    ]

    const rows = report.byClass.map((c) => [
      c.className,
      c.studentCount,
      c.expectedFees,
      c.collectedAmount,
      c.outstandingBalance,
      c.collectionRate,
    ])

    const summary = [
      { label: 'Term', value: report.termName },
      { label: 'School', value: report.schoolName },
      { label: 'Expected Fees', value: report.expectedFees },
      { label: 'Collected Amount', value: report.collectedAmount },
      { label: 'Outstanding Balance', value: report.outstandingBalance },
      { label: 'Collection Rate', value: `${report.collectionRate}%` },
    ]

    return { headers, rows, summary }
  }

  /**
   * Generate arrears report data for Excel export
   * Requirement 10.4: Produce exportable formats (Excel)
   */
  generateArrearsReportExcelData(report: ArrearsReport): {
    headers: string[]
    rows: (string | number | undefined)[][]
    summary: { label: string; value: string | number }[]
  } {
    const headers = [
      'Student Name',
      'Admission No.',
      'Class',
      'Total Fees (UGX)',
      'Paid (UGX)',
      'Arrears (UGX)',
      'Arrears %',
      'Last Payment',
      'Guardian Phone',
    ]

    const rows = report.students.map((s) => [
      s.studentName,
      s.admissionNumber,
      s.className,
      s.totalFees,
      s.totalPaid,
      s.arrearsAmount,
      s.arrearsPercentage,
      s.lastPaymentDate?.toLocaleDateString() || 'N/A',
      s.guardianPhone || 'N/A',
    ])

    const summary = [
      { label: 'Term', value: report.termName },
      { label: 'School', value: report.schoolName },
      { label: 'Students with Arrears', value: report.totalStudentsWithArrears },
      { label: 'Total Arrears Amount', value: report.totalArrearsAmount },
    ]

    return { headers, rows, summary }
  }

  /**
   * Convert report data to CSV format
   * Requirement 10.4: Produce exportable formats (Excel - CSV compatible)
   */
  convertToCSV(
    headers: string[],
    rows: (string | number | undefined)[][]
  ): string {
    const escapeCSV = (value: string | number | undefined): string => {
      if (value === undefined || value === null) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headerLine = headers.map(escapeCSV).join(',')
    const dataLines = rows.map((row) => row.map(escapeCSV).join(','))

    return [headerLine, ...dataLines].join('\n')
  }

  // ============================================
  // PURE FUNCTIONS FOR TESTING
  // ============================================

  /**
   * Calculate collection rate
   */
  calculateCollectionRate(collected: number, expected: number): number {
    if (expected <= 0) return 0
    return Math.round((collected / expected) * 10000) / 100
  }

  /**
   * Calculate arrears percentage
   */
  calculateArrearsPercentage(arrears: number, totalFees: number): number {
    if (totalFees <= 0) return 0
    return Math.round((arrears / totalFees) * 10000) / 100
  }

  /**
   * Sort students by arrears amount descending
   */
  sortByArrearsDescending<T extends { arrearsAmount: number }>(students: T[]): T[] {
    return [...students].sort((a, b) => b.arrearsAmount - a.arrearsAmount)
  }

  /**
   * Filter students by minimum arrears amount
   */
  filterByMinimumArrears<T extends { arrearsAmount: number }>(
    students: T[],
    minAmount: number
  ): T[] {
    return students.filter((s) => s.arrearsAmount >= minAmount)
  }

  /**
   * Aggregate payments by method
   */
  aggregateByMethod(
    payments: { amount: number; method: PaymentMethod }[]
  ): Record<PaymentMethod, number> {
    return payments.reduce(
      (acc, p) => {
        acc[p.method] = (acc[p.method] || 0) + p.amount
        return acc
      },
      { CASH: 0, MOBILE_MONEY: 0, BANK: 0 } as Record<PaymentMethod, number>
    )
  }

  /**
   * Calculate total from payments
   */
  calculateTotalPayments(payments: { amount: number }[]): number {
    return payments.reduce((sum, p) => sum + p.amount, 0)
  }
}

// Export singleton instance
export const financialReportsService = new FinancialReportsService()
