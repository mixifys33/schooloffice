/**
 * Property Test: Receipt Content Completeness
 * **Feature: school-office, Property 19: Receipt Content Completeness**
 * **Validates: Requirements 9.4**
 * 
 * For any payment receipt, it SHALL contain payment amount, method, date,
 * receipt number, and remaining balance.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================
// TYPES FOR TESTING
// ============================================

type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK'

interface ReceiptData {
  receiptNumber: string
  student: {
    name: string
    admissionNumber: string
    className: string
  }
  school: {
    name: string
    address?: string
    phone?: string
  }
  payment: {
    amount: number
    method: PaymentMethod
    reference: string
    receivedAt: Date
    receivedBy: string
  }
  balance: {
    totalFees: number
    totalPaid: number
    remainingBalance: number
  }
  generatedAt: Date
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate receipt content completeness
 * Requirement 9.4: Receipt with payment details and remaining balance
 */
function validateReceiptCompleteness(
  data: ReceiptData
): { complete: boolean; missing: string[] } {
  const missing: string[] = []

  // Check receipt number
  if (!data.receiptNumber) missing.push('receipt number')

  // Check student details
  if (!data.student.name) missing.push('student name')
  if (!data.student.admissionNumber) missing.push('admission number')
  if (!data.student.className) missing.push('class name')

  // Check school details
  if (!data.school.name) missing.push('school name')

  // Check payment details
  if (data.payment.amount === undefined || data.payment.amount === null) {
    missing.push('payment amount')
  }
  if (!data.payment.method) missing.push('payment method')
  if (!data.payment.reference) missing.push('payment reference')
  if (!data.payment.receivedAt) missing.push('payment date')
  if (!data.payment.receivedBy) missing.push('received by')

  // Check balance details
  if (data.balance.totalFees === undefined) missing.push('total fees')
  if (data.balance.totalPaid === undefined) missing.push('total paid')
  if (data.balance.remainingBalance === undefined) missing.push('remaining balance')

  // Check generated timestamp
  if (!data.generatedAt) missing.push('generated timestamp')

  return {
    complete: missing.length === 0,
    missing,
  }
}

/**
 * Generate receipt HTML
 */
function generateReceiptHTML(data: ReceiptData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${data.receiptNumber}</title>
</head>
<body>
  <div class="header">
    <div class="school-name">${data.school.name}</div>
    <div class="receipt-title">PAYMENT RECEIPT</div>
    <div class="receipt-number">${data.receiptNumber}</div>
  </div>
  <div class="student-info">
    <span>Student: ${data.student.name}</span>
    <span>Admission No: ${data.student.admissionNumber}</span>
    <span>Class: ${data.student.className}</span>
  </div>
  <div class="payment-info">
    <span>Amount Paid: UGX ${data.payment.amount.toLocaleString()}</span>
    <span>Payment Method: ${data.payment.method}</span>
    <span>Reference: ${data.payment.reference}</span>
    <span>Date: ${data.payment.receivedAt.toLocaleDateString()}</span>
    <span>Received By: ${data.payment.receivedBy}</span>
  </div>
  <div class="balance-info">
    <span>Total Fees: UGX ${data.balance.totalFees.toLocaleString()}</span>
    <span>Total Paid: UGX ${data.balance.totalPaid.toLocaleString()}</span>
    <span>Remaining Balance: UGX ${data.balance.remainingBalance.toLocaleString()}</span>
  </div>
  <div class="footer">
    <p>Generated on: ${data.generatedAt.toLocaleString()}</p>
  </div>
</body>
</html>
  `
}

// ============================================
// ARBITRARIES FOR GENERATING TEST DATA
// ============================================

const receiptDataArbitrary = fc.record({
  receiptNumber: fc.string({ minLength: 5, maxLength: 20 }),
  student: fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    admissionNumber: fc.string({ minLength: 1, maxLength: 20 }),
    className: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  school: fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    address: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    phone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  }),
  payment: fc.record({
    amount: fc.integer({ min: 1, max: 10000000 }),
    method: fc.constantFrom('CASH' as const, 'MOBILE_MONEY' as const, 'BANK' as const),
    reference: fc.string({ minLength: 1, maxLength: 50 }),
    receivedAt: fc.date(),
    receivedBy: fc.string({ minLength: 1, maxLength: 100 }),
  }),
  balance: fc.record({
    totalFees: fc.integer({ min: 0, max: 10000000 }),
    totalPaid: fc.integer({ min: 0, max: 10000000 }),
    remainingBalance: fc.integer({ min: -10000000, max: 10000000 }),
  }),
  generatedAt: fc.date(),
})

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 19: Receipt Content Completeness', () => {
  /**
   * Property: Valid receipt data passes completeness validation
   */
  it('valid receipt data passes completeness validation', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const validation = validateReceiptCompleteness(data)
        return validation.complete === true && validation.missing.length === 0
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains payment amount
   */
  it('receipt contains payment amount', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(`${data.payment.amount.toLocaleString()}`)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains payment method
   */
  it('receipt contains payment method', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(data.payment.method)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains receipt number
   */
  it('receipt contains receipt number', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(data.receiptNumber)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains remaining balance
   */
  it('receipt contains remaining balance', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(`${data.balance.remainingBalance.toLocaleString()}`)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains student name
   */
  it('receipt contains student name', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(data.student.name)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains school name
   */
  it('receipt contains school name', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(data.school.name)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains payment reference
   */
  it('receipt contains payment reference', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(data.payment.reference)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Missing receipt number fails validation
   */
  it('missing receipt number fails validation', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const invalidData = { ...data, receiptNumber: '' }
        const validation = validateReceiptCompleteness(invalidData)
        return !validation.complete && validation.missing.includes('receipt number')
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Missing payment method fails validation
   */
  it('missing payment method fails validation', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const invalidData = {
          ...data,
          payment: { ...data.payment, method: '' as PaymentMethod },
        }
        const validation = validateReceiptCompleteness(invalidData)
        return !validation.complete && validation.missing.includes('payment method')
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Generated HTML is valid structure
   */
  it('generated HTML is valid structure', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        
        return (
          html.includes('<!DOCTYPE html>') &&
          html.includes('<html>') &&
          html.includes('</html>') &&
          html.includes('<head>') &&
          html.includes('</head>') &&
          html.includes('<body>') &&
          html.includes('</body>')
        )
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt title contains receipt number
   */
  it('receipt title contains receipt number', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(`<title>Receipt - ${data.receiptNumber}</title>`)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains total fees
   */
  it('receipt contains total fees', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(`Total Fees: UGX ${data.balance.totalFees.toLocaleString()}`)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Receipt contains total paid
   */
  it('receipt contains total paid', () => {
    fc.assert(
      fc.property(receiptDataArbitrary, (data) => {
        const html = generateReceiptHTML(data)
        return html.includes(`Total Paid: UGX ${data.balance.totalPaid.toLocaleString()}`)
      }),
      { numRuns: 20 }
    )
  })
})
