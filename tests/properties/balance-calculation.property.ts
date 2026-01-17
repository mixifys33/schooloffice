/**
 * Property Test: Balance Calculation Accuracy
 * **Feature: school-office, Property 18: Balance Calculation Accuracy**
 * **Validates: Requirements 9.2, 9.3, 9.5**
 * 
 * For any student, balance SHALL equal (total fees - total payments),
 * and arrears flag SHALL be true if and only if balance > 0.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================
// PURE FUNCTIONS FOR BALANCE CALCULATION
// ============================================

/**
 * Calculate balance from total fees and total paid
 * Requirement 9.2, 9.3: Balance = totalFees - totalPaid
 */
function calculateBalance(totalFees: number, totalPaid: number): number {
  return totalFees - totalPaid
}

/**
 * Check if student has arrears
 * Requirement 9.5: Arrears flag is true if balance > 0
 */
function hasArrears(balance: number): boolean {
  return balance > 0
}

/**
 * Calculate total from array of payments
 */
function calculateTotalPaid(payments: { amount: number }[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0)
}

// ============================================
// TYPES FOR TESTING
// ============================================

interface Payment {
  id: string
  amount: number
  method: 'CASH' | 'MOBILE_MONEY' | 'BANK'
  reference: string
  receivedAt: Date
}

interface StudentBalance {
  studentId: string
  termId: string
  totalFees: number
  totalPaid: number
  balance: number
  hasArrears: boolean
}

// ============================================
// SIMULATED FINANCE STORE
// ============================================

class FinanceStore {
  private feeStructures: Map<string, number> = new Map() // classId-termId -> totalFees
  private payments: Map<string, Payment[]> = new Map() // studentId-termId -> payments
  private studentClasses: Map<string, string> = new Map() // studentId -> classId

  setFeeStructure(classId: string, termId: string, totalFees: number): void {
    this.feeStructures.set(`${classId}-${termId}`, totalFees)
  }

  setStudentClass(studentId: string, classId: string): void {
    this.studentClasses.set(studentId, classId)
  }

  getStudentTotalFees(studentId: string, termId: string): number {
    const classId = this.studentClasses.get(studentId)
    if (!classId) return 0
    return this.feeStructures.get(`${classId}-${termId}`) ?? 0
  }

  recordPayment(studentId: string, termId: string, payment: Payment): void {
    const key = `${studentId}-${termId}`
    const existing = this.payments.get(key) || []
    existing.push(payment)
    this.payments.set(key, existing)
  }

  getStudentPayments(studentId: string, termId: string): Payment[] {
    return this.payments.get(`${studentId}-${termId}`) || []
  }

  getStudentTotalPaid(studentId: string, termId: string): number {
    const payments = this.getStudentPayments(studentId, termId)
    return calculateTotalPaid(payments)
  }

  calculateStudentBalance(studentId: string, termId: string): StudentBalance {
    const totalFees = this.getStudentTotalFees(studentId, termId)
    const totalPaid = this.getStudentTotalPaid(studentId, termId)
    const balance = calculateBalance(totalFees, totalPaid)

    return {
      studentId,
      termId,
      totalFees,
      totalPaid,
      balance,
      hasArrears: hasArrears(balance),
    }
  }
}

// ============================================
// ARBITRARIES FOR GENERATING TEST DATA
// ============================================

const paymentArbitrary = fc.record({
  id: fc.uuid(),
  amount: fc.integer({ min: 1, max: 1000000 }),
  method: fc.constantFrom('CASH' as const, 'MOBILE_MONEY' as const, 'BANK' as const),
  reference: fc.string({ minLength: 5, maxLength: 20 }),
  receivedAt: fc.date(),
})

const totalFeesArbitrary = fc.integer({ min: 0, max: 5000000 })

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 18: Balance Calculation Accuracy', () => {
  /**
   * Property: Balance equals totalFees minus totalPaid
   */
  it('balance equals totalFees minus totalPaid', () => {
    fc.assert(
      fc.property(
        totalFeesArbitrary,
        fc.array(paymentArbitrary, { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, payments, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          for (const payment of payments) {
            store.recordPayment(studentId, termId, payment)
          }
          
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          const expectedBalance = totalFees - payments.reduce((sum, p) => sum + p.amount, 0)
          
          return balanceInfo.balance === expectedBalance
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Arrears flag is true if and only if balance > 0
   */
  it('arrears flag is true if and only if balance > 0', () => {
    fc.assert(
      fc.property(
        totalFeesArbitrary,
        fc.array(paymentArbitrary, { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, payments, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          for (const payment of payments) {
            store.recordPayment(studentId, termId, payment)
          }
          
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          
          // Arrears should be true iff balance > 0
          return balanceInfo.hasArrears === (balanceInfo.balance > 0)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Zero fees means no arrears regardless of payments
   */
  it('zero fees means no arrears regardless of payments', () => {
    fc.assert(
      fc.property(
        fc.array(paymentArbitrary, { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (payments, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, 0) // Zero fees
          store.setStudentClass(studentId, classId)
          
          for (const payment of payments) {
            store.recordPayment(studentId, termId, payment)
          }
          
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          
          // With zero fees, balance should be negative or zero (overpaid or exact)
          return balanceInfo.balance <= 0 && !balanceInfo.hasArrears
        }
      ),
      { numRuns: 20 }
    )
  })


  /**
   * Property: Full payment results in zero balance
   */
  it('full payment results in zero balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000000 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          // Make a full payment
          store.recordPayment(studentId, termId, {
            id: 'payment-1',
            amount: totalFees,
            method: 'CASH',
            reference: 'FULL-PAYMENT',
            receivedAt: new Date(),
          })
          
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          
          return balanceInfo.balance === 0 && !balanceInfo.hasArrears
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Overpayment results in negative balance
   */
  it('overpayment results in negative balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, extraAmount, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          // Make an overpayment
          store.recordPayment(studentId, termId, {
            id: 'payment-1',
            amount: totalFees + extraAmount,
            method: 'CASH',
            reference: 'OVER-PAYMENT',
            receivedAt: new Date(),
          })
          
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          
          return balanceInfo.balance < 0 && !balanceInfo.hasArrears
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Partial payment results in positive balance with arrears
   */
  it('partial payment results in positive balance with arrears', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5000000 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          // Make a partial payment (half)
          const partialAmount = Math.floor(totalFees / 2)
          store.recordPayment(studentId, termId, {
            id: 'payment-1',
            amount: partialAmount,
            method: 'CASH',
            reference: 'PARTIAL-PAYMENT',
            receivedAt: new Date(),
          })
          
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          const expectedBalance = totalFees - partialAmount
          
          return (
            balanceInfo.balance === expectedBalance &&
            balanceInfo.balance > 0 &&
            balanceInfo.hasArrears
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Multiple payments sum correctly
   */
  it('multiple payments sum correctly', () => {
    fc.assert(
      fc.property(
        totalFeesArbitrary,
        fc.array(paymentArbitrary, { minLength: 2, maxLength: 10 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, payments, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          for (const payment of payments) {
            store.recordPayment(studentId, termId, payment)
          }
          
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          const expectedTotalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
          
          return balanceInfo.totalPaid === expectedTotalPaid
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Balance calculation is consistent
   */
  it('balance calculation is consistent', () => {
    fc.assert(
      fc.property(
        totalFeesArbitrary,
        fc.array(paymentArbitrary, { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, payments, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          for (const payment of payments) {
            store.recordPayment(studentId, termId, payment)
          }
          
          // Calculate balance twice
          const balance1 = store.calculateStudentBalance(studentId, termId)
          const balance2 = store.calculateStudentBalance(studentId, termId)
          
          return (
            balance1.balance === balance2.balance &&
            balance1.totalFees === balance2.totalFees &&
            balance1.totalPaid === balance2.totalPaid &&
            balance1.hasArrears === balance2.hasArrears
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: totalFees is preserved in balance info
   */
  it('totalFees is preserved in balance info', () => {
    fc.assert(
      fc.property(
        totalFeesArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          
          return balanceInfo.totalFees === totalFees
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: No payments means balance equals total fees
   */
  it('no payments means balance equals total fees', () => {
    fc.assert(
      fc.property(
        totalFeesArbitrary,
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          // No payments recorded
          const balanceInfo = store.calculateStudentBalance(studentId, termId)
          
          return (
            balanceInfo.balance === totalFees &&
            balanceInfo.totalPaid === 0 &&
            balanceInfo.hasArrears === (totalFees > 0)
          )
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: calculateBalance pure function is correct
   */
  it('calculateBalance pure function is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }),
        fc.integer({ min: 0, max: 10000000 }),
        (totalFees, totalPaid) => {
          const balance = calculateBalance(totalFees, totalPaid)
          return balance === totalFees - totalPaid
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: hasArrears pure function is correct
   */
  it('hasArrears pure function is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000000, max: 10000000 }),
        (balance) => {
          const arrears = hasArrears(balance)
          return arrears === (balance > 0)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Balance is additive with payments
   */
  it('balance is additive with payments', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 5000000 }),
        fc.integer({ min: 1, max: 500000 }),
        fc.integer({ min: 1, max: 500000 }),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (totalFees, payment1Amount, payment2Amount, studentId, classId, termId) => {
          const store = new FinanceStore()
          
          store.setFeeStructure(classId, termId, totalFees)
          store.setStudentClass(studentId, classId)
          
          // Record first payment
          store.recordPayment(studentId, termId, {
            id: 'payment-1',
            amount: payment1Amount,
            method: 'CASH',
            reference: 'PAY-1',
            receivedAt: new Date(),
          })
          
          const balanceAfterFirst = store.calculateStudentBalance(studentId, termId)
          
          // Record second payment
          store.recordPayment(studentId, termId, {
            id: 'payment-2',
            amount: payment2Amount,
            method: 'CASH',
            reference: 'PAY-2',
            receivedAt: new Date(),
          })
          
          const balanceAfterSecond = store.calculateStudentBalance(studentId, termId)
          
          // Balance should decrease by exactly the second payment amount
          return balanceAfterFirst.balance - balanceAfterSecond.balance === payment2Amount
        }
      ),
      { numRuns: 20 }
    )
  })
})
