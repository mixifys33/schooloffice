/**
 * Discount Service
 * Manages discount rules and student-specific discounts
 * Requirements: 3.1, 3.2, 3.3, 3.8, 3.9
 *
 * Property 10: Discount Approval Workflow
 * For any discount that requires approval (based on school settings),
 * the discount SHALL NOT affect the student balance until status is APPROVED.
 *
 * Property 11: Sibling Detection
 * For any guardian with multiple linked students, the detectSiblings function
 * SHALL return all students linked to that guardian.
 *
 * Property 12: Discount/Penalty Removal Audit
 * For any discount or penalty removal, the system SHALL require a reason
 * and create an audit entry with before/after values.
 */
import { prisma } from '@/lib/db'
import type {
  StudentDiscount,
  ApplyDiscountInput,
  DiscountType,
  DiscountStatus,
  DiscountRule,
} from '@/types/finance'
import { FinanceAuditService } from './finance-audit.service'
import { updateBalance } from './student-account.service'

// Error codes for discount operations
export const DISCOUNT_ERRORS = {
  DISCOUNT_NOT_FOUND: 'DISCOUNT_NOT_FOUND',
  DISCOUNT_MISSING_FIELDS: 'DISCOUNT_MISSING_FIELDS',
  DISCOUNT_INVALID_TYPE: 'DISCOUNT_INVALID_TYPE',
  DISCOUNT_INVALID_VALUE: 'DISCOUNT_INVALID_VALUE',
  DISCOUNT_ALREADY_APPROVED: 'DISCOUNT_ALREADY_APPROVED',
  DISCOUNT_ALREADY_REJECTED: 'DISCOUNT_ALREADY_REJECTED',
  DISCOUNT_REMOVAL_REASON_REQUIRED: 'DISCOUNT_REMOVAL_REASON_REQUIRED',
  STUDENT_ACCOUNT_NOT_FOUND: 'STUDENT_ACCOUNT_NOT_FOUND',
  TERM_NOT_FOUND: 'TERM_NOT_FOUND',
  GUARDIAN_NOT_FOUND: 'GUARDIAN_NOT_FOUND',
} as const

export class DiscountError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DiscountError'
  }
}

/**
 * Validate required fields for applying a discount
 * Requirement 3.1: require discount type, amount, reason, and approval status
 */
function validateDiscountFields(data: ApplyDiscountInput): void {
  const missingFields: string[] = []

  if (!data.studentAccountId) missingFields.push('studentAccountId')
  if (!data.termId) missingFields.push('termId')
  if (!data.name) missingFields.push('name')
  if (!data.type) missingFields.push('type')
  if (data.value === undefined || data.value === null) missingFields.push('value')
  if (!data.appliedBy) missingFields.push('appliedBy')

  if (missingFields.length > 0) {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_MISSING_FIELDS,
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    )
  }

  // Validate discount type
  if (data.type !== 'PERCENTAGE' && data.type !== 'FIXED_AMOUNT') {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_INVALID_TYPE,
      'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT',
      { type: data.type }
    )
  }

  // Validate value is positive
  if (data.value <= 0) {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_INVALID_VALUE,
      'Discount value must be positive',
      { value: data.value }
    )
  }

  // Validate percentage doesn't exceed 100%
  if (data.type === 'PERCENTAGE' && data.value > 100) {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_INVALID_VALUE,
      'Percentage discount cannot exceed 100%',
      { value: data.value }
    )
  }
}

/**
 * Calculate the actual discount amount based on type and value
 */
async function calculateDiscountAmount(
  studentAccountId: string,
  type: DiscountType,
  value: number
): Promise<number> {
  if (type === 'FIXED_AMOUNT') {
    return value
  }

  // For percentage, calculate based on total fees
  const account = await prisma.studentAccount.findUnique({
    where: { id: studentAccountId },
  })

  if (!account) {
    throw new DiscountError(
      DISCOUNT_ERRORS.STUDENT_ACCOUNT_NOT_FOUND,
      'Student account not found',
      { studentAccountId }
    )
  }

  return (account.totalFees * value) / 100
}

/**
 * Check if school requires discount approval
 */
async function requiresApproval(schoolId: string): Promise<boolean> {
  const settings = await prisma.financeSettings.findUnique({
    where: { schoolId },
  })
  return settings?.enableDiscountApproval ?? true
}

/**
 * Get user name for display
 */
async function getUserName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { staff: true },
  })
  if (user?.staff) {
    return `${user.staff.firstName} ${user.staff.lastName}`
  }
  return user?.email || 'Unknown'
}

/**
 * Apply discount to student account
 * Requirement 3.1: require discount type, amount, reason
 * Requirement 3.8: hold discount pending until approved if approval required
 */
export async function applyDiscount(
  data: ApplyDiscountInput
): Promise<StudentDiscount> {
  // Validate required fields
  validateDiscountFields(data)

  // Get student account with student info
  const studentAccount = await prisma.studentAccount.findUnique({
    where: { id: data.studentAccountId },
    include: {
      student: {
        include: {
          class: true,
          stream: true,
        },
      },
    },
  })

  if (!studentAccount) {
    throw new DiscountError(
      DISCOUNT_ERRORS.STUDENT_ACCOUNT_NOT_FOUND,
      'Student account not found',
      { studentAccountId: data.studentAccountId }
    )
  }

  // Verify term exists
  const term = await prisma.term.findUnique({
    where: { id: data.termId },
  })

  if (!term) {
    throw new DiscountError(
      DISCOUNT_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId: data.termId }
    )
  }

  // Calculate the actual discount amount
  const calculatedAmount = await calculateDiscountAmount(
    data.studentAccountId,
    data.type,
    data.value
  )

  // Check if approval is required (Property 10)
  const needsApproval = await requiresApproval(studentAccount.schoolId)
  const initialStatus: DiscountStatus = needsApproval ? 'PENDING' : 'APPROVED'

  // Create the discount record
  const discount = await prisma.studentDiscount.create({
    data: {
      studentAccountId: data.studentAccountId,
      termId: data.termId,
      name: data.name,
      type: data.type,
      value: data.value,
      calculatedAmount,
      reason: data.reason,
      sponsorName: data.sponsorName,
      status: initialStatus,
      appliedBy: data.appliedBy,
      appliedAt: new Date(),
      // If auto-approved, set approval fields
      ...(initialStatus === 'APPROVED' && {
        approvedBy: data.appliedBy,
        approvedAt: new Date(),
      }),
    },
    include: {
      discountRule: true,
    },
  })

  // Log audit entry
  await FinanceAuditService.logAction({
    schoolId: studentAccount.schoolId,
    userId: data.appliedBy,
    action: 'DISCOUNT_APPLIED',
    resourceType: 'Discount',
    resourceId: discount.id,
    newValue: {
      name: data.name,
      type: data.type,
      value: data.value,
      calculatedAmount,
      status: initialStatus,
    },
  })

  // Update balance only if approved (Property 10)
  if (initialStatus === 'APPROVED') {
    await updateBalance(studentAccount.studentId, studentAccount.schoolId, data.termId)
  }

  // Get user name for response
  const appliedByName = await getUserName(data.appliedBy)

  return {
    id: discount.id,
    studentAccountId: discount.studentAccountId,
    studentId: studentAccount.studentId,
    studentName: `${studentAccount.student.firstName} ${studentAccount.student.lastName}`,
    discountRuleId: discount.discountRuleId ?? undefined,
    discountRuleName: discount.discountRule?.name,
    termId: discount.termId,
    termName: term.name,
    name: discount.name,
    type: discount.type as DiscountType,
    value: discount.value,
    calculatedAmount: discount.calculatedAmount,
    reason: discount.reason ?? undefined,
    sponsorName: discount.sponsorName ?? undefined,
    status: discount.status as DiscountStatus,
    appliedBy: discount.appliedBy,
    appliedByName,
    appliedAt: discount.appliedAt.toISOString(),
    approvedBy: discount.approvedBy ?? undefined,
    approvedAt: discount.approvedAt?.toISOString(),
    rejectedBy: discount.rejectedBy ?? undefined,
    rejectedAt: discount.rejectedAt?.toISOString(),
    rejectionReason: discount.rejectionReason ?? undefined,
  }
}

/**
 * Approve pending discount
 * Requirement 3.8: pending discounts don't affect balance until approved
 */
export async function approveDiscount(
  discountId: string,
  approverId: string
): Promise<StudentDiscount> {
  // Get discount with account info
  const discount = await prisma.studentDiscount.findUnique({
    where: { id: discountId },
    include: {
      studentAccount: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      },
      discountRule: true,
    },
  })

  if (!discount) {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_NOT_FOUND,
      'Discount not found',
      { discountId }
    )
  }

  if (discount.status === 'APPROVED') {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_ALREADY_APPROVED,
      'Discount has already been approved',
      { discountId, status: discount.status }
    )
  }

  if (discount.status === 'REJECTED') {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_ALREADY_REJECTED,
      'Discount has already been rejected',
      { discountId, status: discount.status }
    )
  }

  // Update discount status
  const updatedDiscount = await prisma.studentDiscount.update({
    where: { id: discountId },
    data: {
      status: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date(),
    },
    include: {
      discountRule: true,
    },
  })

  // Log audit entry
  await FinanceAuditService.logAction({
    schoolId: discount.studentAccount.schoolId,
    userId: approverId,
    action: 'DISCOUNT_APPROVED',
    resourceType: 'Discount',
    resourceId: discountId,
    previousValue: { status: discount.status },
    newValue: { status: 'APPROVED' },
  })

  // Update balance now that discount is approved (Property 10)
  await updateBalance(
    discount.studentAccount.studentId,
    discount.studentAccount.schoolId,
    discount.termId
  )

  // Get term name
  const term = await prisma.term.findUnique({ where: { id: discount.termId } })

  // Get user names
  const appliedByName = await getUserName(discount.appliedBy)
  const approvedByName = await getUserName(approverId)

  return {
    id: updatedDiscount.id,
    studentAccountId: updatedDiscount.studentAccountId,
    studentId: discount.studentAccount.studentId,
    studentName: `${discount.studentAccount.student.firstName} ${discount.studentAccount.student.lastName}`,
    discountRuleId: updatedDiscount.discountRuleId ?? undefined,
    discountRuleName: updatedDiscount.discountRule?.name,
    termId: updatedDiscount.termId,
    termName: term?.name || '',
    name: updatedDiscount.name,
    type: updatedDiscount.type as DiscountType,
    value: updatedDiscount.value,
    calculatedAmount: updatedDiscount.calculatedAmount,
    reason: updatedDiscount.reason ?? undefined,
    sponsorName: updatedDiscount.sponsorName ?? undefined,
    status: updatedDiscount.status as DiscountStatus,
    appliedBy: updatedDiscount.appliedBy,
    appliedByName,
    appliedAt: updatedDiscount.appliedAt.toISOString(),
    approvedBy: updatedDiscount.approvedBy ?? undefined,
    approvedByName,
    approvedAt: updatedDiscount.approvedAt?.toISOString(),
    rejectedBy: updatedDiscount.rejectedBy ?? undefined,
    rejectedAt: updatedDiscount.rejectedAt?.toISOString(),
    rejectionReason: updatedDiscount.rejectionReason ?? undefined,
  }
}

/**
 * Reject pending discount
 */
export async function rejectDiscount(
  discountId: string,
  rejecterId: string,
  reason: string
): Promise<StudentDiscount> {
  // Get discount with account info
  const discount = await prisma.studentDiscount.findUnique({
    where: { id: discountId },
    include: {
      studentAccount: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      },
      discountRule: true,
    },
  })

  if (!discount) {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_NOT_FOUND,
      'Discount not found',
      { discountId }
    )
  }

  if (discount.status === 'APPROVED') {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_ALREADY_APPROVED,
      'Discount has already been approved',
      { discountId, status: discount.status }
    )
  }

  if (discount.status === 'REJECTED') {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_ALREADY_REJECTED,
      'Discount has already been rejected',
      { discountId, status: discount.status }
    )
  }

  // Update discount status
  const updatedDiscount = await prisma.studentDiscount.update({
    where: { id: discountId },
    data: {
      status: 'REJECTED',
      rejectedBy: rejecterId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
    include: {
      discountRule: true,
    },
  })

  // Log audit entry
  await FinanceAuditService.logAction({
    schoolId: discount.studentAccount.schoolId,
    userId: rejecterId,
    action: 'DISCOUNT_REJECTED',
    resourceType: 'Discount',
    resourceId: discountId,
    previousValue: { status: discount.status },
    newValue: { status: 'REJECTED', rejectionReason: reason },
  })

  // Get term name
  const term = await prisma.term.findUnique({ where: { id: discount.termId } })

  // Get user names
  const appliedByName = await getUserName(discount.appliedBy)
  const rejectedByName = await getUserName(rejecterId)

  return {
    id: updatedDiscount.id,
    studentAccountId: updatedDiscount.studentAccountId,
    studentId: discount.studentAccount.studentId,
    studentName: `${discount.studentAccount.student.firstName} ${discount.studentAccount.student.lastName}`,
    discountRuleId: updatedDiscount.discountRuleId ?? undefined,
    discountRuleName: updatedDiscount.discountRule?.name,
    termId: updatedDiscount.termId,
    termName: term?.name || '',
    name: updatedDiscount.name,
    type: updatedDiscount.type as DiscountType,
    value: updatedDiscount.value,
    calculatedAmount: updatedDiscount.calculatedAmount,
    reason: updatedDiscount.reason ?? undefined,
    sponsorName: updatedDiscount.sponsorName ?? undefined,
    status: updatedDiscount.status as DiscountStatus,
    appliedBy: updatedDiscount.appliedBy,
    appliedByName,
    appliedAt: updatedDiscount.appliedAt.toISOString(),
    approvedBy: updatedDiscount.approvedBy ?? undefined,
    approvedAt: updatedDiscount.approvedAt?.toISOString(),
    rejectedBy: updatedDiscount.rejectedBy ?? undefined,
    rejectedByName,
    rejectedAt: updatedDiscount.rejectedAt?.toISOString(),
    rejectionReason: updatedDiscount.rejectionReason ?? undefined,
  }
}


/**
 * Remove discount with reason and audit
 * Requirement 3.9: require reason and create audit trail
 * Property 12: Discount/Penalty Removal Audit
 */
export async function removeDiscount(
  discountId: string,
  userId: string,
  reason: string
): Promise<void> {
  // Validate reason is provided (Property 12)
  if (!reason || reason.trim() === '') {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_REMOVAL_REASON_REQUIRED,
      'Reason is required when removing a discount',
      { discountId }
    )
  }

  // Get discount with account info
  const discount = await prisma.studentDiscount.findUnique({
    where: { id: discountId },
    include: {
      studentAccount: true,
      discountRule: true,
    },
  })

  if (!discount) {
    throw new DiscountError(
      DISCOUNT_ERRORS.DISCOUNT_NOT_FOUND,
      'Discount not found',
      { discountId }
    )
  }

  // Store previous value for audit (Property 12)
  const previousValue = {
    id: discount.id,
    name: discount.name,
    type: discount.type,
    value: discount.value,
    calculatedAmount: discount.calculatedAmount,
    status: discount.status,
    reason: discount.reason,
  }

  // Delete the discount
  await prisma.studentDiscount.delete({
    where: { id: discountId },
  })

  // Log audit entry with before/after values (Property 12)
  await FinanceAuditService.logAction({
    schoolId: discount.studentAccount.schoolId,
    userId,
    action: 'DISCOUNT_REMOVED',
    resourceType: 'Discount',
    resourceId: discountId,
    previousValue,
    newValue: { removed: true },
    reason,
  })

  // Update balance if discount was approved (it was affecting balance)
  if (discount.status === 'APPROVED') {
    await updateBalance(
      discount.studentAccount.studentId,
      discount.studentAccount.schoolId,
      discount.termId
    )
  }
}

/**
 * Detect siblings for sibling discount
 * Requirement 3.2: automatically detect siblings linked to the same guardian
 * Property 11: Sibling Detection
 */
export async function detectSiblings(
  guardianId: string
): Promise<Array<{
  id: string
  firstName: string
  lastName: string
  admissionNumber: string
  className: string
  streamName?: string
}>> {
  // Verify guardian exists
  const guardian = await prisma.guardian.findUnique({
    where: { id: guardianId },
  })

  if (!guardian) {
    throw new DiscountError(
      DISCOUNT_ERRORS.GUARDIAN_NOT_FOUND,
      'Guardian not found',
      { guardianId }
    )
  }

  // Get all students linked to this guardian (Property 11)
  const studentGuardians = await prisma.studentGuardian.findMany({
    where: { guardianId },
    include: {
      student: {
        include: {
          class: true,
          stream: true,
        },
      },
    },
  })

  // Return all linked students
  return studentGuardians.map((sg) => ({
    id: sg.student.id,
    firstName: sg.student.firstName,
    lastName: sg.student.lastName,
    admissionNumber: sg.student.admissionNumber,
    className: sg.student.class.name,
    streamName: sg.student.stream?.name,
  }))
}

/**
 * Get discount by ID
 */
export async function getDiscount(discountId: string): Promise<StudentDiscount | null> {
  const discount = await prisma.studentDiscount.findUnique({
    where: { id: discountId },
    include: {
      studentAccount: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      },
      discountRule: true,
    },
  })

  if (!discount) {
    return null
  }

  // Get term name
  const term = await prisma.term.findUnique({ where: { id: discount.termId } })

  // Get user names
  const appliedByName = await getUserName(discount.appliedBy)
  const approvedByName = discount.approvedBy
    ? await getUserName(discount.approvedBy)
    : undefined
  const rejectedByName = discount.rejectedBy
    ? await getUserName(discount.rejectedBy)
    : undefined

  return {
    id: discount.id,
    studentAccountId: discount.studentAccountId,
    studentId: discount.studentAccount.studentId,
    studentName: `${discount.studentAccount.student.firstName} ${discount.studentAccount.student.lastName}`,
    discountRuleId: discount.discountRuleId ?? undefined,
    discountRuleName: discount.discountRule?.name,
    termId: discount.termId,
    termName: term?.name || '',
    name: discount.name,
    type: discount.type as DiscountType,
    value: discount.value,
    calculatedAmount: discount.calculatedAmount,
    reason: discount.reason ?? undefined,
    sponsorName: discount.sponsorName ?? undefined,
    status: discount.status as DiscountStatus,
    appliedBy: discount.appliedBy,
    appliedByName,
    appliedAt: discount.appliedAt.toISOString(),
    approvedBy: discount.approvedBy ?? undefined,
    approvedByName,
    approvedAt: discount.approvedAt?.toISOString(),
    rejectedBy: discount.rejectedBy ?? undefined,
    rejectedByName,
    rejectedAt: discount.rejectedAt?.toISOString(),
    rejectionReason: discount.rejectionReason ?? undefined,
  }
}

/**
 * List discounts for a student account
 */
export async function listStudentDiscounts(
  studentAccountId: string,
  filters?: {
    termId?: string
    status?: DiscountStatus
  }
): Promise<StudentDiscount[]> {
  const where: Record<string, unknown> = { studentAccountId }

  if (filters?.termId) {
    where.termId = filters.termId
  }

  if (filters?.status) {
    where.status = filters.status
  }

  const discounts = await prisma.studentDiscount.findMany({
    where,
    include: {
      studentAccount: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      },
      discountRule: true,
    },
    orderBy: { appliedAt: 'desc' },
  })

  // Get term names
  const termIds = [...new Set(discounts.map((d) => d.termId))]
  const terms = await prisma.term.findMany({
    where: { id: { in: termIds } },
  })
  const termMap = new Map(terms.map((t) => [t.id, t.name]))

  // Get user names
  const userIds = [
    ...new Set([
      ...discounts.map((d) => d.appliedBy),
      ...discounts.filter((d) => d.approvedBy).map((d) => d.approvedBy!),
      ...discounts.filter((d) => d.rejectedBy).map((d) => d.rejectedBy!),
    ]),
  ]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { staff: true },
  })
  const userMap = new Map(
    users.map((u) => [
      u.id,
      u.staff ? `${u.staff.firstName} ${u.staff.lastName}` : u.email || 'Unknown',
    ])
  )

  return discounts.map((discount) => ({
    id: discount.id,
    studentAccountId: discount.studentAccountId,
    studentId: discount.studentAccount.studentId,
    studentName: `${discount.studentAccount.student.firstName} ${discount.studentAccount.student.lastName}`,
    discountRuleId: discount.discountRuleId ?? undefined,
    discountRuleName: discount.discountRule?.name,
    termId: discount.termId,
    termName: termMap.get(discount.termId) || '',
    name: discount.name,
    type: discount.type as DiscountType,
    value: discount.value,
    calculatedAmount: discount.calculatedAmount,
    reason: discount.reason ?? undefined,
    sponsorName: discount.sponsorName ?? undefined,
    status: discount.status as DiscountStatus,
    appliedBy: discount.appliedBy,
    appliedByName: userMap.get(discount.appliedBy),
    appliedAt: discount.appliedAt.toISOString(),
    approvedBy: discount.approvedBy ?? undefined,
    approvedByName: discount.approvedBy ? userMap.get(discount.approvedBy) : undefined,
    approvedAt: discount.approvedAt?.toISOString(),
    rejectedBy: discount.rejectedBy ?? undefined,
    rejectedByName: discount.rejectedBy ? userMap.get(discount.rejectedBy) : undefined,
    rejectedAt: discount.rejectedAt?.toISOString(),
    rejectionReason: discount.rejectionReason ?? undefined,
  }))
}

/**
 * List discount rules for a school
 */
export async function listDiscountRules(schoolId: string): Promise<DiscountRule[]> {
  const rules = await prisma.discountRule.findMany({
    where: { schoolId },
    orderBy: { name: 'asc' },
  })

  return rules.map((rule) => ({
    id: rule.id,
    schoolId: rule.schoolId,
    name: rule.name,
    description: rule.description ?? undefined,
    type: rule.type as DiscountType,
    value: rule.value,
    maxAmount: rule.maxAmount ?? undefined,
    isActive: rule.isActive,
    requiresApproval: rule.requiresApproval,
    createdBy: rule.createdBy,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }))
}

/**
 * Get pending discounts for approval
 */
export async function getPendingDiscounts(
  schoolId: string
): Promise<StudentDiscount[]> {
  const discounts = await prisma.studentDiscount.findMany({
    where: {
      studentAccount: { schoolId },
      status: 'PENDING',
    },
    include: {
      studentAccount: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      },
      discountRule: true,
    },
    orderBy: { appliedAt: 'asc' },
  })

  // Get term names
  const termIds = [...new Set(discounts.map((d) => d.termId))]
  const terms = await prisma.term.findMany({
    where: { id: { in: termIds } },
  })
  const termMap = new Map(terms.map((t) => [t.id, t.name]))

  // Get user names
  const userIds = [...new Set(discounts.map((d) => d.appliedBy))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { staff: true },
  })
  const userMap = new Map(
    users.map((u) => [
      u.id,
      u.staff ? `${u.staff.firstName} ${u.staff.lastName}` : u.email || 'Unknown',
    ])
  )

  return discounts.map((discount) => ({
    id: discount.id,
    studentAccountId: discount.studentAccountId,
    studentId: discount.studentAccount.studentId,
    studentName: `${discount.studentAccount.student.firstName} ${discount.studentAccount.student.lastName}`,
    discountRuleId: discount.discountRuleId ?? undefined,
    discountRuleName: discount.discountRule?.name,
    termId: discount.termId,
    termName: termMap.get(discount.termId) || '',
    name: discount.name,
    type: discount.type as DiscountType,
    value: discount.value,
    calculatedAmount: discount.calculatedAmount,
    reason: discount.reason ?? undefined,
    sponsorName: discount.sponsorName ?? undefined,
    status: discount.status as DiscountStatus,
    appliedBy: discount.appliedBy,
    appliedByName: userMap.get(discount.appliedBy),
    appliedAt: discount.appliedAt.toISOString(),
    approvedBy: undefined,
    approvedAt: undefined,
    rejectedBy: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
  }))
}

// Export all functions as a service object
export const DiscountService = {
  applyDiscount,
  approveDiscount,
  rejectDiscount,
  removeDiscount,
  detectSiblings,
  getDiscount,
  listStudentDiscounts,
  listDiscountRules,
  getPendingDiscounts,
}

export default DiscountService
