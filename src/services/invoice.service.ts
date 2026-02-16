/**
 * Invoice Service
 * Generates and manages student invoices
 * Requirements: 6.1, 6.5
 *   
 * Property 26: Invoice Content Completeness
 * For any generated invoice, the invoice SHALL contain all fee items,
 * applied discounts, applied penalties, payments made, and balance due.
 */
import { prisma } from '@/lib/db'
import type {
  Invoice,
  InvoiceItem,
  InvoiceFilters,
  InvoiceStatus,
  PaginatedInvoices,
  FeeCategory,
} from '@/types/finance'
import { FinanceAuditService } from './finance-audit.service'

// Error codes for invoice operations
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
 * Generate unique invoice number based on school settings
 */
async function generateInvoiceNumber(schoolId: string): Promise<string> {
  // Get current term to use in compound unique key
  const currentTerm = await prisma.term.findFirst({
    where: {
      academicYear: {
        schoolId,
        isCurrent: true,
      },
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
  })

  if (!currentTerm) {
    throw new InvoiceError(
      INVOICE_ERRORS.TERM_NOT_FOUND,
      'No active term found for invoice generation',
      { schoolId }
    )
  }

  const settings = await prisma.financeSettings.findFirst({
    where: { schoolId, termId: currentTerm.id },
  })

  const prefix = settings?.invoicePrefix || 'INV'
  const year = new Date().getFullYear()
  const nextNumber = settings?.nextInvoiceNumber || 1

  // Atomically increment the invoice number
  await prisma.financeSettings.upsert({
    where: {
      schoolId_termId: {
        schoolId,
        termId: currentTerm.id,
      },
    },
    update: { nextInvoiceNumber: nextNumber + 1 },
    create: {
      schoolId,
      termId: currentTerm.id,
      nextInvoiceNumber: nextNumber + 1,
    },
  })

  // Format: PREFIX-YEAR-NNNNNN (e.g., INV-2026-000001)
  return `${prefix}-${year}-${String(nextNumber).padStart(6, '0')}`
}

/**
 * Determine invoice status based on payments
 * Property 26: Invoice Content Completeness - status reflects payment state
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
 * Generate invoice for a student
 * Requirement 6.1: Invoice SHALL show all fee items, discounts, penalties, payments, and balance due
 * Property 26: Invoice Content Completeness
 */
export async function generateInvoice(
  studentId: string,
  termId: string,
  issuedBy?: string
): Promise<Invoice> {
  // Get student with class info
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      stream: true,
      studentAccounts: {
        where: { termId },
        take: 1,
      },
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

  // Get student type from account or default to DAY
  const studentAccount = student.studentAccounts?.[0]
  const studentType = studentAccount?.studentType || 'DAY'

  // Get fee structure for this student's class, term, and type
  const feeStructure = await prisma.feeStructure.findFirst({
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

  // Check if invoice already exists for this student and term
  const existingInvoice = await prisma.invoice.findFirst({
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

  // Calculate subtotal from fee items (Property 26)
  const subtotal = feeStructure.items.reduce((sum, item) => sum + item.amount, 0)

  // Get approved discounts for this term (Property 26)
  const discounts = studentAccount
    ? await prisma.studentDiscount.findMany({
        where: {
          studentAccountId: studentAccount.id,
          termId,
          status: 'APPROVED',
        },
      })
    : []
  const discountAmount = discounts.reduce((sum, d) => sum + d.calculatedAmount, 0)

  // Get non-waived penalties for this term (Property 26)
  const penalties = studentAccount
    ? await prisma.studentPenalty.findMany({
        where: {
          studentAccountId: studentAccount.id,
          termId,
          isWaived: false,
        },
      })
    : []
  const penaltyAmount = penalties.reduce((sum, p) => sum + p.amount, 0)

  // Calculate total amount
  const totalAmount = subtotal - discountAmount + penaltyAmount

  // Get confirmed payments for this term (Property 26)
  const payments = await prisma.payment.findMany({
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

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(student.schoolId)

  // Create invoice with items in a transaction
  const invoice = await prisma.invoice.create({
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
          schoolId: student.schoolId,
          description: item.name,
          category: item.category as FeeCategory,
          amount: item.amount,
          isOptional: item.isOptional,
          school: {
            connect: { id: student.schoolId },
          },
        })),
      },
    },
    include: {
      items: true,
      feeStructure: true,
    },
  })

  // Log audit entry
  if (issuedBy) {
    await FinanceAuditService.logAction({
      schoolId: student.schoolId,
      userId: issuedBy,
      action: 'INVOICE_GENERATED',
      entityType: "Invoice",
      entityId: invoice.id,
      details: {
        invoiceNumber,
        studentId,
        termId,
        totalAmount,
        balance,
        status,
      },
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
    className: student.class?.name
      ? student.class.name + (student.stream ? ` - ${student.stream.name}` : '')
      : '',
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
}


/**
 * Generate invoices for all students in a class
 * Requirement 6.1: Bulk invoice generation
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

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: true,
      feeStructure: true,
    },
  })

  if (!invoice) {
    return null
  }

  // Get student info
  const student = await prisma.student.findUnique({
    where: { id: invoice.studentId },
    include: {
      class: true,
      stream: true,
    },
  })

  // Get term info
  const term = await prisma.term.findUnique({
    where: { id: invoice.termId },
  })

  // Get guardian info if present
  let guardianName: string | undefined
  if (invoice.guardianId) {
    const guardian = await prisma.guardian.findUnique({
      where: { id: invoice.guardianId },
    })
    if (guardian) {
      guardianName = `${guardian.firstName} ${guardian.lastName}`
    }
  }

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    schoolId: invoice.schoolId,
    studentId: invoice.studentId,
    studentName: student
      ? `${student.firstName} ${student.lastName}`
      : 'Unknown',
    admissionNumber: student?.admissionNumber || '',
    guardianId: invoice.guardianId ?? undefined,
    guardianName,
    className: student?.class?.name
      ? student.class.name + (student.stream ? ` - ${student.stream.name}` : '')
      : '',
    termId: invoice.termId,
    termName: term?.name || '',
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
}

/**
 * Get invoice by invoice number
 */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber },
  })

  if (!invoice) {
    return null
  }

  return getInvoice(invoice.id)
}


/**
 * List invoices with filters and pagination
 * Requirement 6.6: Filter by term, class, and payment status
 */
export async function listInvoices(
  schoolId: string,
  filters: InvoiceFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedInvoices> {
  const where: Record<string, unknown> = { schoolId }

  if (filters.studentId) {
    where.studentId = filters.studentId
  }

  if (filters.guardianId) {
    where.guardianId = filters.guardianId
  }

  if (filters.termId) {
    where.termId = filters.termId
  }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.dueDateFrom || filters.dueDateTo) {
    where.dueDate = {}
    if (filters.dueDateFrom) {
      (where.dueDate as Record<string, Date>).gte = filters.dueDateFrom
    }
    if (filters.dueDateTo) {
      (where.dueDate as Record<string, Date>).lte = filters.dueDateTo
    }
  }

  // Filter by class through student relation
  if (filters.classId) {
    where.feeStructure = {
      classId: filters.classId,
    }
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        items: true,
        feeStructure: {
          include: {
            class: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ])

  // Get student and term info for all invoices
  const studentIds = [...new Set(invoices.map((i) => i.studentId))]
  const termIds = [...new Set(invoices.map((i) => i.termId))]
  const guardianIds = [...new Set(invoices.filter((i) => i.guardianId).map((i) => i.guardianId!))]

  const [students, terms, guardians] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { class: true, stream: true },
    }),
    prisma.term.findMany({
      where: { id: { in: termIds } },
    }),
    guardianIds.length > 0
      ? prisma.guardian.findMany({
          where: { id: { in: guardianIds } },
        })
      : Promise.resolve([]),
  ])

  const studentMap = new Map(students.map((s) => [s.id, s]))
  const termMap = new Map(terms.map((t) => [t.id, t]))
  const guardianMap = new Map(guardians.map((g) => [g.id, g]))

  const data: Invoice[] = invoices.map((invoice) => {
    const student = studentMap.get(invoice.studentId)
    const term = termMap.get(invoice.termId)
    const guardian = invoice.guardianId ? guardianMap.get(invoice.guardianId) : undefined

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      schoolId: invoice.schoolId,
      studentId: invoice.studentId,
      studentName: student
        ? `${student.firstName} ${student.lastName}`
        : 'Unknown',
      admissionNumber: student?.admissionNumber || '',
      guardianId: invoice.guardianId ?? undefined,
      guardianName: guardian
        ? `${guardian.firstName} ${guardian.lastName}`
        : undefined,
      className: student?.class?.name
      ? student.class.name + (student.stream ? ` - ${student.stream.name}` : '')
        : '',
      termId: invoice.termId,
      termName: term?.name || '',
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
  })

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
 * Update invoice status based on payments
 * Called after payment is recorded or reversed
 */
export async function updateInvoiceStatus(invoiceId: string): Promise<Invoice> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  })

  if (!invoice) {
    throw new InvoiceError(
      INVOICE_ERRORS.INVOICE_NOT_FOUND,
      'Invoice not found',
      { invoiceId }
    )
  }

  // Get current confirmed payments for this student and term
  const payments = await prisma.payment.findMany({
    where: {
      studentId: invoice.studentId,
      termId: invoice.termId,
      status: 'CONFIRMED',
    },
  })

  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = invoice.totalAmount - paidAmount
  const newStatus = determineInvoiceStatus(invoice.totalAmount, paidAmount, invoice.dueDate)

  // Update invoice
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidAmount,
      balance,
      status: newStatus,
    },
    include: { items: true },
  })

  // Get related info for response
  const student = await prisma.student.findUnique({
    where: { id: invoice.studentId },
    include: { class: true, stream: true },
  })

  const term = await prisma.term.findUnique({
    where: { id: invoice.termId },
  })

  let guardianName: string | undefined
  if (invoice.guardianId) {
    const guardian = await prisma.guardian.findUnique({
      where: { id: invoice.guardianId },
    })
    if (guardian) {
      guardianName = `${guardian.firstName} ${guardian.lastName}`
    }
  }

  return {
    id: updatedInvoice.id,
    invoiceNumber: updatedInvoice.invoiceNumber,
    schoolId: updatedInvoice.schoolId,
    studentId: updatedInvoice.studentId,
    studentName: student
      ? `${student.firstName} ${student.lastName}`
      : 'Unknown',
    admissionNumber: student?.admissionNumber || '',
    guardianId: updatedInvoice.guardianId ?? undefined,
    guardianName,
    className: student?.class?.name
      ? student.class.name + (student.stream ? ` - ${student.stream.name}` : '')
      : '',
    termId: updatedInvoice.termId,
    termName: term?.name || '',
    feeStructureId: updatedInvoice.feeStructureId,
    subtotal: updatedInvoice.subtotal,
    discountAmount: updatedInvoice.discountAmount,
    penaltyAmount: updatedInvoice.penaltyAmount,
    totalAmount: updatedInvoice.totalAmount,
    paidAmount: updatedInvoice.paidAmount,
    balance: updatedInvoice.balance,
    dueDate: updatedInvoice.dueDate.toISOString(),
    status: updatedInvoice.status as InvoiceStatus,
    items: updatedInvoice.items.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.description,
      category: item.category as FeeCategory,
      amount: item.amount,
      isOptional: item.isOptional,
    })),
    issuedAt: updatedInvoice.issuedAt?.toISOString(),
    issuedBy: updatedInvoice.issuedBy ?? undefined,
    createdAt: updatedInvoice.createdAt.toISOString(),
    updatedAt: updatedInvoice.updatedAt.toISOString(),
  }
}


/**
 * Cancel an invoice
 */
export async function cancelInvoice(
  invoiceId: string,
  userId: string,
  reason: string
): Promise<Invoice> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  })

  if (!invoice) {
    throw new InvoiceError(
      INVOICE_ERRORS.INVOICE_NOT_FOUND,
      'Invoice not found',
      { invoiceId }
    )
  }

  if (invoice.status === 'CANCELLED') {
    throw new InvoiceError(
      INVOICE_ERRORS.INVALID_STATUS,
      'Invoice is already cancelled',
      { invoiceId, status: invoice.status }
    )
  }

  // Store previous value for audit
  const previousValue = {
    status: invoice.status,
    invoiceNumber: invoice.invoiceNumber,
  }

  // Update invoice status
  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'CANCELLED',
      notes: reason,
    },
    include: { items: true },
  })

  // Log audit entry
  await FinanceAuditService.logAction({
    schoolId: invoice.schoolId,
    userId,
    action: 'INVOICE_CANCELLED',
    entityType: "Invoice",
    entityId: invoiceId,
    details: {
      previousValue,
      newValue: { status: 'CANCELLED' },
      reason,
    },
  })

  // Get related info for response
  const student = await prisma.student.findUnique({
    where: { id: invoice.studentId },
    include: { class: true, stream: true },
  })

  const term = await prisma.term.findUnique({
    where: { id: invoice.termId },
  })

  let guardianName: string | undefined
  if (invoice.guardianId) {
    const guardian = await prisma.guardian.findUnique({
      where: { id: invoice.guardianId },
    })
    if (guardian) {
      guardianName = `${guardian.firstName} ${guardian.lastName}`
    }
  }

  return {
    id: updatedInvoice.id,
    invoiceNumber: updatedInvoice.invoiceNumber,
    schoolId: updatedInvoice.schoolId,
    studentId: updatedInvoice.studentId,
    studentName: student
      ? `${student.firstName} ${student.lastName}`
      : 'Unknown',
    admissionNumber: student?.admissionNumber || '',
    guardianId: updatedInvoice.guardianId ?? undefined,
    guardianName,
    className: student?.class?.name
      ? student.class.name + (student.stream ? ` - ${student.stream.name}` : '')
      : '',
    termId: updatedInvoice.termId,
    termName: term?.name || '',
    feeStructureId: updatedInvoice.feeStructureId,
    subtotal: updatedInvoice.subtotal,
    discountAmount: updatedInvoice.discountAmount,
    penaltyAmount: updatedInvoice.penaltyAmount,
    totalAmount: updatedInvoice.totalAmount,
    paidAmount: updatedInvoice.paidAmount,
    balance: updatedInvoice.balance,
    dueDate: updatedInvoice.dueDate.toISOString(),
    status: updatedInvoice.status as InvoiceStatus,
    items: updatedInvoice.items.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      description: item.description,
      category: item.category as FeeCategory,
      amount: item.amount,
      isOptional: item.isOptional,
    })),
    issuedAt: updatedInvoice.issuedAt?.toISOString(),
    issuedBy: updatedInvoice.issuedBy ?? undefined,
    createdAt: updatedInvoice.createdAt.toISOString(),
    updatedAt: updatedInvoice.updatedAt.toISOString(),
  }
}

/**
 * Get student invoices
 */
export async function getStudentInvoices(
  studentId: string,
  schoolId: string
): Promise<Invoice[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      studentId,
      schoolId,
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  // Get student info
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true, stream: true },
  })

  // Get term info
  const termIds = [...new Set(invoices.map((i) => i.termId))]
  const terms = await prisma.term.findMany({
    where: { id: { in: termIds } },
  })
  const termMap = new Map(terms.map((t) => [t.id, t]))

  // Get guardian info
  const guardianIds = [...new Set(invoices.filter((i) => i.guardianId).map((i) => i.guardianId!))]
  const guardians = guardianIds.length > 0
    ? await prisma.guardian.findMany({
        where: { id: { in: guardianIds } },
      })
    : []
  const guardianMap = new Map(guardians.map((g) => [g.id, g]))

  return invoices.map((invoice) => {
    const term = termMap.get(invoice.termId)
    const guardian = invoice.guardianId ? guardianMap.get(invoice.guardianId) : undefined

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      schoolId: invoice.schoolId,
      studentId: invoice.studentId,
      studentName: student
        ? `${student.firstName} ${student.lastName}`
        : 'Unknown',
      admissionNumber: student?.admissionNumber || '',
      guardianId: invoice.guardianId ?? undefined,
      guardianName: guardian
        ? `${guardian.firstName} ${guardian.lastName}`
        : undefined,
      className: student?.class?.name
      ? student.class.name + (student.stream ? ` - ${student.stream.name}` : '')
        : '',
      termId: invoice.termId,
      termName: term?.name || '',
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
  })
}


/**
 * Generate invoice HTML for printing/PDF
 * Requirement 6.5: Allow printing or downloading as PDF
 * Property 26: Invoice Content Completeness
 */
export function generateInvoiceHTML(invoice: Invoice, schoolInfo?: {
  name?: string
  address?: string
  phone?: string
  email?: string
  logo?: string
}): string {
  const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedIssuedDate = invoice.issuedAt
    ? new Date(invoice.issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A'

  // Group items by category for better display
  const itemsByCategory = invoice.items.reduce((acc, item) => {
    const category = item.category || 'OTHER'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, InvoiceItem[]>)

  const itemsHTML = Object.entries(itemsByCategory)
    .map(([category, items]) => {
      const itemRows = items
        .map(
          (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}${item.isOptional ? ' <span style="color: #666; font-size: 11px;">(Optional)</span>' : ''}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">UGX ${item.amount.toLocaleString()}</td>
        </tr>
      `
        )
        .join('')

      return `
        <tr style="background: #f9f9f9;">
          <td colspan="2" style="padding: 8px; font-weight: bold; text-transform: capitalize;">${category.toLowerCase().replace('_', ' ')}</td>
        </tr>
        ${itemRows}
      `
    })
    .join('')

  const statusColor = {
    DRAFT: '#6b7280',
    ISSUED: 'var(--chart-blue)',
    PARTIALLY_PAID: 'var(--chart-yellow)',
    PAID: 'var(--chart-green)',
    OVERDUE: 'var(--chart-red)',
    CANCELLED: '#6b7280',
  }[invoice.status] || '#6b7280'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
    .invoice { border: 1px solid #ddd; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .school-info { flex: 1; }
    .school-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .school-details { font-size: 12px; color: #666; line-height: 1.5; }
    .invoice-info { text-align: right; }
    .invoice-title { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 10px; }
    .invoice-number { font-size: 14px; color: #666; }
    .invoice-status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; background: ${statusColor}; margin-top: 10px; }
    .details-section { display: flex; justify-content: space-between; margin: 20px 0; }
    .details-box { flex: 1; }
    .details-box h3 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
    .details-box p { font-size: 14px; margin: 4px 0; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #333; color: white; padding: 10px; text-align: left; }
    .items-table th:last-child { text-align: right; }
    .summary-section { margin-top: 20px; border-top: 2px solid #333; padding-top: 20px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .summary-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 15px; }
    .summary-row.balance { font-size: 20px; font-weight: bold; color: ${invoice.balance > 0 ? 'var(--chart-red)' : 'var(--chart-green)'}; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
    .payment-info { background: #f5f5f5; padding: 15px; margin-top: 20px; border-radius: 5px; }
    .payment-info h4 { margin-bottom: 10px; font-size: 14px; }
    .payment-info p { font-size: 12px; margin: 4px 0; }
    @media print {
      body { padding: 0; }
      .invoice { border: none; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="school-info">
        <div class="school-name">${schoolInfo?.name || 'School Name'}</div>
        <div class="school-details">
          ${schoolInfo?.address ? `<div>${schoolInfo.address}</div>` : ''}
          ${schoolInfo?.phone ? `<div>Tel: ${schoolInfo.phone}</div>` : ''}
          ${schoolInfo?.email ? `<div>Email: ${schoolInfo.email}</div>` : ''}
        </div>
      </div>
      <div class="invoice-info">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <div class="invoice-status">${invoice.status.replace('_', ' ')}</div>
      </div>
    </div>

    <div class="details-section">
      <div class="details-box">
        <h3>Bill To</h3>
        <p><strong>${invoice.studentName}</strong></p>
        <p>Admission No: ${invoice.admissionNumber}</p>
        <p>Class: ${invoice.className}</p>
        ${invoice.guardianName ? `<p>Guardian: ${invoice.guardianName}</p>` : ''}
      </div>
      <div class="details-box" style="text-align: right;">
        <h3>Invoice Details</h3>
        <p>Term: ${invoice.termName}</p>
        <p>Issue Date: ${formattedIssuedDate}</p>
        <p>Due Date: <strong>${formattedDueDate}</strong></p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="summary-row">
        <span>Subtotal</span>
        <span>UGX ${invoice.subtotal.toLocaleString()}</span>
      </div>
      ${invoice.discountAmount > 0 ? `
      <div class="summary-row" style="color: var(--chart-green);">
        <span>Discounts</span>
        <span>- UGX ${invoice.discountAmount.toLocaleString()}</span>
      </div>
      ` : ''}
      ${invoice.penaltyAmount > 0 ? `
      <div class="summary-row" style="color: var(--chart-red);">
        <span>Penalties</span>
        <span>+ UGX ${invoice.penaltyAmount.toLocaleString()}</span>
      </div>
      ` : ''}
      <div class="summary-row total">
        <span>Total Amount</span>
        <span>UGX ${invoice.totalAmount.toLocaleString()}</span>
      </div>
      ${invoice.paidAmount > 0 ? `
      <div class="summary-row" style="color: var(--chart-green);">
        <span>Amount Paid</span>
        <span>- UGX ${invoice.paidAmount.toLocaleString()}</span>
      </div>
      ` : ''}
      <div class="summary-row balance">
        <span>Balance Due</span>
        <span>UGX ${invoice.balance.toLocaleString()}</span>
      </div>
    </div>

    <div class="payment-info">
      <h4>Payment Information</h4>
      <p>Please ensure payment is made by the due date to avoid late payment penalties.</p>
      <p>For any queries regarding this invoice, please contact the school bursar.</p>
    </div>

    <div class="footer">
      <p>This is a computer-generated invoice. No signature required.</p>
      <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate invoice PDF
 * Requirement 6.5: Allow printing or downloading as PDF
 * Note: Returns HTML that can be converted to PDF by the caller
 */
export async function generateInvoicePDF(invoiceId: string): Promise<{ html: string; invoice: Invoice }> {
  const invoice = await getInvoice(invoiceId)

  if (!invoice) {
    throw new InvoiceError(
      INVOICE_ERRORS.INVOICE_NOT_FOUND,
      'Invoice not found',
      { invoiceId }
    )
  }

  // Get school info for the invoice
  const school = await prisma.school.findFirst({
    where: { id: invoice.schoolId },
  })

  const html = generateInvoiceHTML(invoice, {
    name: school?.name,
    address: school?.address ?? undefined,
    phone: school?.phone ?? undefined,
    email: school?.email ?? undefined,
  })

  return { html, invoice }
}

/**
 * Update all invoices for a student when payments change
 */
export async function updateStudentInvoiceStatuses(
  studentId: string,
  termId?: string
): Promise<void> {
  const where: { studentId: string; status: { not: 'CANCELLED' }; termId?: string } = {
    studentId,
    status: { not: 'CANCELLED' },
  }

  if (termId) {
    where.termId = termId
  }

  const invoices = await prisma.invoice.findMany({
    where,
    select: { id: true },
  })

  for (const invoice of invoices) {
    await updateInvoiceStatus(invoice.id)
  }
}

// ============================================
// SERVICE EXPORT
// ============================================

export const InvoiceService = {
  // Core functions
  generateInvoice,
  generateClassInvoices,
  getInvoice,
  getInvoiceByNumber,
  listInvoices,
  updateInvoiceStatus,
  cancelInvoice,
  getStudentInvoices,

  // PDF/HTML generation
  generateInvoiceHTML,
  generateInvoicePDF,

  // Utility functions
  updateStudentInvoiceStatuses,
}

export default InvoiceService

