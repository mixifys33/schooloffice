/**
 * Atomic Counter Service
 * Provides truly atomic number generation for receipts and invoices
 * Fixes Issue #2: Missing Atomicity in Receipt Number Generation
 * 
 * Uses MongoDB's findOneAndUpdate with atomic increment to prevent race conditions
 */
import { prisma } from '@/lib/db'

/**
 * Generate next receipt number atomically
 * This operation is atomic at the database level
 */
export async function generateNextReceiptNumber(schoolId: string): Promise<number> {
  // Use MongoDB's atomic findAndModify operation through Prisma
  const settings = await prisma.financeSettings.upsert({
    where: { schoolId },
    update: {
      nextReceiptNumber: { increment: 1 },
    },
    create: {
      schoolId,
      nextReceiptNumber: 2, // Start at 2 since we're returning 1
    },
    select: {
      nextReceiptNumber: true,
    },
  })

  // Return the incremented value - 1 to get the current number
  // This works because upsert returns the value AFTER update
  return settings.nextReceiptNumber - 1
}

/**
 * Generate next invoice number atomically
 * This operation is atomic at the database level
 */
export async function generateNextInvoiceNumber(schoolId: string): Promise<number> {
  const settings = await prisma.financeSettings.upsert({
    where: { schoolId },
    update: {
      nextInvoiceNumber: { increment: 1 },
    },
    create: {
      schoolId,
      nextInvoiceNumber: 2,
    },
    select: {
      nextInvoiceNumber: true,
    },
  })

  return settings.nextInvoiceNumber - 1
}

/**
 * Format receipt number with prefix and year
 */
export async function formatReceiptNumber(
  schoolId: string,
  number: number
): Promise<string> {
  const settings = await prisma.financeSettings.findUnique({
    where: { schoolId },
    select: { receiptPrefix: true },
  })

  const prefix = settings?.receiptPrefix || 'RCP'
  const year = new Date().getFullYear()
  
  return `${prefix}-${year}-${String(number).padStart(6, '0')}`
}

/**
 * Format invoice number with prefix and year
 */
export async function formatInvoiceNumber(
  schoolId: string,
  number: number
): Promise<string> {
  const settings = await prisma.financeSettings.findUnique({
    where: { schoolId },
    select: { invoicePrefix: true },
  })

  const prefix = settings?.invoicePrefix || 'INV'
  const year = new Date().getFullYear()
  
  return `${prefix}-${year}-${String(number).padStart(6, '0')}`
}

/**
 * Generate and format receipt number in one call
 */
export async function generateReceiptNumber(schoolId: string): Promise<string> {
  const number = await generateNextReceiptNumber(schoolId)
  return formatReceiptNumber(schoolId, number)
}

/**
 * Generate and format invoice number in one call
 */
export async function generateInvoiceNumber(schoolId: string): Promise<string> {
  const number = await generateNextInvoiceNumber(schoolId)
  return formatInvoiceNumber(schoolId, number)
}

export const AtomicCounter = {
  generateNextReceiptNumber,
  generateNextInvoiceNumber,
  formatReceiptNumber,
  formatInvoiceNumber,
  generateReceiptNumber,
  generateInvoiceNumber,
}

export default AtomicCounter
