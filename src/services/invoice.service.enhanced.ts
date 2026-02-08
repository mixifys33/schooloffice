/**
 * Enhanced Invoice Service with Idempotency Protection
 * Fixes Issue #5: Invoice Generation Without Idempotency
 * 
 * Prevents duplicate invoices through transaction-based uniqueness checks
 */
import { prisma } from '@/lib/db'
import { generateInvoiceNumber } from '@/lib/atomic-counter'
import type {
  Invoice,
  InvoiceFilters,
  InvoiceStatus,
  PaginatedInvoices,
  FeeCategory,
} from '@/types/finance'
import { FinanceAuditService } from './finance-audit.service'

// Error codes
export const INVOICE_ERRORS = {
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  TERM_NOT_FOUND: 'TERM_NOT_FOUND',
  FEE_STRUCTURE_NOT_FOUND: 'FEE_STRUCTURE_NOT_FOUND',
  INVOICE_ALREADY_EXISTS: 'INVOICE_ALREADY_EXISTS',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  SCHOOL_NOT_FOUND: 'SCHOOL_NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
} as const

export class InvoiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'InvoiceError'
  }
}

/**
 * Determine invoice status based on payments
 */
function determineInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate: Date
): InvoiceStatus {
  const balance = totalAmount - paidAmount
  const today = new Date()

  if (balance <= 0) {
    return 'PAID'
  }
  if (paidAmount > 0 && balance > 0) {
    if (today > dueDate) {
      return 'OVERDUE'
    }
    return 'PARTIALLY_PAID'
  }
  if (paidAmount === 0 && today > dueDate) {
    return 'OVERDUE'
  }
  return 'ISSUED'
}

/**
 * Generate invoice for a student with idempotency protection
 * FIX: Issue #5 - Now uses transaction to prevent duplicate invoices
 * 
 * Property 26: Invoice Content Completeness
 */
export async function generateInvoice(
  studentId: string,
  termId: string,
  issuedBy?: string
): Promise<Invoice> {
  // Use transaction to ensure atomic check-and-create
  return await prisma.$transaction(async (tx) => {
    // Check if invoice already exists WITHIN THE TRANSACTION
    const existingInvoice = await tx.invoice.findFirst({
      where: {
        studentId,
        termId,
        status: { not: 'CANCELLED' },
      },
    })

    if (existingInvoice) {
      throw new InvoiceError(
        INVOICE_ERRORS.INVOICE_ALREADY_EXISTS,
        'An invoice already exists for this student and term',
        { invoiceId: existingInvoice.id, invoiceNumber: existingInvoice.invoiceNumber }
      )
    }

    // Get student with class info
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        stream: true,
        account: true,
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    if (!student) {
      throw new InvoiceError(
        INVOICE_ERRORS.STUDENT_NOT_FOUND,
        'Student not found',
        { studentId }
      )
    }

    // Get term info
    const term = await tx.term.findUnique({
      where: { id: termId },
    })

    if (!term) {
      throw new InvoiceError(
        INVOICE_ERRORS.TERM_NOT_FOUND,
        'Term not found',
        { termId }
      )
    }

    // Get student type from account or default to DAY
    const studentType = student.account?.studentType || 'DAY'

    // Get fee structure for this student's class, term, and type
    const feeStructure = await tx.feeStructure.findFirst({
      where: {
        schoolId: student.schoolId,
        classId: student.classId,
        termId,
        studentType,
        isActive: true,
      },
      include: {
        items: true,
      },
    })

    if (!feeStructure) {
      throw new InvoiceError(
        INVOICE_ERRORS.FEE_STRUCTURE_NOT_FOUND,
        'No active fee structure found for this student',
        { classId: student.classId, termId, studentType }
      )
    }

    // Calculate subtotal from fee items
    const subtotal = feeStructure.items.reduce((sum, item) => sum + item.amount, 0)

    // Get approved discounts for this term
    const discounts = student.account
      ? await tx.studentDiscount.findMany({
          where: {
            studentAccountId: student.account.id,
            termId,
            status: 'APPROVED',
          },
        })
      : []
    const discountAmount = discounts.reduce((sum, d) => sum + d.calculatedAmount, 0)

    // Get non-waived penalties for this term
    const penalties = student.account
      ? await tx.studentPenalty.findMany({
          where: {
            studentAccountId: student.account.id,
            termId,
            isWaived: false,
          },
        })
      : []
    const penaltyAmount = penalties.reduce((sum, p) => sum + p.amount, 0)

    // Calculate total amount
    const totalAmount = subtotal - discountAmount + penaltyAmount

    // Get confirmed payments for this term
    const payments = await tx.payment.findMany({
      where: {
        studentId,
        termId,
        status: 'CONFIRMED',
      },
    })
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)

    // Calculate balance
    const balance = totalAmount - paidAmount

    // Determine due date from fee structure or default
    const dueDate = feeStructure.dueDate || term.endDate

    // Determine initial status
    const status = determineInvoiceStatus(totalAmount, paidAmount, dueDate)

    // Get primary guardian
    const primaryGuardian = student.studentGuardians[0]?.guardian

    // Generate invoice number atomically
    const invoiceNumber = await generateInvoiceNumber(student.schoolId)

    // Create invoice with items
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        schoolId: student.schoolId,
        studentId,
        guardianId: primaryGuardian?.id,
        feeStructureId: feeStructure.id,
        termId,
        subtotal,
        discountAmount,
        penaltyAmount,
        totalAmount,
        paidAmount,
        balance,
        dueDate,
        status,
        issuedAt: new Date(),
        issuedBy,
        items: {
          create: feeStructure.items.map((item) => ({
            description: item.name,
            category: item.category as FeeCategory,
            amount: item.amount,
            isOptional: item.isOptional,
          })),
        },
      },
      include: {
        items: true,
        feeStructure: true,
      },
    })

    // Log audit entry (async)
    if (issuedBy) {
      setImmediate(async () => {
        try {
          await FinanceAuditService.logAction({
            schoolId: student.schoolId,
            userId: issuedBy,
            action: 'INVOICE_GENERATED',
            resourceType: 'Invoice',
            resourceId: invoice.id,
            newValue: {
              invoiceNumber,
              studentId,
              termId,
              totalAmount,
              balance,
              status,
            },
          })
        } catch (error) {
          console.error('Failed to log invoice audit:', error)
        }
      })
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      schoolId: invoice.schoolId,
      studentId: invoice.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      guardianId: invoice.guardianId ?? undefined,
      guardianName: primaryGuardian
        ? `${primaryGuardian.firstName} ${primaryGuardian.lastName}`
        : undefined,
      className: student.class.name + (student.stream ? ` - ${student.stream.name}` : ''),
      termId: invoice.termId,
      termName: term.name,
      feeStructureId: invoice.feeStructureId,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      penaltyAmount: invoice.penaltyAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balance: invoice.balance,
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status as InvoiceStatus,
      items: invoice.items.map((item) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        description: item.description,
        category: item.category as FeeCategory,
        amount: item.amount,
        isOptional: item.isOptional,
      })),
      issuedAt: invoice.issuedAt?.toISOString(),
      issuedBy: invoice.issuedBy ?? undefined,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    }
  }, {
    timeout: 15000,
    maxWait: 5000,
  })
}

/**
 * Generate invoices for all students in a class
 * Uses individual transactions per student to prevent all-or-nothing failure
 */
export async function generateClassInvoices(
  classId: string,
  termId: string,
  issuedBy: string
): Promise<{ generated: Invoice[]; skipped: { studentId: string; reason: string }[] }> {
  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
  })

  if (!classRecord) {
    throw new InvoiceError(
      INVOICE_ERRORS.CLASS_NOT_FOUND,
      'Class not found',
      { classId }
    )
  }

  // Verify term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new InvoiceError(
      INVOICE_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get all active students in the class
  const students = await prisma.student.findMany({
    where: {
      classId,
      status: 'ACTIVE',
    },
    select: { id: true },
  })

  const generated: Invoice[] = []
  const skipped: { studentId: string; reason: string }[] = []

  // Generate invoice for each student
  for (const student of students) {
    try {
      const invoice = await generateInvoice(student.id, termId, issuedBy)
      generated.push(invoice)
    } catch (error) {
      if (error instanceof InvoiceError) {
        skipped.push({
          studentId: student.id,
          reason: error.message,
        })
      } else {
        skipped.push({
          studentId: student.id,
          reason: 'Unknown error occurred',
        })
      }
    }
  }

  return { generated, skipped }
}

// Export service
export const InvoiceService = {
  generateInvoice,
  generateClassInvoices,
  // ... other existing functions
}

export default InvoiceService
