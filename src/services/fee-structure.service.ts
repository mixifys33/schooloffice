/**
 * Fee Structure Service
 * Manages fee structure definitions per class, term, and student type
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8
 */
import { prisma } from '@/lib/db'
import type {
  CreateFeeStructureInput,
  UpdateFeeStructureInput,
  FeeStructureFilters,
  FeeStructure,
  FeeStructureItem,
  StudentType,
} from '@/types/finance'

// Error codes for fee structure operations
export const FEE_STRUCTURE_ERRORS = {
  DUPLICATE: 'FEE_STRUCTURE_DUPLICATE',
  NOT_FOUND: 'FEE_STRUCTURE_NOT_FOUND',
  INVALID_ITEMS: 'FEE_STRUCTURE_INVALID_ITEMS',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  TERM_NOT_FOUND: 'TERM_NOT_FOUND',
} as const

export class FeeStructureError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'FeeStructureError'
  }
}

/**
 * Calculate total amount from fee items
 * Property 3: Fee Structure Total Calculation - totalAmount equals sum of all fee item amounts
 */
export function calculateTotalAmount(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

/**
 * Validate fee items have required fields and positive amounts
 */
function validateFeeItems(items: CreateFeeStructureInput['items']): void {
  if (!items || items.length === 0) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.INVALID_ITEMS,
      'Fee structure must have at least one fee item'
    )
  }

  for (const item of items) {
    if (!item.name || item.name.trim() === '') {
      throw new FeeStructureError(
        FEE_STRUCTURE_ERRORS.INVALID_ITEMS,
        'Fee item name is required'
      )
    }
    if (typeof item.amount !== 'number' || item.amount < 0) {
      throw new FeeStructureError(
        FEE_STRUCTURE_ERRORS.INVALID_ITEMS,
        `Fee item "${item.name}" must have a non-negative amount`
      )
    }
  }
}


/**
 * Create a new fee structure with items
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 * Property 2: Fee Structure Uniqueness - enforces unique constraint (schoolId, classId, termId, studentType)
 */
export async function createFeeStructure(
  data: CreateFeeStructureInput
): Promise<FeeStructure> {
  // Validate fee items
  validateFeeItems(data.items)

  // Verify class exists
  const classRecord = await prisma.class.findUnique({
    where: { id: data.classId },
  })
  if (!classRecord) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.CLASS_NOT_FOUND,
      'Class not found'
    )
  }

  // Verify term exists
  const term = await prisma.term.findUnique({
    where: { id: data.termId },
    include: { academicYear: true },
  })
  if (!term) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.TERM_NOT_FOUND,
      'Term not found'
    )
  }

  // Check for duplicate (Property 2: Fee Structure Uniqueness)
  const existing = await prisma.feeStructure.findUnique({
    where: {
      schoolId_classId_termId_studentType: {
        schoolId: data.schoolId,
        classId: data.classId,
        termId: data.termId,
        studentType: data.studentType,
      },
    },
  })

  if (existing) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.DUPLICATE,
      `Fee structure already exists for this class, term, and student type`,
      {
        classId: data.classId,
        termId: data.termId,
        studentType: data.studentType,
      }
    )
  }

  // Calculate total amount (Property 3: Fee Structure Total Calculation)
  const totalAmount = calculateTotalAmount(data.items)

  // Create fee structure with items in a transaction
  const feeStructure = await prisma.feeStructure.create({
    data: {
      schoolId: data.schoolId,
      classId: data.classId,
      termId: data.termId,
      studentType: data.studentType,
      totalAmount,
      dueDate: data.dueDate,
      isActive: true,
      createdBy: data.createdBy,
      items: {
        create: data.items.map((item) => ({
          name: item.name,
          category: item.category,
          amount: item.amount,
          isOptional: item.isOptional,
          isOneTime: item.isOneTime,
          description: item.description,
        })),
      },
    },
    include: {
      items: true,
      class: true,
      term: true,
    },
  })

  // Log audit entry
  await prisma.financeAuditLog.create({
    data: {
      schoolId: data.schoolId,
      userId: data.createdBy,
      action: 'FEE_STRUCTURE_CREATED',
      resourceType: 'FeeStructure',
      resourceId: feeStructure.id,
      newValue: {
        classId: data.classId,
        termId: data.termId,
        studentType: data.studentType,
        totalAmount,
        itemCount: data.items.length,
      },
    },
  })

  return mapToFeeStructure(feeStructure)
}


/**
 * Update existing fee structure (triggers balance recalculation)
 * Requirements: 1.8 - recalculate all affected student account balances
 */
export async function updateFeeStructure(
  id: string,
  schoolId: string,
  userId: string,
  data: UpdateFeeStructureInput
): Promise<FeeStructure> {
  // Get existing fee structure
  const existing = await prisma.feeStructure.findUnique({
    where: { id },
    include: { items: true, class: true, term: true },
  })

  if (!existing) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.NOT_FOUND,
      'Fee structure not found'
    )
  }

  if (existing.schoolId !== schoolId) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.NOT_FOUND,
      'Fee structure not found'
    )
  }

  const previousValue = {
    totalAmount: existing.totalAmount,
    dueDate: existing.dueDate?.toISOString(),
    isActive: existing.isActive,
    itemCount: existing.items.length,
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {}
  
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate
  }
  
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive
  }

  let newTotalAmount = existing.totalAmount

  // If items are being updated, validate and recalculate total
  if (data.items) {
    validateFeeItems(data.items)
    newTotalAmount = calculateTotalAmount(data.items)
    updateData.totalAmount = newTotalAmount

    // Delete existing items and create new ones
    await prisma.feeItem.deleteMany({
      where: { feeStructureId: id },
    })
  }

  // Update fee structure
  const updated = await prisma.feeStructure.update({
    where: { id },
    data: {
      ...updateData,
      ...(data.items && {
        items: {
          create: data.items.map((item) => ({
            name: item.name,
            category: item.category,
            amount: item.amount,
            isOptional: item.isOptional,
            isOneTime: item.isOneTime,
            description: item.description,
          })),
        },
      }),
    },
    include: {
      items: true,
      class: true,
      term: true,
    },
  })

  // Log audit entry
  await prisma.financeAuditLog.create({
    data: {
      schoolId,
      userId,
      action: 'FEE_STRUCTURE_UPDATED',
      resourceType: 'FeeStructure',
      resourceId: id,
      previousValue,
      newValue: {
        totalAmount: newTotalAmount,
        dueDate: data.dueDate?.toISOString(),
        isActive: data.isActive,
        itemCount: data.items?.length ?? existing.items.length,
      },
    },
  })

  // Recalculate affected student balances if items changed (Requirement 1.8)
  if (data.items) {
    await recalculateAffectedBalances(id)
  }

  return mapToFeeStructure(updated)
}


/**
 * Get fee structure by class/term/studentType
 */
export async function getFeeStructure(
  classId: string,
  termId: string,
  studentType: StudentType
): Promise<FeeStructure | null> {
  const feeStructure = await prisma.feeStructure.findFirst({
    where: {
      classId,
      termId,
      studentType,
      isActive: true,
    },
    include: {
      items: true,
      class: true,
      term: true,
    },
  })

  if (!feeStructure) {
    return null
  }

  return mapToFeeStructure(feeStructure)
}

/**
 * Get fee structure by ID
 */
export async function getFeeStructureById(
  id: string,
  schoolId: string
): Promise<FeeStructure | null> {
  const feeStructure = await prisma.feeStructure.findFirst({
    where: {
      id,
      schoolId,
    },
    include: {
      items: true,
      class: true,
      term: true,
    },
  })

  if (!feeStructure) {
    return null
  }

  return mapToFeeStructure(feeStructure)
}

/**
 * List fee structures with filters
 * Requirement 1.7: filterable by academic year, term, and class
 */
export async function listFeeStructures(
  schoolId: string,
  filters: FeeStructureFilters = {}
): Promise<FeeStructure[]> {
  const where: Record<string, unknown> = { schoolId }

  if (filters.classId) {
    where.classId = filters.classId
  }

  if (filters.termId) {
    where.termId = filters.termId
  }

  if (filters.studentType) {
    where.studentType = filters.studentType
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive
  }

  // Filter by academic year through term relation
  if (filters.academicYearId) {
    where.term = {
      academicYearId: filters.academicYearId,
    }
  }

  const feeStructures = await prisma.feeStructure.findMany({
    where,
    include: {
      items: true,
      class: true,
      term: {
        include: {
          academicYear: true,
        },
      },
    },
    orderBy: [
      { term: { startDate: 'desc' } },
      { class: { level: 'asc' } },
      { studentType: 'asc' },
    ],
  })

  return feeStructures.map(mapToFeeStructure)
}


/**
 * Recalculate all affected student balances when structure changes
 * Requirement 1.8: recalculate all affected student account balances
 * Property 14: Fee Structure Change Cascade
 */
export async function recalculateAffectedBalances(
  feeStructureId: string
): Promise<{ updatedCount: number }> {
  const feeStructure = await prisma.feeStructure.findUnique({
    where: { id: feeStructureId },
    include: { class: true },
  })

  if (!feeStructure) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.NOT_FOUND,
      'Fee structure not found'
    )
  }

  // Find all students in the affected class with matching student type
  const students = await prisma.student.findMany({
    where: {
      schoolId: feeStructure.schoolId,
      classId: feeStructure.classId,
      status: 'ACTIVE',
    },
    include: {
      account: true,
    },
  })

  // Filter students by student type (if they have an account with matching type)
  const affectedStudents = students.filter((student) => {
    if (!student.account) return true // New accounts will be created with correct type
    return student.account.studentType === feeStructure.studentType
  })

  let updatedCount = 0

  // Update each affected student's balance
  for (const student of affectedStudents) {
    await updateStudentBalance(
      student.id,
      feeStructure.schoolId,
      feeStructure.termId
    )
    updatedCount++
  }

  return { updatedCount }
}

/**
 * Update a single student's balance
 * Uses the balance calculation formula: totalFees - totalPaid - totalDiscounts + totalPenalties
 */
async function updateStudentBalance(
  studentId: string,
  schoolId: string,
  termId: string
): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { account: true },
  })

  if (!student) return

  // Get the student's type from their account or default to DAY
  const studentType = student.account?.studentType || 'DAY'

  // Get applicable fee structure
  const feeStructure = await prisma.feeStructure.findFirst({
    where: {
      schoolId,
      classId: student.classId,
      termId,
      studentType,
      isActive: true,
    },
  })

  const totalFees = feeStructure?.totalAmount || 0

  // Get total payments for this term
  const payments = await prisma.payment.aggregate({
    where: {
      studentId,
      schoolId,
      termId,
      status: 'CONFIRMED',
    },
    _sum: { amount: true },
  })
  const totalPaid = payments._sum.amount || 0

  // Get approved discounts for this term
  const discounts = await prisma.studentDiscount.aggregate({
    where: {
      studentAccount: { studentId, schoolId },
      termId,
      status: 'APPROVED',
    },
    _sum: { calculatedAmount: true },
  })
  const totalDiscounts = discounts._sum.calculatedAmount || 0

  // Get non-waived penalties for this term
  const penalties = await prisma.studentPenalty.aggregate({
    where: {
      studentAccount: { studentId, schoolId },
      termId,
      isWaived: false,
    },
    _sum: { amount: true },
  })
  const totalPenalties = penalties._sum.amount || 0

  // Calculate balance using the invariant formula (Property 1)
  const balance = totalFees - totalPaid - totalDiscounts + totalPenalties

  // Get last payment info
  const lastPayment = await prisma.payment.findFirst({
    where: { studentId, schoolId, status: 'CONFIRMED' },
    orderBy: { receivedAt: 'desc' },
  })

  // Upsert student account
  await prisma.studentAccount.upsert({
    where: { studentId_schoolId: { studentId, schoolId } },
    update: {
      totalFees,
      totalPaid,
      totalDiscounts,
      totalPenalties,
      balance,
      lastPaymentDate: lastPayment?.receivedAt,
      lastPaymentAmount: lastPayment?.amount,
    },
    create: {
      studentId,
      schoolId,
      studentType,
      totalFees,
      totalPaid,
      totalDiscounts,
      totalPenalties,
      balance,
      lastPaymentDate: lastPayment?.receivedAt,
      lastPaymentAmount: lastPayment?.amount,
    },
  })
}


/**
 * Delete a fee structure (soft delete by setting isActive to false)
 */
export async function deleteFeeStructure(
  id: string,
  schoolId: string,
  userId: string
): Promise<void> {
  const existing = await prisma.feeStructure.findFirst({
    where: { id, schoolId },
    include: { items: true },
  })

  if (!existing) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.NOT_FOUND,
      'Fee structure not found'
    )
  }

  // Soft delete by setting isActive to false
  await prisma.feeStructure.update({
    where: { id },
    data: { isActive: false },
  })

  // Log audit entry
  await prisma.financeAuditLog.create({
    data: {
      schoolId,
      userId,
      action: 'FEE_STRUCTURE_UPDATED',
      resourceType: 'FeeStructure',
      resourceId: id,
      previousValue: { isActive: true },
      newValue: { isActive: false },
      reason: 'Fee structure deactivated',
    },
  })
}

/**
 * Check if a fee structure exists for the given combination
 * Used for validation before creating duplicates
 */
export async function feeStructureExists(
  schoolId: string,
  classId: string,
  termId: string,
  studentType: StudentType
): Promise<boolean> {
  const existing = await prisma.feeStructure.findUnique({
    where: {
      schoolId_classId_termId_studentType: {
        schoolId,
        classId,
        termId,
        studentType,
      },
    },
  })
  return existing !== null
}

/**
 * Copy fee structure from one term to another
 * Useful for setting up new terms with similar fee structures
 */
export async function copyFeeStructure(
  sourceId: string,
  targetTermId: string,
  schoolId: string,
  userId: string
): Promise<FeeStructure> {
  const source = await prisma.feeStructure.findFirst({
    where: { id: sourceId, schoolId },
    include: { items: true },
  })

  if (!source) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.NOT_FOUND,
      'Source fee structure not found'
    )
  }

  // Check if target already exists
  const exists = await feeStructureExists(
    schoolId,
    source.classId,
    targetTermId,
    source.studentType as StudentType
  )

  if (exists) {
    throw new FeeStructureError(
      FEE_STRUCTURE_ERRORS.DUPLICATE,
      'Fee structure already exists for target term'
    )
  }

  // Create copy with new term
  return createFeeStructure({
    schoolId,
    classId: source.classId,
    termId: targetTermId,
    studentType: source.studentType as StudentType,
    dueDate: source.dueDate || undefined,
    createdBy: userId,
    items: source.items.map((item) => ({
      name: item.name,
      category: item.category as CreateFeeStructureInput['items'][0]['category'],
      amount: item.amount,
      isOptional: item.isOptional,
      isOneTime: item.isOneTime,
      description: item.description || undefined,
    })),
  })
}


/**
 * Map Prisma fee structure to API type
 */
function mapToFeeStructure(
  prismaFeeStructure: {
    id: string
    schoolId: string
    classId: string
    termId: string
    studentType: string
    totalAmount: number
    dueDate: Date | null
    isActive: boolean
    createdBy: string
    createdAt: Date
    updatedAt: Date
    items: Array<{
      id: string
      name: string
      category: string
      amount: number
      isOptional: boolean
      isOneTime: boolean
      description: string | null
    }>
    class: { name: string }
    term: { name: string }
  }
): FeeStructure {
  return {
    id: prismaFeeStructure.id,
    schoolId: prismaFeeStructure.schoolId,
    classId: prismaFeeStructure.classId,
    className: prismaFeeStructure.class.name,
    termId: prismaFeeStructure.termId,
    termName: prismaFeeStructure.term.name,
    studentType: prismaFeeStructure.studentType as StudentType,
    totalAmount: prismaFeeStructure.totalAmount,
    dueDate: prismaFeeStructure.dueDate?.toISOString(),
    isActive: prismaFeeStructure.isActive,
    items: prismaFeeStructure.items.map(mapToFeeItem),
    createdBy: prismaFeeStructure.createdBy,
    createdAt: prismaFeeStructure.createdAt.toISOString(),
    updatedAt: prismaFeeStructure.updatedAt.toISOString(),
  }
}

/**
 * Map Prisma fee item to API type
 */
function mapToFeeItem(
  prismaItem: {
    id: string
    name: string
    category: string
    amount: number
    isOptional: boolean
    isOneTime: boolean
    description: string | null
  }
): FeeStructureItem {
  return {
    id: prismaItem.id,
    name: prismaItem.name,
    category: prismaItem.category as FeeStructureItem['category'],
    amount: prismaItem.amount,
    isOptional: prismaItem.isOptional,
    isOneTime: prismaItem.isOneTime,
    description: prismaItem.description || undefined,
  }
}

// Export all functions
export const FeeStructureService = {
  createFeeStructure,
  updateFeeStructure,
  getFeeStructure,
  getFeeStructureById,
  listFeeStructures,
  recalculateAffectedBalances,
  deleteFeeStructure,
  feeStructureExists,
  copyFeeStructure,
  calculateTotalAmount,
}

export default FeeStructureService
