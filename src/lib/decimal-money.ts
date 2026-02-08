/**
 * Decimal Money Library
 * Provides precise decimal arithmetic for financial calculations
 * Fixes Issue #3: Floating Point Arithmetic for Money
 * 
 * Uses Decimal.js to avoid floating-point precision errors
 */
import Decimal from 'decimal.js'

// Configure Decimal.js for currency (2 decimal places)
Decimal.set({
  precision: 20, // High precision for intermediate calculations
  rounding: Decimal.ROUND_HALF_UP, // Standard rounding
  toExpNeg: -7,
  toExpPos: 21,
})

/**
 * Money class - wraps Decimal.js for currency operations
 */
export class Money {
  private amount: Decimal

  constructor(value: number | string | Decimal) {
    this.amount = new Decimal(value)
  }

  /**
   * Add another money amount
   */
  add(other: Money | number | string): Money {
    return new Money(this.amount.add(new Decimal(other instanceof Money ? other.amount : other)))
  }

  /**
   * Subtract another money amount
   */
  subtract(other: Money | number | string): Money {
    return new Money(this.amount.sub(new Decimal(other instanceof Money ? other.amount : other)))
  }

  /**
   * Multiply by a number
   */
  multiply(multiplier: number | string): Money {
    return new Money(this.amount.mul(new Decimal(multiplier)))
  }

  /**
   * Divide by a number
   */
  divide(divisor: number | string): Money {
    return new Money(this.amount.div(new Decimal(divisor)))
  }

  /**
   * Calculate percentage of this amount
   */
  percentage(percent: number | string): Money {
    return new Money(this.amount.mul(new Decimal(percent)).div(100))
  }

  /**
   * Check if equal to another amount
   */
  equals(other: Money | number | string): boolean {
    return this.amount.equals(new Decimal(other instanceof Money ? other.amount : other))
  }

  /**
   * Check if greater than another amount
   */
  greaterThan(other: Money | number | string): boolean {
    return this.amount.greaterThan(new Decimal(other instanceof Money ? other.amount : other))
  }

  /**
   * Check if less than another amount
   */
  lessThan(other: Money | number | string): boolean {
    return this.amount.lessThan(new Decimal(other instanceof Money ? other.amount : other))
  }

  /**
   * Check if greater than or equal to another amount
   */
  greaterThanOrEqual(other: Money | number | string): boolean {
    return this.amount.greaterThanOrEquals(new Decimal(other instanceof Money ? other.amount : other))
  }

  /**
   * Check if less than or equal to another amount
   */
  lessThanOrEqual(other: Money | number | string): boolean {
    return this.amount.lessThanOrEquals(new Decimal(other instanceof Money ? other.amount : other))
  }

  /**
   * Get absolute value
   */
  abs(): Money {
    return new Money(this.amount.abs())
  }

  /**
   * Get negative value
   */
  negate(): Money {
    return new Money(this.amount.neg())
  }

  /**
   * Round to currency precision (2 decimal places)
   */
  round(): Money {
    return new Money(this.amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP))
  }

  /**
   * Convert to number (use with caution - may lose precision)
   */
  toNumber(): number {
    return this.amount.toNumber()
  }

  /**
   * Convert to string with 2 decimal places
   */
  toString(): string {
    return this.amount.toFixed(2)
  }

  /**
   * Convert to display string with thousand separators
   */
  toDisplayString(currencySymbol: string = 'UGX'): string {
    const value = this.amount.toFixed(2)
    const [integer, decimal] = value.split('.')
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${currencySymbol} ${formattedInteger}.${decimal}`
  }

  /**
   * Check if zero
   */
  isZero(): boolean {
    return this.amount.isZero()
  }

  /**
   * Check if positive
   */
  isPositive(): boolean {
    return this.amount.greaterThan(0)
  }

  /**
   * Check if negative
   */
  isNegative(): boolean {
    return this.amount.lessThan(0)
  }

  /**
   * Get the raw Decimal value
   */
  toDecimal(): Decimal {
    return this.amount
  }
}

/**
 * Helper functions for common money operations
 */

/**
 * Create Money from number or string
 */
export function money(value: number | string | Decimal): Money {
  return new Money(value)
}

/**
 * Sum an array of money amounts
 */
export function sum(amounts: Array<Money | number | string>): Money {
  return amounts.reduce((acc, curr) => {
    return acc.add(curr)
  }, new Money(0))
}

/**
 * Calculate balance: fees - paid - discounts + penalties
 */
export function calculateBalance(
  totalFees: number | Money,
  totalPaid: number | Money,
  totalDiscounts: number | Money,
  totalPenalties: number | Money
): Money {
  const fees = totalFees instanceof Money ? totalFees : money(totalFees)
  const paid = totalPaid instanceof Money ? totalPaid : money(totalPaid)
  const discounts = totalDiscounts instanceof Money ? totalDiscounts : money(totalDiscounts)
  const penalties = totalPenalties instanceof Money ? totalPenalties : money(totalPenalties)

  return fees.subtract(paid).subtract(discounts).add(penalties).round()
}

/**
 * Calculate percentage of an amount
 */
export function calculatePercentage(
  amount: number | Money,
  percentage: number
): Money {
  const amt = amount instanceof Money ? amount : money(amount)
  return amt.percentage(percentage).round()
}

/**
 * Convert Money back to database-safe number
 */
export function toDbNumber(value: Money): number {
  return parseFloat(value.round().toString())
}

/**
 * Validate and convert user input to Money
 */
export function parseMoneyInput(input: string | number): Money {
  try {
    const value = typeof input === 'string' ? parseFloat(input) : input
    if (isNaN(value)) {
      throw new Error('Invalid money amount')
    }
    return money(value)
  } catch (error) {
    throw new Error('Invalid money amount')
  }
}

export default {
  Money,
  money,
  sum,
  calculateBalance,
  calculatePercentage,
  toDbNumber,
  parseMoneyInput,
}
